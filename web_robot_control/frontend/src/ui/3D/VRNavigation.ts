import {
    Vector3,
    BufferGeometry,
    BufferAttribute,
    LineBasicMaterial,
    AdditiveBlending,
    Line,
    XRTargetRaySpace,
    Quaternion,
    Mesh,
    MeshBasicMaterial,
    DoubleSide,
    CircleGeometry,
} from 'three'

import { RenderController } from '../3D/RenderController.js'

export class VRNavigation {
    controller: RenderController

    gravity = new Vector3(0, -9.8, 0)
    lineSegments = 20
    guideLine: Line
    guideTarget: Mesh
    lineGeometryVertices: Float32Array | undefined

    guidingController: XRTargetRaySpace | null = null

    constructor(renderController: RenderController) {
        this.controller = renderController

        this.guideLine = this.createGuideline()
        this.guideTarget = new Mesh(
            new CircleGeometry(0.1, 32),
            new MeshBasicMaterial({
                color: '#26a69a',
                side: DoubleSide,
                blending: AdditiveBlending,
            })
        )
        this.guideTarget.rotateX(-Math.PI / 2)

        for (const index of [0, 1]) {
            const controller = this.controller.controllers[index].controller
            controller.addEventListener(
                'selectstart',
                this.onSelectStart(controller)
            )
            controller.addEventListener(
                'selectend',
                this.onSelectEnd(controller)
            )
        }

        this.controller.frameCallbacks.push(this.frameCallback)
    }

    frameCallback = () => {
        if (this.guidingController) {
            const position = new Vector3(),
                velocity = new Vector3()
            this.guidingController.getWorldPosition(position)
            this.guidingController.getWorldDirection(velocity)

            velocity.multiplyScalar(6)

            const time =
                (-velocity.y +
                    Math.sqrt(
                        velocity.y ** 2 - 2 * position.y * this.gravity.y
                    )) /
                this.gravity.y

            for (let i = 1; i <= this.lineSegments; i++) {
                const vertex = this.positionAtT(
                    (i * time) / this.lineSegments,
                    position,
                    velocity
                )
                this.guidingController.worldToLocal(vertex)
                vertex.toArray(this.lineGeometryVertices!, i * 3)
            }
            this.guideLine.geometry.attributes.position.needsUpdate = true

            this.guideTarget.position.copy(
                this.positionAtT(time * 0.98, position, velocity)
            )
        }
    }

    positionAtT = (time: number, position: Vector3, velocity: Vector3) => {
        const output = new Vector3()
        output.copy(position)
        output.addScaledVector(velocity, time)
        output.addScaledVector(this.gravity, 0.5 * time ** 2)
        return output
    }

    createGuideline = () => {
        const lineGeometry = new BufferGeometry()
        this.lineGeometryVertices = new Float32Array(
            (this.lineSegments + 1) * 3
        )
        this.lineGeometryVertices.fill(0)
        lineGeometry.setAttribute(
            'position',
            new BufferAttribute(this.lineGeometryVertices, 3)
        )
        const lineMaterial = new LineBasicMaterial({
            color: '#26a69a',
            blending: AdditiveBlending,
        })
        return new Line(lineGeometry, lineMaterial)
    }

    onSelectStart =
        (controller: XRTargetRaySpace) => (event: { data: XRInputSource }) => {
            if (event!.data!.hand) {
                return
            }

            this.guidingController = controller
            this.controller.scene.add(this.guideTarget)
            controller.add(this.guideLine)
        }

    onPointStart = (controller: XRTargetRaySpace) => () => {
        this.guidingController = controller
        this.controller.scene.add(this.guideTarget)
        controller.add(this.guideLine)
    }

    onSelectEnd = (controller: XRTargetRaySpace) => () => {
        if (this.guidingController === controller) {
            const feetPosition = new Vector3()
            this.controller.renderer.xr
                .getCamera()
                .getWorldPosition(feetPosition)
            feetPosition.y = 0

            const position = new Vector3(),
                velocity = new Vector3()
            this.guidingController.getWorldPosition(position)
            this.guidingController.getWorldDirection(velocity)
            velocity.multiplyScalar(6)
            const time =
                (-velocity.y +
                    Math.sqrt(
                        velocity.y ** 2 - 2 * position.y * this.gravity.y
                    )) /
                this.gravity.y
            const cursorPos = this.positionAtT(time, position, velocity)

            const offset = cursorPos.addScaledVector(feetPosition, -1)

            this.teleport(offset)

            this.guidingController.remove(this.guideLine)
            this.guidingController = null
            this.controller.scene.remove(this.guideTarget)
        }
    }

    teleport = (origin: Vector3) => {
        const baseReferenceSpace =
            this.controller.renderer.xr.getReferenceSpace()

        const offsetPosition = {
            x: -origin.x,
            y: -origin.y,
            z: -origin.z,
            w: 1,
        }
        const offsetRotation = new Quaternion()
        const transform = new XRRigidTransform(offsetPosition, offsetRotation)
        const teleportSpaceOffset =
            baseReferenceSpace!.getOffsetReferenceSpace(transform)

        this.controller.renderer.xr.setReferenceSpace(teleportSpaceOffset)
    }
}
