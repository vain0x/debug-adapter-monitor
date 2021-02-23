import express from "express"
import cp, { ChildProcess } from "child_process"

export const newRouter = (signal: AbortSignal): express.Router => {
  const router = express.Router()

  let adapterProcess: ChildProcess | null = null
  let adapterCommand: string | null = null
  let adapterError: unknown = null
  let exitCode: number | null = null

  let stderrBuffer = Buffer.from([])

  const terminate = () => {
    console.error("trace: terminate:", adapterProcess?.pid)

    if (adapterProcess != null) {
      adapterProcess.kill()

      if (!adapterProcess.killed) {
        setTimeout(() => {
          console.error("trace: killing", adapterProcess?.pid)
          adapterProcess?.kill("SIGKILL")
          adapterProcess = null
        }, 3 * 1000)
      }
    }
  }

  signal.addEventListener("abort", () => {
    console.error("trace: router is aborting.")
    terminate()
  }, { once: true })

  router.post("/rpc/launch", (req, res) => {
    const body = req.body as Record<string, unknown>
    const command = body["command"]

    if (!(typeof command === "string" && command !== "")) {
      res.status(400).send("Bad command.")
      return
    }

    if (adapterProcess != null) {
      res.status(500).send("Already launched.")
      return
    }

    console.log("trace: spawn", command)
    const adapter = cp.spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"] })
    adapterCommand = command
    adapterProcess = adapter
    console.log("trace: spawned, pid =", adapter.pid)

    adapter.once("exit", code => {
      console.error("trace: adapter: exit", code)
      exitCode = code
    })

    adapter.once("error", err => {
      console.error("error: adapter: error", err)

      exitCode = -1
      adapterError = err
    })

    // adapter.stdout.on("readable", () => {})

    adapter.stderr.once("readable", () => {
      while (adapter.stderr.readable) {
        const chunk = adapterProcess?.stderr?.read() as Buffer | null
        console.log("chunk", chunk != null, chunk?.length)
        if (chunk == null || chunk.length) {
          return
        }

        stderrBuffer = Buffer.concat([stderrBuffer, chunk])
      }
    })

    res.json({}).end()

    {
      const message = JSON.stringify({
        "adapterID": "adapter",
      })
      const data = new TextEncoder().encode(message)
      const len = data.length
      adapter.stdin.write(`Content-Length: ${len}\r\n\r\n`)
      adapter.stdin.write(data)
    }
  })

  router.post("/rpc/terminate", (_req, res) => {
    terminate()
    res.json({}).end()
  })

  // long-polling
  router.post("/rpc/status", (req, res) => {
    if (adapterProcess == null) {
      // 起動するのを待つ？
      setTimeout(() => {
        res.json({
          live: false,
          exitCode: null,
          stderr: "",
          err: null,
        }).end()
      }, 1000)
      return
    }

    const adapterStderr = adapterProcess.stderr
    const attach = (): void => {
      adapterStderr?.once("readable", onReadable)
      adapterStderr?.once("close", onClose)
    }
    const detach = (): void => {
      adapterStderr?.removeListener("readable", onReadable)
      adapterStderr?.removeListener("close", onClose)
    }

    const onReadable = () => {
      detach()
      console.log("on readable?", adapterProcess?.stderr?.readable ?? false)
      if (adapterProcess?.stderr?.readable ?? false) {
        const chunk = adapterProcess?.stderr?.read() as Buffer | null
        console.log("read:", chunk)

        res.json({
          live: adapterProcess != null,
          stderr: chunk?.toString() ?? "",
        })
      }
    }

    const onClose = () => {
      detach()
      res.json({
        live: adapterProcess != null,
        stderr: "",
      }).end()
    }

    console.log("readable?", adapterProcess?.stderr?.readable ?? false)
    if (adapterProcess?.stderr?.readable ?? false) {
      onReadable()
      return
    }

    attach()
  })

  return router
}
