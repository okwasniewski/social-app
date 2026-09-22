import {z} from 'zod'
import type {Web} from '@e2edev/web'
import type {Screen} from 'e2e'
import {test, expect} from '../fixtures/bsky.ts'

/**
 * Drags the saved-feed row at `from` onto the row at `to` through its grip
 * handle. The web list reorders on pointer events, which the agent has no
 * verb for, so this is the one deterministic gesture in the flow.
 */
async function dragFeed(
  web: Web,
  screen: Screen,
  from: number,
  to: number,
): Promise<void> {
  const handles = screen.getByTestId('feed-drag-handle')
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
  test.beforeEach(async ({mockServer, app, testControls}) => {
    await mockServer.reset('users', 'follows', 'posts', 'feeds')
    await app.open('/')
    await testControls.signIn('alice')
  })

  test('reorders and unpins home feeds', async ({
    agent,
    screen,
    web,
    testControls,
  }) => {
    const homeTabs = () =>
      agent.extract(
        'the names of the feed tabs at the top of the home screen, from left to right',
        {
          schema: z.array(z.string()),
        },
      )

    await agent.act(
      'open alice\'s own profile, open its Feeds tab, open the "alice-favs" feed and pin it to home',
    )
    await testControls.press('e2eGotoHome')
    await expect(
      screen.getByTestId('homeScreenFeedTabs-Feeds ✨'),
    ).not.toBeAttached()
    expect(await homeTabs()).toEqual(['Following', 'alice-favs'])

    await agent.act(
      'open Feeds and open the editor for your saved feeds ("Edit My Feeds")',
    )
    await expect(screen.getByTestId('feed-drag-handle')).toHaveCount(2)
    await dragFeed(web, screen, 1, 0)
    await agent.act('save the changes to your feeds')
    await testControls.press('e2eGotoHome')
    expect(await homeTabs()).toEqual(['alice-favs', 'Following'])

    await agent.act(
      'open Feeds and open the editor for your saved feeds ("Edit My Feeds")',
    )
    await expect(screen.getByTestId('feed-drag-handle')).toHaveCount(2)
    await dragFeed(web, screen, 0, 1)
    await agent.act('save the changes to your feeds')
    await testControls.press('e2eGotoHome')
    expect(await homeTabs()).toEqual(['Following', 'alice-favs'])

    await agent.act(
      'open Feeds, edit your saved feeds, unpin the "Following" feed and save the changes',
    )
    await testControls.press('e2eGotoHome')
    await expect(
      screen.getByTestId('homeScreenFeedTabs-Following'),
    ).not.toBeAttached()
    expect(await homeTabs()).toEqual(['alice-favs'])
  })
})
