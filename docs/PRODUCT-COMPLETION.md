# Product completion checklist

Before production launch:

1. Install root and `billion-rush/` dependencies and run the Vite production build.
2. Apply `supabase/migrations/0018_billion_rush_store.sql`, configure server-only Paystack test secrets, deploy the four store Edge Functions, and test successful/failed/cancelled/repeated payments.
3. Test all regular lifeline inventory limits, Extra Time +10-second behavior, Second Chance replacement-question behavior, and free restart from Game Over.
4. Test active-session invalidation on Android app switch, lock, background, page hide, and restart; verify lost and completed results remain valid when leaving results.
5. Test score sharing with image attachment and the download/challenge invitation on a real Android phone.
6. Generate the Capacitor Android project, open it in Android Studio, build and install it, and test payment return and inventory sync on a real device.
7. Complete privacy, support, refund, payment-disclosure, and distribution checks.

The source changes do not mean that the payment backend has been deployed or that the APK has been built. Do not accept live payments until end-to-end testing passes and Paystack approves the business model.
