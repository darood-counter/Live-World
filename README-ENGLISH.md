# Live World — Website MVP (UAE-first)

This is a website-only update for GitHub Pages. Android is not included.

## Included
- Email/password signup, login and password reset.
- Required mobile number on signup and profile edit (phone is stored privately in `users/{uid}`). This validates a UAE-friendly phone format; it does **not** verify ownership by SMS.
- English interface with UAE cities and Dubai as the default map view.
- Leaflet/OpenStreetMap map. Location sharing is OFF by default and requires browser permission.
- Public map uses coordinates rounded to 2 decimal places (roughly kilometre-scale, not an exact GPS pin). This is still approximate location data; users should only enable sharing if comfortable.
- Search public profiles, direct chats, block and report controls.

## Important before publishing
1. Replace repository files with the files in this package, keeping `index.html` at repository root and preserving `css/` and `js/` folders.
2. Publish `firestore.rules` in Firebase Console → Firestore Database → Rules.
3. Firebase Authentication → Sign-in method: enable Email/Password.
4. Firebase Authentication → Settings → Authorized domains: add `darood-counter.github.io`.
5. Google Cloud API key: keep HTTP referrer restriction `https://darood-counter.github.io/*`. Do not remove APIs without testing. Firebase API keys are public identifiers, not admin secrets; Firestore rules protect data.
6. GitHub Pages: deploy `main` branch, root folder.

## Required Firestore collections
The app creates `users`, `publicProfiles`, `presence`, `chats/{chatId}/messages`, `blocks`, and `reports` documents as needed.

## Security and production limitations
- This is an initial functional MVP, not a fully audited production social network.
- Phone number is mandatory as a field, but no SMS OTP verification is implemented.
- Public profiles and approximate presence are visible to signed-in users. Do not put phone/email in `publicProfiles`.
- Add App Check, abuse rate limits, moderation/admin workflows, account deletion, data retention controls, and age-appropriate safety processes before broad public launch.
- Firestore may request a composite index for chat listing; use the index creation link shown in the browser console if prompted.
- Geolocation requires HTTPS; GitHub Pages provides HTTPS.
