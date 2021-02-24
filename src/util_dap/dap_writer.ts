// import { debug } from "./util_logging"
import { encodeUtf8 } from "./util_utf8"

export const writeDapMessage = (out: NodeJS.WritableStream, message: unknown): void => {
  const json = JSON.stringify(message, null, 4) + "\r\n"

  const encodedJson = encodeUtf8(json)
  const contentLength = encodedJson.length

  out.write(`Content-Length: ${contentLength}\r\n\r\n`)
  out.write(encodedJson)
}
