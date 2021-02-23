import React from "react"

const saveCommand = (value: string) => {
  localStorage.setItem("command", value)
}

const loadCommand = (): string => localStorage.getItem("command") ?? ""

export const ConfigPage: React.FC<{ onLaunch(): void }> = props => {
  const { onLaunch } = props

  const [command, setCommand] = React.useState(loadCommand)
  const [isLaunching, setIsLaunching] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = React.useCallback((ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()

    saveCommand(command)

    setIsLaunching(true)
    fetch("/rpc/launch", {
      body: JSON.stringify({
        command,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).then(res => {
      if (!res.ok) {
        throw new Error(res.statusText)
      }
      return res.json()
    }).then(() => {
      onLaunch()
    }).catch(err => {
      setIsLaunching(false)
      console.error(err)
      setError(String(err))
    })
  }, [command])

  return (
    <>
      <form onSubmit={onSubmit}>
        <label>
          <div>起動コマンド</div>
          <input
            type="text"
            required
            value={command}
            onChange={ev => setCommand(ev.target.value)} />
        </label>

        <button disabled={isLaunching}>
          起動する
        </button>

        {isLaunching ? (
          <p>起動しています……</p>
        ) : null}

        {error != null ? (
          <div style={{ color: "red" }}>
            <div>起動できませんでした。</div>
            <pre>{error}</pre>
          </div>
        ) : null}
      </form>
    </>
  )
}
