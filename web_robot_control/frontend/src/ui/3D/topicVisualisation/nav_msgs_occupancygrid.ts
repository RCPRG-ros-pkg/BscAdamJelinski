import { useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'

export const nav_msgs_occupancygrid = (topicName: string, options?: any) => {
    const textureCanvas = document.createElement('canvas')
    const material = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(textureCanvas),
        transparent: true,
        side: THREE.BackSide,
    })
    const geometry = new THREE.PlaneGeometry(10, 10)
    const mesh = new THREE.Mesh(geometry, material)

    useTopicSubscriber(topicName, 'nav_msgs/msg/OccupancyGrid', (grid) => {
        if (grid.header.frame_id === 'map') {
            const { width, height, resolution } = grid.info

            textureCanvas.width = width
            textureCanvas.height = height
            mesh.geometry = new THREE.PlaneGeometry(
                width * resolution,
                height * resolution
            )
            mesh.position.set(
                grid.info.origin.position.x + (width * resolution) / 2,
                grid.info.origin.position.y + (height * resolution) / 2,
                grid.info.origin.position.z
            )

            const ctx = textureCanvas.getContext('2d')
            const imageData = ctx!.getImageData(0, 0, width, height)
            const pixels = imageData.data

            for (let i = 0; i < grid.data.length; i++) {
                if (grid.data[i] !== -1) {
                    const val = (1 - grid.data[i]) * 220
                    pixels[4 * i] = val
                    pixels[4 * i + 1] = val
                    pixels[4 * i + 2] = val
                    pixels[4 * i + 3] = 255
                } else {
                    pixels[4 * i] = 200
                    pixels[4 * i + 1] = 200
                    pixels[4 * i + 2] = 200
                    pixels[4 * i + 3] = 50
                }
            }

            ctx?.putImageData(imageData, 0, 0)

            material.map = new THREE.CanvasTexture(textureCanvas)
            material.map.magFilter = THREE.NearestFilter
            material.map.minFilter = THREE.NearestFilter
        }
    })
    mesh.rotateX(Math.PI)

    return mesh
}
