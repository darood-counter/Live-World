DriverLink update package

Included:
- index.html
- css/main.css
- js/app.js
- firestore.rules

IMPORTANT:
Keep your existing js/firebase.js file. It contains your Firebase project configuration and is intentionally not replaced by this package.

Deploy website files:
1. Upload/replace index.html, css/main.css, and js/app.js in the same folders in your GitHub repository.
2. Keep js/firebase.js unchanged.
3. Commit and push the changes, then wait for GitHub Pages/your hosting provider to deploy.

Publish Firestore rules:
1. Open Firebase Console > Build > Firestore Database > Rules.
2. Replace the entire Rules editor content with firestore.rules from this package.
3. Click Publish.

Map:
- Uses Esri World Street Map tiles, using the global/default English-oriented map labels. Some official place names may still vary by source data.

Security:
- Signed-in users can read public driver profiles and live presence.
- Users can write only their own private profile and live presence.
- Chats are readable only by their members.
- Block records are readable only by their owner or the user who is blocked.
- Email/phone remain in private users documents and are not published in publicProfiles.

Run the app over HTTPS. Browser geolocation does not work reliably on insecure HTTP pages.
