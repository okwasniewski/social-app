import {expect, type Locator, type Screen} from 'e2e'

/**
 * A tab of the home screen's feed selector, by feed name. Web exposes the
 * tab's text node; native folds the tab into one accessible node whose name
 * is the feed, and `getByText` matches either.
 */
export function homeFeedTab(screen: Screen, name: string): Locator {
  return screen.getByTestId('homeScreenFeedTabs-selector').getByText(name)
}

/**
 * Checks the feed tabs of the home screen, in order. Each tab node carries
 * its name as text on web and as its accessible name on native, and no tab
 * exists past the last expected one.
 */
export async function expectHomeTabs(
  screen: Screen,
  platform: string,
  names: readonly string[],
): Promise<void> {
  for (const [index, name] of names.entries()) {
    const tab = screen.getByTestId(`homeScreenFeedTabs-selector-${index}`)
    if (platform === 'web') await expect(tab).toContainText(name)
    else await expect(tab).toHaveAccessibleName(name)
  }
  await expect(
    screen.getByTestId(`homeScreenFeedTabs-selector-${names.length}`),
  ).not.toBeAttached()
}
