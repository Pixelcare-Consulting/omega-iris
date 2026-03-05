/**
 *  custom server for deploying next.js app to (Internet Information Service) IIS
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 80
const app = next({ dev })
const handle = app.getRequestHandler()

//* NOTE: Add also the HTTP_X_FORWARDED_FOR, HTTP_X_FORWARDED_PROTO, HTTP_X_FORWARDED_HOST and their values in server server variables in IIS URL Rewrite in web.config
app.prepare().then(() => {
  createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true)
    const { pathname, query } = parsedUrl

    if (pathname === '/a') {
      app.render(req, res, '/a', query)
    } else if (pathname === '/b') {
      app.render(req, res, '/b', query)
    } else {
      handle(req, res, parsedUrl)
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, (err) => {
      if (err) throw err
      console.log(`> Ready on http://localhost:${port}`)
    })
})
