# Physical-device testing (Phase 0 criteria 13 and 14)

These checks need a person with a real iPhone and a real Android phone. Until they are run and the
evidence is attached to the Phase 0 pull request, criteria 13 and 14 stay **Pending**.

No Apple or Google developer account is needed: Phase 0 runs inside **Expo Go**.

## What you need

- A computer with this repository set up (see the README) and Docker running.
- An iPhone (iOS 17 or later recommended) and an Android phone (Android 10 or later; ideally a
  mid-range model, since that is the performance target).
- **Expo Go** installed on both phones from the App Store and Google Play. Expo Go must support
  Expo SDK 58; if the store version is older or newer, Expo Go shows a version error. In that case,
  note it in the results and we will switch to a development build in Phase 1.
- The computer and both phones on the **same Wi-Fi network**.

## 1. Point the app at your computer

Phones can't reach `localhost` on your computer. Find your computer's LAN address:

- macOS: `ipconfig getifaddr en0`
- Windows: `ipconfig` (the IPv4 address of your Wi-Fi adapter)
- Linux: `hostname -I`

In `.env`, set (using your address):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

## 2. Start the backend

```bash
docker compose -f infra/compose.yml up -d
set -a; source .env; set +a
pnpm db:migrate
pnpm --filter @film/api dev
```

On each phone, open the browser and visit `http://<your-address>:4000/health`. It should show
`{"status":"ok"}`. If it doesn't, your firewall or Wi-Fi is blocking the phone. Allow incoming
connections on port 4000, or use a network without client isolation.

## 3. Criterion 13: status screen shows "API: ok"

```bash
set -a; source .env; set +a
pnpm --filter @film/mobile start
```

Scan the QR code: with the Camera app on iPhone, and from inside Expo Go on Android. The app opens
on the **Status** screen.

**Pass:** the screen shows **API: ok** in green, and the address under it is your computer's LAN
address. Take a screenshot on each phone.

## 4. Criterion 14a: 1,000-item feed scrolls smoothly

Performance must be measured on a production bundle, not the slower development bundle:

```bash
pnpm --filter @film/mobile exec expo start --no-dev --minify
```

1. Reopen the app in Expo Go and tap **1,000-item feed scroll test**.
2. Open the developer menu: shake the phone (or three-finger long press on iPhone) and choose
   **Toggle performance monitor**. It shows UI and JS frames per second.
3. Start a screen recording (iPhone: Control Center > Screen Recording; Android: Quick Settings >
   Screen record).
4. Fling-scroll from the top to the bottom and back, quickly, for about 30 seconds.

**Pass:** on Android, UI and JS stay at or close to 60 fps (brief dips under 50 during fast flings
are acceptable; sustained drops are not), with no blank rows. On iPhone, no visible stutter or blank
rows. 120 Hz phones may show up to 120. Record the lowest sustained value you saw.

## 5. Criterion 14b: screen readers announce every control

Turn on the screen reader: VoiceOver on iPhone (Settings > Accessibility > VoiceOver) or TalkBack on
Android (Settings > Accessibility > TalkBack). Open **Screen reader form test** and swipe right
through every element.

**Pass** if each item is announced like this (wording varies slightly by platform):

| Element                                 | Expected announcement                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Name field                              | "Full name, text field"                                                                           |
| Role field                              | "Primary role, text field", followed by the hint "For example actor, director or cinematographer" |
| Switch                                  | "Available for work, switch, off"                                                                 |
| Save button (empty name)                | "Save, button, dimmed" (iOS) or "Save, button, disabled" (Android)                                |
| After typing a name and activating Save | "Saved locally (prototype, nothing was sent)" is announced                                        |

Also open the feed screen with the screen reader on: each row should read as one item, such as
"Post 1. Casting call: short film, two roles, shooting next month."

## 6. Record the results

Fill in this table in `docs/status/test-results.md` (or paste it as a comment on the pull request),
and attach the screenshots and recordings to the pull request:

| Check                                            | iPhone (model, iOS version) | Android (model, Android version) |
| ------------------------------------------------ | --------------------------- | -------------------------------- |
| 13: status shows API: ok                         | Pass / Fail                 | Pass / Fail                      |
| 14a: feed scroll, lowest sustained fps           |                             |                                  |
| 14b: VoiceOver / TalkBack announce every control | Pass / Fail                 | Pass / Fail                      |
| Notes (anything unexpected)                      |                             |                                  |

If 14a or 14b fails, the stack decision (D1) comes back to the owner with these measurements before
Phase 1 starts.
