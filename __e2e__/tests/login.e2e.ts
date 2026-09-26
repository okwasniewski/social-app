import {credentials} from 'e2e'
import {PDS_URL} from '../fixtures/env.ts'
import {test, expect} from '../fixtures/bsky.ts'

test.describe('signing in', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users')
    await bsky.press('e2eOpenLoggedOutView')
  })

  test('signs in against a custom hosting provider', async ({
    agent,
    screen,
  }) => {
    const alice = credentials.user('alice')
    await agent.act(
      'sign in: choose "Sign in", change the hosting provider to the custom server {server}, then sign in as {username} with {password}',
      {
        params: {
          server: PDS_URL,
          username: alice.username,
          password: alice.password,
        },
      },
    )
    await expect(screen.getByTestId('homeScreenFeedTabs')).toBeVisible({
      timeout: 30_000,
    })
    await expect(screen.getByText('Following').first()).toBeVisible()
  })

  test('creates an account on a custom hosting provider', async ({
    agent,
    screen,
  }) => {
    await agent.act(
      'create a new account: choose "Create account", change the hosting provider to the custom server {server}, enter the email {email} and the password {password}, and continue',
      {
        params: {
          server: PDS_URL,
          email: 'example@test.com',
          password: 'hunter22',
        },
      },
    )
    await agent.act(
      'choose the handle {handle} and continue once the handle is shown as available',
      {
        params: {handle: 'e2e-test'},
      },
    )
    await expect(screen.getByText('Give your profile a face')).toBeVisible()
  })
})
