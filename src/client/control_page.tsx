import React from "react"

type State = {
  status: string
}

type Msg =
  | { kind: "requestContinue" }
  | { kind: "requestPause" }
  | { kind: "requestTerminate" }
  | { kind: "didTerminate" }
  | { kind: "error", err: unknown }

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

  const dispatchAsync = React.useCallback(<T extends unknown>(p: Promise<T>, decode: (value: T) => Msg): void => {
    p.then(value => dispatch(decode(value)), err => dispatch(error(err)))
  }, [])

  const [state, dispatch] = React.useReducer((state: State, msg: Msg) => {
    switch (msg.kind) {
      case "error": {
        console.error("error:", msg.err)
        alert("Something wrong")
        return { ...state, status: "error" }
      }
      case "requestTerminate": {
        dispatchAsync(rpc("/rpc/terminate", {}), () => ({ kind: "didTerminate" }))
        return { ...state, status: "terminating" }
      }
      case "didTerminate": {
        onTerminate()
        return { ...state, status: "terminated" }
      }
      default:
        return state
    }
  }, {
    status: "launched",
  })

  const requestTerminate = React.useCallback(() => dispatch({ kind: "requestTerminate" }), [])

  const requestContinue = React.useCallback(() => dispatch({ kind: "requestContinue" }), [])

  const requestPause = React.useCallback(() => dispatch({ kind: "requestPause" }), [])

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

      <p>
        (出力はありません。)
      </p>
    </>
  )
}
