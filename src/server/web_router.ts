import express from "express"
import cp, { ChildProcess } from "child_process"

type Phase =
  { kind: "prelaunch" }
  | { kind: "launched" }

class DapClient {
  adapter: ChildProcess | null = null
  command: string | null = null
  exitCode: number | null = null
  err: unknown
  last = 0

  launch(command: string): void {
    console.log("trace: spawn", command)

    const adapter = cp.spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"] })
    this.adapter = adapter
    this.command = command
    console.log("trace: spawned, pid =", adapter.pid)

    adapter.once("exit", code => {
      console.error("trace: adapter: exit", code)
      this.exitCode = code
    })

    adapter.once("error", err => {
      console.error("error: adapter: error", err)

      this.err = err
      this.exitCode = -1
    })

    adapter.stdout.on("readable", () => {
      while (adapter.stdout.readable) {
        const chunk = adapter.stdout.read() as Buffer | null
        if (chunk == null || chunk.length === 0) {
          break
        }

        this.put(chunk)
      }
    })
  }

  put(chunk: Buffer): void {

  }

  sendInitialize(): void {
    // adapter.stdout.on("readable", () => {})

    const message = JSON.stringify({
      seq: ++this.last,
      type: "request",
      command: "initialize",
      arguments: {
        "adapterID": "adapter",
      },
    })
    const data = new TextEncoder().encode(message)
    const len = data.length
    this.adapter?.stdin?.write(`Content-Length: ${len}\r\n\r\n`)
    this.adapter?.stdin?.write(data)
  }

  terminate() {
    console.error("trace: terminate:", this.adapter?.pid)

    if (this.adapter != null) {
      this.adapter.kill()

      if (!this.adapter.killed) {
        setTimeout(() => {
          console.error("trace: killing", this.adapter?.pid)
          this.adapter?.kill("SIGKILL")
          this.adapter = null
        }, 3 * 1000)
      }
    }
  }
}

export const newRouter = (signal: AbortSignal): express.Router => {
  const router = express.Router()

  const client: DapClient = new DapClient()

  signal.addEventListener("abort", () => {
    console.error("trace: router is aborting.")
    client.terminate()
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
