<script lang="ts" setup>
import ThreeDRenderWindow from '@/ui/windows/ThreeDRenderWindow.vue'
import WindowBorder from '@/ui/components/WindowBorder.vue'

const windowDimensions = ref({ height: 0, width: 0 })
</script>
<template>
    <div class="ma-4 margins">
        <WindowBorder
            name="3D view window"
            icon="mdi-cube-outline"
            @setDimensions="(value) => (windowDimensions = value)"
        >
            <ThreeDRenderWindow
                :windowDimensions="windowDimensions"
            ></ThreeDRenderWindow>
        </WindowBorder>
    </div>
</template>
<style lang="css" scoped>
.margins {
    height: calc(100vh - 64px - 24px - 32px);
}
</style>
