import {type Device} from '@e2edev/mobile'
import {type Web} from '@e2edev/web'
import {expect, test as base, type TestAPI, type TestFixtures} from 'e2e'

import {stubWebFilePicker} from './media.ts'

const MOCK_SERVER_URL = 'http://localhost:1986/'

/** Data sets `dev-env/mock-server.ts` knows how to seed. */
export type Seed =
  'users' | 'follows' | 'posts' | 'feeds' | 'thread' | 'labels' | 'invite'

/** Accounts the mock server creates for the `users` seed that the e2e test controls can sign in. */
export type TestUser = 'alice' | 'bob'

/** Hidden 1x1 buttons `TestCtrls.e2e.tsx` renders in e2e builds (`EXPO_PUBLIC_ENV=e2e`). */
export type TestControl =
  | 'e2eSignInAlice'
  | 'e2eSignInBob'
  | 'e2eSignOut'
  | 'e2eGotoHome'
  | 'e2eGotoSettings'
  | 'e2eGotoModeration'
  | 'e2eGotoLists'
  | 'e2eGotoFeeds'
  | 'storybookBtn'
  | 'e2eRefreshHome'
  | 'e2eOpenLoggedOutView'
  | 'e2eStartOnboarding'

export interface MockServer {
  /** Restarts the mock PDS and seeds it with the named data sets. */
  reset(...seeds: Seed[]): Promise<void>
}

export interface Bsky {
  /**
   * Resets the mock network with these seeds and brings the app to its
   * signed-out start, both at once: the PDS restart and the app relaunch each
   * take a few seconds and do not depend on each other.
   */
  start(...seeds: Seed[]): Promise<void>
  /**
   * Brings the app to its signed-out start: a fresh page load on web, a
   * relaunch with cleared state on a device (what the Maestro flows did with
   * `clearState`).
   */
  open(): Promise<void>
  /** Presses one of the hidden e2e test controls. */
  press(control: TestControl): Promise<void>
  /** Signs in through the test controls and waits for the home feed. */
  signIn(user: TestUser): Promise<void>
  /** Signs out every account through the test controls. */
  signOut(): Promise<void>
  /**
   * Makes image uploads work without an OS dialog. On web every file input
   * picks a generated PNG; a device build already mocks the picker in-app
   * (`src/lib/media/picker.e2e.tsx`), so there this is a no-op.
   */
  stubFilePicker(): Promise<void>
}

/**
 * Fixtures the engines contribute. Each exists only on its own platform and
 * fails at first touch elsewhere, so a test that reaches for one carries
 * `platforms` or checks `platform` first. `test` below is typed with both so
 * one suite file serves every target.
 */
interface EngineFixtures {
  web: Web
  device: Device
}

/**
 * Restarts the mock network through the manager on :1986. Every test owns
 * its own server state, exactly like the Maestro flows did with setupServer.js.
 */
async function resetMockServer(seeds: Seed[]): Promise<void> {
  const query = seeds.length > 0 ? `?${seeds.join('&')}` : ''
  // the manager answers 500 while the previous PDS is still releasing its ports
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(`${MOCK_SERVER_URL}${query}`, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: '',
    })
    if (response.ok) return
    const detail = `${response.status} ${await response.text()}`
    if (attempt === 3) throw new Error(`mock server reset failed: ${detail}`)
    await new Promise(resolve => setTimeout(resolve, 2_000))
  }
}

function createBsky(fixtures: TestFixtures & Partial<EngineFixtures>): Bsky {
  const {app, screen, platform} = fixtures
  const isWeb = platform === 'web'

  /**
   * The test controls are 1x1 px buttons pinned to the viewport edge. A
   * device tap lands on the element's centre, so it hits them; a browser
   * pointer tap lands beside them, so the click is dispatched on the element.
   */
  const press = async (control: TestControl): Promise<void> => {
    const button = screen.getByTestId(control)
    await expect(button).toBeAttached({timeout: 30_000})
    if (!isWeb) {
      await button.tap()
      return
    }
    await fixtures.web!.evaluate((id: string) => {
      const element = document.querySelector(`[data-testid="${id}"]`)
      if (!(element instanceof HTMLElement))
        throw new Error(`test control ${id} not rendered`)
      element.click()
      return null
    }, control)
  }

  const open = async (): Promise<void> => {
    if (isWeb) await app.open('/')
    // a device attempt launches nothing on its own; this is the one launch, with a clean slate
    else await app.clearState()
  }

  return {
    async start(...seeds) {
      await Promise.all([resetMockServer(seeds), open()])
    },
    open,
    press,
    async signIn(user) {
      const control = user === 'alice' ? 'e2eSignInAlice' : 'e2eSignInBob'
      const signInButton = screen.getByRole('button', {name: 'Sign in'})
      /*
       * The hidden controls mount before the app is interactive, so a press
       * right after a relaunch can be lost. Waiting for the signed-out
       * screen's own button first means the app is ready; the press is still
       * repeated, with a short window, in case a tap lands on a transition.
       */
      await expect(signInButton.first()).toBeVisible({timeout: 30_000})
      // the launch transition is still animating when the button first shows
      await new Promise(resolve => setTimeout(resolve, 600))
      for (let attempt = 1; ; attempt += 1) {
        await press(control)
        try {
          await expect(signInButton).toHaveCount(0, {timeout: 6_000})
          break
        } catch (error) {
          if (attempt === 3) throw error
        }
      }
      const homeTabs = screen.getByTestId('homeScreenFeedTabs')
      // a fresh sign-in lands on home already; the press is for a session that did not
      if (!(await homeTabs.isVisible())) await press('e2eGotoHome')
      await expect(homeTabs).toBeVisible({timeout: 30_000})
    },
    async signOut() {
      await press('e2eSignOut')
      await expect(
        screen.getByRole('button', {name: 'Sign in'}).first(),
      ).toBeVisible({timeout: 30_000})
    },
    async stubFilePicker() {
      if (isWeb) await stubWebFilePicker(fixtures.web!)
    },
  }
}

export const test = base
  .extend<{mockServer: MockServer}>({
    mockServer: async (_fixtures, provide) => {
      await provide({reset: (...seeds) => resetMockServer(seeds)})
    },
  })
  .extend<{bsky: Bsky}>({
    bsky: async (fixtures, provide) => {
      await provide(createBsky(fixtures))
    },
  }) as unknown as TestAPI<
  TestFixtures & EngineFixtures & {mockServer: MockServer; bsky: Bsky}
>

export {expect}
