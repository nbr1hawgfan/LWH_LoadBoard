# LWH Load Board PWA

The app is already configured to read this published Google Sheets CSV:

https://docs.google.com/spreadsheets/d/e/2PACX-1vTgw11TS3xBI37HrqoJmJSI1ZSy5mxhT6-9BBUzr3jj9119oUZwAIAI-caD4W3m0SwjQdE7Xd4Pazf_/pub?output=csv

## Install on GitHub Pages

1. Create a GitHub repository.
2. Upload every file and folder from this package to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save and open the generated Pages address.

## Expected columns

CalendarDate, WHSE, Direction, SubCust, ProNumber, RelatedPro,
BillToReference, Carrier, Shipper, ConName, Status, ItemNm,
ItemDescription, Units, ItemQty, ItemMatchMethod, Instructions, Comments.

The app also works before item columns are added. Repeated rows for multiple items
are grouped into one load card.

## Privacy

A sheet published to the web is publicly accessible. Exclude confidential pricing,
credentials, private contact information, and sensitive notes.


## Version 1.1 additions

- Fixed date-only values shifting to the next day because of UTC parsing.
- Added a specific-date picker.
- Calendar displays all published dates regardless of the Load Board range selection.
- Calendar day counts and expandable `+ more` buttons.
- Clicking a calendar date can filter the Load Board to that date.
- Solid-black header and high-contrast black/white styling with bright accents.
- Live America/Chicago date and time.
- Current Fort Smith or Dallas weather using Open-Meteo without an API key.
