import {test, expect} from '../fixtures/bsky.ts'
import {homeFeedTab} from '../fixtures/home.ts'
import {expectLikes, expectReposts} from '../fixtures/posts.ts'

test.describe('home screen', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'follows', 'posts', 'feeds')
    await bsky.signIn('alice')
  })

  test('the Feeds tab leads to feed discovery until a feed is pinned', async ({
    agent,
    screen,
  }) => {
    await agent.act('open the "Feeds ✨" tab of the home screen')
    await expect(screen.getByText('Discover New Feeds')).toBeVisible()

    await agent.act(
      'go to alice\'s own profile, open its Feeds tab, open the "alice-favs" feed and pin it to home',
    )
    await agent.act('go back to the home screen')
    await expect(homeFeedTab(screen, 'alice-favs')).toBeVisible()
    await expect(homeFeedTab(screen, 'Feeds ✨')).not.toBeAttached()
  })

  test('likes and unlikes a post', async ({agent, screen, platform}) => {
    const firstPost = screen.getByTestId('feedItem-by-bob.test').first()
    await agent.act('like the post by Bob in the Following feed')
    await expectLikes(platform, firstPost, 1)
    await agent.act('remove the like from the post by Bob')
    await expectLikes(platform, firstPost, 0)
  })

  test('reposts and removes the repost', async ({agent, screen, platform}) => {
    const firstPost = screen.getByTestId('feedItem-by-bob.test').first()
    await agent.act(
      'repost the post by Bob in the Following feed (a plain repost, not a quote)',
    )
    await expectReposts(platform, firstPost, 1)
    await agent.act('undo the repost of the post by Bob')
    await expectReposts(platform, firstPost, 0)
  })

  test('deletes its own post', async ({agent, screen}) => {
    await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(1)
    await agent.act(
      'delete alice\'s own post from the Following feed using the post\'s "..." menu',
    )
    await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(0)
  })
})
