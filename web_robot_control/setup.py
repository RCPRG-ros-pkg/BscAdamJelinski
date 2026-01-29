from setuptools import find_packages, setup
from glob import glob
import os

package_name = "web_robot_control"


setup(
    name=package_name,
    version="0.0.0",
    packages=find_packages(exclude=["test"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name + "/launch", glob("launch/*.launch")),
        ("share/" + package_name + "/config", glob("config/*.yaml")),
        ("share/" + package_name + "/config/tests", glob("config/tests/*.yaml")),
        ("share/" + package_name + "/meshes", glob("meshes/*")),
        *[
            (
                os.path.join(
                    "share",
                    package_name,
                    "frontend",
                    "dist",
                    os.path.relpath(os.path.dirname(f), "frontend/dist"),
                ),
                [f],
            )
            for f in glob("frontend/dist/**/*", recursive=True)
            if os.path.isfile(f)
        ],
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Adam Jeliński",
    maintainer_email="adas.jelinski@gmail.com",
    description="TODO: Package description",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "server = web_robot_control.server:main",
            "mesh_publisher = web_robot_control.mesh_publisher:main",
        ],
    },
)
