# Leaxaro Auth — UX Audit
**Date**: 2025  
**Scope**: Registration, Login, Email Verification, Password Reset, Onboarding, Settings  
**Methodology**: Heuristic evaluation, mobile ergonomics, cognitive load analysis

---

## Summary Scores

| Area | Score | Issues |
|------|-------|--------|
| Registration | 7/10 | Strength meter good, terms UX could improve |
| Login | 8/10 | Clean, redirect logic correct |
| Email Verification | 5/10 | Pre-fetch vulnerability, no progress indicator |
| Password Reset | 7/10 | Solid flow, needs better success state |
| Onboarding | 6/10 | Progress now persisted, but TP step UX unclear |
| Settings | 6/10 | Functional, needs polish |
| Mobile Overall | 7/10 | Touch targets mostly ok, some overflow risks |

---

## 1. Registration Form

### UX-R-01: Password strength meter — GOOD ✅
**Current**: Real-time strength meter with "Słabe/Średnie/Silne/Bardzo silne" labels  
**Assessment**: Clear, motivating, reduces friction for strong passwords  
**Recommendation**: None

### UX-R-02: Password requirements visibility — MEDIUM ⚠️
**Current**: Requirements listed but may not be visible when typing  
**Issue**: Users often scroll past requirements before seeing them fail  
**Recommendation**: Show requirement checklist inline below password field  
**Effort**: Low (1-2h)

### UX-R-03: Terms checkbox — MEDIUM ⚠️
**Current**: Checkbox with inline links to /terms and /privacy  
**Issue**: Checkbox may be small — touch target concern on mobile  
**Recommendation**: Ensure checkbox label area is at least 44px tall  
**Effort**: Low (30min)

### UX-R-04: Success state — GOOD ✅
**Current**: Success message shown, auto-redirect after 1.8s  
**Assessment**: Good — clear confirmation before redirect  
**Recommendation**: Add brief instruction "Sprawdź email aby potwierdzić konto"

### UX-R-05: Error message placement — MEDIUM ⚠️
**Current**: Field errors appear below each field  
**Issue**: On mobile, field may scroll out of view after keyboard appears  
**Recommendation**: Ensure error stays visible when keyboard is open  
**Effort**: Medium (2-3h)

### UX-R-06: Name field label — LOW ℹ️
**Current**: "Imię i nazwisko" or "Imię"?  
**Recommendation**: Be explicit: "Imię i nazwisko (lub pseudonim)"  
**Effort**: Trivial

### UX-R-07: Email normalization feedback — LOW ℹ️
**Current**: Email trimmed + lowercased silently on submit  
**Recommendation**: Show normalized email before submit (or after)  
**Effort**: Medium

---

## 2. Login Form

### UX-L-01: "Forgot password" link position — GOOD ✅
**Assessment**: Near password field — expected location  
**Recommendation**: None

### UX-L-02: Error specificity — MEDIUM ⚠️
**Current**: Generic "Nieprawidłowy email lub hasło"  
**Issue**: Users who make typos in email don't know if email or password is wrong  
**Note**: Generic is CORRECT for security — document as intentional  
**Recommendation**: Add "Nie pamiętasz danych? Użyj Zapomniałem hasła" hint after 2+ failures

### UX-L-03: Loading state — HIGH ⚠️
**Current**: Unclear if loading spinner/disabled state shown during login  
**Recommendation**: Disable submit button + show spinner during `isPending` state  
**Effort**: Low

### UX-L-04: Remember me — MEDIUM ⚠️
**Current**: No "Remember me" option — session duration is fixed  
**Recommendation**: For MVP: document JWT expiry. Post-MVP: add persistent session toggle  
**Effort**: Medium-High

### UX-L-05: Social login hint — LOW ℹ️
**Current**: No social login (credentials only)  
**Recommendation**: Add "Opcje logowania społecznościowego coming soon" if planned  
**Effort**: Low

---

## 3. Email Verification

### UX-EV-01: Email pre-fetch — CRITICAL ⚠️
**Current**: GET request to /auth/verify-email immediately consumes token  
**Issue**: Outlook, Gmail, iOS Mail pre-fetch links → token consumed before user clicks  
**Impact**: User clicks link → "token invalid" error → confused, frustrated  
**Recommendation**: Show confirmation page on GET, consume token on POST (user clicks "Confirm")  
**Effort**: Medium (4-6h)

### UX-EV-02: Expired token UX — HIGH ⚠️
**Current**: Error shown, but resend button may not be visible  
**Recommendation**: On "token expired" page: large "Wyślij nowy link" button  
**Effort**: Low

### UX-EV-03: Verification pending state in UI — HIGH ⚠️
**Current**: After registration, user is redirected to login without info about email  
**Recommendation**: Login page should show banner "Konto wymaga weryfikacji email"  
**Effort**: Medium

### UX-EV-04: Email in spam — MEDIUM ⚠️
**Current**: No guidance about spam folders  
**Recommendation**: Add "Sprawdź folder spam" hint in success message  
**Effort**: Trivial

### UX-EV-05: From address recognition — MEDIUM ⚠️
**Current**: EMAIL_FROM in .env — ensure it's recognizable (e.g., hello@leaxaro.app)  
**Recommendation**: Use branded from address with reply-to  
**Effort**: Config

---

## 4. Password Reset

### UX-PR-01: Reset flow — GOOD ✅
**Current**: Email → link → new password form → success  
**Assessment**: Standard, clear flow

### UX-PR-02: Token expiry communicated — MEDIUM ⚠️
**Current**: Link valid for 24h — not communicated in email?  
**Recommendation**: Add "Link ważny 24 godziny" in email  
**Effort**: Trivial

### UX-PR-03: Success state — MEDIUM ⚠️
**Current**: After reset, redirect to login  
**Recommendation**: Show "Hasło zostało zmienione. Zaloguj się." banner on login page  
**Effort**: Low

---

## 5. Onboarding Wizard

### UX-OB-01: Step indicator clarity — MEDIUM ⚠️
**Current**: Step counter shown (e.g., "2/5")  
**Recommendation**: Name each step in indicator: "Dane osobowe → Cel → TrainingPeaks → ..."  
**Effort**: Medium

### UX-OB-02: TrainingPeaks step — HIGH ⚠️
**Current**: TP connect step — users without TP account don't know if they need one  
**Recommendation**: Add "Nie masz konta? Możesz połączyć później z Ustawień"  
**Effort**: Low

### UX-OB-03: Skip option clarity — HIGH ⚠️
**Current**: "Pomiń" button exists but may not be prominent  
**Recommendation**: Make skip visible and non-threatening: "Pomiń na razie (możesz ustawić później)"  
**Effort**: Low

### UX-OB-04: Progress persistence feedback — MEDIUM ⚠️
**Current**: Progress saved but no "Zapisano" feedback  
**Recommendation**: Subtle "Postęp zapisany ✓" after each step save  
**Effort**: Low

### UX-OB-05: Back navigation loses unsaved form data — MEDIUM ⚠️
**Current**: If user types on step 3, then clicks Back → step 3 data may be lost  
**Recommendation**: Preserve step-level form state in component memory  
**Effort**: Medium

### UX-OB-06: Exit intent — LOW ℹ️
**Current**: User can close tab mid-onboarding  
**Recommendation**: Consider `beforeunload` warning: "Twoje dane nie zostały zapisane"  
**Effort**: Low

---

## 6. Settings Page

### UX-S-01: Notification settings layout — MEDIUM ⚠️
**Recommendation**: Group settings: Profile | Notifications | Integrations | Danger Zone  
**Effort**: Medium

### UX-S-02: Disconnect TP — confirmation — HIGH ⚠️
**Current**: Disconnect button — does it show confirmation modal?  
**Risk**: Accidental disconnect is destructive  
**Recommendation**: Always show confirmation: "Czy na pewno chcesz rozłączyć TrainingPeaks?"  
**Effort**: Low

### UX-S-03: Push notification toggle clarity — MEDIUM ⚠️
**Current**: Toggle to enable push  
**Recommendation**: Explain what notifications are for: "Powiadomienia o nowych analizach treningów"  
**Effort**: Trivial

---

## 7. Mobile Ergonomics

### UX-M-01: Bottom safe area — HIGH ⚠️
**Issue**: iOS home indicator (34px) may overlap bottom navigation  
**Recommendation**: Add `padding-bottom: env(safe-area-inset-bottom)` to bottom nav  
**Effort**: Low (15min CSS)

### UX-M-02: Keyboard overlap — HIGH ⚠️
**Issue**: iOS keyboard may push form fields out of view  
**Current**: Standard browser behavior — no custom handling  
**Recommendation**: Scroll active input into view on focus (ScrollIntoView)  
**Effort**: Medium

### UX-M-03: Touch targets — MEDIUM ⚠️
**Minimum**: 44×44px (Apple HIG) / 48×48dp (Material)  
**Check items**: Password toggle button, terms checkbox, step navigation dots  
**Effort**: Low

### UX-M-04: Font size — LOW ℹ️
**iOS**: Input font-size < 16px triggers zoom  
**Recommendation**: Ensure all inputs use `font-size: 16px` minimum  
**Effort**: Trivial

### UX-M-05: Autofill support — MEDIUM ⚠️
**Current**: email/password fields should support browser autofill  
**Recommendation**: Verify `autocomplete` attributes: `email`, `new-password`, `current-password`  
**Effort**: Low

---

## 8. Loading States & Feedback

### UX-LD-01: Async operation feedback
| Operation | Current | Recommended |
|-----------|---------|------------|
| Register submit | Unclear | Button disabled + spinner |
| Login submit | Unclear | Button disabled + spinner |
| Verify email | Unclear | "Weryfikuję..." loading state |
| Reset request | Unclear | "Wysyłam..." loading state |
| Onboarding step save | Unclear | Step indicator subtle pulse |

### UX-LD-02: Error recovery
**Current**: Errors shown, user must correct and resubmit  
**Recommendation**: Auto-clear field errors on input change  
**Effort**: Low

---

## 9. Accessibility

### UX-A-01: Form labels — CRITICAL
**All inputs must have**: `<label for>` or `aria-label`  
**Verify**: Screen reader reads field names correctly

### UX-A-02: Error announcements — HIGH
**Current**: Errors in DOM but may not be announced  
**Recommendation**: Error containers should have `role="alert"` or `aria-live="polite"`

### UX-A-03: Focus management — MEDIUM
**On error**: Focus should move to first error field  
**On success**: Focus should be on next actionable element

### UX-A-04: Color contrast
**Requirement**: WCAG 2.1 AA — 4.5:1 for normal text  
**At-risk**: Light gray helper text, weak-password meter text  
**Tool**: Use browser devtools contrast checker

### UX-A-05: Keyboard navigation
**All interactive elements** must be reachable by Tab  
**Verify**: Terms checkbox, password toggle, step navigation

---

## 10. Copy & Microcopy Recommendations

| Current | Recommended | Reason |
|---------|------------|--------|
| "Zarejestruj się" | "Utwórz konto" | More action-oriented |
| "Zaloguj się" | OK | Standard |
| "Resetuj hasło" | "Ustaw nowe hasło" | More positive framing |
| "Pomiń" | "Pomiń na razie" | Reduces anxiety |
| Generic error | "Coś poszło nie tak. Spróbuj ponownie." | More human |

---

## Priority Matrix

| Priority | Issue | Effort |
|----------|-------|--------|
| P1 - CRITICAL | Email pre-fetch token consumption | Medium |
| P1 - HIGH | Loading states on all forms | Low |
| P1 - HIGH | Verification pending banner on login | Medium |
| P2 - HIGH | TP step "no account" guidance | Low |
| P2 - HIGH | Expired token → resend CTA prominent | Low |
| P2 - MEDIUM | Mobile bottom safe area | Low |
| P2 - MEDIUM | iOS keyboard overlap handling | Medium |
| P3 - LOW | Remember me option | Medium-High |
| P3 - LOW | Step naming in progress indicator | Medium |
