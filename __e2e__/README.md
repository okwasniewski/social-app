# End-to-end tests

Agentic end-to-end suite for the Bluesky app, run with [e2e](https://github.com/tester-army/e2e).
Each test states goals in natural language (`agent.act`), checks the outcome with
`agent.assert`, and pins exact facts with deterministic locator assertions.

The suite drives the **web build** in Chromium. Tests are written against the
engine-agnostic `screen` and `agent` fixtures, so a device target
(`@e2edev/mobile`) can be added to `e2e.config.ts` to run the same files on
iOS or Android; `shared-prefs.e2e.ts` is already limited to those platforms.

## Prerequisites

The mock network (`../dev-env`) needs Postgres on `:5433` and Redis on `:6380`,
as for the Maestro flows before. Either start the Docker services
(`pnpm --dir ../dev-env start` does this for you), or run them yourself and use
`pnpm --dir ../dev-env start:external`, which is what `e2e.config.ts` declares
as the `mock-server` service.

The mock PDS listens on `:3000` (and takes `:3001`/`:3002` for PLC and the AppView).
If those ports are busy, move it: `E2E_PDS_PORT=3100`, and pass the AppView DID that
`dev-env` then logs (`AppView DID did:plc:...`) as `E2E_APPVIEW_DID`. Both reach the
app through `EXPO_PUBLIC_E2E_PDS_URL` / `EXPO_PUBLIC_E2E_APPVIEW_DID` in the web build.

A model is needed for the agent steps. The config uses the Vercel AI Gateway:

```bash
export AI_GATEWAY_API_KEY=...
export E2E_MODEL=openai/gpt-5.6-luna   # optional, this is the default
```

## Running

```bash
pnpm install
pnpm test                 # starts the mock server and the web dev server if needed
pnpm test:headed          # watch the browser
pnpm exec e2e run tests/home.e2e.ts --no-cache --ai-trace
```

The web dev server is started with `EXPO_PUBLIC_ENV=e2e`, which makes
webpack resolve the `*.e2e.tsx` source overrides (`TestCtrls.e2e.tsx`, the
hidden sign-in controls the tests use) and points the app at the local
AppView. Set `APP_URL` to test against another address.

Results land in `.e2e/report.json`; failures keep a screenshot and a text
snapshot of the screen under `.e2e/artifacts/`.

From the repository root, `pnpm e2e:run` and `pnpm e2e:run:headed` do the same.
`.github/workflows/e2e.yml` runs the suite on every pull request with Postgres and
Redis as job services; it needs the `AI_GATEWAY_API_KEY` secret.

`perf-test.yml` is not part of this suite: it is the Flashlight performance
scenario and still runs through Maestro (`pnpm perf:test`).

## Layout

| Path | Purpose |
| --- | --- |
| `e2e.config.ts` | Target, agent, credentials, mock-server service |
| `fixtures/bsky.ts` | `mockServer.reset(...seeds)` and the `testControls` fixture |
| `fixtures/media.ts` | `stubFilePicker` so image uploads work without an OS dialog |
| `tests/*.e2e.ts` | One file per area, mirroring the former Maestro flows |
