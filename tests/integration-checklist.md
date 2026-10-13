# Integration test cases

1. New user can sign up and receives a profile.
2. Player cannot select `questions.correct_option` directly.
3. Start-rush returns exactly one public question id and a 30-second deadline.
4. Answer after deadline is rejected.
5. Correct answer advances exactly once.
6. Duplicate answer cannot create two answer rows.
7. Lifeline calls do not modify `current_deadline`.
8. Walk-away changes an active session once.
9. Completed session can create exactly one share token per generated share.
10. Two ready players can start one match only once.
11. Both players receive the same question id.
12. Opponent answer remains private until reveal.
13. Round scoring is derived from stored answer/deadline state.
14. Final result is written once.
15. Reconnect restores authoritative match state.


## Billion Rush local store / anti-cheat release checks

16. Every genuinely new Rush resets two free uses of each regular lifeline.
17. Purchased regular lifeline inventory persists between runs and is separate from free uses.
18. Regular lifelines cannot be used more than five times each in one Rush.
19. Extra Time costs ₦200 for one or ₦800 for five, has no free uses, adds exactly 10 seconds, cannot be reused on one question, and cannot exceed five uses per Rush.
20. Second Chance costs ₦300 for one or ₦500 for two, has no free uses, cannot exceed two uses per Rush, and only appears on Game Over when a purchased use is available.
21. Second Chance never opens checkout on Game Over; it consumes one owned use and replaces the failed question with a different unused question at the same ladder position.
22. A failed/cancelled Paystack transaction grants no inventory.
23. A successful test transaction grants only the server-defined product quantity and amount.
24. Repeated payment verification/callback grants inventory once only.
25. Purchased item consumption decrements server inventory once; local storage alone cannot grant purchases.
26. Backgrounding, app switching, locking, or navigating away while active clears the session and it cannot be restored after app restart.
27. Opening built-in lifeline UI does not invalidate the session.
28. Leaving a lost/completed results screen does not invalidate that result.
29. Android payment return and foreground inventory sync work after the player returns from Paystack checkout.
30. The shared score challenge still directs friends to the Android download page, not browser gameplay.
