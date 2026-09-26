# End-to-end tests

Agentic end-to-end suite for the Bluesky app, run with [e2e](https://github.com/tester-army/e2e).
Each test states goals in natural language (`agent.act`), checks the outcome with
`agent.assert`, and pins exact facts with deterministic locator assertions.

The same test files run on three targets: the **web build** in Chromium
(`@e2edev/web`), and the **iOS simulator** and **Android emulator** development
builds (`@e2edev/mobile`, on agent-device). Tests are written against the
engine-agnostic `screen`, `agent`, `app` and `bsky` fixtures; the few
platform differences live in `fixtures/` (see Layout). A test that needs one
platform says so with `platforms: [...]`, as `shared-prefs.e2e.ts` does.

## Prerequisites

The mock network (`../dev-env`) needs Postgres on `:5433` and Redis on `:6380`,
as for the Maestro flows before. Either start the Docker services
(`pnpm --dir ../dev-env start` does this for you), or run them yourself and use
`pnpm --dir ../dev-env start:external`, which is what `e2e.config.ts` declares
as the `mock-server` service.

The mock PDS listens on `:3000` (and takes `:3001`/`:3002` for PLC and the AppView).
If those ports are busy, move it: `E2E_PDS_PORT=3100`, and pass the AppView DID that
`dev-env` then logs (`AppView DID did:plc:...`) as `E2E_APPVIEW_DID`. Both reach the
app through `EXPO_PUBLIC_E2E_PDS_URL` / `EXPO_PUBLIC_E2E_APPVIEW_DID` in the web build
and through Metro for the native builds.

A model is needed for the agent steps. The config uses the Vercel AI Gateway:

```bash
export AI_GATEWAY_API_KEY=...
export E2E_MODEL=openai/gpt-5.6-luna   # optional, this is the default
```

## Running on web

```bash
pnpm install
pnpm test                 # starts the mock server and the web dev server if needed
pnpm test:headed          # watch the browser
pnpm exec e2e run --target web tests/home.e2e.ts --no-cache --ai-trace
```

The web dev server is started with `EXPO_PUBLIC_ENV=e2e`, which makes
webpack resolve the `*.e2e.tsx` source overrides (`TestCtrls.e2e.tsx`, the
hidden sign-in controls the tests use) and points the app at the local
AppView. Set `APP_URL` to test against another address.

## Running on iOS and Android

The device targets drive a **development build** of the app that loads its
JavaScript from Metro, the way the Maestro flows did. Build and install it once
from the repository root (this is `expo run:ios` with the e2e environment, so
Metro resolves the `*.e2e.ts(x)` overrides through `RN_SRC_EXT`):

```bash
pnpm e2e:build            # iOS: prebuild, pod install, build, install on the booted simulator
pnpm e2e:build-android    # Android
pnpm e2e:build:release    # iOS Release build with the JavaScript embedded: no Metro, faster launch and UI
```

With the Release build installed, run with `E2E_RELEASE_BUILD=1` so the config
does not start or wait for Metro.

Then run the suite. The config starts the mock server and Metro itself
(`.e2e/logs/metro.log`) and reuses them when they already answer:

```bash
xcrun simctl boot "iPhone 16e"     # or any booted simulator is used
# the "Save Password?" sheet stalls the runner, and the keyboard's prediction
# bar makes screens with a keyboard slow to capture
xcrun simctl spawn booted defaults write com.apple.Preferences AutoFillPasswords -bool false
xcrun simctl spawn booted defaults write com.apple.Preferences KeyboardPrediction -bool false
xcrun simctl spawn booted defaults write com.apple.Preferences KeyboardAutocorrection -bool false
pnpm test:ios
pnpm test:android
pnpm exec e2e run --target ios tests/home.e2e.ts --no-cache --ai-trace
```

From the repository root, `pnpm e2e:run:ios` and `pnpm e2e:run:android` do the same.

Web and device runs cannot overlap on one machine: the web dev server and
the native Metro both want port 8081, and Expo refuses to pick another port
when it cannot ask. Stop one before starting the other.

Options through the environment:

| Variable | Meaning |
| --- | --- |
| `E2E_IOS_DEVICE` / `E2E_ANDROID_DEVICE` | Simulator or emulator name or UDID; otherwise the booted one is used. |
| `E2E_IOS_APP_PATH` / `E2E_ANDROID_APP_PATH` | A `.app` / `.apk` to install once per worker, for a machine without a local build (CI). |
| `E2E_METRO_PORT` | Metro port, `8081` by default. |

A device attempt launches nothing on its own, so tests start with
`bsky.start(...seeds)`: it resets the mock network and, at the same time, loads
the page on web or relaunches the app with cleared state on a device. Every
attempt then signs in through the hidden test controls (`bsky.signIn`).

On Android the config adds `adb reverse` for the Metro and PDS ports as
services, so the emulator reaches them on `localhost` like the app expects.

Run `pnpm exec agent-device doctor` once if a device run fails before the
first test; it checks Xcode, the simulator runtime and the Android SDK.

The suite runs on the unpatched canaries. The engine treats a `RUNNER_BUSY`
answer from the iOS runner (an accessibility capture that outran its watchdog
on a keyboard-heavy screen) as a failure; if that returns, the three simulator
defaults above make it rare, and `retries: 1` in the config covers the rest.

Results land in `.e2e/report.json`; failures keep a screenshot and a text
snapshot of the screen under `.e2e/artifacts/<target>/`.

## Trace cache

Every `agent.act` step the model drives is recorded as a trace of semantic
actions (tap the button named "Home", type into the field with this test id)
under `.e2e/cache/`, keyed on the test, the step's text and the screen it
started on. The next run replays a matching trace with no model call and
falls back to the model when the app is not where the recording began, so a
green suite gets cheaper and faster on every run. On the home file the second
iOS pass replayed all 8 steps and finished in 125s instead of 215s.

`agent.assert` and `agent.extract` are judgments on the current screen and
always call the model. Pass `--no-cache` while writing or debugging a test
so every step exercises the model; CI reads the cache but never writes it.

`.github/workflows/e2e.yml` runs the web suite on every pull request with Postgres
and Redis as job services, and the iOS suite nightly and on demand on a macOS
runner (an EAS local build of the `e2e` profile, installed through
`E2E_IOS_APP_PATH`). Both need the `AI_GATEWAY_API_KEY` secret.

`perf-test.yml` is not part of this suite: it is the Flashlight performance
scenario and still runs through Maestro (`pnpm perf:test`).

## Layout

| Path | Purpose |
| --- | --- |
| `e2e.config.ts` | Targets (web, ios, android), agent, credentials, mock-server and Metro processes |
| `fixtures/bsky.ts` | `mockServer.reset(...seeds)` and the `bsky` fixture: `start`, `open`, `press`, `signIn`, `signOut`, `stubFilePicker` |
| `fixtures/engine.ts` | `withApp`, adds `command`/`services` to a device engine so the runner starts Metro and the mock server |
| `fixtures/posts.ts` | `expectLikes` / `expectReposts` (counts, read as text on web and from the button label on native) and `expectPostsInFeed` (scrolls to each post, since a phone feed only renders the rows in view) |
| `fixtures/home.ts` | `homeFeedTab`: a tab of the home feed selector on either platform |
| `fixtures/media.ts` | `stubWebFilePicker`, so image uploads work in the browser without an OS dialog |
| `tests/*.e2e.ts` | One file per area, mirroring the former Maestro flows |

### Platform notes

- Native buttons are one accessible node: text inside them (`likeCount`,
  `homeScreenFeedTabs-<name>`) is not in the tree. Assert on the button's
  accessible name or on the enclosing node instead, as `fixtures/posts.ts`
  and `fixtures/home.ts` do.
- Native flattens some containers: a feed row's children, or a feed and its
  `-flatlist`, can be siblings in the tree. Query the inner node directly
  (`listFeed-flatlist`, `getByText(...)`) rather than through a parent.
- Handles render with bidi isolation marks on native: match them with a
  regular expression (`/@bob\.test/`), not an exact string.
- The hidden test controls are 1px on web (clicked through the DOM) and a few
  points wide on devices, where a tap lands on the element's centre.
- Image pickers: the web build gets a stubbed file input, the native e2e
  build mocks the picker in `src/lib/media/picker.e2e.tsx`. `bsky.stubFilePicker()`
  does the right thing on both.
