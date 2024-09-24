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
import AppBar from '@/ui/components/AppBar.vue'
import AppFooter from '@/ui/components/AppFooter.vue'
</script>
