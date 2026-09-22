import {test, expect} from '../fixtures/bsky.ts'
import {stubFilePicker} from '../fixtures/media.ts'

test.describe('search and profiles', () => {
  test.beforeEach(async ({mockServer, app, testControls}) => {
    await mockServer.reset('users', 'posts', 'feeds')
    await app.open('/')
    await testControls.signIn('alice')
  })

  test('search autocomplete opens another profile', async ({
    agent,
    screen,
    web,
  }) => {
    await agent.act(
      'open Search, type "b" into the search box and pick bob.test from the suggestions',
    )
    await expect(web).toHaveURL('/profile/bob.test')
    await expect(screen.getByTestId('profileView')).toBeVisible()
    await agent.assert("bob's profile is showing, with a Follow button")
  })

  test('follows, unfollows, mutes and unmutes another user', async ({
    agent,
    screen,
    web,
  }) => {
    await agent.act("open bob.test's profile through Search")
    await expect(web).toHaveURL('/profile/bob.test')

    await agent.act('follow Bob, dismissing any prompt that appears afterwards')
    await expect(screen.getByTestId('unfollowBtn')).toBeVisible()
    await agent.act('unfollow Bob')
    await expect(screen.getByTestId('followBtn')).toBeVisible()

    await agent.act('mute Bob\'s account from the profile\'s "..." menu')
    await agent.assert('the profile says the account is muted')
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
    web,
  }) => {
    await stubFilePicker(web)
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
