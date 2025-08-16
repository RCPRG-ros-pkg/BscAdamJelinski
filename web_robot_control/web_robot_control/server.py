#!/usr/bin/env python3

import os
import sys
import threading
import tempfile
import ipaddress
import ssl
from pathlib import Path
from typing import Optional

import rclpy
from rclpy.node import Node
from ament_index_python.packages import get_package_share_directory

from flask import Flask, Response, send_from_directory, jsonify
import tornado.wsgi
import tornado.httpserver
import tornado.ioloop


class WebRobotControlNode(Node):

    def __init__(self):
        super().__init__("web_robot_control_server")

        self.declare_parameter("port", 8080)
        self.declare_parameter("host", "0.0.0.0")
        self.declare_parameter("config", "")

        self.port = self.get_parameter("port").get_parameter_value().integer_value
        self.host = self.get_parameter("host").get_parameter_value().string_value
        self.config = self.get_parameter("config").get_parameter_value().string_value


def generate_self_signed_cert():
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from datetime import datetime, timedelta, timezone

        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

        subject = issuer = x509.Name(
            [
                x509.NameAttribute(NameOID.COUNTRY_NAME, "PL"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Mazowieckie"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "Warszawa"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Web Robot Control"),
                x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
            ]
        )

        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.now(timezone.utc))
            .not_valid_after(datetime.now(timezone.utc) + timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName(
                    [
                        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                        x509.IPAddress(ipaddress.IPv6Address("::1")),
                        x509.DNSName("localhost"),
                    ]
                ),
                critical=False,
            )
            .sign(private_key, hashes.SHA256())
        )

        cert_file = tempfile.NamedTemporaryFile(delete=False, suffix=".crt")
        key_file = tempfile.NamedTemporaryFile(delete=False, suffix=".key")

        cert_file.write(cert.public_bytes(serialization.Encoding.PEM))
        key_file.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )

        cert_file.close()
        key_file.close()

        return cert_file.name, key_file.name

    except Exception as e:
        return None, None


def find_frontend_dist() -> Optional[Path]:
    try:
        package_path = get_package_share_directory("web_robot_control")
        installed_path = Path(package_path) / "frontend" / "dist"
        if installed_path.exists():
            return installed_path
    except Exception:
        pass

    dev_path = Path(__file__).parent.parent / "frontend" / "dist"
    if dev_path.exists():
        return dev_path

    return None


def get_package_path(package_name: str) -> Optional[str]:
    try:
        return get_package_share_directory(package_name)
    except Exception:
        return None


def create_app(node: WebRobotControlNode, frontend_dist_path: Path) -> Flask:
    app = Flask(__name__)

    @app.route("/models/packages/<package_name>/<path:file_path>")
    def serve_package_file(package_name: str, file_path: str):
        package_path = get_package_path(package_name)

        if not package_path:
            node.get_logger().warn(f"Package {package_name} not found")
            return jsonify({"error": f"Package {package_name} not found"}), 404

        full_file_path = os.path.join(package_path, file_path)

        if not os.path.abspath(full_file_path).startswith(
            os.path.abspath(package_path)
        ):
            node.get_logger().warn(
                f"Access denied for {file_path} in package {package_name}"
            )
            return jsonify({"error": "Access denied"}), 403

        if os.path.exists(full_file_path) and os.path.isfile(full_file_path):
            try:
                node.get_logger().debug(
                    f"Serving file: {file_path} from package {package_name}"
                )
                return send_from_directory(
                    os.path.dirname(full_file_path), os.path.basename(full_file_path)
                )
            except Exception as e:
                node.get_logger().error(f"Error serving file {file_path}: {str(e)}")
                return jsonify({"error": f"Error serving file: {str(e)}"}), 500
        else:
            node.get_logger().warn(
                f"File {file_path} not found in package {package_name}"
            )
            return (
                jsonify(
                    {"error": f"File {file_path} not found in package {package_name}"}
                ),
                404,
            )

    @app.route("/")
    def serve_frontend():
        return send_from_directory(frontend_dist_path, "index.html")

    @app.route("/config.yaml")
    def serve_config():
        return Response(node.config, mimetype="text/yaml")

    @app.route("/<path:path>")
    def serve_static(path: str):
        file_path = frontend_dist_path / path
        if file_path.exists() and file_path.is_file():
            return send_from_directory(frontend_dist_path, path)
        else:
            return send_from_directory(frontend_dist_path, "index.html")

    return app


def run_ros_node(node: WebRobotControlNode) -> None:
    node.get_logger().info("ROS node thread started")
    while True:
        try:
            rclpy.spin_once(node, timeout_sec=0.1)
        except Exception as e:
            node.get_logger().error(f"Error in ROS node thread: {e}")
            break
    node.get_logger().info("ROS node thread finished")


def main() -> None:
    rclpy.init()
    node = WebRobotControlNode()

    frontend_dist_path = find_frontend_dist()

    if not frontend_dist_path:
        node.get_logger().error("Frontend dist directory not found.")
        node.get_logger().error(
            "Please ensure the frontend is built and the package is properly installed."
        )
        node.destroy_node()
        rclpy.shutdown()
        sys.exit(1)

    app = create_app(node, frontend_dist_path)

    node.get_logger().info(
        f"Starting Web Robot Control Server on {node.host}:{node.port}"
    )
    node.get_logger().info(f"Frontend served from: {frontend_dist_path}")

    try:
        ros_thread = threading.Thread(target=run_ros_node, args=(node,))
        ros_thread.daemon = True
        ros_thread.start()

        cert_file, key_file = generate_self_signed_cert()

        if cert_file and key_file:
            ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            ssl_context.load_cert_chain(cert_file, key_file)

            container = tornado.wsgi.WSGIContainer(app)
            http_server = tornado.httpserver.HTTPServer(
                container, ssl_options=ssl_context
            )
            http_server.listen(node.port, address=node.host)
            tornado.ioloop.IOLoop.current().start()
        else:
            node.get_logger().error("SSL setup failed, closing server")
    except KeyboardInterrupt:
        node.get_logger().info("Received KeyboardInterrupt, shutting down...")
    except SystemExit:
        node.get_logger().info("Received SystemExit, shutting down...")
    except Exception as e:
        node.get_logger().error(f"Unexpected error: {e}")

    node.get_logger().info("Destroying ROS node...")
    node.destroy_node()

    if cert_file and os.path.exists(cert_file):
        try:
            os.unlink(cert_file)
            node.get_logger().info("SSL certificate file cleaned up")
        except Exception as e:
            node.get_logger().warn(f"Failed to clean up certificate file: {e}")

    if key_file and os.path.exists(key_file):
        try:
            os.unlink(key_file)
            node.get_logger().info("SSL key file cleaned up")
        except Exception as e:
            node.get_logger().warn(f"Failed to clean up key file: {e}")


if __name__ == "__main__":
    main()
