<script lang="ts" setup>
import { defineEmits, defineProps, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps(['name', 'icon'])
const emit = defineEmits(['setDimensions'])

const container = ref<HTMLDivElement | null>(null)
const resizeObserver = ref(
    new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (entry.contentRect) {
                const contentRect = Array.isArray(entry.contentRect)
                    ? entry.contentRect[0]
                    : entry.contentRect

                emit('setDimensions', {
                    height: contentRect.height,
                    width: contentRect.width,
                })
            }
        }
    })
)

onMounted(() => {
    if (container.value) {
        resizeObserver.value.observe(container.value)
    }
})
onBeforeUnmount(() => {
    if (container.value) {
        resizeObserver.value.unobserve(container.value)
    }
})
</script>
<template>
    <v-layout class="container">
        <v-sheet
            elevation="2"
            rounded
            class="background"
        >
            <v-system-bar
                color="primary"
                :absolute="false"
                height="30"
                style="position: relative"
            >
                <v-icon
                    color="trinary"
                    class="me-2"
                >
                    {{ props.icon }}
                </v-icon>
                <span class="primary--text text-truncate">
                    {{ props.name }}
                </span>
                <v-spacer></v-spacer>
            </v-system-bar>
            <div
                ref="container"
                class="content"
            >
                <slot />
            </div>
        </v-sheet>
    </v-layout>
</template>
<style scoped>
.container {
    height: inherit;
}
.background {
    width: inherit;
    flex-grow: 1;
}
.content {
    height: calc(100% - 30px);
    width: inherit;
    display: flex;
}
</style>
