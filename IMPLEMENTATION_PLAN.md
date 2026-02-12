# Implementation Plan

## Current Status (Done)
- Frontend stack confirmed: Next.js (App Router).
- Backend stack confirmed: Python (FastAPI).
- AI service explicitly deferred for now.
- DynamoDB tables confirmed: `Users`, `Transactions`, `PlaidItems` in `sa-east-1`.
- Backend scaffold created:
  - `GET /health`
  - `GET /transactions?userId=...` (queries existing DynamoDB data)
  - Config via `.env`
- Frontend scaffold created with a mobile-only preview frame.
- Dashboard UI styled to match the provided mobile design.
- Bottom navigation routes to placeholder pages (`/home`, `/graphs`, `/bot`, `/calendar`, `/planning`).
- Shared `ScreenShell` applied to placeholder pages for consistent look.
- `logo.svg` added to the Chat Bot floating button in the bottom bar.

## Next Steps (Planned, Not Started)
1. **Frontend polish + UX**
   - Decide how month selection should behave (filter, scroll, or static).
   - Decide what happens on transaction click (details view, modal, or no action).
   - Add active state styling for current bottom-nav item.
2. **Backend API expansion**
   - Add `GET /users/{userId}` to load profile data if needed by UI.
   - Add basic pagination/sorting for transactions (date desc).
   - Add error handling for missing user or empty results.
3. **Data usage**
   - Decide whether to keep using separate tables or migrate to a single-table model.
   - Define any derived fields (monthly totals, categories) computed server-side.
4. **Auth (Deferred)**
   - Pick auth strategy (JWT vs session cookies).
   - Implement login + password hashing.
5. **Plaid (Deferred)**
   - Implement Link + token exchange only after UI/data flows are confirmed.
6. **Testing & Dev Workflow**
   - Add minimal backend tests for DynamoDB query.
   - Add frontend smoke test for `/dashboard` data load.

## Open Decisions
- Final UX for month tabs and transaction rows.
- Whether the mobile UI stays as a fixed-width preview or later supports responsive tablet/desktop.
- Whether to keep separate DynamoDB tables or consolidate later.
