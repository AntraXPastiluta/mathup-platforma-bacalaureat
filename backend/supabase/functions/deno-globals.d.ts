declare namespace Deno {
  const env: {
    get(name: string): string | undefined
  }

  function serve(handler: (request: Request) => Response | Promise<Response>): void
  function test(name: string, fn: () => void | Promise<void>): void
}

interface ImportMeta {
  readonly main?: boolean
}

declare module 'node:assert/strict' {
  const assert: any
  export default assert
}
