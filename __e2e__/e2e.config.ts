import {web} from '@e2edev/web'
import {gateway} from 'ai'
import type {E2EConfig} from 'e2e'
import {createAgent} from 'e2e/agent'

import {PDS_PORT, PDS_URL} from './fixtures/env.ts'

/** Test accounts the mock server (`dev-env/mock-server.ts`) creates for `?users`. */
const TEST_USERS = ['alice', 'bob', 'carla'] as const

const APP_URL = process.env.APP_URL ?? 'http://localhost:19006'
const appEnv: Record<string, string> = {
  EXPO_PUBLIC_ENV: 'e2e',
  NODE_ENV: 'development',
  CI: '1',
  ...(process.env.E2E_PDS_PORT ? {EXPO_PUBLIC_E2E_PDS_URL: PDS_URL} : {}),
  ...(process.env.E2E_APPVIEW_DID
    ? {EXPO_PUBLIC_E2E_APPVIEW_DID: process.env.E2E_APPVIEW_DID}
    : {}),
}

export default {
  tests: ['tests/**/*.e2e.ts'],
  timeout: 240_000,
  workers: 1,
  agents: {
    default: createAgent({
      model: gateway(process.env.E2E_MODEL ?? 'openai/gpt-5.6-luna'),
      system:
        'You test the Bluesky social app. Verify a visible confirmation before completing a step. ' +
        'Close prompts and notices you did not ask for. Never sign out unless the goal says so.',
      context:
        'This is a local test network with three accounts: alice.test, bob.test and carla.test. ' +
        'The home feed shows the "Following" tab. The left sidebar holds Home, Search, Notifications, ' +
        'Chat, Feeds, Lists, Profile and Settings. The "New post" button opens the composer. ' +
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
        services: [
          {
            name: 'mock-server',
            executable: 'pnpm',
            args: ['start:external'],
            cwd: '../dev-env',
            env: {LC_ALL: 'C', E2E_PDS_PORT: PDS_PORT},
            readyUrl: 'http://localhost:1986/',
            reuseExisting: true,
            log: '.e2e/logs/mock-server.log',
          },
        ],
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
