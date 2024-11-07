import { useTopicSubscriber } from '@/core/roslibExtensions'
import { LoadingManager, MathUtils } from 'three'
import URDFLoader, { URDFRobot } from 'urdf-loader'
import { RenderController } from './RenderController'

export const urdfLoader = async (
    path: string,
    jointTopic?: string,
    controller?: RenderController
) => {
    return await new Promise<URDFRobot>((resolve, reject) => {
        const manager = new LoadingManager()
        const loader = new URDFLoader(manager)

        loader.packages = (pkg) => `/models/urdf/${pkg}`
        loader.load(path, (robot) => {
            if (jointTopic && controller) {
                const latestJointState = Object.fromEntries(
                    Object.entries(robot.joints).map(([key, joint]) => [
                        key,
                        joint.angle as number,
                    ])
                )

                useTopicSubscriber(
                    jointTopic,
                    'sensor_msgs/msg/JointState',
                    (data) => {
                        for (const [i, name] of data.name.entries()) {
                            latestJointState[name] = data.position[i]
                        }
                    }
                )
                controller.frameCallbacks.push(() => {
                    for (const [name, value] of Object.entries(
                        latestJointState
                    )) {
                        robot.setJointValue(
                            name,
                            MathUtils.lerp(
                                robot.joints[name].angle as number,
                                value,
                                0.2
                            )
                        )
                    }
                })
            }

            resolve(robot)
        })
    })
}
