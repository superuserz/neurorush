# NeuroRush — Monetization Roadmap

> This document tracks planned monetization features deferred from the initial launch.
> All items below are **not yet implemented**. The app currently uses a coins-only economy
> earned entirely through gameplay, which is fully compliant with App Store and Google Play.

---

## Phase 1 — Real In-App Purchases (IAP)

**Priority: High | Prerequisite for revenue**

Replace the current placeholder coin shop with real payment processing.

### Tasks
- Integrate `expo-iap` (wraps StoreKit 2 on iOS, Google Play Billing on Android)
- Create products in App Store Connect and Google Play Console:
  - `com.pixelbyte.neurorush.coins_500` — $0.99
  - `com.pixelbyte.neurorush.coins_1200` — $1.99
  - `com.pixelbyte.neurorush.coins_3000` — $4.99
- Implement purchase flow: `initConnection → getProducts → requestPurchase → validateReceipt → grant coins`
- Server-side receipt validation via backend (`/api/iap/validate`) to prevent fraud
- Handle purchase restoration for iOS (`restorePurchases`)
- Handle pending/cancelled purchases gracefully

### Notes
- Apple takes 30% commission (15% for small businesses via AppStore Small Business Program)
- Google Play takes 15% on first $1M revenue per year
- Both stores require the IAP SDK — you cannot use Stripe or external payment links for digital goods

---

## Phase 2 — Rewarded Ads

**Priority: Medium | Zero-friction monetization for non-paying users**

Let players watch an optional ad to earn coins.

### Tasks
- Integrate `react-native-google-mobile-ads` (AdMob)
- Register app in AdMob dashboard, get App ID and Ad Unit IDs
- Add App ID to `app.json` under `ios.googleMobileAdsAppId` and `android.googleMobileAdsAppId`
- Implement rewarded ad unit: user taps "Watch Ad → Earn 50 coins", ad plays, reward granted on `onRewarded` callback
- Implement interstitial ad: shown between rounds every N games (configurable)
- Add GDPR/ATT consent flow:
  - iOS: `requestTrackingPermissionsAsync` (expo-tracking-transparency) before loading ads
  - Both: Google UMP SDK consent form for EEA/UK users
- Declare ad usage in Google Play Data Safety form

### Notes
- ATT prompt (iOS 14.5+) is mandatory before showing personalised ads
- Without ATT consent, show limited ads (lower eCPM but still generates revenue)
- Test with AdMob test ad unit IDs during development — never click your own live ads

---

## Phase 3 — Season Pass / Battle Pass

**Priority: Medium | Recurring revenue + retention**

A limited-time progression track with free and premium reward tiers.

### Tasks
- Design season structure: 30-day season, 50 tiers, each tier unlocked by earning XP
- Free track: cosmetic rewards (bubble colour variants, title cards)
- Premium track ($2.99/season via IAP): exclusive animated bubble skins, bonus coins, premium avatars
- Backend: season definition stored in MongoDB, fetched on app load
- Frontend: Season Pass screen showing tier progress, reward previews, unlock state
- Automatic season rotation on server (cron job)

### Notes
- Battle pass model has proven high LTV in hypercasual games
- Keep premium rewards cosmetic-only to avoid pay-to-win perception and comply with loot box regulations

---

## Phase 4 — Cosmetic Item Shop

**Priority: Low | Expands spendable content**

Permanent cosmetic items purchasable with coins or real money.

### Items to design
- Bubble skins (colour gradient presets, animated skins)
- Trail effects on correct tap
- Explosion particle themes (currently fixed green/red)
- HUD themes (colour accent overrides)
- Player avatars / profile borders

### Tasks
- Design item catalogue and rarity tiers (Common / Rare / Epic / Legendary)
- Store selected cosmetics in `UserProfile` and apply in `BubbleSphere` and `ParticleEffect`
- Add "Featured" rotating section to store screen

---

## Phase 5 — Subscription (NeuroRush Pro)

**Priority: Low | Only viable once DAU is established**

Monthly/annual subscription removing ads and granting monthly coin allowance.

### Tasks
- Create subscription products in both stores (auto-renewable)
- Implement subscription status check on app launch via receipt validation
- `Pro` benefits: no interstitial ads, 500 coins/month, exclusive profile badge, early access to new categories
- Handle subscription expiry, grace period, and billing retry gracefully

### Notes
- Subscriptions require a clearly stated cancellation policy in the App Store listing
- Apple requires a free trial or introductory price to be disclosed prominently

---

## Pre-Monetization Prerequisites (do first)

These are required before any IAP or ads can go live:

| Item | Status |
|---|---|
| EAS Build configured for iOS + Android | Not done |
| App Store Connect listing created | Not done |
| Google Play Console listing created | Not done |
| Privacy policy published at `/privacy` | Done — `https://neurorush-app.vercel.app/privacy` |
| Age rating submitted (4+ / Everyone) | Not done |
| Data Safety form (Google Play) | Not done |
| ATT / GDPR consent flow | Not done |
| Backend receipt validation endpoint | Not done |
| AdMob account created | Not done |

---

## Revenue Estimate (illustrative, not guaranteed)

| Stream | Model | Rough benchmark |
|---|---|---|
| IAP coin packs | One-time purchase | $0.10–$0.50 ARPU in hypercasual |
| Rewarded ads | CPM $5–$20 (geo-dependent) | ~$0.01–$0.05 per DAU per day |
| Season Pass | $2.99/month, 2–5% conversion | Depends on retention |

Hypercasual games typically monetise primarily through ads. IAP conversion is low (1–3%) but high value. Focus Phase 1 (IAP) and Phase 2 (Ads) first.
