// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
    state: () => ({
        //
    }),
})

export * from './ros'
export * from './app'
