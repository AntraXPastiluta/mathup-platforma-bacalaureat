export type EnvSource = Record<string, string | undefined> | { get(name: string): string | undefined } | undefined

export function readEnv(name: string, envSource?: EnvSource) {
  if (!envSource) return Deno.env.get(name)
  if ('get' in envSource && typeof envSource.get === 'function') {
    return envSource.get(name)
  }
  return (envSource as Record<string, string | undefined>)[name]
}
