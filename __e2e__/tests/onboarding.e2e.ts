import {test, expect} from '../fixtures/bsky.ts'

test.describe('onboarding', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users')
    await bsky.signIn('alice')
    await bsky.stubFilePicker()
    await bsky.press('e2eStartOnboarding')
  })

  test('completes onboarding with an uploaded avatar', async ({
    agent,
    screen,
  }) => {
    await agent.act(
      'choose "Select an avatar" to upload a picture from the library, confirm any crop step, then continue',
    )
    await expect(screen.getByText('What are your interests?')).toBeVisible()
    await agent.act('pick the interest "Animals" and continue')
    await expect(screen.getByText('Suggested for you')).toBeVisible()
    await agent.act(
      'skip the suggested accounts step, continue through the remaining screens and press the button that finishes onboarding; the dialog may show "Finalizing" for a while afterwards, that is fine',
    )
    await expect(screen.getByTestId('homeScreenFeedTabs')).toBeVisible({
      timeout: 30_000,
    })
    await expect(screen.getByText('Following').first()).toBeVisible()
  })

  test('completes onboarding with a created avatar', async ({
    agent,
    screen,
  }) => {
    await agent.act(
      'open the avatar creator, choose the zap (lightning) emoji and a yellow background, then confirm with Done',
    )
    await agent.assert(
      'the avatar preview shows a zap emoji on a yellow background',
      {vision: true},
    )
    await agent.act(
      'open "Select an avatar" again, pick the atom emoji this time, confirm with Done, then continue',
    )
    await expect(screen.getByText('What are your interests?')).toBeVisible()
    await agent.act('pick the interest "Animals" and continue')
    await expect(screen.getByText('Suggested for you')).toBeVisible()
    await agent.act(
      'skip the suggested accounts step, continue through the remaining screens and press the button that finishes onboarding; the dialog may show "Finalizing" for a while afterwards, that is fine',
    )
    await expect(screen.getByTestId('homeScreenFeedTabs')).toBeVisible({
      timeout: 30_000,
    })
  })
})
