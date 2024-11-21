<script lang="ts" setup>
import WebGL from 'three/addons/capabilities/WebGL.js'

import { RenderController } from '../3D/RenderController'

const props = defineProps(['windowDimensions'])
const width = computed<number>(() => props.windowDimensions.width)
const height = computed<number>(() => props.windowDimensions.height)

const webGLAvailable = WebGL.isWebGL2Available()

const canvas = ref<HTMLCanvasElement | undefined>()

let renderer: RenderController

onMounted(() => {
    if (canvas.value) {
        renderer = new RenderController(canvas.value, width.value, height.value)
    }
})

watch([width, height], () => {
    renderer!.updateWindowDimensions(width.value, height.value)
})
</script>
<template>
    <div>
        <canvas
            v-if="webGLAvailable"
            :width="width"
            :height="height"
            ref="canvas"
        />
        <span v-else>WebGL not available, you need a newer browser</span>
    </div>
</template>
