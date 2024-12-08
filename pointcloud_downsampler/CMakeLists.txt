cmake_minimum_required(VERSION 3.8)
project(pointcloud_downsampler)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# find dependencies
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(pcl_conversions REQUIRED)
find_package(pcl_ros REQUIRED)


include_directories(${PCL_INCLUDE_DIRS} include)
link_directories(${PCL_LIBRARY_DIRS})
add_definitions(${PCL_DEFINITIONS})

add_executable(downsampler src/downsampler.cpp)
ament_target_dependencies(downsampler rclcpp std_msgs sensor_msgs pcl_conversions)

install(TARGETS
  downsampler
  DESTINATION lib/${PROJECT_NAME})

ament_package()
