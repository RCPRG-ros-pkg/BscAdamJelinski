<template>
    <v-app>
        <AppBar />

        <v-main>
            <router-view />
        </v-main>

        <AppFooter />
    </v-app>
</template>

<script lang="ts" setup>
import AppBar from '@/components/AppBar.vue'
</script>
