import {test, expect} from '../fixtures/bsky.ts'

test.describe('reporting', () => {
  test.beforeEach(async ({mockServer, app, testControls}) => {
    await mockServer.reset('users', 'follows', 'posts', 'feeds')
    await app.open('/')
    await testControls.signIn('alice')
  })

  test('reports a post as spam', async ({agent, screen}) => {
    await agent.act(
      'report the first post in the Following feed: open its "..." menu and choose Report',
    )
    await expect(
      screen.getByRole('dialog', {name: 'Report dialog'}),
    ).toBeVisible()
    await agent.act('choose the category "Misleading" and the reason "Spam"')
    await expect(
      screen.getByRole('button', {name: 'Send report to Dev-env Moderation'}),
    ).toBeVisible()
    await agent.act('send the report')
    await expect(
      screen.getByRole('dialog', {name: 'Report dialog'}),
    ).not.toBeAttached({timeout: 20_000})
  })

  test('changes the reason before sending', async ({agent, screen}) => {
    await agent.act(
      'report the first post in the Following feed: open its "..." menu and choose Report',
    )
    await agent.act(
      'choose the category "Misleading" and the reason "Other misleading content"',
    )
    await expect(screen.getByTestId('report:details')).toBeVisible()

    await agent.act('clear the chosen reason, then clear the chosen category')
    await expect(screen.getByTestId('report:details')).not.toBeAttached()
    await expect(
      screen.getByTestId('report:option:Other misleading content'),
    ).not.toBeAttached()

    await agent.act(
      'choose the category "Misleading" and the reason "Spam", then send the report',
    )
    await expect(
      screen.getByRole('dialog', {name: 'Report dialog'}),
    ).not.toBeAttached({timeout: 20_000})
  })

  test('sends a report with written details', async ({agent, screen}) => {
    await agent.act(
      'report the first post in the Following feed: open its "..." menu and choose Report',
    )
    await agent.act(
      'choose the category "Misleading" and the reason "Other misleading content", write {details} in the details field and send the report',
      {
        params: {details: 'This is a test report'},
      },
    )
    await expect(
      screen.getByRole('dialog', {name: 'Report dialog'}),
    ).not.toBeAttached({timeout: 20_000})
  })

  test('reports an account', async ({agent, screen, web}) => {
    await agent.act(
      "open Carla's profile by clicking her avatar in the Following feed",
    )
    await expect(web).toHaveURL('/profile/carla.test')
    await agent.act(
      'open the report dialog for this account from the profile\'s "..." menu and choose the category "Misleading" and the reason "Spam", but do not send the report yet',
    )
    await expect(
      screen.getByRole('button', {name: 'Send report to Dev-env Moderation'}),
    ).toBeVisible()
    await agent.act('send the report')
    await expect(
      screen.getByRole('dialog', {name: 'Report dialog'}),
    ).not.toBeAttached({timeout: 20_000})
  })
})
