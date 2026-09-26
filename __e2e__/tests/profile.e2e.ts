import {test, expect} from '../fixtures/bsky.ts'

test.describe('search and profiles', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'posts', 'feeds')
    await bsky.signIn('alice')
  })

  test('search autocomplete opens another profile', async ({agent, screen}) => {
    await agent.act(
      'open Search, type "b" into the search box and pick bob.test from the suggestions',
    )
    await expect(screen.getByTestId('profileView')).toBeVisible()
    await expect(screen.getByText(/@bob\.test/).first()).toBeVisible()
    await expect(screen.getByTestId('followBtn')).toBeVisible()
  })

  test('follows, unfollows, mutes and unmutes another user', async ({
    agent,
    screen,
  }) => {
    await agent.act("open bob.test's profile through Search")
    await expect(screen.getByTestId('profileView')).toBeVisible()
    await expect(screen.getByText(/@bob\.test/).first()).toBeVisible()

    await agent.act('follow Bob, dismissing any prompt that appears afterwards')
    await expect(screen.getByTestId('unfollowBtn')).toBeVisible()
    await agent.act('unfollow Bob')
    await expect(screen.getByTestId('followBtn')).toBeVisible()

    await agent.act('mute Bob\'s account from the profile\'s "..." menu')
    await expect(screen.getByText('Account Muted')).toBeVisible()
    await agent.act('unmute Bob\'s account from the profile\'s "..." menu')
    await expect(screen.getByText('Account Muted')).not.toBeAttached()
  })

  test('edits and clears the display name and description', async ({
    agent,
    screen,
  }) => {
    await agent.act(
      'open your own profile and open the Edit profile dialog, then cancel it without changes',
    )
    await expect(screen.getByTestId('editProfileModal')).not.toBeAttached()

    await agent.act(
      'edit your profile: set the display name to {name} and the description to {description}, then save',
      {
        params: {name: 'Alicia', description: 'One cool hacker'},
      },
    )
    await expect(screen.getByTestId('editProfileModal')).not.toBeAttached()
    await expect(screen.getByTestId('profileHeaderDisplayName')).toHaveText(
      'Alicia',
    )
    await expect(screen.getByText('One cool hacker')).toBeVisible()

    await agent.act(
      'edit your profile again: clear both the display name and the description, then save',
    )
    await expect(screen.getByTestId('profileHeaderDisplayName')).toContainText(
      'alice.test',
    )
    await expect(screen.getByText('One cool hacker')).not.toBeAttached()
  })

  test('uploads and removes the avatar and banner', async ({
    agent,
    screen,
    bsky,
  }) => {
    await bsky.stubFilePicker()
    await agent.act('open your own profile')
    await expect(screen.getByTestId('userBannerFallback')).toBeVisible()

    await agent.act(
      'edit your profile: upload a new banner and a new avatar from the library, confirm any crop step, then save the profile',
    )
    await expect(screen.getByTestId('editProfileModal')).not.toBeAttached()
    await expect(screen.getByTestId('userBannerImage')).toBeVisible()

    await agent.act(
      'edit your profile: remove the banner and remove the avatar, then save',
    )
    await expect(screen.getByTestId('userBannerFallback')).toBeVisible()
  })
})
