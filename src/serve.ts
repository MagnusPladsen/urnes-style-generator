import index from '../web/index.html'

Bun.serve({
  port: 3000,
  routes: {
    '/': index,
  },
  development: {
    hmr: true,
    console: true,
  },
})

console.log('Urnes Style Generator running at http://localhost:3000')
