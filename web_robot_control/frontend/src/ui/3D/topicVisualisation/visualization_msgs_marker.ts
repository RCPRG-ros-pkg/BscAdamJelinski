import { useTF2Frame, useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RenderController } from '../RenderController'
import { TopicVisualizationOptions } from '../types'

enum MarkerType {
    ARROW = 0,
    CUBE = 1,
    SPHERE = 2,
    CYLINDER = 3,
    LINE_STRIP = 4,
    LINE_LIST = 5,
    CUBE_LIST = 6,
    SPHERE_LIST = 7,
    POINTS = 8,
    TEXT_VIEW_FACING = 9,
    MESH_RESOURCE = 10,
    TRIANGLE_LIST = 11,
}

enum MarkerAction {
    ADD = 0,
    MODIFY = 1,
    DELETE = 2,
    DELETEALL = 3,
}

export const visualization_msgs_marker = (
    topicName: string,
    controller: RenderController,
    options?: TopicVisualizationOptions
) => {
    const frame_id = ref('')
    const frame = useTF2Frame(frame_id, controller)

    const objects: Record<string, THREE.Object3D> = {}

    const createMarkerObject = async (msg: any): Promise<THREE.Object3D> => {
        let object: THREE.Object3D
        switch (msg.type) {
            case MarkerType.CUBE: {
                object = new THREE.Mesh(new THREE.BoxGeometry())
                break
            }
            case MarkerType.SPHERE: {
                object = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16))
                break
            }
            case MarkerType.CYLINDER: {
                object = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.5, 1, 16)
                )
                break
            }
            case MarkerType.MESH_RESOURCE: {
                if (msg.mesh_resource.startsWith('package://')) {
                    const packagePath = msg.mesh_resource.replace(
                        'package://',
                        ''
                    )
                    msg.mesh_resource = `https://localhost:8080/models/packages/${packagePath}`
                }
                switch (msg.mesh_resource.split('.').pop()) {
                    case 'stl':
                        {
                            const loader = new STLLoader()
                            const geometry = await loader.loadAsync(
                                msg.mesh_resource
                            )
                            object = new THREE.Mesh(geometry)
                        }
                        break
                    case 'dae':
                        {
                            const loader = new ColladaLoader()
                            object = (await loader.loadAsync(msg.mesh_resource))
                                .scene
                        }
                        break
                    case 'glb':
                    case 'gltf': {
                        const loader = new GLTFLoader()
                        object = (await loader.loadAsync(msg.mesh_resource))
                            .scene
                        break
                    }
                    default: {
                        object = new THREE.Object3D()
                        break
                    }
                }
                break
            }
            default: {
                object = new THREE.Object3D()
                break
            }
        }
        object.name = msg.ns + '_' + msg.id
        object.scale.set(msg.scale.x, msg.scale.y, msg.scale.z)
        object.position.set(
            msg.pose.position.x,
            msg.pose.position.y,
            msg.pose.position.z
        )
        object.quaternion.set(
            msg.pose.orientation.x,
            msg.pose.orientation.y,
            msg.pose.orientation.z,
            msg.pose.orientation.w
        )
        const color = new THREE.Color(msg.color.r, msg.color.g, msg.color.b)
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: msg.color.a,
        })
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
        object.frustumCulled = false
        return object
    }

    useTopicSubscriber(topicName, 'visualization_msgs/msg/Marker', (msg) => {
        frame_id.value = msg.header.frame_id

        switch (msg.action) {
            case MarkerAction.ADD:
            case MarkerAction.MODIFY:
                {
                    let object = objects[msg.ns + '_' + msg.id]
                    if (!object) {
                        createMarkerObject(msg).then((obj) => {
                            objects[msg.ns + '_' + msg.id] = obj
                            frame.add(obj)
                        })
                    }
                }
                break
            case MarkerAction.DELETE:
                {
                    const key = msg.ns + '_' + msg.id
                    const object = objects[key]
                    if (object) {
                        frame.remove(object)
                        delete objects[key]
                    }
                }
                break
        }
    })

    return frame
}
