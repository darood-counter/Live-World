DriverLink update — Full-screen map, GPS dot, Saved Pin and driver profiles

Included files:
- index.html
- css/main.css
- js/app.js
- firestore.rules

Keep your existing js/firebase.js exactly as it is. It is not included because it contains your Firebase project configuration.

Map behavior:
- The Location page is a full-screen map with only essential floating controls.
- Current GPS button requests the device's current location and displays a blue GPS dot. While Online, the dot continues updating locally on this device using GPS. It is not written to Firebase and is not broadcast to other drivers.
- Saved Pin is separate from GPS. Use the Pin button, move the map, then tap the chosen place to save it. The saved coordinates and address are stored in both the private user document and public driver profile.
- Going Online shows the fixed Saved Pin to other signed-in drivers. Going Offline hides that driver's public map marker but does not delete the saved pin.
- When Offline, your own saved pin remains visible only on your map. GPS current-location button still works; Pin selection can be started from the current map view.
- Drivers saved within 75 metres are grouped. Tapping the group shows each driver's profile and chat actions.
- The public profile includes the mobile number because you requested that other drivers can see it. This makes the number visible to signed-in DriverLink users. Email remains private.

Deploy:
1. Replace website root index.html.
2. Replace css/main.css and js/app.js in their existing folders.
3. Keep js/firebase.js unchanged.
4. Compare firestore.rules with your currently published rules. If they differ, publish the included rules; they allow the public profile phone field.
5. Test GPS permission on HTTPS. GPS will not work reliably on an insecure HTTP website.
