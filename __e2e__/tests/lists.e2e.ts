import {test, expect} from '../fixtures/bsky.ts'
import {homeFeedTab} from '../fixtures/home.ts'

test.describe('user lists', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'follows', 'posts')
    await bsky.signIn('alice')
    await bsky.press('e2eGotoLists')
  })

  test('creates, edits and deletes a list', async ({agent, screen}) => {
    await agent.act(
      'create a new user list named {name} with the description {description}',
      {
        params: {name: 'Good Ppl', description: 'They good'},
      },
    )
    await expect(screen.getByTestId('headerTitle')).toHaveText('Good Ppl')
    await expect(screen.getByText('They good').first()).toBeAttached()

    await agent.act(
      'edit the list details: rename it to {name} and change the description to {description}, then save',
      {
        params: {name: 'Bad Ppl', description: 'They bad'},
      },
    )
    await expect(screen.getByTestId('headerTitle')).toHaveText('Bad Ppl')
    await expect(screen.getByText('They bad').first()).toBeAttached()

    await agent.act(
      'edit the list details and clear the description completely, then save',
    )
    await expect(screen.getByText('They bad')).not.toBeAttached()

    await agent.act('delete this list and confirm the deletion')
    await expect(screen.getByTestId('newUserListBtn')).toBeVisible()
    await expect(screen.getByText('Bad Ppl')).not.toBeAttached()
  })

  test('adds people to a list and pins it to home', async ({
    agent,
    screen,
    bsky,
  }) => {
    await agent.act(
      'create a new user list named {name} with the description {description}',
      {
        params: {name: 'Good Ppl', description: 'They good'},
      },
    )
    await agent.act(
      'add the user bob.test to this list, searching for "b" in the add-people dialog, then close the dialog',
    )
    await agent.act('open the People tab of the list')
    await expect(screen.getByTestId('profileCard-bob.test-link')).toBeVisible()

    await agent.act('open the Posts tab of the list')
    await expect(
      screen
        .getByTestId('listFeed-flatlist')
        .getByTestId('feedItem-by-bob.test')
        .first(),
    ).toBeAttached()

    await agent.act('pin this list to home')
    await bsky.press('e2eGotoHome')
    await agent.act('open the "Good Ppl" tab of the home feed')
    await expect(
      screen
        .getByTestId('customFeedPage-feed-flatlist')
        .getByTestId('feedItem-by-bob.test')
        .first(),
    ).toBeAttached()

    await bsky.press('e2eGotoFeeds')
    await agent.act('open the saved feed "Good Ppl"')
    await expect(
      screen
        .getByTestId('listFeed-flatlist')
        .getByTestId('feedItem-by-bob.test')
        .first(),
    ).toBeAttached()
    await agent.act('unpin this feed from home')
    await bsky.press('e2eGotoHome')
    await expect(homeFeedTab(screen, 'Good Ppl')).not.toBeAttached()
  })

  test('adds a user to a list from their profile', async ({agent, screen}) => {
    await agent.act(
      'create a new user list named {name} with the description {description}',
      {
        params: {name: 'Good Ppl', description: 'They good'},
      },
    )
    await agent.act("open bob.test's profile through Search")
    await expect(screen.getByTestId('profileView')).toBeVisible()

    await agent.act(
      'open the profile\'s "..." menu, choose "Add to Lists", add Bob to the "Good Ppl" list and close the dialog',
    )
    await expect(
      screen.getByTestId('userAddRemoveListsDialog'),
    ).not.toBeAttached()
    await agent.act(
      'open "Add to Lists" again and remove Bob from the "Good Ppl" list, then close the dialog',
    )
    await expect(
      screen.getByTestId('userAddRemoveListsDialog'),
    ).not.toBeAttached()
  })
})

test.describe('moderation lists', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'follows', 'labels')
    await bsky.signIn('alice')
    await bsky.press('e2eGotoModeration')
  })

  test('creates a moderation list and subscribes to it', async ({
    agent,
    screen,
  }) => {
    await agent.act(
      'open Moderation lists and create a new list named {name} with the description {description}',
      {
        params: {name: 'Muted Users', description: 'Shhh'},
      },
    )
    await expect(screen.getByTestId('headerTitle')).toHaveText('Muted Users')
    await expect(screen.getByText('Shhh').first()).toBeAttached()

    await agent.act('subscribe to this list so it mutes the accounts on it')
    await expect(screen.getByRole('button', {name: 'Unmute'})).toBeVisible()
    await agent.act('unmute the list')

    await agent.act('subscribe to this list so it blocks the accounts on it')
    await expect(screen.getByRole('button', {name: 'Unblock'})).toBeVisible()
    await agent.act('unblock the list')
    await expect(
      screen.getByRole('button', {name: 'Subscribe to this list'}),
    ).toBeVisible()
  })
})
