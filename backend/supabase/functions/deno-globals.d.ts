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
  interface AssertStrict {
    equal(actual: unknown, expected: unknown, message?: string): void
    deepEqual(actual: unknown, expected: unknown, message?: string): void
    match(value: string, regex: RegExp, message?: string): void
  }

  const assert: AssertStrict
  export default assert
}
