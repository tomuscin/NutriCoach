# OAuth Lifecycle — Leaxaro (ETAP 6.5+)

## Flow: TrainingPeaks Connect

```
User → /api/integrations/trainingpeaks/connect
  1. requireAuth() — must be authenticated
  2. crypto.randomUUID() → CSRF state token
  3. db.OAuthState.create({ userId, state, provider, expiresAt: +10min })
  4. db.Integration.upsert({ status: PENDING }) — idempotent
  5. 302 → https://oauth.trainingpeaks.com/OAuth/Authorize?
         client_id=&redirect_uri=&response_type=code&scope=&state=<CSRF>
```

## Flow: OAuth Callback

```
TrainingPeaks → /api/integrations/trainingpeaks/callback?code=&state=
  1. Validate `state` param — lookup in OAuthState table
     - Missing → 400 invalid_state
     - Expired  → 400 invalid_state
     - userId mismatch → 400 invalid_state
  2. db.OAuthState.delete({ state }) — one-time use, prevents replay
  3. exchangeCodeForTokens(code) → TPTokenResponse
     - POST https://oauth.trainingpeaks.com/OAuth/Token
     - client_secret_post auth
  4. encryptToken(accessToken), encryptToken(refreshToken) — AES-256-GCM
  5. db.Integration.upsert({
       status: ACTIVE,
       accessToken: encrypted,
       refreshToken: encrypted,
       tokenExpiresAt: now + expires_in,
       nextSyncAt: now
     })
  6. runTrainingPeaksSync(userId) — fire-and-forget, non-blocking
  7. 302 → /integrations?connected=trainingpeaks
```

## Flow: Token Refresh

```
Triggered by:
  - runTrainingPeaksSync() — proactive: 15min before expiry
  - sync-tokens cron — */30 * * * * — refreshes all expiring within 15min

Refresh sequence:
  1. safeDecryptToken(refreshToken)
  2. POST https://oauth.trainingpeaks.com/OAuth/Token
     grant_type=refresh_token
  3. Rotate tokens: encryptToken(new_access), encryptToken(new_refresh)
  4. db.Integration.update({ accessToken, refreshToken, tokenExpiresAt, nextSyncAt })
  5. emitEvent('token_refreshed', { userId, provider })

On refresh failure:
  - IntegrationError(code: TOKEN_EXPIRED | TOKEN_REVOKED)
  - db.Integration.update({ status: EXPIRED | REVOKED })
  - Sentry.captureException
```

## Flow: Disconnect

```
POST /api/integrations/trainingpeaks/disconnect
  1. requireAuth()
  2. db.Integration.update({
       status: DISCONNECTED,
       accessToken: null,
       refreshToken: null,
       tokenExpiresAt: null,
       nextSyncAt: null
     })
  3. Tokens cleared — cannot be replayed
```

## Security Properties

| Property | Implementation |
|----------|---------------|
| CSRF protection | OAuthState table — random UUID, 10-min TTL, one-time use |
| Token storage | AES-256-GCM, key = INTEGRATION_ENCRYPTION_KEY (64 hex chars) |
| Token transmission | Never in logs, never in responses, redacted by pino |
| Replay prevention | OAuthState deleted after first use |
| Revocation | Integration status set to REVOKED, tokens cleared |

## Known Risks

- `INTEGRATION_ENCRYPTION_KEY` rotation: no key versioning yet — rotation requires re-auth all users
- OAuthState cleanup: handled by stale-scan cron (0 */6 * * *), but expired states are harmless
- TP doesn't support token introspection — we trust `expires_in` value
