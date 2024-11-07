from setuptools import find_packages, setup
from glob import glob

package_name = "web_robot_control"

setup(
    name=package_name,
    version="0.0.0",
    packages=find_packages(exclude=["test"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name, glob("launch/*.launch")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Adam Jeliński",
    maintainer_email="adas.jelinski@gmail.com",
    description="TODO: Package description",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": ["server = web_robot_control.server:main"],
    },
)
