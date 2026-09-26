import {
  defineEngine,
  type EngineAppDeclaration,
  type EngineHandle,
} from 'e2e/engine'

/**
 * Re-declares an engine with processes the runner starts for it. `mobile()`
 * only names the app it drives; a device build still needs Metro and the
 * mock network, and the runner starts what the engine's `app` declares, so
 * the handle is rebuilt through the public `defineEngine` with `command` and
 * `services` added. Every hook stays bound to the original surface, so
 * `mobileTools(original)` keeps dispatching to it.
 */
export function withApp(
  engine: EngineHandle,
  app: Pick<EngineAppDeclaration, 'command' | 'readyUrl' | 'services'>,
): EngineHandle {
  const {capabilities: _capabilities, ...spec} = engine as EngineHandle & {
    capabilities?: unknown
  }
  return defineEngine({...spec, app: {...engine.app, ...app}})
}
