import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tools/',
  build: {
    // Without this the minifier emits media-query range syntax (`width<=600px`), unparsable
    // on older Android WebViews and Safari below 16.4, dropping every rule inside.
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
})
