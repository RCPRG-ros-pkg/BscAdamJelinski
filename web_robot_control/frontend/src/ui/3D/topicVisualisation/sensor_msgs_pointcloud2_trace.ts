import { useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'
import { RenderController } from '../RenderController'
import { Transform } from 'roslib'

export const sensor_msgs_pointcloud2_trace = (
    topicName: string,
    controller: RenderController,
    options?: any
) => {
    options = options || { color: 'RGB' }
    const maxPoints = 100000

    let frame_id = ''
    const latestPosition = new THREE.Vector3()
    const latestRotation = new THREE.Quaternion()

    const updatePosition = (tf: Transform) => {
        latestPosition.set(tf.translation.x, tf.translation.y, tf.translation.z)
        latestRotation.set(
            tf.rotation.x,
            tf.rotation.y,
            tf.rotation.z,
            tf.rotation.w
        )
    }

    const group = new THREE.Group()
    const objects: Array<THREE.Points> = []

    useTopicSubscriber(
        topicName,
        'sensor_msgs/msg/PointCloud2',
        (msg) => {
            if (frame_id !== msg.header.frame_id) {
                if (frame_id !== '')
                    controller.tf2Client?.unsubscribe(frame_id, updatePosition)

                frame_id = msg.header.frame_id
                controller.tf2Client?.subscribe(frame_id, updatePosition)
            }

            const geom = new THREE.BufferGeometry()
            const positions = new THREE.BufferAttribute(
                new Float32Array(maxPoints * 3),
                3,
                false
            )
            const colors = new THREE.BufferAttribute(
                new Float32Array(maxPoints * 3),
                3,
                false
            )
            geom.setAttribute('position', positions)
            geom.setAttribute('color', colors)

            const material = new THREE.PointsMaterial({
                size: 0.005,
                vertexColors: true,
            })
            const object = new THREE.Points(geom, material)
            object.frustumCulled = false

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
            if (options.color === 'RGB') {
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
            } else {
                setColor = (base: number, index: number) => {
                    const rainbow = (h: number) =>
                        Math.min(
                            Math.max(
                                6.0 * Math.abs(h - Math.floor(h) - 0.5) - 1.0,
                                0.0
                            ),
                            1.0
                        )

                    const hue = dataview.getFloat32(base + x, littleEndian) / 10
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

            object.position.copy(latestPosition)
            object.rotation.setFromQuaternion(latestRotation)

            group.add(object)
            objects.push(object)

            if (objects.length > 50) {
                group.remove(objects[0])
                objects[0].geometry.dispose()
                if (objects[0].material instanceof Array) {
                    objects[0].material[0].dispose()
                } else {
                    objects[0].material.dispose()
                }

                objects.shift()
            }
        },
        { compression: 'cbor', throttle_rate: 100, queue_size: 1 }
    )

    return group
}
