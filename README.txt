DriverLink — OpenStreetMap update

This package updates the map provider only. It retains the existing DriverLink app files and behavior from the source package, including Firebase integration references, saved-pin logic, driver grouping, profiles, and chat.

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

NOTES
- This is a map-provider change, not a live Firebase deployment test.
- OpenStreetMap data and public tile services have usage policies and availability limits. For a large production audience, use a tile provider/hosting plan appropriate to expected traffic.
