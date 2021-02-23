import React from "react"
import ReactDOM from "react-dom"
import { ConfigPage } from "./config_page"
import { ControlPage } from "./control_page"

const Main: React.FC = () => {
  const [isLaunched, setIsLaunched] = React.useState(false)

  const onLaunch = React.useCallback(() => setIsLaunched(true), [])
  const onTerminate = React.useCallback(() => setIsLaunched(false), [])

  return (
    <>
      <header>
        <h1>デバッガー</h1>
      </header>

      <main>
        {!isLaunched ? (
          <ConfigPage onLaunch={onLaunch} />
        ) : (
            <ControlPage onTerminate={onTerminate} />
          )}
      </main>

      <footer>
        <a href="https://github.com/vain0x/debugger-web">See source code on GitHub.</a>
      </footer>
    </>
  )
}

const main = () => {
  const appContainerElement = document.getElementById("app-container") as HTMLElement

  ReactDOM.render((<Main />), appContainerElement)
}

document.addEventListener("DOMContentLoaded", main)
