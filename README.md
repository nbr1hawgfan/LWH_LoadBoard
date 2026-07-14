# Logistics Warehouse Operations Dashboard v2.0

This package is configured for:

- Load Board CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vTgw11TS3xBI37HrqoJmJSI1ZSy5mxhT6-9BBUzr3jj9119oUZwAIAI-caD4W3m0SwjQdE7Xd4Pazf_/pub?output=csv
- Current Inventory CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vR88eoG2Hhmq_JCsS_jZMnBiTWlcmehB4i0A5Z6BXZ2oykJ0KqGB6IhrZc0Tr5l5ZOYxtuy8OffpPL-/pub?output=csv

## Modules

- Operations Dashboard
- Load Board
- Calendar
- Leaflet Shipment Map
- Current Inventory
- Analytics
- User Settings and Themes

## Deployment

1. Extract the ZIP.
2. Upload the contents to the root of the existing GitHub Pages repository.
3. Replace existing files when prompted.
4. Keep the `icons` folder.
5. Wait for GitHub Pages to deploy, then hard refresh once.

## Inventory column recognition

The inventory importer recognizes common names including:

- LWH_ID, LWHID, ControlNumber, PalletID
- Customer, SubCustNm, SubCust
- ItemNm, Item, ItemNumber
- ItemDescription, ItemDesc, Description1
- LotNum, Lot, LotNm
- Qty, Quantity
- Units, UnitCount
- BayName, Bay, Location
- Warehouse, WHSE
- DateReceived, ReceivedDate, SystemCreatedOn, CreatedOn
- AgeDays, DaysInInventory, DaysOld

The parser is deliberately flexible because the published inventory CSV could not be directly inspected during this build.

## Map

The map uses Leaflet and OpenStreetMap tiles. City coordinates are looked up through Open-Meteo geocoding and cached in each browser.

## Privacy

Both published Google Sheets CSV feeds are public URLs. Do not include confidential pricing, credentials, private contact information or sensitive customer notes.


## Version 2.0.1 loader fix

- Load Board and Inventory feeds load independently.
- One failed source no longer prevents the entire dashboard from opening.
- Each CSV is retried using both the plain published URL and a cache-busted URL.
- Added a 45-second timeout and validation that Google returned CSV rather than an HTML error page.
- Error messages now identify the failing source.


## Version 2.1.0

### Data architecture
- Removed CSV data caching from localStorage.
- Only user settings and small city-coordinate lookups remain stored locally.
- Load Board, Inventory, and Labor feeds load independently into memory.
- One failed feed does not stop other modules.

### Labor source
https://docs.google.com/spreadsheets/d/e/2PACX-1vRihZPpC8D0OvPHt44DZaH9d5SiooI2lPczdtw6vtApjEC5eKH_JC8wb3ds-IC4OByZOhwIDRYybCzJ/pub?gid=0&single=true&output=csv

Recognized columns:
Work_Date, Day_Of_Week, Employee_Name, Employee_Type,
Time_Clock_Location, Warehouse_Code, Total_Hours, Regular_Hours,
Overtime_Hours, Hourly_Pay_Rate, Daily_Base_Wages,
Benefits_21pct, Daily_Actual_Cost.

## Version 2.2.0 — visual redesign

- Replaced the generic rounded-card look with a flatter, denser "dock ledger" design language: hairline-bordered panels, a joined KPI ledger strip in place of individual shadow boxes, and manifest-ticket style load cards.
- All numeric values (KPIs, clock, bar chart figures, table columns) now use tabular monospace figures (IBM Plex Mono) so numbers line up and scan quickly across dense screens.
- Headings, eyebrows, nav labels and buttons use a condensed display face (Barlow Condensed) for a dock-signage feel; body copy stays on Inter for readability.
- Default accent color changed from blue to the maroon (#7a1230) used across the rest of the LWH tool suite, for brand consistency. Existing theme options (Warehouse Blue, Forest, Crimson, High Contrast) and the custom accent color picker are unaffected.
- Added a wide-desktop breakpoint (1440px+) that expands the Dashboard and Analytics grids to 4 columns to make better use of large monitors.
- Tables now have zebra striping and a hover highlight for easier row-tracking in Labor and Inventory table views.
- No functional or data changes — this release only touches `styles.css`, the topbar markup in `index.html`, and font/version metadata.

## Version 2.3.0 — shipment map rewrite + refreshed icons

- Replaced the Leaflet/OpenStreetMap tile map with a self-contained flat SVG map of the continental US. State outlines are bundled locally in `us-map-data.js` (no tile server, no map library, nothing that depends on the container being a stable pixel size at the instant it initializes — which was the likely cause of the map occasionally rendering incorrectly).
- Cities are plotted as proportional dots sized by shipment volume (more loads = bigger dot), colored in the brand accent, matching the flatter design language instead of colorful OSM tiles and rounded Leaflet zoom controls.
- Removed the "Group nearby cities" and "Fit All" controls — with the whole map always in view there's nothing to fit or cluster. Added a simple dot-size legend instead.
- City geocoding still uses the free Open-Meteo geocoding API (unchanged, cached in the browser as before) — only the rendering layer changed.
- Alaska, Hawaii, and Puerto Rico aren't drawn on the map (kept the projection to the continental US for a clean, undistorted layout); shipments to those areas still show up in the Visible Cities list.
- Regenerated `icon-192.png`, `icon-512.png`, and `icon-512-maskable.png` so the "OPERATIONS" text uses the new maroon brand accent instead of the old blue.

## Version 2.3.1 — map range + deploy-safety fix

- **Root cause of the console errors after the last deploy:** GitHub Pages' CDN doesn't invalidate every file at exactly the same moment after a push. For a few minutes after deploying, it's possible for the browser to fetch a freshly-updated `app.js` alongside a still-stale cached `index.html` (or vice versa). That's what produced both the leftover Leaflet integrity error (from the old HTML) and the `US_STATES is not defined` error (new `app.js` running without the old HTML knowing to load `us-map-data.js` first).
- **Fix:** `styles.css`, `app.js`, and `us-map-data.js` are now loaded with a `?v=2.3.1` version query string in `index.html`, and the service worker's precache list matches. Bumping that version string on every future release forces browsers to treat it as a brand-new file rather than reusing a stale cached copy — this whole class of mismatch shouldn't recur.
- `renderMap()` now checks that `us-map-data.js` actually loaded before using it, and shows a plain-language message in the map panel instead of throwing an error if it didn't.
- The Shipment Map now defaults to **Today** (same Today / Next 7 Days / Next 31 / All range control as the Load Board), instead of plotting every load ever received. This makes the map load faster (far fewer cities to geocode) and gives a cleaner day-to-day snapshot; switch ranges any time to see more.
- If you still see the Leaflet error after this update: do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R), and if it persists, open the same URL in a private/incognito window to confirm it's a caching artifact rather than a real file problem. The "Banner not shown" message in the console is expected — that's Chrome just noting that we're deferring the install prompt to our own Install button, not an error.

## Version 2.4.0 — inventory data & aging filter

- Removed the "30+ / 60+ / 90+ / 180+ days" aging dropdown from the Inventory filters. (Open item for what replaces it — see conversation.)
- Inventory cards and table rows now open a full detail dialog (same pattern as Load Board) showing every field from the sheet: LWH ID, Warehouse, Customer, Customer ID, Bay, Lot, Units, Qty, Received date, Age, Receipt Reference, **Vendor**, **Comments**, and the two spare reference columns (Unique2/Unique3) if your sheet has them populated.
- Table view now also shows a Vendor and Received Date column.
- Fixed a data bug: `Customer ID` was silently falling back to the `Comments` column when a dedicated Customer ID column wasn't found, which meant comment text could show up mislabeled as a customer ID. It's now its own field.
- Inventory filters are down to Customer / Item / Bay (Age removed as above).

## Version 2.5.0 — Received date range filter + Scan-to-lookup

### Inventory
- Replaced the removed age-bucket filter with a proper **Received from / Received to** date range.

### Scan
- New **Scan** button in the top bar. Two ways to use it:
  - **Handheld scanner** (or any USB/Bluetooth scanner that types like a keyboard): click Scan, then scan — it acts like typing into the box and pressing Enter, no camera permission needed. This works on any device.
  - **Camera** (Chrome/Edge/most Android browsers, via the browser's native barcode API): tap "Use Camera" and point it at a barcode or QR code. Not currently supported in Safari/iOS — the manual/handheld-scanner path always works there instead.
- A scan is matched exactly against Pro Number, LWH ID, Item, and Lot across whatever's currently loaded. One match jumps straight to that record's detail view; multiple matches show a short pick list; no match offers to drop the code into the search box instead.
- **Scope note:** this is a read-only lookup accelerator over the CSV data already in the browser — it does not write anything back to birdsEye. A true scan-driven bay-move (or other write-capable scanning) needs your IT company's backend and is tracked separately from this app.

## Version 2.5.1 — camera scanning ported from the Toolkit (iPhone-reliable)

- Replaced the native `BarcodeDetector` camera scan (Chrome/Android only) with **html5-qrcode** (pinned to `2.3.8` via unpkg), the same library your Warehouse Toolkit switched to after finding the native API unreliable on iPhone. Camera scanning now works the same way, and about as reliably, in both apps.
- The library is version-pinned (`@2.3.8` is an immutable URL on unpkg, unlike `@latest`), so this doesn't carry the same staleness risk as the earlier Leaflet CDN issue.
- Camera picks the rear-facing camera by device label first, falls back to `facingMode: environment` if that lookup fails — same order the Toolkit uses.
- Handheld-scanner and manual typing continue to work everywhere regardless of camera support, same as before.

### Labor module


- Today, last 7 days, current Sunday–Saturday workweek, last 31 days, or all.
- Employee type, employee name, clock location, warehouse and minimum-OT filters.
- Employee, hours, regular hours, overtime and actual-cost KPIs.
- Warehouse hours, warehouse cost, employee-type and OT-leader summaries.
- Full labor detail table.
