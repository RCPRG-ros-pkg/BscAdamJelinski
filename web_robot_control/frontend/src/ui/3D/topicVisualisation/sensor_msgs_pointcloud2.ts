import { useTF2Pose, useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { RenderController } from '../RenderController'
import { TopicVisualizationOptions } from '../types'

export const sensor_msgs_pointcloud2 = (
    topicName: string,
    controller: RenderController,
    options?: TopicVisualizationOptions
) => {
    const opts = {
        maxPoints: 100000,
        pointSize: 0.005,
        colorMode: 'RGB',
        maxTraces: 50,
        opacity: 1.0,
        renderOrder: 0,
        ...options,
    }

    const frame_id = ref('')
    const latestPose = useTF2Pose(frame_id, controller.tf2Client!)

    const group = new THREE.Group()

    const pointCloudBuffer: Array<THREE.Points> = []
    let currentBufferIndex = 0

    for (let i = 0; i < opts.maxTraces; i++) {
        const geom = new THREE.BufferGeometry()
        const positions = new THREE.BufferAttribute(
            new Float32Array(opts.maxPoints * 3),
            3,
            false
        )
        const colors = new THREE.BufferAttribute(
            new Float32Array(opts.maxPoints * 3),
            3,
            false
        )
        geom.setAttribute('position', positions)
        geom.setAttribute('color', colors)

        const material = new THREE.PointsMaterial({
            size: opts.pointSize,
            vertexColors: true,
            transparent: opts.opacity < 1.0,
            opacity: opts.opacity,
        })

        const object = new THREE.Points(geom, material)
        object.frustumCulled = false
        object.visible = false
        object.renderOrder = opts.renderOrder

        pointCloudBuffer.push(object)
        group.add(object)
    }

    controller.frameCallbacks.push(() => {
        const scaleVec = new THREE.Vector3()
        controller.camera.getWorldScale(scaleVec)
        const scale = scaleVec.x
        pointCloudBuffer.forEach((pc) => {
            const material = pc.material as THREE.PointsMaterial
            material.size = opts.pointSize / scale
            material.needsUpdate = true
        })
    })

    useTopicSubscriber(
        topicName,
        'sensor_msgs/msg/PointCloud2',
        (msg) => {
            frame_id.value = msg.header.frame_id

            const object = pointCloudBuffer[currentBufferIndex]
            const geom = object.geometry
            const positions = geom.getAttribute(
                'position'
            ) as THREE.BufferAttribute
            const colors = geom.getAttribute('color') as THREE.BufferAttribute

            const fields: { [key: string]: any } = {}
            for (let i = 0; i < msg.fields.length; i++) {
                fields[msg.fields[i].name] = msg.fields[i]
            }

            const dataview = new DataView(
                msg.data.buffer,
                msg.data.byteOffset,
                msg.data.byteLength
            )
            const littleEndian = !msg.is_bigendian
            const x = fields.x.offset
            const y = fields.y.offset
            const z = fields.z.offset
            const pointCount = Math.min(
                msg.height * msg.width,
                positions.array.length / 3
            )

            let setColor = (base: number, index: number) => {}
            if (opts.colorMode === 'RGB') {
                if (fields.rgb) {
                    const offset = fields.rgb.offset
                    setColor = (base: number, index: number) => {
                        colors.array[3 * index] =
                            dataview.getUint8(base + offset) / 255.0
                        colors.array[3 * index + 1] =
                            dataview.getUint8(base + offset + 1) / 255.0
                        colors.array[3 * index + 2] =
                            dataview.getUint8(base + offset + 2) / 255.0
                    }
                }
                if (fields.r && fields.g && fields.b) {
                    setColor = (base: number, index: number) => {
                        colors.array[3 * index] = dataview.getFloat32(
                            base + fields.r.offset,
                            littleEndian
                        )
                        colors.array[3 * index + 1] = dataview.getFloat32(
                            base + fields.g.offset,
                            littleEndian
                        )
                        colors.array[3 * index + 2] = dataview.getFloat32(
                            base + fields.b.offset,
                            littleEndian
                        )
                    }
                }
            } else if (opts.colorMode === 'rainbow') {
                setColor = (base: number, index: number) => {
                    const rainbow = (h: number) =>
                        Math.min(
                            Math.max(
                                6.0 * Math.abs(h - Math.floor(h) - 0.5) - 1.0,
                                0.0
                            ),
                            1.0
                        )

                    const hue = dataview.getFloat32(base + z, littleEndian) / 10
                    colors.array[3 * index] = rainbow(hue)
                    colors.array[3 * index + 1] = rainbow(hue + 1.0 / 3.0)
                    colors.array[3 * index + 2] = rainbow(hue + 2.0 / 3.0)
                }
            }

            for (let i = 0; i < pointCount; i++) {
                const base = i * msg.point_step
                positions.array[3 * i] = dataview.getFloat32(
                    base + x,
                    littleEndian
                )
                positions.array[3 * i + 1] = dataview.getFloat32(
                    base + y,
                    littleEndian
                )
                positions.array[3 * i + 2] = dataview.getFloat32(
                    base + z,
                    littleEndian
                )
                setColor(base, i)
            }

            geom.setDrawRange(0, pointCount)

            positions.needsUpdate = true
            positions.updateRanges = [
                {
                    start: 0,
                    count: pointCount * positions.itemSize,
                },
            ]
            colors.needsUpdate = true
            colors.updateRanges = [
                {
                    start: 0,
                    count: pointCount * positions.itemSize,
                },
            ]

            object.position.copy(latestPose.position)
            object.rotation.setFromQuaternion(latestPose.rotation)
            object.visible = true

            currentBufferIndex = (currentBufferIndex + 1) % opts.maxTraces
        },
        { compression: 'cbor', throttle_rate: 100, queue_size: 1 }
    )

    return group
}
