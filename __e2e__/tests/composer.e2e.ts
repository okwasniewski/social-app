import {test, expect} from '../fixtures/bsky.ts'
import {COMPOSER_HINT} from '../fixtures/hints.ts'
import {expectPostsInFeed} from '../fixtures/posts.ts'

/* Three publishes per test, each several agent steps: well over the default deadline. */
test.describe(
  'composer',
  {agentContext: COMPOSER_HINT, timeout: 600_000},
  () => {
    test.beforeEach(async ({bsky}) => {
      await bsky.start('users')
      await bsky.signIn('alice')
      await bsky.stubFilePicker()
    })

    test('publishes text, image and link-card posts', async ({
      agent,
      screen,
      bsky,
    }) => {
      await agent.act('publish a new post with the text {text}', {
        params: {text: 'Post text only'},
      })
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await agent.act(
        'publish a new post with the text {text} and one image added from the media library',
        {
          params: {text: 'Post with an image'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await agent.act(
        'publish a new post with the text {text} (it contains a URL; publish right away, a link preview is optional)',
        {
          params: {text: 'Post with a https://example.com link card'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await bsky.press('e2eRefreshHome')
      await expectPostsInFeed(screen, [
        'Post text only',
        'Post with an image',
        'Post with a example.com link card',
      ])
    })

    test('replies with text, an image and a link card', async ({
      agent,
      screen,
      bsky,
    }) => {
      await agent.act('publish a new post with the text {text}', {
        params: {text: 'Post text only'},
      })
      await bsky.press('e2eRefreshHome')
      await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(1)

      await agent.act('reply to the post "Post text only" with {text}', {
        params: {text: 'Reply text only'},
      })
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })
      await agent.act(
        'reply to the post "Post text only" with {text} and one image from the media library',
        {
          params: {text: 'Reply with an image'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })
      await agent.act(
        'reply to the post "Post text only" with {text} (it contains a URL; publish right away, a link preview is optional)',
        {
          params: {text: 'Reply with a https://example.com link card'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await agent.act('open the thread of the post "Post text only"')
      await expectPostsInFeed(screen, [
        'Reply text only',
        'Reply with an image',
        'Reply with a example.com link card',
      ])
    })

    test('quote posts with text, an image and a link card', async ({
      agent,
      screen,
      bsky,
    }) => {
      await agent.act('publish a new post with the text {text}', {
        params: {text: 'Post text only'},
      })
      await bsky.press('e2eRefreshHome')
      await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(1)

      await agent.act(
        'quote post the post "Post text only" (Repost menu, then Quote post) with the text {text}',
        {
          params: {text: 'QP text only'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })
      await agent.act(
        'quote post the post "Post text only" with the text {text} and one image from the media library',
        {
          params: {text: 'QP with an image'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })
      await agent.act(
        'quote post the post "Post text only" with the text {text} (it contains a URL; publish right away, a link preview is optional)',
        {
          params: {text: 'QP with a https://example.com link card'},
        },
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 20_000,
      })

      await bsky.press('e2eRefreshHome')
      await expectPostsInFeed(screen, [
        'QP text only',
        'QP with an image',
        'QP with a example.com link card',
      ])
    })

    test('labels an image post as adult content', async ({
      agent,
      screen,
      bsky,
    }) => {
      await agent.act(
        'write a new post with the text {text}, add one image from the media library, open "Content warnings", pick "Porn", confirm, and publish',
        {params: {text: 'Post with an image'}},
      )
      await expect(screen.getByTestId('composePostView')).not.toBeAttached({
        timeout: 30_000,
      })
      await bsky.press('e2eRefreshHome')
      await expect(screen.getByTestId('feedItem-by-alice.test')).toBeVisible()
      await expect(screen.getByText('Adult Content')).toBeVisible()
    })
  },
)
