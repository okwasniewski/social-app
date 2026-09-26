import {expect, type Locator, type Screen} from 'e2e'

/**
 * Checks the like count of a post row as the viewer's own like. Web renders
 * the count as text beside the button; a native button is one accessible
 * node whose label carries the count, so the count text is not in the tree.
 */
export async function expectLikes(
  platform: string,
  post: Locator,
  count: number,
): Promise<void> {
  if (platform === 'web') {
    const likeCount = post.getByTestId('likeCount')
    if (count === 0) await expect(likeCount).not.toBeAttached()
    else await expect(likeCount).toHaveText(String(count))
    return
  }
  const label =
    count === 0
      ? 'Like (0 likes)'
      : `Unlike (${count} ${count === 1 ? 'like' : 'likes'})`
  await expect(post.getByTestId('likeBtn')).toHaveAccessibleName(label)
}

/** Checks the repost count of a post row as the viewer's own repost; see `expectLikes`. */
export async function expectReposts(
  platform: string,
  post: Locator,
  count: number,
): Promise<void> {
  if (platform === 'web') {
    const repostCount = post.getByTestId('repostCount')
    if (count === 0) await expect(repostCount).not.toBeAttached()
    else await expect(repostCount).toHaveText(String(count))
    return
  }
  const label =
    count === 0
      ? 'Repost (0 reposts)'
      : `Undo repost (${count} ${count === 1 ? 'repost' : 'reposts'})`
  await expect(post.getByTestId('repostBtn')).toHaveAccessibleName(label)
}

/**
 * Checks that posts with these texts are in the feed on screen. A phone feed
 * only renders the rows in view, so counting rows says nothing there; each
 * post is scrolled to instead. The app shows a link's host in place of its URL.
 */
export async function expectPostsInFeed(
  screen: Screen,
  texts: readonly string[],
): Promise<void> {
  for (const text of texts) {
    const post = screen.getByText(text).first()
    try {
      await screen.scrollUntilVisible(post, {timeout: 15_000})
    } catch {
      // the post may sit above the rows a previous scroll went past
      await screen.scrollUntilVisible(post, {direction: 'up', timeout: 15_000})
    }
    await expect(post).toBeVisible()
  }
}
