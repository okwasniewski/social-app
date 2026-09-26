import {test, expect} from '../fixtures/bsky.ts'

test.describe(
  'shared preferences (native module)',
  {platforms: ['ios', 'android']},
  () => {
    test.beforeEach(async ({bsky}) => {
      await bsky.start('users', 'posts', 'feeds')
      await bsky.signIn('alice')
      await bsky.press('storybookBtn')
    })

    test('stores strings, booleans, numbers and sets', async ({
      agent,
      screen,
    }) => {
      await agent.act('open the Shared Prefs Tester')
      await agent.act('set the string value')
      await expect(screen.getByText('Hello')).toBeVisible()
      await agent.act('remove the string value')
      await expect(screen.getByText('undefined')).toBeVisible()
      await agent.act('set the boolean value')
      await expect(screen.getByText('true')).toBeVisible()
      await agent.act('set the number value')
      await expect(screen.getByText('123')).toBeVisible()
      await agent.act('add the value to the set')
      await expect(screen.getByText('true')).toBeVisible()
      await agent.act('remove the value from the set')
      await expect(screen.getByText('false')).toBeVisible()
    })
  },
)
