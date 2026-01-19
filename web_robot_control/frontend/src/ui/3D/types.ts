import * as THREE from 'three'
import { RenderController } from './RenderController'

export interface TFConfig {
    fixed_frame: string
    angular_threshold: number
    translation_threshold: number
}

export interface RobotConfig {
    joint_states_topics: string[]
}

export interface TopicConfig {
    name: string
    message_type: string
    options?: TopicVisualizationOptions
}

export interface VRPositionPublisherConfig {
    enabled: boolean
    headsetTopic: string
    leftControllerTopic: string
    rightControllerTopic: string
    publishRate: number // Hz
}

export interface RenderControllerConfig {
    tf: TFConfig
    robot: RobotConfig
    grid: {
        enabled: boolean
        cellCount: number
        cellSize: number
    }
    topics: TopicConfig[]
    vrPublisher: VRPositionPublisherConfig
}

export interface TopicVisualizer {
    (
        topicName: string,
        controller: RenderController,
        options?: TopicVisualizationOptions
    ): THREE.Object3D
}

export interface TopicVisualizationOptions {
    opacity?: number
    renderOrder?: number

    // PointCloud2
    maxPoints?: number
    pointSize?: number
    colorMode?: 'RGB' | 'rainbow'
    maxTraces?: number

    // OccupancyGrid
    colorScheme?: 'map' | 'costmap'
    showUnknown?: boolean
    unknownColor?: number
    zOffset?: number

    // Path, Odometry and PoseStamped
    lineWidth?: number
    color?: number

    // Odometry and PoseStamped
    axesSize?: number
}
