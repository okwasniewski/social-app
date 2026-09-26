import {test, expect} from '../fixtures/bsky.ts'
import {COMPOSER_HINT} from '../fixtures/hints.ts'
import {expectLikes, expectReposts} from '../fixtures/posts.ts'

test.describe('thread screen', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'follows', 'thread')
    await bsky.signIn('alice')
  })

  test('likes and reposts the root post and a reply', async ({
    agent,
    screen,
    platform,
  }) => {
    await agent.act(
      'open the thread of the post "Thread root" from the Following feed',
    )
    const root = screen.getByTestId('postThreadItem-by-bob.test')
    const reply = screen.getByTestId('postThreadItem-by-carla.test')
    await expect(reply.getByText('Thread reply')).toBeVisible()

    await agent.act('like the root post "Thread root" by Bob')
    await expect(screen.getByText('1 like')).toBeVisible()
    await agent.act('remove your like from the root post by Bob')
    await expect(screen.getByText('1 like')).not.toBeAttached()

    await agent.act(
      'like the reply "Thread reply" by Carla, then remove that like again',
    )
    await expectLikes(platform, reply, 0)

    await agent.act(
      'repost the root post by Bob (a plain repost, not a quote post)',
    )
    await expect(screen.getByTestId('repostCount-expanded')).toBeVisible()
    await agent.act('undo the repost of the root post by Bob')
    await expect(screen.getByTestId('repostCount-expanded')).not.toBeAttached()

    await agent.act(
      'repost the reply by Carla (a plain repost, not a quote post)',
    )
    await expectReposts(platform, reply, 1)
    await agent.act('undo the repost of the reply by Carla')
    await expectReposts(platform, reply, 0)
    await expect(root).toBeVisible()
  })
})

/* Four account switches and eight agent steps: this flow needs more than the default deadline. */
test.describe(
  'thread muting',
  {agentContext: COMPOSER_HINT, timeout: 600_000},
  () => {
    test.beforeEach(async ({bsky}) => {
      await bsky.start('users', 'follows')
      await bsky.signIn('alice')
    })

    test('a muted thread stops producing notifications', async ({
      agent,
      screen,
      bsky,
    }) => {
      await agent.act('publish a new post with the text {text}', {
        params: {text: 'Test thread'},
      })
      await expect(screen.getByTestId('feedItem-by-alice.test')).toBeVisible()
      await expect(screen.getByText('Test thread').first()).toBeVisible()

      await bsky.signOut()
      await bsky.signIn('bob')
      await agent.act(
        'reply to alice\'s post "Test thread" with {text}; the composer closing means the reply was sent, the feed may not show it right away',
        {params: {text: 'Reply 1'}},
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await bsky.signOut()
      await bsky.signIn('alice')
      await agent.act(
        'open Notifications and open the notification about the reply "Reply 1"',
      )
      await expect(
        screen.getByTestId('postThreadItem-by-bob.test'),
      ).toBeVisible()
      await agent.act(
        'mute this thread from the "..." menu of Bob\'s reply; toasts are disabled in this build, so afterwards open that menu again, check it now offers "Unmute thread", and close it without choosing anything',
      )

      await bsky.signOut()
      await bsky.signIn('bob')
      await agent.act(
        'open your own profile, switch to the Replies tab, and reply to the thread root "Test thread" by alice with {text}; the composer closing means the reply was sent, the list may take a while to show it',
        {
          params: {text: 'Reply 2'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })
      await agent.act(
        'reply to the thread root "Test thread" by alice once more, with {text}; the composer closing means the reply was sent, the list may take a while to show it',
        {
          params: {text: 'Reply 3'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await bsky.signOut()
      await bsky.signIn('alice')
      await agent.act('open Notifications')
      await expect(screen.getByTestId('notifsFeed').first()).toBeVisible()
      await expect(screen.getByText('Reply 1').first()).toBeVisible()
      await expect(screen.getByText('Reply 2')).not.toBeAttached()
      await expect(screen.getByText('Reply 3')).not.toBeAttached()

      await agent.act(
        'open the notification about "Reply 1" and unmute the thread from the "..." menu of Bob\'s reply',
      )
      await agent.act('go back to Notifications and refresh the list')
      await expect(screen.getByText('Reply 1').first()).toBeVisible()
      await expect(screen.getByText('Reply 2')).not.toBeAttached()
      await expect(screen.getByText('Reply 3')).not.toBeAttached()
    })
  },
)
