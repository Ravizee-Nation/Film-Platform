# D7 trial: physical-device authentication checklist

Branch `poc/d7-better-auth` only (draft PR 7, never merged). Verifies verify-first email registration,
sign-in, session persistence, sign-out and recovery on a **real iPhone and a real Android phone**,
and the native Origin header on both. Native verification stays **Pending** until every row below
has evidence. Automated tests (L4) do not count as device verification.

Use synthetic addresses only (`@example.test`). No email is sent: registration and reset codes are
printed in the API terminal, and no real inbox is involved. Codes expire after 30 minutes and work
once.

**Tester:** ______ **Date:** ______ **Commit:** ______
**iPhone:** model ______ iOS ______ **Android:** model ______ Android ______
**Expo Go version:** iOS ______ Android ______

## 0. Before you start

1. Expo Go on both phones; computer and phones on the same Wi-Fi (see
   [physical-device-checklist.md](physical-device-checklist.md) section 0).
2. Find the computer's LAN address (Mac: `ipconfig getifaddr en0`).

## 1. Start the trial stack (macOS Terminal)

These commands were run end to end before release (Linux, with `sed -i` instead of `sed -i ''`).
Run them one at a time from the folder where you cloned the repository.

```bash
cd Film-Platform
git fetch origin && git checkout poc/d7-better-auth && git pull
corepack enable && pnpm install --frozen-lockfile

# Keep any existing settings, then start from the example file.
[ -f .env ] && cp .env .env.backup
cp .env.example .env

# Fill in your LAN address and a fresh local-only secret (never share or commit it).
LAN=$(ipconfig getifaddr en0); echo "LAN address: $LAN"
SECRET=$(openssl rand -base64 32)
sed -i '' "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|; s|^AUTH_BASE_URL=.*|AUTH_BASE_URL=http://$LAN:4000|; s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$LAN:4000|" .env
grep -E '^(AUTH_BASE_URL|EXPO_PUBLIC_API_URL)=' .env    # both show your LAN address

docker compose -f infra/compose.yml up -d --wait
set -a; source .env; set +a
pnpm db:migrate     # expect: "Migrations applied."
pnpm dev            # API :4000, web :3000, Expo QR code; leave this window open
```

If `echo` prints an empty LAN address, your Wi-Fi is not `en0`: use `ipconfig getifaddr en1`.
Open a second Terminal window for the control command below and for reading codes.

- [ ] On each phone's browser, `http://<LAN address>:4000/health` shows `{"status":"ok"}`.
- [ ] **Control (on the computer):** the server refuses a cookie-bearing request without an Origin:

  ```bash
  curl -s -X POST http://localhost:4000/api/auth/sign-out -H 'cookie: better-auth.session_token=x'
  ```

  Expected: `{"code":"MISSING_OR_NULL_ORIGIN",...}`. This shows the protection the app must satisfy.

In the app: **Status** screen > **Authentication trial (email)**. Use `d7-ios@example.test` on the
iPhone and `d7-android@example.test` on Android, with a password of at least 10 characters.

## 2. Steps

| #   | Step                                                                                                                                                                                                                                                                                                | Expected                                                                                                                     | iPhone | Android |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| A1  | Enter your email, tap **Create account** (registration takes an email only)                                                                                                                                                                                                                         | "Check the API log for your registration code, then set a password."                                                         | ☐      | ☐       |
| A2  | Type any password, tap **Sign in**                                                                                                                                                                                                                                                                  | "Sign-in failed: INVALID_EMAIL_OR_PASSWORD" (no password exists until the emailed link is used)                              | ☐      | ☐       |
| A3  | In the API terminal find `[auth mail, not sent] complete-registration for <your address> (ref …)`. Type the **code:** line into **Reset code**, with or without the spaces; capitals matter. Check the counter reads **24/24**. Type your chosen password in **Password**; tap **Set new password** | "Password set. Sign in with it now."                                                                                         | ☐      | ☐       |
| A4  | Tap **Sign in**                                                                                                                                                                                                                                                                                     | "Signed in"                                                                                                                  | ☐      | ☐       |
| A5  | Tap **Who am I**, then tap **Create account** again with the same address, then **Who am I** again                                                                                                                                                                                                  | "Signed in as …"; the same Create account message; still "Signed in as …" (registering again changes nothing)                | ☐      | ☐       |
| A6  | Close the app completely (swipe it away), reopen the project in Expo Go, return to the trial screen, tap **Who am I**                                                                                                                                                                               | Still "Signed in as …" (session kept in SecureStore)                                                                         | ☐      | ☐       |
| A7  | Stop the stack (Ctrl+C), run `pnpm dev` again, tap **Who am I**                                                                                                                                                                                                                                     | Still "Signed in as …" (sessions live in the database)                                                                       | ☐      | ☐       |
| A8  | Tap **Sign out**, then **Who am I**                                                                                                                                                                                                                                                                 | "Signed out", then "Not signed in (401)". Sign-out succeeding proves the app sent the trusted Origin (see the control above) | ☐      | ☐       |
| A9  | Tap **Sign in**, then **Send reset link**                                                                                                                                                                                                                                                           | "If the account exists, a reset link is in the API log."                                                                     | ☐      | ☐       |
| A10 | In the API terminal type the **code:** line under the `reset-password` entry into **Reset code** (counter **24/24**); type a new password in **Password**; tap **Set new password**                                                                                                                 | "Password set. Sign in with it now."                                                                                         | ☐      | ☐       |
| A11 | Tap **Who am I**                                                                                                                                                                                                                                                                                    | "Not signed in (401)": the session from A9 was revoked by the reset                                                          | ☐      | ☐       |
| A12 | Put the **old** password back in **Password**, tap **Sign in**                                                                                                                                                                                                                                      | "Sign-in failed: INVALID_EMAIL_OR_PASSWORD"                                                                                  | ☐      | ☐       |
| A13 | Put the **new** password in, tap **Sign in**, then **Who am I**                                                                                                                                                                                                                                     | "Signed in", then "Signed in as …"                                                                                           | ☐      | ☐       |
| A14 | Tap **Set new password** again with the same code                                                                                                                                                                                                                                                   | "Reset failed: …" (a code works once)                                                                                        | ☐      | ☐       |

Each address gets at most 3 unused codes per hour (abuse limit). If a code stops appearing in the
API log after repeated attempts, the limit is working: note it and use a new `@example.test` address.

Evidence: a screenshot of the result of A2, A3, A5, A6, A8, A11 and A13 on each phone, named
`d7-<step>-ios.png` / `d7-<step>-android.png`, plus the curl control output. Crop the API log so it
shows no secret. **Pass** only when every box is ticked with evidence; anything else is recorded as
Failed or Not Run with the message shown.

## If a code is refused (INVALID_TOKEN)

Each issued code has a **ref** (8 characters) on its `[auth mail, not sent]` line. Every attempt to
use a code writes two lines to the API terminal, with no code, password or cookie in them:

```
{"auth":"password-link.check","stage":"…","length":24,"ref":"…"}
{"auth":"password-link.result","outcome":"refused","status":400,"code":"INVALID_TOKEN","ref":"…"}
```

| What the check line shows                                        | Meaning                                                                        | What to do                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| `stage: "not-found"` and a **different** ref from the issued one | The code typed is not the code issued (usually one wrong character or capital) | Retype it carefully; the code is still valid |
| `stage: "malformed"` and a length other than 24                  | A character was dropped or added                                               | Check the counter reads 24/24                |
| `stage: "not-found"` and the **same** ref as the issued one      | That code was already used                                                     | Request a new code                           |
| `stage: "expired"`                                               | Older than 30 minutes                                                          | Request a new code                           |
| `stage: "valid"` but the result is refused                       | Server defect                                                                  | Stop and send the two lines                  |

Record the two lines (they are safe to share) with any failure.

## 3. The native Origin header: purpose and limits

**Purpose.** Better Auth refuses state-changing requests that carry a session cookie unless their
`Origin` header names a trusted origin. In a browser this stops cross-site request forgery: a
malicious page cannot make the browser send our cookie with a forged Origin, because browsers set
`Origin` themselves and page scripts cannot change it. Native apps send no Origin at all, so their
sign-out and other cookie-bearing requests would be refused (`MISSING_OR_NULL_ORIGIN`). The app
therefore sends `Origin: filmplatform://`, which the server lists as trusted. This lets us keep the
library's server-side Expo plugin, and its authorization proxy (advisory GHSA-4wq4-2ppv-q3hg), off.

**Limits.**

- It is **not** proof that a request comes from our app. Any non-browser client (curl, a script,
  another app) can send `Origin: filmplatform://`. What authenticates a request is the session
  cookie, which the app keeps in SecureStore (iOS Keychain, Android Keystore-backed storage).
- Trusting it opens no browser hole: browsers never let a web page send `filmplatform://` as its
  Origin.
- It does nothing against a compromised device (jailbroken or rooted) or malware that can read the
  app's storage; those are outside this control.
- Custom URL schemes can be claimed by other apps. That matters for redirect-based sign-in, which
  the trial does not use. Apple and Google sign-in (C1, C2) must use native ID tokens, not scheme
  redirects, or be reviewed again (C5).
- Staging and production builds will need their own schemes, each added to the trusted list.
