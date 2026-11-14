DriverLink update package — saved location + online status

Included files:
- index.html
- css/main.css
- js/app.js
- firestore.rules

IMPORTANT: Keep your existing js/firebase.js unchanged. It contains your Firebase project configuration and is intentionally not included.

What changed:
- Bottom navigation now has Location, Chat, Profile only.
- One header button switches Online / Offline. Status is saved in Firestore and restored after refresh/login.
- Online status is separate from GPS. No continuous tracking and no watchPosition() are used.
- Current Location uses a one-time GPS request. Set on Map saves the tapped point.
- The saved location stays fixed until the driver saves another one. Offline hides the marker but does not delete the saved location.
- Nearby online drivers are grouped; tapping a numbered group lists each driver with View Profile and Chat.
- The map fills the available page area on mobile and desktop.
- Existing account login/signup, driver directory, chat, profile, and green/gold theme are retained.

Deploy website files:
1. Replace index.html in the website root.
2. Replace css/main.css and js/app.js in their existing folders.
3. Keep js/firebase.js exactly as it is.
4. Commit/push and wait for hosting to deploy.

Publish Firestore rules:
1. Firebase Console > Build > Firestore Database > Rules.
2. Replace the rules with firestore.rules from this package and click Publish.

Important existing data:
- Old accounts without onlineStatus are treated as Offline until the driver taps Go Online.
- Old presence records are not used by the new map. Drivers should save a location once after updating.
- Location visibility is limited to signed-in members through publicProfiles read rules.
