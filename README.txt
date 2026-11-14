DriverLink — OpenStreetMap update

This package polishes DriverLink map pins and makes driver-to-driver messaging easier. It retains the existing Firebase integration references, saved-pin behavior, driver grouping, profiles, chat collections, and Firestore rules.

MAP
- OpenStreetMap standard tiles are the primary map source. No map API key is required.
- If several map tiles fail to load, the app switches once to CARTO's light OSM-based map as a backup.
- The map starts centered on the saved driver location when available, otherwise Dubai.
- Reverse-geocoded address language is requested in English where supported by the geocoding service. Tile labels depend on the map provider's available name data.

INSTALL
1. Extract this ZIP.
2. In the exact GitHub Pages folder serving the existing DriverLink website, replace index.html, css/main.css, and js/app.js with the files in this package.
3. Keep your existing js/firebase.js unchanged. It is intentionally not included in this ZIP because it contains your project's Firebase configuration.
4. Do not replace or delete any other Firebase files or Firestore data.
5. Commit/push the files and wait for GitHub Pages to deploy. Then reload the site (preferably in a private/incognito tab).

PIN & MESSAGING UPDATE
- Driver pins now use a consistent branded taxi-pin design instead of the default Leaflet marker. The saved pin and offline center pin use matching styling.
- A single driver pin opens a profile preview with View details and Message actions.
- A grouped pin shows each driver with separate Details and Message buttons.
- Message opens the existing one-to-one chat, switches to the Chat tab, and focuses the message field. The profile dialog also has a clearly labelled Send Message button.

NOTES
- Chat still depends on the existing Firebase Authentication, Firestore database, and published Firestore rules. This package has not been live-tested against your Firebase project.
- OpenStreetMap data and public tile services have usage policies and availability limits. For a large production audience, use a tile provider/hosting plan appropriate to expected traffic.
