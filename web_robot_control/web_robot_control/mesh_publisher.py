#! /usr/bin/env python3

import rclpy
from rclpy.node import Node
from visualization_msgs.msg import Marker


class MeshMarkerPublisher(Node):
    def __init__(self):
        super().__init__("mesh_publisher")

        topic_default = "~/world_mesh"
        pose_default = [0.0, 0.0, -0.01, 0.0, 0.0, 0.0, 1.0]

        self.declare_parameter("mesh_resource", "")
        self.declare_parameter("topic", topic_default)
        self.declare_parameter("pose", pose_default)

        if not self.get_parameter("mesh_resource").value:
            self.get_logger().error(
                "Parameter 'mesh_resource' is required but not set. Shutting down."
            )
            rclpy.shutdown()
            return

        mesh_resource = self.get_parameter("mesh_resource").value
        topic = self.get_parameter("topic").value
        pose_param = self.get_parameter("pose").value

        self._pub = self.create_publisher(Marker, topic, 10)

        self._marker = Marker()
        self._marker.header.frame_id = "map"
        self._marker.ns = ""

        self._marker.type = Marker.MESH_RESOURCE
        self._marker.id = 0
        self._marker.action = Marker.ADD

        self._marker.mesh_resource = mesh_resource
        self._marker.mesh_use_embedded_materials = True

        self._marker.scale.x = 1.0
        self._marker.scale.y = 1.0
        self._marker.scale.z = 1.0

        self._marker.color.r = 0.0
        self._marker.color.g = 0.0
        self._marker.color.b = 0.0
        self._marker.color.a = 1.0

        try:
            if isinstance(pose_param, (list, tuple)) and len(pose_param) == 7:
                px, py, pz, ox, oy, oz, ow = pose_param
            else:
                raise ValueError("pose must be a list of 7 floats")
        except Exception as e:
            self.get_logger().warning(
                f"Invalid 'pose' parameter ({pose_param}), using default: {pose_default}: {e}"
            )
            px, py, pz, ox, oy, oz, ow = pose_default

        self._marker.pose.position.x = float(px)
        self._marker.pose.position.y = float(py)
        self._marker.pose.position.z = float(pz)
        self._marker.pose.orientation.x = float(ox)
        self._marker.pose.orientation.y = float(oy)
        self._marker.pose.orientation.z = float(oz)
        self._marker.pose.orientation.w = float(ow)

        self._timer = self.create_timer(1.0, self._on_timer)

    def _on_timer(self) -> None:
        self._marker.header.stamp = self.get_clock().now().to_msg()
        self._pub.publish(self._marker)


def main(args=None):
    rclpy.init(args=args)
    node = MeshMarkerPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
