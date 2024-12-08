import { useRosStore } from '@/stores/ros'
import { Topic, Service } from 'roslib'
import { computed, watch } from 'vue'

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
        }
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
            console.log(newTopic, oldTopic)
            if (oldTopic) oldTopic.unsubscribe()
            if (newTopic) newTopic.subscribe(callback)
        },
        { immediate: true }
    )

    return topic
}
