import {test, expect} from '../fixtures/bsky.ts'

/** Vocabulary for the report sheet on a phone, where the keyboard hides the footer. */
const REPORT_HINT =
  'On iOS and Android the report form is a bottom sheet. After typing into its details field the keyboard ' +
  'covers the Submit button: scroll the sheet (swipe up inside it) until the button is clear of the keyboard, ' +
  'then tap it.'

test.describe('reporting', {agentContext: REPORT_HINT}, () => {
  test.beforeEach(async ({bsky}) => {
    await bsky.start('users', 'follows', 'posts', 'feeds')
    await bsky.signIn('alice')
  })

  test('reports a post as spam', async ({agent, screen}) => {
    await agent.act(
      'report the first post in the Following feed: open its "..." menu and choose Report',
    )
    await expect(screen.getByTestId('report:dialog')).toBeVisible()
    await agent.act('choose the category "Misleading" and the reason "Spam"')
    await expect(
      screen.getByRole('button', {name: 'Send report to Dev-env Moderation'}),
    ).toBeVisible()
    await agent.act('send the report')
    await expect(screen.getByTestId('report:dialog')).not.toBeAttached({
      timeout: 20_000,
    })
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
    await expect(screen.getByTestId('report:dialog')).not.toBeAttached({
      timeout: 20_000,
    })
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
    await expect(screen.getByTestId('report:dialog')).not.toBeAttached({
      timeout: 20_000,
    })
  })

  test('reports an account', async ({agent, screen}) => {
    await agent.act(
      "open Carla's profile by tapping her avatar in the Following feed",
    )
    await expect(screen.getByTestId('profileView')).toBeVisible()
    await expect(screen.getByText(/@carla\.test/).first()).toBeVisible()
    await agent.act(
      'open the report dialog for this account from the profile\'s "..." menu and choose the category "Misleading" and the reason "Spam", but do not send the report yet',
    )
    await expect(
      screen.getByRole('button', {name: 'Send report to Dev-env Moderation'}),
    ).toBeVisible()
    await agent.act('send the report')
    await expect(screen.getByTestId('report:dialog')).not.toBeAttached({
      timeout: 20_000,
    })
  })
})
