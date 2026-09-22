import {test, expect} from '../fixtures/bsky.ts'

test.describe('home screen', () => {
  test.beforeEach(async ({mockServer, app, testControls}) => {
    await mockServer.reset('users', 'follows', 'posts', 'feeds')
    await app.open('/')
    await testControls.signIn('alice')
  })

  test('the Feeds tab leads to feed discovery until a feed is pinned', async ({
    agent,
    screen,
  }) => {
    await agent.act('open the "Feeds ✨" tab of the home screen')
    await agent.assert('the page invites the user to discover new feeds')
    await expect(screen.getByText('Discover New Feeds')).toBeVisible()

    await agent.act(
      'go to alice\'s own profile, open its Feeds tab, open the "alice-favs" feed and pin it to home',
    )
    await agent.act('go back to the home screen')
    await expect(
      screen.getByTestId('homeScreenFeedTabs-alice-favs'),
    ).toBeVisible()
    await expect(
      screen.getByTestId('homeScreenFeedTabs-Feeds ✨'),
    ).not.toBeAttached()
  })

  test('likes and unlikes a post', async ({agent, screen}) => {
    const firstPost = screen.getByTestId('feedItem-by-bob.test').first()
    await agent.act('like the post by Bob in the Following feed')
    await expect(firstPost.getByTestId('likeCount')).toHaveText('1')
    await agent.act('remove the like from the post by Bob')
    await expect(firstPost.getByTestId('likeCount')).not.toBeAttached()
  })

  test('reposts and removes the repost', async ({agent, screen}) => {
    const firstPost = screen.getByTestId('feedItem-by-bob.test').first()
    await agent.act(
      'repost the post by Bob in the Following feed (a plain repost, not a quote)',
    )
    await expect(firstPost.getByTestId('repostCount')).toHaveText('1')
    await agent.act('undo the repost of the post by Bob')
    await expect(firstPost.getByTestId('repostCount')).not.toBeAttached()
  })

  test('deletes its own post', async ({agent, screen}) => {
    await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(1)
    await agent.act(
      'delete alice\'s own post from the Following feed using the post\'s "..." menu',
    )
    await agent.assert('no post by alice remains in the feed')
    await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(0)
  })
})
