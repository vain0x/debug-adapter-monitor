import React from "react"

type StatusResult =
  {
    live: true
    stderr: string
    stderrChunkOffset: number
  } | {
    live: false
    exitCode: number
    stderr: string
    stderrChunkOffset: number
    err: string
  }

type State = {
  status: string
  stderr: string
}

const INITIAL_STATE: State = {
  status: "launched",
  stderr: "",
}

type Msg =
  | { kind: "requestContinue" }
  | { kind: "requestPause" }
  | { kind: "requestTerminate" }
  | { kind: "didTerminate" }
  | { kind: "didUpdate", result: StatusResult }
  | { kind: "error", err: unknown }
  | { kind: "output", stderr: string }

const error = (err: unknown): Msg => ({ kind: "error", err })

const rpc = (path: string, body: unknown): Promise<unknown> =>
  fetch(path, {
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).then(res => {
    if (!res.ok) {
      throw new Error(res.statusText)
    }
    return res.json()
  })

export const ControlPage: React.FC<{ onTerminate(): void }> = props => {
  const { onTerminate } = props

  const ac = React.useMemo(() => new AbortController(), [])

  const dispatchAsync = React.useCallback(<T extends unknown>(p: Promise<T>, decode: (value: T) => Msg): Promise<void> => {
    return p.then(value => dispatch(decode(value)), err => dispatch(error(err)))
  }, [])

  const [state, dispatch] = React.useReducer((state: State, msg: Msg): State => {
    switch (msg.kind) {
      case "error": {
        ac.abort()
        console.error("error:", msg.err)
        alert("Something wrong")
        return { ...state, status: "error" }
      }

      case "requestContinue":
      case "requestPause":
        return state

      case "requestTerminate": {
        dispatchAsync(rpc("/rpc/terminate", {}), () => ({ kind: "didTerminate" }))
        return { ...state, status: "terminating" }
      }
      case "didTerminate": {
        ac.abort()
        onTerminate()
        return { ...state, status: "terminated" }
      }

      case "didUpdate": {
        const { result } = msg
        if (result.stderr.length !== 0) {
          state = { ...state, stderr: state.stderr + result.stderr }
        }
        if (!result.live) {
          state = { ...state, status: "exited" }
        }
        return state
      }
      default:
        return state
    }
  }, INITIAL_STATE)

  const requestTerminate = React.useCallback(() => dispatch({ kind: "requestTerminate" }), [])

  const requestContinue = React.useCallback(() => dispatch({ kind: "requestContinue" }), [])

  const requestPause = React.useCallback(() => dispatch({ kind: "requestPause" }), [])

  React.useEffect(() => {
    let timerId: any | null = null

    const go = () => {
      timerId = setTimeout(() => {
        if (!ac.signal.aborted) {
          dispatchAsync(rpc("/rpc/status", {}), result => ({
            kind: "didUpdate",
            result: result as StatusResult,
          })).then(go)
        }
      }, 1000)
    }

    go()

    return () => {
      if (timerId != null) {
        clearTimeout(timerId)
      }
    }
  }, [ac.signal.aborted])

  return (
    <>
      <form>
        <output>
          <label>状態:</label>
          <div>{state.status}</div>
        </output>

        <button type="button" onClick={requestTerminate}>■ 停止</button>

        <button type="button" onClick={requestContinue}>▶ 再開</button>
        <button type="button" onClick={requestPause}>|| 中断</button>
      </form>

      <p>
        (スレッドは未実装です。)
      </p>

      <Output output={state.stderr} />
    </>
  )
}

const Output: React.FC<{ output: string }> = props => {
  const { output } = props

  if (output.length === 0) {
    return (
      <p>
        <i>(出力はありません。)</i>
      </p>
    )
  }

  return (
    <pre>{output}</pre>
  )
}
