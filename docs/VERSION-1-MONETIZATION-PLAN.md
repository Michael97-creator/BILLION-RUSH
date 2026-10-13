# Billion Rush Version 1 monetization plan

## Launch strategy
- Launch ad-free through the Billion Rush download page.
- Start Nigeria-first with NGN prices. Keep the existing Supabase backend and Paystack as the payment provider; do not switch providers without discussing it first.
- No AdMob, interstitial ads, rewarded ads, or ad-based continuation in Version 1.
- Every new Rush starts with two free uses of each regular lifeline. Walk Away remains a free gameplay choice, not a paid item.

## Store prices
| Product | Price | Grant |
|---|---:|---|
| 50/50 | ₦200 | 1 additional use |
| 50/50 | ₦500 | 3 additional uses |
| AI Poll Audience | ₦200 | 1 additional use |
| AI Poll Audience | ₦500 | 3 additional uses |
| Call-a-Friend | ₦200 | 1 additional use |
| Call-a-Friend | ₦500 | 3 additional uses |
| Extra Time | ₦200 | 1 use; adds 10 seconds |
| Extra Time | ₦800 | 5 uses |
| Second Chance | ₦300 | 1 use |
| Second Chance | ₦500 | 2 uses |
| Existing Complete Lifeline Bundle | ₦2,000 | 2 additional uses of each regular lifeline; retained to avoid silently removing the existing offer |

## Gameplay purchase rules
- Free uses and purchased inventory remain separate.
- Regular lifelines have a maximum of five uses per Rush, counting free and purchased uses together.
- Extra Time has no free uses, can be used once per question, and is limited to five uses per Rush.
- Second Chance has no free uses and is limited to two uses per Rush. It must be bought before gameplay. After a loss, it may replace the failed question at the same ladder position, and the Game Over screen never opens checkout.
- All checkout is available only before a Rush begins.

## Payment implementation status
Server-side Paystack initialization, verification, idempotent inventory grants, and atomic inventory consumption are present in source. They are not live until the migration and Edge Functions are deployed, server-only test keys are configured, and successful/failed/cancelled/repeated transactions pass end-to-end tests. Do not rely on client-side success messages or local storage as proof of payment. Confirm Paystack approves this business model before live mode.

## Version 2
Reconsider ads only after Version 1 retention and purchase data justify the added integration and after distribution/ad-serving requirements are confirmed.
