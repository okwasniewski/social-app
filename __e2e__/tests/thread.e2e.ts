import {test, expect} from '../fixtures/bsky.ts'
import {COMPOSER_HINT} from '../fixtures/hints.ts'

test.describe('thread screen', () => {
  test.beforeEach(async ({mockServer, app, testControls}) => {
    await mockServer.reset('users', 'follows', 'thread')
    await app.open('/')
    await testControls.signIn('alice')
  })

  test('likes and reposts the root post and a reply', async ({
    agent,
    screen,
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
    await expect(reply.getByTestId('likeCount')).not.toBeAttached()

    await agent.act(
      'repost the root post by Bob (a plain repost, not a quote post)',
    )
    await expect(screen.getByTestId('repostCount-expanded')).toBeVisible()
    await agent.act('undo the repost of the root post by Bob')
    await expect(screen.getByTestId('repostCount-expanded')).not.toBeAttached()

    await agent.act(
      'repost the reply by Carla (a plain repost, not a quote post)',
    )
    await expect(reply.getByTestId('repostCount')).toHaveText('1')
    await agent.act('undo the repost of the reply by Carla')
    await expect(reply.getByTestId('repostCount')).not.toBeAttached()
    await expect(root).toBeVisible()
  })
})

test.describe('thread muting', {agentContext: COMPOSER_HINT}, () => {
  test.beforeEach(async ({mockServer, app, testControls}) => {
    await mockServer.reset('users', 'follows')
    await app.open('/')
    await testControls.signIn('alice')
  })

  test('a muted thread stops producing notifications', async ({
    agent,
    screen,
    testControls,
  }) => {
    await agent.act('publish a new post with the text {text}', {
      params: {text: 'Test thread'},
    })
    await expect(screen.getByTestId('feedItem-by-alice.test')).toContainText(
      'Test thread',
    )

    await testControls.signOut()
    await testControls.signIn('bob')
    await agent.act('reply to alice\'s post "Test thread" with {text}', {
      params: {text: 'Reply 1'},
    })
    await expect(screen.getByTestId('composePostView')).not.toBeAttached({
      timeout: 20_000,
    })

    await testControls.signOut()
    await testControls.signIn('alice')
    await agent.act(
      'open Notifications and open the notification about the reply "Reply 1"',
    )
    await expect(screen.getByTestId('postThreadItem-by-bob.test')).toBeVisible()
    await agent.act('mute this thread from the "..." menu of Bob\'s reply')
    await agent.assert(
      'the thread is muted, or a confirmation of muting was shown',
    )

    await testControls.signOut()
    await testControls.signIn('bob')
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

    await testControls.signOut()
    await testControls.signIn('alice')
    await agent.act('open Notifications')
    await expect(screen.getByTestId('notifsFeed').first()).toBeVisible()
    await expect(screen.getByText('Reply 1')).toBeVisible()
    await expect(screen.getByText('Reply 2')).not.toBeAttached()
    await expect(screen.getByText('Reply 3')).not.toBeAttached()
    await agent.assert(
      'only the notification about "Reply 1" is listed; nothing mentions "Reply 2" or "Reply 3"',
    )

    await agent.act(
      'open the notification about "Reply 1" and unmute the thread from the "..." menu of Bob\'s reply',
    )
    await agent.act('go back to Notifications and refresh the list')
    await expect(screen.getByText('Reply 1')).toBeVisible()
    await expect(screen.getByText('Reply 2')).not.toBeAttached()
    await expect(screen.getByText('Reply 3')).not.toBeAttached()
  })
})
