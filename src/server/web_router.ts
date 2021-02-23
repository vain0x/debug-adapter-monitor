import express from "express"
import cp, { ChildProcess } from "child_process"

export const newRouter = (signal: AbortSignal): express.Router => {
  const router = express.Router()

  let adapterProcess: ChildProcess | null = null
  let adapterCommand: string | null = null
  let adapterError: unknown = null
  let exitCode: number | null = null

  let stderrChunk = Buffer.from([])
  let stderrChunkOffset = 0

  const terminate = () => {
    console.error("trace: terminate:", adapterProcess?.pid)

    if (adapterProcess != null) {
      adapterProcess.kill()

      if (!adapterProcess.killed) {
        setTimeout(() => {
          console.error("trace: killing", adapterProcess?.pid)
          adapterProcess?.kill("SIGKILL")
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
      adapterProcess = null
      exitCode = code
    })

    adapter.once("error", err => {
      console.error("error: adapter: error", err)

      adapterProcess = null
      exitCode = -1
      adapterError = err
    })

    adapter.stdout.on("readable", () => {
      while (adapter.stdout.readable) {
        const chunk = adapter.stderr.read() as Buffer | null
        if (chunk == null || chunk.length === 0) {
          break
        }

        stderrChunk = Buffer.concat([stderrChunk, chunk])
      }
    })

    adapter.stderr.on("readable", () => {
      while (adapter.stderr.readable ?? false) {
        const chunk = adapter.stderr.read() as Buffer | null
        if (chunk == null || chunk.length === 0) {
          break
        }

        stderrChunk = Buffer.concat([stderrChunk, chunk])
      }
    })

    res.json({}).end()
  })

  router.post("/rpc/terminate", (_req, res) => {
    terminate()
    res.json({}).end()
  })

  router.get("/rpc/status", (req, res) => {
    const stderrOffset = req.body?.["stderrOffset"] as number | null ?? 0
    if (!(typeof stderrOffset === "number" && Number.isSafeInteger(stderrOffset) && stderrOffset >= 1)) {
      res.status(400).send("Bad request. stderrOffset").end()
      return
    }

    let stderr = stderrChunk
    stderrChunk = Buffer.from([])
    stderrChunkOffset += stderr.length

    if (adapterProcess == null) {
      res.send({
        live: false,
        exitCode,
        stderr,
        stderrChunkOffset,
        err: adapterError,
      }).end()
    } else {
      res.send({
        live: true,
        command: adapterCommand,
        stderr,
        stderrChunkOffset,
      }).end()
    }
  })

  return router
}
