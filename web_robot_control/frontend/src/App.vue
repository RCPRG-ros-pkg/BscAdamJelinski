<script lang="ts" setup>
import { useRosStore } from './stores/ros'

useRosStore().connect()
</script>
<template>
    <v-app>
        <router-view />
    </v-app>
</template>
