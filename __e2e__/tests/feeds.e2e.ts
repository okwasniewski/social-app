import type {Web} from '@e2edev/web'
import type {Screen} from 'e2e'
import {test, expect} from '../fixtures/bsky.ts'
import {expectHomeTabs, homeFeedTab} from '../fixtures/home.ts'

/**
 * Drags the saved-feed row at `from` onto the row at `to` through its grip
 * handle. The list reorders on pointer events, which the agent has no verb
 * for, so this is the one deterministic gesture in the flow. A device drag
 * is a long press that moves; the web list wants a pointer path, so a
 * browser gets a stepped mouse move.
 */
async function dragFeed(
  screen: Screen,
  from: number,
  to: number,
  web?: Web,
): Promise<void> {
  const handles = screen.getByTestId('feed-drag-handle')
  if (web === undefined) {
    await handles.nth(from).dragTo(handles.nth(to))
    return
  }
  const source = await handles.nth(from).boundingBox()
  const target = await handles.nth(to).boundingBox()
  if (!source || !target) throw new Error('drag handles are not on screen')
  const x = source.x + source.width / 2
  const startY = source.y + source.height / 2
  const endY = target.y + target.height / 2 + (to > from ? 8 : -8)
  await web.mouse.move(x, startY)
  await web.mouse.down()
  const steps = 12
  for (let step = 1; step <= steps; step += 1) {
    await web.mouse.move(x, startY + ((endY - startY) * step) / steps)
  }
  await web.mouse.up()
}

test.describe('saved feeds', () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'follows', 'posts', 'feeds')
    await bsky.signIn('alice')
  })

  test('reorders and unpins home feeds', async fixtures => {
    const {agent, screen, bsky, platform} = fixtures
    const web = platform === 'web' ? fixtures.web : undefined
    await agent.act(
      'open alice\'s own profile, open its Feeds tab, open the "alice-favs" feed and pin it to home; close any menu or sheet that is still open afterwards',
    )
    await bsky.press('e2eGotoHome')
    await expect(homeFeedTab(screen, 'Feeds ✨')).not.toBeAttached()
    await expectHomeTabs(screen, platform, ['Following', 'alice-favs'])

    await agent.act(
      'open Feeds and open the editor for your saved feeds ("Edit My Feeds")',
    )
    await expect(screen.getByTestId('feed-drag-handle')).toHaveCount(2)
    await dragFeed(screen, 1, 0, web)
    await agent.act('save the changes to your feeds')
    await bsky.press('e2eGotoHome')
    await expectHomeTabs(screen, platform, ['alice-favs', 'Following'])

    await agent.act(
      'open Feeds and open the editor for your saved feeds ("Edit My Feeds")',
    )
    await expect(screen.getByTestId('feed-drag-handle')).toHaveCount(2)
    await dragFeed(screen, 0, 1, web)
    await agent.act('save the changes to your feeds')
    await bsky.press('e2eGotoHome')
    await expectHomeTabs(screen, platform, ['Following', 'alice-favs'])

    await agent.act(
      'open Feeds, edit your saved feeds, unpin the "Following" feed and save the changes',
    )
    await bsky.press('e2eGotoHome')
    await expect(homeFeedTab(screen, 'Following')).not.toBeAttached()
    await expectHomeTabs(screen, platform, ['alice-favs'])
  })
})
