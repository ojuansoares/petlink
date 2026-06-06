# PetLink — Session Context

## Goal
- Implement remaining RFs: location search filters (RF20 sub-features), then temperature alerts (RF26), then export (RF24), backup (RF28); skip geofencing (RF22)

## Constraints & Preferences
- Use app's standard green color scheme (`colors.primary`) everywhere
- Avoid hardcoded orange (`#F97316`)
- Prefer `RouteLine` over `MapView` for captured/shared composites (avoids SurfaceView z-order issues)
- Server errors must not leak raw English messages to the user
- Pet-friendly places use a **voting system per user** (not a global boolean toggle) — each user votes, count shows "X usuários consideram como Pet Friendly"
- OSM type labels must display in **Portuguese** (e.g. "Clínica Veterinária" not "veterinary")
- Category filter pills must show only the 6 categories compatible with the system (vet, petshop, park, hotel, beach, other)
- Temperature alerts via server-side cron + Open-Meteo (free, no API key) + push notifications

## Progress
### Done
- **All 26 RFs from README handled** — 24 implemented, 2 skipped (RF22 Geofencing, RF28 Google Drive)
- **RF20 — Location search filters (step 1):** PetFriendly voting system, category filter pills, OSM type labels in Portuguese
- **RF26 — Temperature alerts:** Open-Meteo integration, server cron every 2h, weather widget on HomeScreen, toggle in settings
- **RF24 — Export JSON/CSV/PDF:** Server endpoint with 8 parallel queries, mobile modal with format picker (JSON/CSV/PDF), download + share

## Next Steps
- *(none — all RFs complete)*
