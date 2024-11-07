import { useTopicSubscriber } from '@/core/roslibExtensions'
import { LoadingManager } from 'three'
import URDFLoader, { URDFRobot } from 'urdf-loader'

export const urdfLoader = async (path: string, jointTopic?: string) => {
    return await new Promise<URDFRobot>((resolve, reject) => {
        const manager = new LoadingManager()
        const loader = new URDFLoader(manager)

        loader.packages = (pkg) => `/models/urdf/${pkg}`
        loader.load(path, (robot) => {
            if (jointTopic) {
                useTopicSubscriber(
                    jointTopic,
                    'sensor_msgs/msg/JointState',
                    (data) => {
                        console.log(data)
                    }
                )
            }

            resolve(robot)
        })
    })
}
