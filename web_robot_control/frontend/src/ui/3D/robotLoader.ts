import { useTF2Pose, useTopicSubscriber } from '@/core/roslibExtensions'
import { MathUtils, Group } from 'three'
import { RenderController } from './RenderController'
import { urdfParser } from './urdfParser'

export const robotLoader = async (
    urdf: string,
    jointTopics: string[],
    controller: RenderController
) => {
    const robot = await urdfParser(urdf)
    const tfBaseFrame =
        Object.entries(robot.frames).find(([, frame]) => !frame.parent)?.[0] ||
        'base_link'

    const latestJointState = Object.fromEntries(
        Object.entries(robot.joints).map(([key, joint]) => [
            key,
            joint.angle as number,
        ])
    )

    const latestPose = useTF2Pose(tfBaseFrame, controller.tf2Client!)

    for (const topic of jointTopics || []) {
        useTopicSubscriber(topic, 'sensor_msgs/msg/JointState', (data) => {
            for (const [i, name] of data.name.entries()) {
                if (name in latestJointState)
                    latestJointState[name] = data.position[i]
            }
        })
    }

    controller.frameCallbacks.push(() => {
        for (const [name, value] of Object.entries(latestJointState)) {
            robot.setJointValue(
                name,
                MathUtils.lerp(robot.joints[name].angle as number, value, 0.2)
            )
        }
        robot.position.lerp(latestPose.position, 0.2)
        robot.quaternion.slerp(latestPose.rotation, 0.2)
    })

    const group = new Group()
    group.add(robot)
    group.rotateX(-Math.PI / 2)

    return group
}
