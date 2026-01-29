import { useTF2Frame, useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { RenderController } from '../RenderController'
import { TopicVisualizationOptions } from '../types'

export const geometry_msgs_posestamped = (
    topicName: string,
    controller: RenderController,
    options?: TopicVisualizationOptions
) => {
    const opts = {
        axesSize: 0.1,
        lineWidth: 2,
        opacity: 1.0,
        renderOrder: 0,
        ...options,
    }

    const axesGeometry = new LineSegmentsGeometry().setPositions(
        [
            [0, 0, 0, opts.axesSize, 0, 0],
            [0, 0, 0, 0, opts.axesSize, 0],
            [0, 0, 0, 0, 0, opts.axesSize],
        ].flat()
    )

    const axesMaterial = new LineMaterial({
        color: 0xffffff,
        linewidth: opts.lineWidth,
        vertexColors: true,
        transparent: opts.opacity < 1.0,
        opacity: opts.opacity,
    })

    const colors = new Float32Array(
        [
            [1, 0, 0, 1, 0.6, 0], // X-axis red
            [0, 1, 0, 0.6, 1, 0], // Y-axis green
            [0, 0, 1, 0, 0.6, 1], // Z-axis blue
        ].flat()
    )
    axesGeometry.setColors(colors)

    const axes = new LineSegments2(axesGeometry, axesMaterial)
    axes.renderOrder = opts.renderOrder

    const latestPosition = new THREE.Vector3()
    const latestRotation = new THREE.Quaternion()

    const frame_id = ref('')
    const frame = useTF2Frame(frame_id, controller)

    frame.add(axes)

    controller.frameCallbacks.push(() => {
        axes.position.lerp(latestPosition, 0.2)
        axes.quaternion.slerp(latestRotation, 0.2)
        //axes.position.copy(latestPosition)
        //axes.quaternion.copy(latestRotation)
    })

    useTopicSubscriber(topicName, 'geometry_msgs/msg/PoseStamped', (msg) => {
        frame_id.value = msg.header.frame_id

        latestPosition.set(
            msg.pose.position.x,
            msg.pose.position.y,
            msg.pose.position.z
        )
        latestRotation.set(
            msg.pose.orientation.x,
            msg.pose.orientation.y,
            msg.pose.orientation.z,
            msg.pose.orientation.w
        )
    })

    return frame
}
