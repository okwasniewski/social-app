import {mobile} from '@e2edev/mobile'
import {mobileTools} from '@e2edev/mobile/tools'
import {web} from '@e2edev/web'
import {gateway} from 'ai'
import {type CommandConfig, type E2EConfig, type ServiceConfig} from 'e2e'
import {createAgent} from 'e2e/agent'

import {withApp} from './fixtures/engine.ts'
import {PDS_PORT, PDS_URL} from './fixtures/env.ts'

/** Test accounts the mock server (`dev-env/mock-server.ts`) creates for `?users`. */
const TEST_USERS = ['alice', 'bob', 'carla'] as const

/** Bundle id on iOS and package name on Android. */
const APP_ID = 'xyz.blueskyweb.app'

const APP_URL = process.env.APP_URL ?? 'http://localhost:19006'
const METRO_PORT = process.env.E2E_METRO_PORT ?? '8081'
const METRO_STATUS_URL = `http://localhost:${METRO_PORT}/status`

const appEnv: Record<string, string> = {
  EXPO_PUBLIC_ENV: 'e2e',
  NODE_ENV: 'development',
  CI: '1',
  ...(process.env.E2E_PDS_PORT ? {EXPO_PUBLIC_E2E_PDS_URL: PDS_URL} : {}),
  ...(process.env.E2E_APPVIEW_DID
    ? {EXPO_PUBLIC_E2E_APPVIEW_DID: process.env.E2E_APPVIEW_DID}
    : {}),
}

/* Metro resolves the `*.e2e.ts(x)` overrides through RN_SRC_EXT; webpack reads EXPO_PUBLIC_ENV. */
const nativeEnv: Record<string, string> = {
  ...appEnv,
  RN_SRC_EXT: 'e2e.ts,e2e.tsx',
}

const mockServer: ServiceConfig = {
  name: 'mock-server',
  executable: 'pnpm',
  args: ['start:external'],
  cwd: '../dev-env',
  env: {LC_ALL: 'C', E2E_PDS_PORT: PDS_PORT},
  readyUrl: 'http://localhost:1986/',
  reuseExisting: true,
  log: '.e2e/logs/mock-server.log',
}

/**
 * A Release build embeds its JavaScript and needs no Metro; set
 * E2E_RELEASE_BUILD=1 when the installed app is one (`pnpm e2e:build:release`).
 */
const RELEASE_BUILD = process.env.E2E_RELEASE_BUILD === '1'

/** The dev server a development build loads its JavaScript from. */
const metro: CommandConfig = {
  executable: 'pnpm',
  args: ['exec', 'expo', 'start', '--dev-client', '--port', METRO_PORT],
  cwd: '..',
  env: nativeEnv,
  reuseExisting: true,
  startupTimeout: 300_000,
  log: '.e2e/logs/metro.log',
}

/**
 * The Android emulator reaches the host through 10.0.2.2, while the app and
 * Metro use localhost; `adb reverse` maps the ports back, exactly as the
 * Maestro runner did.
 */
function adbReverse(port: string): ServiceConfig {
  return {
    name: `adb-reverse-${port}`,
    executable: 'adb',
    args: ['reverse', `tcp:${port}`, `tcp:${port}`],
    waitForExit: true,
  }
}

/*
 * Devices relaunch the app before every attempt, and the two device options
 * come straight from the environment: E2E_IOS_APP_PATH / E2E_ANDROID_APP_PATH
 * install a build once per worker (a local `pnpm e2e:build` installs it
 * already), E2E_IOS_DEVICE / E2E_ANDROID_DEVICE pick a simulator or emulator
 * over whatever is booted.
 */
const ios = mobile({
  platform: 'ios',
  app: APP_ID,
  appPath: process.env.E2E_IOS_APP_PATH,
  device: process.env.E2E_IOS_DEVICE,
  settle: 100,
  transition: 700,
})
const android = mobile({
  platform: 'android',
  app: APP_ID,
  appPath: process.env.E2E_ANDROID_APP_PATH,
  device: process.env.E2E_ANDROID_DEVICE,
  settle: 100,
  transition: 700,
})

export default {
  tests: ['tests/**/*.e2e.ts'],
  timeout: 240_000,
  // a locator that never resolves fails here instead of at the test deadline
  actionTimeout: 15_000,
  /* A device snapshot can trip the runner's watchdog on a heavy screen; one retry covers that. */
  retries: 1,
  workers: 1,
  agents: {
    default: createAgent({
      /*
       * gpt-6-luna-fast was measured 30% slower per step here (52s vs 40s on
       * the composer steps, same call count): the inputs are large
       * accessibility trees, so input processing dominates. E2E_MODEL overrides.
       */
      model: gateway(process.env.E2E_MODEL ?? 'openai/gpt-5.6-luna'),
      tools: mobileTools(ios, android),
      system:
        'You test the Bluesky social app. Verify a visible confirmation before completing a step. ' +
        'Close prompts and notices you did not ask for. Never sign out unless the goal says so. ' +
        'Never press the small unlabeled buttons whose test id starts with "e2e" or is "storybookBtn": ' +
        'they belong to the test harness.',
      context:
        'This is a local test network with three accounts: alice.test, bob.test and carla.test. ' +
        'The home feed shows the "Following" tab. ' +
        'On web the left sidebar holds Home, Search, Notifications, Chat, Feeds, Lists, Profile and Settings, ' +
        'and the "New post" button opens the composer. ' +
        'On iOS and Android the bottom tab bar holds Home, Search, Chat, Notifications and Profile; ' +
        'Feeds, Lists, Moderation and Settings are in the drawer that opens from the avatar at the top left ' +
        'of the home screen, and the round pencil button at the bottom right opens the composer. ' +
        'A post row has Reply, Repost, Like and a "..." (more) button. Search is limited to profile autocomplete.',
    }),
  },
  targets: [
    {
      name: 'web',
      engine: web({
        url: APP_URL,
        viewport: {width: 1280, height: 900},
        command: {
          executable: 'pnpm',
          args: ['exec', 'expo', 'start', '--web'],
          cwd: '..',
          env: appEnv,
          reuseExisting: true,
          startupTimeout: 300_000,
          log: '.e2e/logs/web.log',
        },
        services: [mockServer],
      }),
    },
    {
      name: 'ios',
      engine: withApp(ios, {
        ...(RELEASE_BUILD ? {} : {command: metro, readyUrl: METRO_STATUS_URL}),
        services: [mockServer],
      }),
    },
    {
      name: 'android',
      engine: withApp(android, {
        ...(RELEASE_BUILD ? {} : {command: metro, readyUrl: METRO_STATUS_URL}),
        services: [mockServer, adbReverse(PDS_PORT), adbReverse(METRO_PORT)],
      }),
    },
  ],
  credentials: Object.fromEntries(
    TEST_USERS.map(name => [
      name,
      {username: `${name}.test`, password: 'hunter2'},
    ]),
  ),
} satisfies E2EConfig
