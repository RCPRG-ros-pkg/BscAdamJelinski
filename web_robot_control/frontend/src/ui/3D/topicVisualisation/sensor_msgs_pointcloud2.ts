import { useTopicSubscriber } from '@/core/roslibExtensions'
import * as THREE from 'three'

export const sensor_msgs_pointcloud2 = (topicName: string, options?: any) => {
    const maxPoints = 1000000

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
        size: 0.1,
        vertexColors: true,
    })
    const object = new THREE.Points(geom, material)

    useTopicSubscriber(
        topicName,
        'sensor_msgs/msg/PointCloud2',
        (msg) => {
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

                const rainbow = (h: number) =>
                    Math.min(
                        Math.max(
                            6.0 * Math.abs(h - Math.floor(h) - 0.5) - 1.0,
                            0.0
                        ),
                        1.0
                    )

                const hue = dataview.getFloat32(base + z, littleEndian) / 10
                colors.array[3 * i] = rainbow(hue)
                colors.array[3 * i + 1] = rainbow(hue + 1.0 / 3.0)
                colors.array[3 * i + 2] = rainbow(hue + 2.0 / 3.0)
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
        },
        { compression: 'cbor', throttle_rate: 100, queue_size: 1 }
    )
    //mesh.rotateX(Math.PI)

    return object
}
