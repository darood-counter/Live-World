DriverLink update — Saved Pin and GPS fix

This update keeps the existing DriverLink pages and Firebase setup.

Changes:
- Go Online requests the phone's current GPS and saves it as the driver's Saved Pin in Firestore.
- The Saved Pin is fixed and separate from the blue GPS dot.
- While Online, the blue GPS dot follows the device location; it does not move the Saved Pin.
- Go Offline stops GPS tracking but keeps the Saved Pin saved.
- Your own Saved Pin remains visible on your map while Offline and Online.
- Drag your Saved Pin marker to move it; the new position is saved to Firebase automatically.
- The Pin Point button still lets you select a point by tapping the map.
- Other signed-in drivers see your Saved Pin only while you are Online.

IMPORTANT:
- Keep your existing js/firebase.js file. It is intentionally not included in this ZIP.
- Upload/replace index.html, css/main.css, and js/app.js at the same GitHub Pages folder used by your live site.
- Do not delete or replace js/firebase.js.
- The supplied firestore.rules are unchanged from the prior package; only publish them if they match the rules currently used by your project.
- GPS requires HTTPS and browser location permission.
