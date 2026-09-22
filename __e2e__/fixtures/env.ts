/**
 * The mock PDS listens on 3000 by default. Set E2E_PDS_PORT to move it; the
 * AppView DID changes with the ports, so pass the one `dev-env` logs as
 * E2E_APPVIEW_DID too. Both reach the app through the e2e test controls.
 */
export const PDS_PORT = process.env.E2E_PDS_PORT ?? '3000'
export const PDS_URL = `http://localhost:${PDS_PORT}`
