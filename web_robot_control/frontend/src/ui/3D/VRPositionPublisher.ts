import * as THREE from 'three'
import { useTopic } from '@/core/roslibExtensions'
import { RenderController } from './RenderController'
import { VRPositionPublisherConfig } from './types'

export class VRPositionPublisher {
    headsetTopic!: ReturnType<typeof useTopic>
    leftControllerTopic!: ReturnType<typeof useTopic>
    rightControllerTopic!: ReturnType<typeof useTopic>
    publishInterval: number | null = null

    renderController: RenderController
    config: VRPositionPublisherConfig

    constructor(
        renderController: RenderController,
        config: VRPositionPublisherConfig
    ) {
        this.config = config
        this.renderController = renderController

        if (!this.config.enabled || this.config.publishRate <= 0) {
            return
        }

        this.initializeTopics()
        this.startPublishing()
    }

    initializeTopics() {
        this.headsetTopic = useTopic(
            this.config.headsetTopic,
            'geometry_msgs/msg/PoseStamped'
        )
        this.leftControllerTopic = useTopic(
            this.config.leftControllerTopic,
            'geometry_msgs/msg/PoseStamped'
        )
        this.rightControllerTopic = useTopic(
            this.config.rightControllerTopic,
            'geometry_msgs/msg/PoseStamped'
        )
    }

    startPublishing() {
        if (this.publishInterval) {
            clearInterval(this.publishInterval)
        }

        this.publishInterval = setInterval(() => {
            this.publishPositions()
        }, 1000 / this.config.publishRate)
    }

    publishPositions() {
        const leftPose = this.getControllerPose(0)
        const rightPose = this.getControllerPose(1)
        if (leftPose && rightPose) {
            this.headsetTopic.value?.publish(
                this.createPoseMessage(this.renderController.camera)
            )

            this.leftControllerTopic.value?.publish(leftPose)
            this.rightControllerTopic.value?.publish(rightPose)
        }
    }

    createPoseMessage(object: THREE.Object3D) {
        const position = new THREE.Vector3()
        const quaternion = new THREE.Quaternion()

        object.getWorldPosition(position)
        object.getWorldQuaternion(quaternion)

        const transform1 = new THREE.Quaternion(),
            transform2 = new THREE.Quaternion()
        transform1.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
        transform2.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2))

        const transformedQuat = transform1
            .clone()
            .multiply(quaternion)
            .multiply(transform2)

        const now = Date.now()
        return {
            header: {
                stamp: {
                    sec: Math.floor(now / 1000),
                    nanosec: (now % 1000) * 1000000,
                },
                frame_id: this.renderController.config.tf.fixed_frame,
            },
            pose: {
                position: {
                    x: position.x,
                    y: -position.z,
                    z: position.y,
                },
                orientation: {
                    x: transformedQuat.x,
                    y: transformedQuat.y,
                    z: transformedQuat.z,
                    w: transformedQuat.w,
                },
            },
        }
    }

    getControllerPose(controllerIndex: number) {
        const controller =
            this.renderController.controllers[controllerIndex]?.controller
        return controller ? this.createPoseMessage(controller) : null
    }
}
