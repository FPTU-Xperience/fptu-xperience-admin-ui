> Current email/password contract: `POST /api/auth/email-login` with `{ email, password }` uses the same session/refresh/logout as Google. Passwordless dev-login and its temporary key were removed. Admin and CTSV can use PKCE SSO in both directions; roles are preserved. `VITE_LOGIN_ACCOUNT_SHORTCUTS=true` shows email-only shortcuts (default false). ClubHub's email form initially stays collapsed behind “Hoặc dùng email”. Existing accounts without a password need operator/admin setup; there is no default password. Historical dev-login sections below are superseded.

# Session and CTSV SSO — 2026-10-22

Admin now follows ClubHub's token-refresh lifecycle, with one refresh per concurrent request group, one retry, and shared login/logout across same-origin tabs. Network/5xx failures retain credentials; permission/validation errors do not become logout events.

CTSV can sign in to either app and open the other without entering credentials again. The destination uses a top-level roundtrip through the peer with state and a one-minute, single-use PKCE-bound code. Backend authority remains `STUDENT_AFFAIRS_ADMIN`, active and unlocked. Tokens never travel in URLs; existing non-CTSV sessions are not replaced.

Logout and definitive session expiry in Admin go to `https://fptux-clubhub-ui.pages.dev/v2`. Other Admin tabs follow this redirect. The initiating tab finishes its revocation attempt first. ClubHub uses `/v2` on its own origin. Cross-origin logout is observed on focus or every 15 seconds while visible, and revokes both refresh chains in the same SSO family.

Google popup blur/focus does not bypass the anonymous discovery cooldown. Focus discovery waits 250 ms for the callback and skips an in-flight login; concurrent focus/visibility events share one probe. Known student sessions do not request staff tickets. Login, identity and refresh requests time out after 20 seconds without discarding credentials. Vite updates retire obsolete SSO startup/listeners and reload the auth tree together, preventing duplicate React roots and mixed AuthContext generations.

Pending sign-in uses a separate busy flag, so a failed attempt keeps the selected method and typed email rather than unmounting the form. The corrected API returns 403 with code dev_login_unavailable when `/api/auth/dev-login` has no valid private proxy key, email allow-list or expiry; older deployments returned 404. Test email-only sign-in against a Development/Testing API, or use Google in production.

Deploy AuthService/API and migration `20261022090000_StaffSsoTickets` before the UI. Both applications must use the same gateway. Backend contract: `POST /api/auth/sso/tickets`, `/redeem`, `/status`; exact production origins must be allowed in SSO and CORS configuration. Development backend defaults use localhost:5174 and localhost:5173; use matching origins or explicit backend overrides.

Admin variables: `VITE_API_BASE_URL`, `VITE_CLUBHUB_APP_URL` (production default `https://fptux-clubhub-ui.pages.dev/v2`), `VITE_STAFF_SSO_ENABLED` (default true), existing `VITE_GOOGLE_CLIENT_ID`. ClubHub uses `VITE_ADMIN_APP_URL`. Setting SSO false disables cross-origin discovery, while refresh, same-origin synchronization and `/v2` redirects still run.

Run `npm run test:session`, `npm test` and `npm run build`. `scripts/session-sso-smoke.mjs` is a real-browser fixture, not live API/OAuth evidence. Production deployment and Google acceptance must be verified separately. Detailed server contract, revocation semantics and rollout are in the API repository's `docs/session-and-staff-sso.md`.

## Local browser verification — 2026-10-22

Chrome verification used the real AuthService login/refresh/SSO handlers and Admin actor endpoints in a local Testing host at `localhost:5270`, with isolated SQLite test users; Admin/ClubHub ran at `localhost:5274`/`localhost:5273`. The CTSV test identity `ctsv.an@fpt.edu.vn` entered the CTSV workspace, obtained SSO in both directions, synchronized logout across an existing Admin tab and ClubHub, and returned to ClubHub `/v2` after server-side session expiry. Database inspection confirmed independent refresh chains in one family and revocation of the prior family. Business-service data endpoints are not part of this local host, so its visible business-data 404s are not a full-stack integration result.

Separately, real Google sign-in for the supplied student account was observed on `localhost:5173` against the public API, showing student navigation. Email-only login against the production API was observed returning 404 by design; no production CTSV Google acceptance is claimed. Production API recovery run `39758805112` completed successfully and public `/health` returned `200 Healthy`.

## Follow-up on the actual development ports

The isolated `5273`/`5274` QA pass did not establish that existing `5173`/`5174` sessions were fixed. A follow-up on those ports confirmed both still use the production API. The global `no-referrer` policy also conflicted with Google Sign-In: use `strict-origin-when-cross-origin` so cross-origin requests carry only the origin, without SSO query parameters. See [Google setup guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

Google SDK initialization is now shared across StrictMode remounts, and the button's official `click_listener` starts a bounded authentication lease before opening the popup. SSO discovery/status and focus-driven identity retries respect that lease, including the interval before a credential callback arrives. A fresh Google iframe on `5173` then recognized the student account without the prior origin/duplicate-initialization warnings. Chrome disconnected before the final account-selection/callback check; end-to-end acceptance on the actual ports remains pending. The production email-login 404 remains a separate environment restriction.

### Verification on the retained development servers (2026-10-22)

- Stopped the extra FE servers on 5273 and 5274 (679 MB combined working set); retained only ClubHub 5173 and Admin 5174.
- Both development servers now use a git-ignored `.env.development.local` override for `http://localhost:5270`. The isolated Testing API uses the real auth/SSO endpoint handlers with exact origins 5173/5174 and the public Google client ID. Production configuration is unchanged.
- Browser checks on the retained ports: CTSV email login succeeds on ClubHub and directly on Admin; ClubHub-to-Admin CTSV SSO reaches `/ctsv/work`; Admin logout sends both tabs to ClubHub `/v2`. A prior stale Admin session was rejected after restarting the Testing API with a new ephemeral signing key; reopening Admin then completed SSO.
- Student `cuongnkce161131@fpt.edu.vn` reaches student onboarding on ClubHub; Admin stays on its login screen. No CTSV role was assigned to the student.
- Testing API covers auth/SSO only. Business-data 404 responses are expected and do not verify full application integration. Google credential callback is still pending because Chrome disconnected; email results do not prove Google completion.

## Local frontend login against the deployed API

Local ClubHub 5173 and Admin 5174 continue to use the production API and real database. Student Google login calls the production Google endpoint directly. Email dev-login uses only the local Vite proxy at `/api/auth/dev-login`, enabled with `VITE_LOCAL_DEV_LOGIN=true` and a non-VITE `LOCAL_DEV_LOGIN_KEY` in git-ignored `.env.development.local`. The proxy requires a loopback connection and its exact local browser Origin, then attaches `X-Local-Dev-Login-Key` server-side. The key must never be placed in a VITE variable or browser bundle.

Production AuthService accepts this email login only when `LOCAL_DEV_LOGIN_KEY` is at least 32 characters, matches the request key in constant time, `LOCAL_DEV_LOGIN_EMAILS` contains the email, and `LOCAL_DEV_LOGIN_EXPIRES_AT` is a future UTC timestamp. Missing, invalid, or expired configuration returns 403 with code dev_login_unavailable; older deployments returned 404. Existing active/unlocked account and actor-policy checks still apply. Deployment obtains the key from the production environment secret and the allow-list/expiry from production environment variables. Removing the secret or expiring the window disables this login method; existing sessions follow normal revocation/expiry rules.

`LOCAL_SSO_ENABLED=true` additionally permits exactly `http://localhost:5174` and `http://localhost:5173` as a separate SSO pair. Production-to-production SSO remains available; ticket issuance between a production origin and a local origin is rejected. The endpoint still requires a valid CTSV session, source refresh ownership, and PKCE. No API Testing service or synthetic user is needed for this flow.

This section documents the source change; deployment and browser verification must be recorded separately.
