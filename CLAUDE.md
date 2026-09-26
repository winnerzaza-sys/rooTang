# CLAUDE.md — รู้ทาง

These instructions apply to Claude throughout this repository.

## Required Reading

Before planning, coding, refactoring or reviewing, read these files completely:

1. `CLAUDE.md`
2. `IMPLEMENTATION_PLAN.md`
3. `UI_DESIGN.md`

Do not implement from memory or a partial summary. The current direction is a PWA; Swift, SwiftUI, MapKit and Liquid Glass specifications are obsolete.

If the documents conflict with a newer explicit user request, follow the request and update the affected documentation before implementation.

## Product

**รู้ทาง** is a mobile-first PWA that:

1. Shows Longdo/iTIC and Traffy Fondue incidents on a map.
2. Finds a driving route and reports incidents near that route in encounter order.
3. Provides a Nearby feed sorted by distance from the user.

User-facing name: `รู้ทาง`  
Internal project name: `roo-thang`  
Description: `ดูสิ่งที่จะเจอตลอดเส้นทาง`  
App icon: `assets/ru-thang-app-icon-1024.png`

Do not use the old name Road Advisor in new UI copy.

## Stack

- React
- TypeScript with strict mode
- Vite
- React Router
- Google Maps JavaScript API
- Google Routes API
- Google Places API
- Browser Geolocation
- Turf modules for geospatial matching
- Vercel TypeScript serverless functions
- `vite-plugin-pwa`
- Vitest + React Testing Library
- Playwright

Use Prompt for headings and Sarabun for body content.

## MVP Scope

Navigation has exactly two primary destinations:

- **แผนที่**
- **ใกล้ฉัน**

MVP includes:

- Origin/destination search
- Primary and alternative routes
- Selected-route incident pins
- Route findings in encounter order
- Incident details with source and timestamp
- Nearby feed with category filters
- Loading, empty, error, partial-data, permission-denied and offline states
- Installable PWA app shell

Do not add without explicit direction:

- Google Weather
- Qwen or another LLM
- Risk Score or route safety score
- Vehicle Profile
- Drive Mode or turn-by-turn navigation
- Voice guidance
- Authentication
- Database/cloud sync
- Push notifications
- Crowdsourced reporting
- Background location tracking

## Data Sources

- Use Longdo/iTIC Event Feed through the Backend adapter.
- Use Traffy Fondue GeoJSON through the Backend adapter.
- Never use Longdo Traffic Status feeds.
- Do not scrape provider websites.
- Do not let UI code parse raw provider payloads.
- Do not add production credentials to the repository.
- Confirm license, attribution, rate limits and cache policy before production.

## Architecture Rules

- Keep provider adapters on the server side.
- Normalize every provider into the shared `RoadIncident` model.
- Keep Google-dependent code behind interfaces so tests can mock it.
- Keep route-matching functions pure and independently testable.
- Centralize category corridor configuration.
- Validate coordinates, bounding boxes and upstream payloads.
- Use timeouts, response-size limits, cache and partial-failure handling.
- If one provider fails, use the other and expose `partial: true`.
- Do not persist or log precise user location or route history by default.
- Request approval before adding a major dependency or changing the agreed architecture.

## Route Behavior

For each Google route:

1. Convert the route path to a line representation.
2. Match normalized incidents using category-specific corridors.
3. Exclude unrelated incidents.
4. Treat parallel-road matches conservatively.
5. Filter resolved/expired reports when confidently known.
6. Identify candidate duplicates without aggressive merging.
7. Calculate route progression.
8. Sort matches in encounter order.

When the selected route changes, update these together:

- Selected polyline
- Visible incident pins
- ETA and distance
- Incident count
- Findings and their order

Never describe a proximity match as certain proof that an event is on the same road or direction.

## UI Rules

- Follow `UI_DESIGN.md` as the visual source of truth.
- Map is the primary content surface.
- Keep the route search card opaque and readable.
- On mobile, show route results in a bottom sheet.
- Use only two bottom-navigation items.
- Minimum touch target is 44 × 44 px.
- Primary actions are at least 52 px high.
- Never communicate category/status using color alone.
- Show source and freshness in incident cards/details.
- Support keyboard navigation, visible focus, screen readers, browser zoom and reduced motion.
- Do not redesign or introduce a new visual language unless requested.

## Safety Copy

Prefer:

- “มีรายงาน...”
- “พบรายงานเหตุการณ์ใกล้เส้นทาง...”
- “ใกล้เส้นทางประมาณ...”

Never claim:

- The road is definitely flooded.
- A route is safe.
- A road is certainly passable.
- Provider data is real-time unless explicitly guaranteed.

When no incident matches, show:

```text
ยังไม่พบรายงานเหตุการณ์ใกล้เส้นทางนี้
ข้อมูลนี้ไม่ใช่การยืนยันว่าเส้นทางปลอดภัยหรือผ่านได้แน่นอน
```

## PWA Rules

- Cache the app shell and static assets only by default.
- Do not present cached incident data as live.
- Show cached timestamps clearly.
- Maps, route search and updated incidents require internet.
- Respect safe-area insets in standalone mode.
- Keep the service-worker update flow recoverable.

## Testing Requirements

Add or update tests for changed behavior, especially:

- Longdo and Traffy normalization
- Missing/invalid coordinates
- Resolved/expired reports
- Haversine distance
- Route corridor matching
- Category-specific corridors
- Parallel-road false positives
- Incident encounter order
- Candidate deduplication
- Selected route and visible pins
- Nearby sorting/filtering
- Provider partial failure and timeout
- Location denied, empty, offline and error states
- Accessibility labels and keyboard focus

Automated tests must mock Google and provider responses. Do not incur live API costs in routine tests.

## Workflow

Before editing:

- Inspect repository status and preserve unrelated user changes.
- Identify the requested implementation phase.
- Read related models, tests and fixtures.
- State any blocker that changes scope or architecture.

While editing:

- Implement only the requested phase.
- Keep business and geospatial logic outside React components.
- Prefer small focused modules and semantic HTML.
- Never add real credentials.

After editing:

- Run formatting/lint if configured.
- Run TypeScript typecheck.
- Run relevant unit/component tests.
- Run relevant Playwright tests when the environment supports them.
- Build the production bundle.
- Report commands, actual results and blockers.

Never claim a command passed unless it was executed successfully.

## Definition of Done

A task is complete when:

- Requested behavior is implemented within the phase scope.
- `IMPLEMENTATION_PLAN.md` and `UI_DESIGN.md` are followed.
- Typecheck and relevant tests pass.
- Production build passes.
- New business logic has deterministic tests.
- Required UI and accessibility states exist.
- No secrets or unnecessary location history are introduced.
- Core flows remain usable with one provider unavailable.

End coding responses with:

```text
Implemented
- ...

Verified
- Commands and results

Remaining
- Out-of-scope work, blockers or decisions
```
