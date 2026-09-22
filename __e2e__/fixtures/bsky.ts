import {test as base, type Web} from '@e2edev/web'
import {expect, type Screen} from 'e2e'

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

export interface TestControls {
  /** Presses one of the hidden e2e test controls. */
  press(control: TestControl): Promise<void>
  /** Signs in through the test controls and waits for the home feed. */
  signIn(user: TestUser): Promise<void>
  /** Signs out every account through the test controls. */
  signOut(): Promise<void>
}

/**
 * Restarts the mock network through the manager on :1986. Every test owns
 * its own server state, exactly like the Maestro flows did with setupServer.js.
 */
async function resetMockServer(seeds: Seed[]): Promise<void> {
  const query = seeds.length > 0 ? `?${seeds.join('&')}` : ''
  const response = await fetch(`${MOCK_SERVER_URL}${query}`, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'},
    body: '',
  })
  if (!response.ok) {
    throw new Error(
      `mock server reset failed: ${response.status} ${await response.text()}`,
    )
  }
}

/**
 * The test controls are 1x1 px buttons pinned to the viewport edge, so a real
 * pointer tap lands beside them. Dispatch the click on the element instead.
 */
function createTestControls(web: Web, screen: Screen): TestControls {
  const press = async (control: TestControl): Promise<void> => {
    await expect(screen.getByTestId(control)).toBeAttached({timeout: 30_000})
    await web.evaluate((id: string) => {
      const element = document.querySelector(`[data-testid="${id}"]`)
      if (!(element instanceof HTMLElement))
        throw new Error(`test control ${id} not rendered`)
      element.click()
      return null
    }, control)
  }
  return {
    press,
    async signIn(user) {
      await press(user === 'alice' ? 'e2eSignInAlice' : 'e2eSignInBob')
      await expect(screen.getByRole('button', {name: 'Sign in'})).toHaveCount(
        0,
        {timeout: 30_000},
      )
      await press('e2eGotoHome')
      await expect(screen.getByTestId('homeScreenFeedTabs')).toBeVisible({
        timeout: 30_000,
      })
    },
    async signOut() {
      await press('e2eSignOut')
      await expect(
        screen.getByRole('button', {name: 'Sign in'}).first(),
      ).toBeVisible({timeout: 30_000})
    },
  }
}

export const test = base
  .extend<{mockServer: MockServer}>({
    mockServer: async (_fixtures, provide) => {
      await provide({reset: (...seeds) => resetMockServer(seeds)})
    },
  })
  .extend<{testControls: TestControls}>({
    testControls: async ({web, screen}, provide) => {
      await provide(createTestControls(web, screen))
    },
  })

export {expect}
