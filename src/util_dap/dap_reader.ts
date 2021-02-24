
import { decodeUtf8, encodeUtf8 } from "./util_utf8"

class DapReader {
  buffer = Buffer.from([])

  resolve?: () => void

  extend(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    this.resolve?.()
  }

  async next(): Promise<Record<string, unknown>> {
    while (true) {
      {
        const msg = this.readNext()
        if (msg != null) {
          return msg
        }
      }

      await new Promise<void>(resolve => {
        this.resolve = resolve
      })
    }
  }

  private readNext(): Record<string, unknown> | null {
    const headerEndIndex = findIndex(this.buffer, "\r\n\r\n")
    if (headerEndIndex == null) {

      return null
    }

    const bodyIndex = headerEndIndex + 4

    const headerPart = decodeUtf8(this.buffer.slice(0, bodyIndex))

    let contentLength: number | null = null
    for (const line of headerPart.split("\r\n")) {
      let [key, value] = line.split(":").map(part => part.trim())

      if (key === "Content-Length") {
        contentLength = Number.parseInt(value)
        continue
      }

      if (key !== "") {
        warn("Unknown header.", key)
      }
    }
    if (contentLength == null) {
      throw fail("Content-Length missing.")
    }

    const bodyPart = this.buffer.slice(bodyIndex, bodyIndex + contentLength)
    const body = JSON.parse(decodeUtf8(bodyPart)) as Record<string, unknown>

    buffer = buffer.slice(bodyIndex + contentLength)

    return body
  }
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

/**
 * バッファから特定の文字列の位置を探す。
 */
const findIndex = (buffer: Buffer, patternString: string): number | null => {
  const pattern: Uint8Array = encodeUtf8(patternString)

  for (let i = 0; i + pattern.length <= buffer.length; i++) {
    const part = buffer.slice(i, i + pattern.length)
    if (part.compare(pattern) === 0) {
      return i
    }
  }
  return null
}
