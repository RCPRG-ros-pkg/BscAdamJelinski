<template>
    <v-app-bar
        :elevation="2"
        color="trinary"
    >
        <template v-slot:prepend>
            <v-app-bar-nav-icon color="primary"></v-app-bar-nav-icon>
        </template>

        <ProjectLogo />
        <v-app-bar-title style="margin-inline-start: 0px"></v-app-bar-title>

        <template v-slot:append>
            <v-app-bar-nav-icon color="primary"></v-app-bar-nav-icon>
        </template>
    </v-app-bar>
</template>

<script setup lang="ts">
import ProjectLogo from '@/ui/assets/ProjectLogo.vue'
</script>

<style scoped lang="sass"></style>
