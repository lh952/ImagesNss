# Image Library Website

A public image library:
- Everyone can view images.
- Everyone can download images for free.
- Images are organized by category.
- Search and preview are included.
- Upload panel is protected by the requested password: `333784`.
- Firebase is used so uploaded images persist online and are visible to everyone.

## Important security note

The password gate in this static version is a **frontend gate**. Because the browser receives the JavaScript, a technically skilled visitor can inspect the source and bypass it.

For a real production site where only authorized people can upload, put the password verification on a server (for example a Firebase Cloud Function / Cloud Run endpoint) and do not place the password in public JavaScript.

## Firebase setup

1. Create a Firebase project at https://firebase.google.com/
2. Add a Web App.
3. Copy the Firebase config into `app.js`.
4. Enable:
   - Authentication → Anonymous
   - Firestore Database
   - Storage
5. Apply appropriate Firestore and Storage security rules.
6. Host the folder on GitHub Pages, Firebase Hosting, Netlify, Vercel, etc.

## Suggested public data model

Firestore collection:
`images`

Each document:
- title
- category
- keywords
- url
- storagePath
- originalName
- size
- type
- createdAt

## GitHub Pages

Upload `index.html`, `styles.css`, `app.js` and this README to a GitHub repository.
Then enable Pages from:
Settings → Pages → Deploy from branch → main → /(root)

## Recommended production improvement

For the requested upload-password behavior, use a backend endpoint that:
1. receives the password,
2. verifies it server-side,
3. creates a short-lived upload authorization/token,
4. allows the upload,
5. never sends the real password to the browser.

The public gallery and downloads can remain completely open.
