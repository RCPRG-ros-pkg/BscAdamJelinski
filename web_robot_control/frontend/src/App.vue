<script lang="ts" setup>
import { useRosStore } from './stores/ros'

const rosStore = useRosStore()

onMounted(() => {
    rosStore.connect()
})

onBeforeUnmount(() => {
    rosStore.disconnect()
})
</script>
<template>
    <v-app>
        <router-view />
    </v-app>
</template>
