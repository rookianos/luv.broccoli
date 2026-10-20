# VKTN · GitHub Pages TEST SITE

Upload `index.html`, `app.js`, `admin.html`, `admin.js`, `style.css`, `engine.js` into the root of a GitHub repository. Go to Settings > Pages, choose Deploy from a branch, main, /(root). Do **not** upload the ZIP itself.

DEMO: all accounts, credits, referrals, checkout confirmations and admin photos are simulated with browser localStorage. Test sign-in needs only any valid-looking email (no email sent). This is not actual identity verification. Anyone can reset, fake or edit local demo data. NEVER use the static mock system for real payments or trusted user accounts.

Test universal promo: `VKTN-TEST-UNLIMITED` (+1 credit once per local demo account). Test checkout adds credits without charging. Referral: sign in with account A, copy referral URL, sign out, open URL, sign in with account B and buy a simulated pack; A gets +1 credit. Same browser is simplest because simulated accounts are not shared between devices.

Admin: `admin.html`. Four image slots are stored in your own browser only, not published to visitors. To publish actual images globally, use the real server backend or commit images into the repository.


## English-only stabilisation update
- English only; language selector removed.
- Single perpetual animation loop, improved preview scheduling and responsive speed.
- Fixed randomize phase assignment, referral-link clipboard error handling, and demo SVG validation.
- PDF export is removed. Only SVG (demo credit) and PNG (600 × 900, free) are available.
- Upload a TTF, OTF, WOFF or WOFF2 font (maximum 8 MB). Imported fonts are embedded into exported SVG as font data, not converted into outlines. Browser SVG/PNG font rendering may vary, so verify exported files in your design applications.
- IMPORTANT: Payments, accounts, referrals, and admin content on GitHub Pages are local-browser simulations only. Never use for real sales.
- The SVG contains text objects; font portability and output fidelity must be tested before selling.
- Automated Chromium UI tests were not possible in this execution environment (browser navigation blocked); static JS checks passed.

## Font upload
Upload TTF, OTF, WOFF or WOFF2 (max 8 MB). Font is used in preview/PNG and embedded in SVG as an encoded font file (SVG text is not converted to vector outlines). Check font license permissions for embedding/distribution. The browser-only demo does not upload fonts to a server. PDF export has been removed.
