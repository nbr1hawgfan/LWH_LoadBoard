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
