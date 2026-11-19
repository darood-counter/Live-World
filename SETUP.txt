DriverLink — Profile, Driver ID, and Password Update

WHAT CHANGED
- Signup now asks the driver to choose a unique Driver ID (3–20 letters, numbers, hyphens, or underscores). IDs are stored in a reservation collection so two new accounts cannot claim the same ID.
- Profile includes “I am working in” with Day Shift / Night Shift, shown in driver map details and the profile view.
- Profile includes Change Password. The current password is re-authenticated before updating the password.
- Map group / driver Profile View now opens the profile modal reliably and displays Driver ID along with name, city, shift, About me, saved location visibility, and mobile number.
- Firestore Rules updated for the shift field and unique Driver ID reservation records.
- Chat now has Clear chat history. It deletes the conversation messages for both participants after confirmation.
- The header Online/Offline button has been removed. A distinctive Online/Offline control now appears in the map controls in place of Find Drivers.
- Forgot Password explains expired / already-used links and directs the user to request the newest reset email. Firebase controls action-link expiry; client code cannot extend it.

INSTALL
1. In your existing GitHub Pages project, replace:
   - index.html
   - css/main.css
   - js/app.js
   - js/firebase.js
   - firestore.rules (publish these rules in Firebase Console > Firestore Database > Rules; required for Clear chat history)
2. Keep your existing js/firebase-config.js file unchanged. The supplied js/firebase.js imports that file.
3. Do not delete or replace your Firebase project configuration or existing Firestore data.
4. Commit/push and wait for GitHub Pages to deploy. Reload the site in a private/incognito tab.

IMPORTANT NOTES
- This package was syntax-checked and its ZIP integrity was verified. It was not connected to your live Firebase project, so live signup, chat-history deletion, map profile display against live records, online/offline status updates, password reset delivery, and password change have not been tested against your project.
- If a newly requested password-reset email still opens as expired, check Firebase Console > Authentication > Templates > Password reset and ensure the action handler / authorized domain is correctly configured. Firebase controls the action-code validity window; an expired link must be replaced by a newly requested link.
- Existing accounts keep their current Driver IDs. Their missing shift field defaults to Day Shift until they save their profile.
- Keep js/firebase-config.js in the same js folder; it is not included because it contains your project-specific Firebase settings.
