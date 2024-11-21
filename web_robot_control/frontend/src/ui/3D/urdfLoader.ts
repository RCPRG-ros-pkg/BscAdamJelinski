import { LoadingManager } from 'three'
import URDFLoader, { URDFRobot } from 'urdf-loader'

export const urdfLoader = async (path: string) => {
    return await new Promise<URDFRobot>((resolve, reject) => {
        const manager = new LoadingManager()
        const loader = new URDFLoader(manager)

        loader.packages = (pkg) => `/models/urdf/${pkg}`
        loader.load(path, (robot) => {
            resolve(robot)
        })
    })
}
