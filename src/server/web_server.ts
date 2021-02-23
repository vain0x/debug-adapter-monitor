import express from "express"
import * as path from "path"
import { AppServerContext } from "./main_core"

const DIST_DIR = path.resolve(__dirname, "../../dist")

export const startServer = (context: () => AppServerContext, signal: AbortSignal): void => {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  const staticFileHandler = express.static(DIST_DIR)
  app.use(["/", "/index.html", "/favicon.ico", "/static/*"], staticFileHandler)

  app.use((req, res, next) => {
    next()
    console.error(`${req.method} ${req.url} ${res.statusCode}`)
  })

  app.use((...args) => context().router(...args))

  const server = app.listen(8080, () => {
    console.log("info: HTTP server is ready. Visit http://localhost:8080 .")
  })

  signal.addEventListener("abort", () => server.close(), { once: true })
}
