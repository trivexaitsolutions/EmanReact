CUSTOMER LOGOUT ROLE-SELECTION FIX

Updated file:
app/user/profile.tsx

What changes:
- Customer logout no longer opens /user/login.
- Logout clears:
  customerSession
  workerSession
  activeRole
  newBookingDraft
- Navigation stack is reset to the root index page.
- The Worker / User type-selection page opens.
- Device Back cannot reopen the old customer dashboard/profile.

Install:
1. Extract this ZIP in the active Expo application root.
2. Allow overwrite of app/user/profile.tsx.
3. Restart Metro:

   npx expo start -c

Expected flow:
Customer Profile -> Logout -> Confirm -> Worker/User Selection Page
