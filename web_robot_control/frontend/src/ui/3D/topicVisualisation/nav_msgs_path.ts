import { useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'

export const nav_msgs_path = (topicName: string, options?: any) => {
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff })
    const geometry = new THREE.BufferGeometry()
    const line = new THREE.Line(geometry, material)

    useTopicSubscriber(topicName, 'nav_msgs/msg/Path', (path) => {
        console.log(path)
        if (path.header.frame_id === 'map') {
            const points = []
            for (const pose of path.poses) {
                const position = pose.pose.position
                points.push(
                    new THREE.Vector3(position.x, position.y, position.z + 0.01)
                )
            }

            line.geometry = new THREE.BufferGeometry().setFromPoints(points)
        }
    })
    return line
}
