import {test, expect} from '../fixtures/bsky.ts'
import {stubFilePicker} from '../fixtures/media.ts'
import {COMPOSER_HINT} from '../fixtures/hints.ts'

test.describe('composer', {agentContext: COMPOSER_HINT}, () => {
  test.beforeEach(async ({mockServer, app, testControls, web}) => {
    await mockServer.reset('users')
    await app.open('/')
    await testControls.signIn('alice')
    await stubFilePicker(web)
  })

  test('publishes text, image and link-card posts', async ({
    agent,
    screen,
    testControls,
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

    await testControls.press('e2eRefreshHome')
    await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(3)
    await agent.assert(
      'the Following feed shows three posts by alice: a text post, one with an image, and one whose text contains https://example.com',
    )
  })

  test('replies with text, an image and a link card', async ({
    agent,
    screen,
    testControls,
  }) => {
    await agent.act('publish a new post with the text {text}', {
      params: {text: 'Post text only'},
    })
    await testControls.press('e2eRefreshHome')
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
    await expect(screen.getByText('Reply text only').first()).toBeVisible()
    await expect(screen.getByText('Reply with an image').first()).toBeVisible()
    await expect(
      screen.getByTestId('postThreadItem-by-alice.test'),
    ).toHaveCount(4)
  })

  test('quote posts with text, an image and a link card', async ({
    agent,
    screen,
    testControls,
  }) => {
    await agent.act('publish a new post with the text {text}', {
      params: {text: 'Post text only'},
    })
    await testControls.press('e2eRefreshHome')
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

    await testControls.press('e2eRefreshHome')
    await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(4)
    await agent.assert(
      'the feed contains three quote posts of "Post text only": text only, one with an image, one whose text contains https://example.com',
    )
  })

  test('labels an image post as adult content', async ({
    agent,
    screen,
    testControls,
  }) => {
    await agent.act(
      'write a new post with the text {text}, add one image from the media library, open "Content warnings", pick "Porn", confirm, and publish',
      {params: {text: 'Post with an image'}},
    )
    await expect(screen.getByTestId('composePostView')).not.toBeAttached({
      timeout: 30_000,
    })
    await testControls.press('e2eRefreshHome')
    await expect(screen.getByTestId('feedItem-by-alice.test')).toBeVisible()
    await expect(screen.getByText('Adult Content')).toBeVisible()
    await agent.assert("alice's post is marked with an adult content label")
  })
})
