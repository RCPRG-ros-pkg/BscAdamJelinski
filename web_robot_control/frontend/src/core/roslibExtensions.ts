import { useRosStore } from '@/stores/ros'
import { Topic, Service, TFClient, ROS2TFClient, Transform } from 'roslib'
import { computed, watch } from 'vue'

import * as THREE from 'three'
import { RenderController } from '@/ui/3D/RenderController'

export const callService = (
    serviceName: string,
    serviceType: string,
    request: any
) =>
    new Promise((resolve, reject) => {
        const rosStore = useRosStore()

        if (!rosStore || !rosStore.ros) {
            reject(new Error('Not connected to ros'))
            return
        }
        const service = new Service({
            ros: rosStore.ros,
            name: serviceName,
            serviceType,
        })

        service.callService(
            request,
            (response) => {
                resolve(response)
            },
            (error) => {
                reject(new Error(error))
            }
        )
    })

export const onRosConnected = (callback: () => void) => {
    const rosStore = useRosStore()
    watch(
        () => rosStore.connected,
        () => {
            if (rosStore.connected) {
                callback()
            }
        },
        { immediate: true }
    )
}

export const onRosDisconnected = (callback: () => void) => {
    const rosStore = useRosStore()
    watch(
        () => rosStore.connected,
        () => {
            if (!rosStore.connected) {
                callback()
            }
        }
    )
}

export const useTopic = (
    topicName: string,
    messageType: string,
    options?: any
) => {
    const rosStore = useRosStore()
    const topic = computed(() => {
        if (rosStore.ros && rosStore.connected) {
            return new Topic({
                ros: rosStore.ros,
                name: topicName,
                messageType,
                ...(options || {}),
            })
        } else {
            return null
        }
    })

    return topic
}

export const useTopicSubscriber = (
    topicName: string,
    messageType: string,
    callback: (data: any) => void,
    options?: any
) => {
    const topic = useTopic(topicName, messageType, options)

    watch(
        topic,
        (newTopic, oldTopic) => {
            if (oldTopic) oldTopic.unsubscribe()
            if (newTopic) newTopic.subscribe(callback)
        },
        { immediate: true }
    )

    return topic
}

export const useTF2Pose = (
    frame_id: string | Ref<string>,
    tf2Client: TFClient | ROS2TFClient
) => {
    const currentPose = {
        position: new THREE.Vector3(),
        rotation: new THREE.Quaternion(),
    }
    const frame = typeof frame_id === 'string' ? ref(frame_id) : frame_id

    const updatePose = (tf: Transform) => {
        currentPose.position.set(
            tf.translation.x,
            tf.translation.y,
            tf.translation.z
        )
        currentPose.rotation.set(
            tf.rotation.x,
            tf.rotation.y,
            tf.rotation.z,
            tf.rotation.w
        )
    }

    watch(
        frame,
        (newFrame, oldFrame) => {
            if (oldFrame) tf2Client.unsubscribe(frame.value, updatePose)
            if (newFrame) tf2Client.subscribe(frame.value, updatePose)
        },
        { immediate: true }
    )

    return currentPose
}

export const useTF2Frame = (
    frame_id: string | Ref<string>,
    controller: RenderController
) => {
    const currentFrame = new THREE.Group()
    const frame = typeof frame_id === 'string' ? ref(frame_id) : frame_id

    const currentPose = useTF2Pose(frame, controller.tf2Client!)

    controller.frameCallbacks.push(() => {
        currentFrame.position.lerp(currentPose.position, 0.2)
        currentFrame.quaternion.slerp(currentPose.rotation, 0.2)
    })

    return currentFrame
}
