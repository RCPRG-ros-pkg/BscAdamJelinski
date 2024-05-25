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
        primary: colors.teal.lighten1,
        'on-primary': '#000000',
        secondary: colors.pink.base,
        trinary: colors.blueGrey.darken4,
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
