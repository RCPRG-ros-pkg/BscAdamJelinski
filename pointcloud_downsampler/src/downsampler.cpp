#include <functional>
#include <memory>
#include <string>

#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

#include <pcl/filters/voxel_grid.h>
#include <pcl/io/pcd_io.h>
#include <pcl/point_types.h>
#include <pcl_conversions/pcl_conversions.h>

using std::placeholders::_1;

class DownSampler : public rclcpp::Node {
public:
  DownSampler() : Node("pointcloud_downsampler") {

    subscription_ = this->create_subscription<sensor_msgs::msg::PointCloud2>(
        "input", 10, std::bind(&DownSampler::topic_callback, this, _1));

    publisher_ =
        this->create_publisher<sensor_msgs::msg::PointCloud2>("output", 1);
  }

private:
  void topic_callback(const sensor_msgs::msg::PointCloud2::SharedPtr msg) {
    pcl::PCLPointCloud2::Ptr cloud(new pcl::PCLPointCloud2());
    pcl::PCLPointCloud2::Ptr cloud_filtered(new pcl::PCLPointCloud2());

    pcl_conversions::toPCL(*msg, *cloud);

    pcl::VoxelGrid<pcl::PCLPointCloud2> voxel_filter;
    voxel_filter.setInputCloud(cloud);
    voxel_filter.setLeafSize(0.05, 0.05, 0.05);
    voxel_filter.filter(*cloud_filtered);

    sensor_msgs::msg::PointCloud2 cloud_out;

    pcl_conversions::fromPCL(*cloud_filtered, cloud_out);

    cloud_out.header.frame_id = msg->header.frame_id;
    cloud_out.header.stamp = msg->header.stamp;

    publisher_->publish(cloud_out);
  }

  rclcpp::Subscription<sensor_msgs::msg::PointCloud2>::SharedPtr subscription_;
  rclcpp::Publisher<sensor_msgs::msg::PointCloud2>::SharedPtr publisher_;
};

int main(int argc, char *argv[]) {
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<DownSampler>());
  rclcpp::shutdown();
  return 0;
}