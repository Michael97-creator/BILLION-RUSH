# Before public launch

- [ ] Install dependencies and pass the Vite production build.
- [ ] Apply store migration `0018_billion_rush_store.sql`.
- [ ] Set `PAYSTACK_SECRET_KEY` (test key) and `BR_PUBLIC_APP_URL` as Supabase Edge Function secrets.
- [ ] Deploy `paystack-initialize`, `paystack-verify`, `get-store-inventory`, and `consume-store-item`.
- [ ] Verify regular lifeline packs: ₦200 for 1 use and ₦500 for 3 uses for each of 50/50, AI Poll Audience, and Call-a-Friend.
- [ ] Verify Extra Time: ₦200 for 1 use, ₦800 for 5 uses, +10 seconds exactly, no free uses, maximum five per Rush and once per question.
- [ ] Verify Second Chance: ₦300 for 1 use, ₦500 for 2 uses, no free uses, maximum two per Rush, different replacement question at the same ladder position, and no checkout after a loss.
- [ ] Confirm purchases are server-verified, duplicate callbacks grant only once, and inventory survives app restart.
- [ ] Confirm failed/cancelled payments grant nothing.
- [ ] Confirm active games are voided when the app is left and never restored; results screens are not voided just for leaving.
- [ ] Build and test the Android APK on a real device.
- [ ] Confirm Paystack approves the digital game items before live mode.
