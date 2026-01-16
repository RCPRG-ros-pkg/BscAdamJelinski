import { useTF2Frame, useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { TopicVisualizationOptions } from '../types'
import { RenderController } from '../RenderController'

export const nav_msgs_occupancygrid = (
    topicName: string,
    controller: RenderController,
    options?: TopicVisualizationOptions
) => {
    const opts = {
        colorScheme: 'map',
        showUnknown: true,
        unknownColor: 0xcc0000,
        opacity: 0.8,
        renderOrder: 0,
        zOffset: Math.random() / 100,
        ...options,
    }

    const textureCanvas = document.createElement('canvas')
    const material = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(textureCanvas),
        transparent: true,
        opacity: opts.opacity,
        side: THREE.BackSide,
    })
    const geometry = new THREE.PlaneGeometry(10, 10)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.renderOrder = opts.renderOrder

    const frame_id = ref('')
    const frame = useTF2Frame(frame_id, controller)
    frame.add(mesh)

    useTopicSubscriber(topicName, 'nav_msgs/msg/OccupancyGrid', (grid) => {
        frame_id.value = grid.header.frame_id

        const { width, height, resolution } = grid.info

        textureCanvas.width = width
        textureCanvas.height = height
        mesh.geometry.copy(
            new THREE.PlaneGeometry(width * resolution, height * resolution)
        )
        mesh.position.set(
            grid.info.origin.position.x + (width * resolution) / 2,
            grid.info.origin.position.y + (height * resolution) / 2,
            grid.info.origin.position.z + opts.zOffset
        )

        const ctx = textureCanvas.getContext('2d')
        const imageData = ctx!.getImageData(0, 0, width, height)
        const pixels = imageData.data

        for (let i = 0; i < grid.data.length; i++) {
            if (opts.colorScheme === 'map') {
                if (grid.data[i] !== -1) {
                    const val = (1 - grid.data[i] / 100) * 220
                    pixels[4 * i] = val
                    pixels[4 * i + 1] = val
                    pixels[4 * i + 2] = val
                    pixels[4 * i + 3] = 255
                } else if (opts.showUnknown) {
                    pixels[4 * i] = (opts.unknownColor >> 16) & 0xff
                    pixels[4 * i + 1] = (opts.unknownColor >> 8) & 0xff
                    pixels[4 * i + 2] = opts.unknownColor & 0xff
                    pixels[4 * i + 3] = 50
                }
            } else if (opts.colorScheme === 'costmap') {
                const val = grid.data[i]
                if (val === 0) {
                    pixels[4 * i] = 0
                    pixels[4 * i + 1] = 0
                    pixels[4 * i + 2] = 0
                    pixels[4 * i + 3] = 0
                } else if (1 <= val && val <= 98) {
                    const v = (255 * val) / 100
                    pixels[4 * i] = v
                    pixels[4 * i + 1] = 0
                    pixels[4 * i + 2] = 255 - v
                    pixels[4 * i + 3] = 255
                } else if (val === 99) {
                    pixels[4 * i] = 0
                    pixels[4 * i + 1] = 255
                    pixels[4 * i + 2] = 255
                    pixels[4 * i + 3] = 255
                } else if (val === 100) {
                    pixels[4 * i] = 255
                    pixels[4 * i + 1] = 0
                    pixels[4 * i + 2] = 255
                    pixels[4 * i + 3] = 255
                } else if (opts.showUnknown) {
                    pixels[4 * i] = 0x70
                    pixels[4 * i + 1] = 0x89
                    pixels[4 * i + 2] = 0x86
                    pixels[4 * i + 3] = 255
                }
            }
        }

        ctx?.putImageData(imageData, 0, 0)

        material.map = new THREE.CanvasTexture(textureCanvas)
        material.map.magFilter = THREE.NearestFilter
        material.map.minFilter = THREE.NearestFilter
    })
    mesh.rotateX(Math.PI)

    return frame
}
