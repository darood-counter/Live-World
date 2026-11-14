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
- Set on Map lets the driver choose one fixed point. Its address and coordinates are saved in Firestore; the Online button never requests GPS or changes this saved point.
- My Saved Location centers the map on the already saved point. Set on Map is the only way to choose or change that point. GPS, live location, and continuous tracking are not used.
- The saved location stays fixed until the driver saves another one. Offline hides the marker but does not delete the saved location.
- Every Online driver, including your own account, appears at their saved map point. Offline drivers disappear from the map but their saved locations remain stored. Nearby online drivers are grouped; tapping a numbered group lists each driver with View Profile and Chat (Chat is not offered for your own account).
- The map fills the available page area on mobile and desktop.
- Chat list now shows unread message counts and clearer conversation previews. Existing account login/signup, driver directory, chat, profile, and green/gold theme are retained.

Deploy website files:
1. Replace index.html in the website root.
2. Replace css/main.css and js/app.js in their existing folders.
3. Keep js/firebase.js exactly as it is.
4. Commit/push and wait for hosting to deploy.

Firestore Rules:
- Compare the included firestore.rules with the Rules currently published in your Firebase project.
- If you already published the matching rules, do not publish them again. If they differ, update them so signed-in drivers can read publicProfiles and each owner can update their own profile, onlineStatus, and savedLocation.

Important existing data:
- Old accounts without onlineStatus are treated as Offline. Save a fixed point using Set on Map before tapping Go Online. Going Online only changes status; it never reads GPS or changes the saved location. Offline keeps the saved location.
- Old presence records are not used by the new map. Drivers should select and save their fixed location on the map once.
- Location visibility is limited to signed-in members through publicProfiles read rules.
