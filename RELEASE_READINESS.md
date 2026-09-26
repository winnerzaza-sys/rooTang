# รู้ทาง — Phase 5 Release Readiness

Status as of 2026-09-26. This records what was verified locally, what could not be executed, and what still blocks a production release. Nothing here claims provider permission, legal approval, or a deployment.

## Verified locally

| Area                   | How it was verified                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contrast (WCAG AA)     | Computed ratios for essential text/control pairs. Fixed the focus ring (was 2.1:1), the orange category fill (was 3.7:1 with white text) and the form-field border (was 1.3:1).                                                                        |
| Keyboard               | Tab order walked in Chromium. The detail dialog traps focus and returns it on close. Route options follow the radio pattern (one tab stop, arrow keys). Component tests cover both.                                                                    |
| Screen-reader labels   | Existing labels include category, distance, source, time and route relation. Route summary uses `aria-live="polite"` and partial warnings use `role="status"`.                                                                                         |
| Reduced motion         | With `prefers-reduced-motion: reduce`, the skeleton animation collapses to one near-zero iteration.                                                                                                                                                    |
| Touch targets          | All visible controls are measured at ≥ 44 px (inner mock `<input>` elements sit inside 48 px field wrappers). Primary actions are 52 px.                                                                                                               |
| Responsive / zoom      | Checked 360 × 740, 390 × 844, 844 × 390, 640 × 400 (1280 × 800 at 200% zoom), 768 × 1024 and 1280 × 800. Fixed the search card being covered by the results sheet on short viewports.                                                                  |
| PWA                    | Playwright on the production build: manifest fields and icon sizes, service-worker precache limited to same-origin shell assets (no `/api`), offline shell and deep link (Chromium), and the update prompt (unit tests).                               |
| Production data states | Playwright on the production build with intercepted `/api`: one provider unavailable, all unavailable plus retry, request timeout, empty, offline after load, location denied, provider markup rendered as text, and no Google requests without a key. |
| API                    | Unit tests for validation, bbox limit, 405/400/429/503, response-size limit, timeout and rate limit. The compiled function was imported and run under plain Node ESM.                                                                                  |

## Platform checks not executed

- **Real iOS Safari and iOS standalone (Add to Home Screen):** not available. A WebKit (Playwright) pass ran at 390 × 844. It is not a substitute, and its offline-reload step is skipped because of a Playwright WebKit limitation.
- **Real Android Chrome install prompt and standalone:** not available. Chromium emulation (Pixel 7) only.
- **Safe-area insets on notched devices:** CSS uses `env(safe-area-inset-*)` with `viewport-fit=cover`, but this was not observed on hardware.
- **Live Google Maps, Places and Routes:** not exercised, to avoid paid calls. The report-only CSP must be checked against the live map before it is enforced.
- **Lighthouse and axe:** not configured in this repository and not run.

## Release blockers

1. **Provider permissions (Longdo/iTIC, Traffy/NECTEC):** licence, commercial use, attribution wording, rate limits, cache policy and SLA are not documented. The UI currently shows a per-incident source label only.
2. **Privacy Policy:** no approved content exists. It must be written and approved before production. Do not publish invented legal claims.
3. **Google Cloud:** confirm the production key has HTTP-referrer restrictions (origin level, because the loader uses `authReferrerPolicy: 'origin'`) and API restrictions (Maps JavaScript, Routes and Places (New) only), plus quota caps and budget alerts. None of this is verifiable from the repository.
4. **Deployment:** no Vercel project is linked in this workspace, and no preview has been created or verified.
5. **Global rate limiting:** the API limiter is per instance and in memory. Configure a Vercel Firewall rate-limit rule for `/api/v1/incidents` for a real global limit.
6. **CSP:** shipped as `Content-Security-Policy-Report-Only`. Switch to enforcing after a clean preview run with the live map.
7. **Monitoring:** no error or uptime monitoring is configured. Choosing a service is an architecture decision.
8. **Device testing:** the platform checks listed above.

## Known limits (decisions, not defects)

- Routes whose padded bounding box exceeds `INCIDENT_MAX_BBOX_DEGREES` (default 5°), for example Bangkok to Chiang Mai, get a 400 error and show the retryable "ยังตรวจสอบรายงานเหตุการณ์ตามเส้นทางไม่ได้" state.
- Platform request logs (Vercel) record request URLs. Incident queries are snapped outward to a 0.05° grid so they do not carry the precise user position, but the approximate area is still visible to the platform.
- Mock fixtures (about 5 KB) are included in the production bundle because mock mode is chosen at runtime by `VITE_DATA_MODE`.
- Fonts come from Google Fonts and are not cached offline. The offline shell falls back to system fonts.
