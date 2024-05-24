/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify, type ThemeDefinition } from 'vuetify'
import colors from 'vuetify/util/colors'

const dark: ThemeDefinition = {
    dark: true,
    colors: {
        primary: colors.cyan.base,
        secondary: colors.pink.base,
    },
}

export default createVuetify({
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark,
        },
    },
})
