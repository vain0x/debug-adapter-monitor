// 開発用のサーバー

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-constant-condition */
/* eslint-disable no-undef */

const chokidar = require("chokidar")
const path = require("path")

const { AbortController } = require("abortcontroller-polyfill/dist/cjs-ponyfill")

const TARGET_DIR = path.resolve(__dirname, "../../target")

const requireServerMain = (...args) =>
  require(path.join(TARGET_DIR, "server/main_core")).mainCore(...args)

const requireServerContext = (...args) =>
  require(path.join(TARGET_DIR, "server/main_core")).newServerContext(...args)

const clearModuleCaches = () => {
  for (const key of Object.keys(require.cache)) {
    if (!key.includes("node_modules")) {
      delete require.cache[key]
    }
  }
}

const main = async () => {
  const globalAc = new AbortController()
  process.once("SIGINT", () => globalAc.abort())
  process.once("SIGTERM", () => globalAc.abort())

  let current = null
  const invalidate = () => {
    if (current != null && current.ac != null) {
      current.ac.abort()
    }
    current = null
  }
  globalAc.signal.addEventListener("abort", invalidate, { once: true })

  const getContext = () => {
    if (current == null) {
      clearModuleCaches()
      const contextAc = new AbortController()
      const context = requireServerContext(contextAc.signal)
      current = { ac: contextAc, context }
    }
    return current.context
  }

  {
    const watcher = chokidar.watch(TARGET_DIR)
    globalAc.signal.addEventListener("abort", () => watcher.close(), { once: true })

    watcher.once("ready", () => {
      watcher.on("all", () => {
        invalidate()
      })
    })
  }

  {
    const retry = async (name, action) => {
      while (!globalAc.signal.aborted) {
        try {
          action()
          return
        } catch (err) {
          console.error("error: Failed to ", name, ".", err, "Retrying...")
        }
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    retry("start server", () => requireServerMain(getContext, globalAc.signal))
  }
}

main()
