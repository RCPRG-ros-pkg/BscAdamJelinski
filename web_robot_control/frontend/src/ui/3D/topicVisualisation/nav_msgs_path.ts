import { useTF2Frame, useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { RenderController } from '../RenderController'
import { TopicVisualizationOptions } from '../types'

export const nav_msgs_path = (
    topicName: string,
    controller: RenderController,
    options?: TopicVisualizationOptions
) => {
    const opts = {
        color: 0x00000ff,
        opacity: 1.0,
        lineWidth: 2,
        renderOrder: 0,
        ...options,
    }
    const material = new LineMaterial({
        color: opts.color,
        linewidth: opts.lineWidth,
        transparent: opts.opacity < 1.0,
        opacity: opts.opacity,
    })
    const geometry = new LineGeometry()
    const line = new Line2(geometry, material)
    line.renderOrder = opts.renderOrder

    const frame_id = ref('')
    const frame = useTF2Frame(frame_id, controller)

    frame.add(line)

    useTopicSubscriber(topicName, 'nav_msgs/msg/Path', (msg) => {
        frame_id.value = msg.header.frame_id

        const points = []
        for (const pose of msg.poses) {
            const position = pose.pose.position
            points.push(
                new THREE.Vector3(position.x, position.y, position.z + 0.01)
            )
        }

        line.geometry = new LineGeometry().setPositions(
            points.flatMap((p) => [p.x, p.y, p.z])
        )
    })
    return frame
}
