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
    Euler,
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

    grabbedControllers: [boolean, boolean] = [false, false]
    lastGrabbingPose: {
        midpoint: Vector3
        difference: Vector3
        distance: number
    } | null = null

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

            controller.addEventListener(
                'squeezestart',
                this.onSquezeStart(controller, index)
            )
            controller.addEventListener(
                'squeezeend',
                this.onSquezeEnd(controller, index)
            )
        }

        this.controller.frameCallbacks.push(this.frameCallback)
    }

    frameCallback = () => {
        if (this.guidingController) {
            const position = new Vector3(),
                velocity = new Vector3(),
                floorPosition = new Vector3()
            this.guidingController.getWorldPosition(position)
            this.guidingController.getWorldDirection(velocity)
            this.controller.cameraGroup.getWorldPosition(floorPosition)

            velocity.multiplyScalar(6)

            const time = this.throwTime(position, velocity, floorPosition)

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
            this.guideTarget.scale.setScalar(
                this.controller.cameraGroup.scale.x
            )
        }
        if (
            this.grabbedControllers[0] &&
            this.grabbedControllers[1] &&
            this.lastGrabbingPose
        ) {
            const position1 = new Vector3(),
                position2 = new Vector3()
            this.controller.controllers[0].controller.getWorldPosition(
                position1
            )
            this.controller.controllers[1].controller.getWorldPosition(
                position2
            )

            const midpoint = new Vector3()
                .addVectors(position1, position2)
                .divideScalar(2)
            const difference = new Vector3()
                .subVectors(position1, position2)
                .normalize()
            const distance = new Vector3()
                .subVectors(position1, position2)
                .length()

            const offsetPosition = new Vector3().subVectors(
                this.lastGrabbingPose.midpoint,
                midpoint
            )
            const offsetRotationRaw = new Quaternion().setFromUnitVectors(
                difference,
                this.lastGrabbingPose.difference
            )
            const offsetYaw = new Euler().setFromQuaternion(offsetRotationRaw).y

            const offsetRotation = new Quaternion()
            offsetRotation.setFromEuler(new Euler(0, offsetYaw, 0))
            /*
            offsetRotation.set(
                offsetRotationRaw.x,
                offsetRotationRaw.y,
                offsetRotationRaw.z,
                offsetRotationRaw.w
            )
                */

            this.controller.cameraGroup.scale.multiplyScalar(
                this.lastGrabbingPose.distance / distance
            )
            this.teleport(offsetPosition, offsetRotation)
        }
    }

    throwTime = (
        position: Vector3,
        velocity: Vector3,
        floorPosition: Vector3
    ) => {
        return (
            (-velocity.y +
                Math.sqrt(
                    velocity.y ** 2 -
                        2 * (position.y - floorPosition.y) * this.gravity.y
                )) /
            this.gravity.y
        )
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

            const position = new Vector3(),
                velocity = new Vector3(),
                floorPosition = new Vector3()
            this.guidingController.getWorldPosition(position)
            this.guidingController.getWorldDirection(velocity)
            this.controller.cameraGroup.getWorldPosition(floorPosition)
            feetPosition.y = floorPosition.y
            velocity.multiplyScalar(6)

            const time = this.throwTime(position, velocity, floorPosition)
            const cursorPos = this.positionAtT(time, position, velocity)

            const offset = cursorPos.addScaledVector(feetPosition, -1)

            this.teleport(offset)

            this.guidingController.remove(this.guideLine)
            this.guidingController = null
            this.controller.scene.remove(this.guideTarget)
        }
    }

    onSquezeStart = (controller: XRTargetRaySpace, index: number) => () => {
        this.grabbedControllers[index] = true

        if (this.grabbedControllers[0] && this.grabbedControllers[1]) {
            const position1 = new Vector3(),
                position2 = new Vector3()
            this.controller.controllers[0].controller.getWorldPosition(
                position1
            )
            this.controller.controllers[1].controller.getWorldPosition(
                position2
            )

            const midpoint = new Vector3()
                .addVectors(position1, position2)
                .divideScalar(2)
            const difference = new Vector3()
                .subVectors(position1, position2)
                .normalize()
            const distance = new Vector3()
                .subVectors(position1, position2)
                .length()

            this.lastGrabbingPose = { midpoint, difference, distance }
        }
    }
    onSquezeEnd = (controller: XRTargetRaySpace, index: number) => () => {
        this.grabbedControllers[index] = false
    }

    teleport = (offset: Vector3, offsetRotation?: Quaternion) => {
        this.controller.cameraGroup.applyQuaternion(
            offsetRotation || new Quaternion()
        )
        this.controller.cameraGroup.position.add(offset)
    }
}
