<template>
    <v-app-bar
        :elevation="2"
        color="primary"
    >
        <template v-slot:prepend>
            <v-app-bar-nav-icon></v-app-bar-nav-icon>
        </template>

        <v-app-bar-title>Application Bar</v-app-bar-title>
    </v-app-bar>
</template>

<script setup lang="ts"></script>

<style scoped lang="sass"></style>
