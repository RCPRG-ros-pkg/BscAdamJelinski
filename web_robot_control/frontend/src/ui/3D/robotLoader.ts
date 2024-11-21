import { useTopicSubscriber } from '@/core/roslibExtensions'
import { MathUtils, Group } from 'three'
import * as THREE from 'three'
import { RenderController } from './RenderController'
import { urdfLoader } from './urdfLoader'

export const robotLoader = async (
    path: string,
    controller: RenderController,
    tfBaseFrame: string,
    jointTopics?: [string]
) => {
    const robot = await urdfLoader(path)
    const latestJointState = Object.fromEntries(
        Object.entries(robot.joints).map(([key, joint]) => [
            key,
            joint.angle as number,
        ])
    )
    const latestPosition = new THREE.Vector3()
    const latestRotation = new THREE.Quaternion()

    for (const topic of jointTopics || []) {
        useTopicSubscriber(topic, 'sensor_msgs/msg/JointState', (data) => {
            for (const [i, name] of data.name.entries()) {
                if (name in latestJointState)
                    latestJointState[name] = data.position[i]
            }
        })
    }

    controller.tf2Client?.subscribe(tfBaseFrame!, (tf) => {
        latestPosition.set(tf.translation.x, tf.translation.y, tf.translation.z)
        latestRotation.set(
            tf.rotation.x,
            tf.rotation.y,
            tf.rotation.z,
            tf.rotation.w
        )
    })

    controller.frameCallbacks.push(() => {
        for (const [name, value] of Object.entries(latestJointState)) {
            robot.setJointValue(
                name,
                MathUtils.lerp(robot.joints[name].angle as number, value, 0.2)
            )
        }
        robot.position.lerp(latestPosition, 0.2)
        robot.quaternion.slerp(latestRotation, 0.2)
    })

    const group = new Group()
    group.add(robot)
    group.rotateX(-Math.PI / 2)

    return group
}
