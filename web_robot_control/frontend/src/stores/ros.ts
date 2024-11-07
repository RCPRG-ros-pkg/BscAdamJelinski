import { Ros } from 'roslib'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useRosStore = defineStore('ros', () => {
    const address = ref(window.location.hostname)
    const port = ref(9090)
    const url = computed(() =>
        new URL(`ws://${address.value}:${port.value}`).toString()
    )

    const ros = ref<Ros>()
    const connected = ref(false)

    const topics = ref<{ [key: string]: string }>({})
    const services = ref<string[]>([])

    const reconnectTimeout = ref<number>()
    const connectionTimeout = ref<number>()

    function connect() {
        if (reconnectTimeout.value) clearTimeout(reconnectTimeout.value)
        if (connectionTimeout.value) clearTimeout(connectionTimeout.value)
        reconnectTimeout.value = undefined
        connectionTimeout.value = undefined

        if (
            ros.value &&
            ros.value.socket &&
            ros.value.socket.readyState !== WebSocket.CLOSED &&
            ros.value.socket.readyState !== WebSocket.CLOSING
        ) {
            if (ros.value.socket.url === url.value) return
            else ros.value.close()
        }

        console.log('[ROS]', 'connecting...', url.value)

        const newRos = new Ros({
            url: url.value,
        })
        connectionTimeout.value = setTimeout(() => {
            newRos.close()
        }, 4000)

        newRos.on('connection', () => {
            if (!ros.value || !ros.value.socket) return
            console.log('[ROS]', 'connected!', newRos!.socket!.url)

            connected.value = ros.value.isConnected

            ros.value.getTopics(
                (newTopics) => {
                    const result: { [key: string]: string } = {}

                    newTopics.topics.forEach((key, index) => {
                        result[key] = newTopics.types[index]
                    })
                    topics.value = result
                    console.log(topics.value)
                },
                (error) => {
                    console.warn('Cannot get topics list', error)
                    topics.value = {}
                }
            )
            ros.value.getServices(
                (newServices) => {
                    services.value = newServices
                },
                (error) => {
                    console.warn('Cannot get services', error)
                    services.value = []
                }
            )

            clearTimeout(connectionTimeout.value)
        })

        newRos.on('error', () => {
            if (!ros.value) return
            console.log('[ROS]', 'error :(', newRos!.socket!.url)

            connected.value = ros.value.isConnected

            scheduleReconnect()
        })
        newRos.on('close', () => {
            if (!ros.value) return
            console.log('[ROS]', 'closed', newRos!.socket!.url)

            connected.value = ros.value.isConnected

            scheduleReconnect()
        })

        ros.value = newRos
    }

    function scheduleReconnect() {
        if (!reconnectTimeout.value)
            reconnectTimeout.value = setTimeout(() => connect(), 1000)
    }

    return {
        ros,
        url,
        connected,
        connect,
        topics,
        services,
    }
})
