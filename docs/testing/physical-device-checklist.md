# Phase 0 physical-device checklist (criteria 13 and 14)

The exact sequence to verify the mobile app on a real iPhone and a real Android phone. Criteria 13
and 14 stay **Pending** until the evidence below is posted on PR #1. Detailed troubleshooting is in
[physical-devices.md](physical-devices.md).

Criterion 2 (Docker Compose and `pnpm dev`) **passed** on 2026-11-08
([transcript](../status/evidence/criterion-2-docker-compose.txt)), so the setup below is known to work.

**Tester:** ______ **Date:** ______
**iPhone:** model ______ iOS ______ **Android:** model ______ Android ______
**Expo Go version:** iOS ______ Android ______

## 0. Before you start (5 minutes)

1. Install **Expo Go** on both phones (App Store, Google Play). The app targets **Expo SDK 58**.
   If Expo Go says the project's SDK is unsupported, stop and record the message: that is a
   finding, not a failure of the app, and we switch to a development build.
2. Put the computer and both phones on the **same Wi-Fi** (not a guest network with client isolation).
3. Find the computer's LAN address. On a Mac: `ipconfig getifaddr en0`.

## 1. Start the platform on the computer

```bash
cd Film-Platform && git checkout claude/phase-0-foundation && git pull
corepack enable && pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env: EXPO_PUBLIC_API_URL=http://<LAN address>:4000
docker compose -f infra/compose.yml up -d --wait
set -a; source .env; set +a
pnpm db:migrate          # expect: "Migrations applied."
pnpm dev                 # API :4000, web :3000, Expo QR code in the terminal
```

- [ ] On each phone's browser, `http://<LAN address>:4000/health` shows `{"status":"ok"}`.
      If not, allow incoming connections for Node in macOS System Settings > Network > Firewall.

## 2. Criterion 13: live API connection, availability and recovery

| #    | Step                                                                                            | Expected                                               | iPhone | Android |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ | ------- |
| 13.1 | Scan the QR code (iPhone Camera app; Android: inside Expo Go)                                   | App opens on **Status**                                | ☐      | ☐       |
| 13.2 | Read the status line                                                                            | **API: ok** in green; the LAN address shown underneath | ☐      | ☐       |
| 13.3 | In the terminal, stop the stack (Ctrl+C), then on the phone tap **Check again**                 | **API: unavailable** in red                            | ☐      | ☐       |
| 13.4 | Run `pnpm dev` again, wait about 20 s, reopen the app if Expo disconnected, tap **Check again** | **API: ok** again                                      | ☐      | ☐       |

Evidence files: `13-ios-api-ok.png`, `13-android-api-ok.png`, `13-ios-unavailable.png`,
`13-android-unavailable.png`.

## 3. Criterion 14a: 1,000-item feed performance

Stop `pnpm dev` and start a production bundle (performance in development mode isn't representative):

```bash
pnpm --filter @film/api dev &                                   # API only
pnpm --filter @film/mobile exec expo start --no-dev --minify     # scan the new QR code
```

| #     | Step                                                                 | Expected                                 | iPhone | Android |
| ----- | -------------------------------------------------------------------- | ---------------------------------------- | ------ | ------- |
| 14a.1 | Tap **1,000-item feed scroll test**                                  | List appears immediately                 | ☐      | ☐       |
| 14a.2 | Shake the phone > **Toggle performance monitor**                     | UI and JS fps shown                      | ☐      | ☐       |
| 14a.3 | Start screen recording; fling-scroll top to bottom and back for 30 s | No blank rows, no visible stutter        | ☐      | ☐       |
| 14a.4 | Note the lowest sustained UI fps                                     | 55 or more (brief dips under 50 allowed) | ___    | ___     |
| 14a.5 | Scroll to the end                                                    | Last row reads "Post 1000"               | ☐      | ☐       |

Evidence files: `14a-ios-feed.mp4`, `14a-android-feed.mp4` (performance monitor visible).

## 4. Criterion 14b: VoiceOver and TalkBack

Turn on VoiceOver (Settings > Accessibility > VoiceOver) or TalkBack (Settings > Accessibility >
TalkBack). Start a screen recording with the microphone on, so the speech is captured. Open
**Screen reader form test** and swipe right through every element.

| #     | Element                             | Expected announcement                                                                      | iPhone | Android |
| ----- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ------ | ------- |
| 14b.1 | Name field                          | "Full name, text field"                                                                    | ☐      | ☐       |
| 14b.2 | Role field                          | "Primary role, text field", then the hint "For example actor, director or cinematographer" | ☐      | ☐       |
| 14b.3 | Switch                              | "Available for work, switch, off"                                                          | ☐      | ☐       |
| 14b.4 | Save with an empty name             | "Save, button, dimmed" (iOS) or "disabled" (Android)                                       | ☐      | ☐       |
| 14b.5 | Type a name, double-tap Save        | "Saved locally (prototype, nothing was sent)" is announced                                 | ☐      | ☐       |
| 14b.6 | Go back, open the feed, focus a row | Read as one item: "Post 1. …"                                                              | ☐      | ☐       |

Evidence files: `14b-ios-voiceover.mp4`, `14b-android-talkback.mp4`.

## 5. Post the evidence

Comment on PR #1 with this filled-in table, and drag the evidence files into the comment:

| Criterion                           | iPhone (model, iOS) | Android (model, Android) | Result      |
| ----------------------------------- | ------------------- | ------------------------ | ----------- |
| 13: live API, unavailable, recovery |                     |                          | Pass / Fail |
| 14a: feed, lowest sustained fps     |                     |                          | Pass / Fail |
| 14b: VoiceOver / TalkBack           |                     |                          | Pass / Fail |
| Notes                               |                     |                          |             |

A failure on 14a or 14b sends the stack decision (D1) back to the owner with these measurements.
