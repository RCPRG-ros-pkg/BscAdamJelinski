import { useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { RenderController } from '../RenderController'
import { Transform } from 'roslib'

export const geometry_msgs_posestamped = (
    topicName: string,
    controller: RenderController,
    options?: any
) => {
    const frame = new THREE.Group()
    const object = new THREE.AxesHelper(0.1)
    frame.add(object)

    const latestPosition = new THREE.Vector3()
    const latestRotation = new THREE.Quaternion()

    let frame_id = ''
    const latestFramePosition = new THREE.Vector3()
    const latestFrameRotation = new THREE.Quaternion()
    controller.frameCallbacks.push(() => {
        frame.position.lerp(latestFramePosition, 0.2)
        frame.quaternion.slerp(latestFrameRotation, 0.2)

        object.position.lerp(latestPosition, 0.2)
        object.quaternion.slerp(latestRotation, 0.2)
    })

    const updatePosition = (tf: Transform) => {
        latestFramePosition.set(
            tf.translation.x,
            tf.translation.y,
            tf.translation.z
        )
        latestFrameRotation.set(
            tf.rotation.x,
            tf.rotation.y,
            tf.rotation.z,
            tf.rotation.w
        )
    }

    useTopicSubscriber(topicName, 'geometry_msgs/msg/PoseStamped', (msg) => {
        if (frame_id !== msg.header.frame_id) {
            if (frame_id !== '')
                controller.tf2Client?.unsubscribe(frame_id, updatePosition)

            frame_id = msg.header.frame_id
            controller.tf2Client?.subscribe(frame_id, updatePosition)
        }

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
