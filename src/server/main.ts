// 本番環境におけるサーバーのエントリーポイント

import { AppServerContext, newServerContext } from "./main_core"
import { startServer } from "./web_server"

const main = (): void => {
  const ac = new AbortController()
  process.once("SIGINT", () => ac.abort())
  process.once("SIGTERM", () => ac.abort())

  const context: AppServerContext = newServerContext(ac.signal)

  startServer(() => context, ac.signal)
}

main()
