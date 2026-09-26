import {test, expect} from '../fixtures/bsky.ts'
import {homeFeedTab} from '../fixtures/home.ts'

/*
 * A one-to-one port of the former Maestro `home-screen.yml` flow with no agent
 * steps: the same taps by test id and text, in the same order. It exists to
 * measure the driver against Maestro, so it only runs with E2E_BENCH=1.
 */
test.describe(
  'home screen, deterministic port of the Maestro flow',
  {
    platforms: ['ios', 'android'],
    tags: ['bench'],
    skip: process.env.E2E_BENCH !== '1' && 'benchmark only: set E2E_BENCH=1',
  },
  () => {
    test('pins a feed, likes, reposts and deletes', async ({bsky, screen}) => {
      await bsky.start('users', 'follows', 'posts', 'feeds')
      await bsky.signIn('alice')

      await homeFeedTab(screen, 'Feeds ✨').tap()
      await expect(screen.getByText('Discover New Feeds')).toBeVisible()

      await screen.getByTestId('bottomBarProfileBtn').tap()
      // the tab's index depends on which tabs the profile has; go by its name
      await screen.getByTestId('profilePager-selector').getByText('Feeds').tap()
      await screen.getByText('alice-favs').first().tap()
      await screen.getByText('Pin to Home').tap()
      await screen.getByTestId('bottomBarHomeBtn').tap()
      await screen.getByTestId('bottomBarHomeBtn').tap()
      await screen.getByTestId('bottomBarHomeBtn').tap()
      // the pinned feed reaches the tab bar after a preferences refetch
      await expect(homeFeedTab(screen, 'Feeds ✨')).not.toBeAttached({
        timeout: 15_000,
      })

      const likeButton = screen.getByTestId('likeBtn').first()
      await likeButton.tap()
      await likeButton.tap()

      const repostButton = screen.getByTestId('repostBtn').first()
      await repostButton.tap()
      await screen.getByText(/^Repost$/).tap()
      await repostButton.tap()
      await screen.getByText('Remove repost').tap()

      await screen
        .getByTestId('feedItem-by-alice.test')
        .getByTestId('postDropdownBtn')
        .tap()
      await screen.getByText('Delete post').tap()
      await screen.getByText(/^Delete$/).tap()
      await expect(screen.getByTestId('feedItem-by-alice.test')).toHaveCount(0)
    })
  },
)
