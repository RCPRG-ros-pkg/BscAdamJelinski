import { LoadingManager, Object3D } from 'three'
import URDFLoader, { URDFRobot } from 'urdf-loader'

export const urdfParser = async (urdf: string) => {
    return await new Promise<URDFRobot>((resolve, reject) => {
        const manager = new LoadingManager()
        const loader = new URDFLoader(manager)

        loader.packages = (pkg) => `/models/packages/${pkg}`
        const robot = loader.parse(urdf)
        const recurse = (object: Object3D) => {
            object.frustumCulled = false
            object.children.forEach((child) => recurse(child))
        }
        setTimeout(() => recurse(robot), 1000)

        resolve(robot)
    })
}
