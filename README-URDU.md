# Live World — Phase 1 (Account System)

یہ GitHub Pages کے لیے static website ہے۔ Firebase Project خودکار طور پر نہیں بنتا؛ پہلے Firebase Console میں project بنائیں۔

## 1) Firebase Project بنائیں
1. https://console.firebase.google.com/ کھولیں۔
2. Add project دبائیں اور نام `Live World` رکھیں۔
3. Authentication > Sign-in method میں Email/Password فعال کریں۔
4. Firestore Database بنائیں (Production mode منتخب کریں)۔
5. Project settings > General > Your apps > Web app سے config حاصل کریں۔
6. config کی values `js/firebase-config.js` میں درج کریں۔

## 2) Firebase Rules لگائیں
- Firestore Rules میں `firestore.rules` کا متن paste اور Publish کریں۔
- Realtime Database ابھی Phase 1 میں استعمال نہیں؛ اگر بنائیں تو `database.rules.json` کے مطابق بند رکھیں۔
- Storage Rules میں `storage.rules` کا متن paste اور Publish کریں۔

## 3) GitHub Pages
1. GitHub پر نئی repository `live-world` بنائیں۔
2. ZIP extract کرکے تمام فائلیں repository کی root میں upload کریں۔
3. Settings > Pages > Deploy from a branch > `main` > `/ (root)` منتخب کریں۔
4. Save کریں۔ چند منٹ بعد GitHub Pages URL کھولیں۔

## 4) Authorized domains
Firebase Authentication > Settings > Authorized domains میں اپنے GitHub Pages host کو شامل کریں، مثال:
`YOUR-GITHUB-USERNAME.github.io`

## 5) Phase 1 Test Checklist
- Firebase config placeholder باقی ہو تو setup warning آتی ہے۔
- Signup: نام، email، password، confirm password اور terms لازم ہیں۔
- Duplicate email پر واضح error آتا ہے۔
- Verification email بھیجی جاتی ہے۔
- Login اور logout۔
- Forgot password۔
- Profile read/update اور UID۔
- غیر لاگ اِن صارف Firestore user profile نہیں پڑھ سکتا۔

## اہم حدود
- Phase 1 میں Map، GPS، Chat، Friends، Presence، Push Notifications اور Admin Panel شامل نہیں۔
- Public GitHub repository میں Firebase web config آ سکتی ہے، لیکن Firebase Security Rules لازمی ہیں۔ Service account/private keys کبھی upload نہ کریں۔
- موجودہ rules ہر user profile کو صرف اسی صارف تک محدود رکھتے ہیں۔ اگلے مرحلے میں public-safe profile fields کے لیے الگ public profile model بنائیں گے؛ مکمل phone/email public نہیں ہوں گے۔
- Firebase Auth email verification صرف email بھیجتا ہے؛ verified status کے مطابق account gating ابھی شامل نہیں۔
- Firebase billing/quotas اور email delivery limits اپنے Firebase console میں چیک کریں۔
