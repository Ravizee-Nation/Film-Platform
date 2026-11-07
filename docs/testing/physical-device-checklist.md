# Phase 0 physical-device checklist

A short checklist for criteria 2, 13 and 14. The detailed steps and troubleshooting are in
[physical-devices.md](physical-devices.md). Every item stays **Pending** until its evidence is
attached to PR #1.

**Tester:** ______ **Date:** ______
**iPhone:** model ______ iOS ______ **Android:** model ______ Android ______
**Expo Go version:** iOS ______ Android ______

## Setup (also covers criterion 2)

- [ ] On a computer with Docker: `docker compose -f infra/compose.yml up -d` starts Postgres
- [ ] `.env` copied from `.env.example`, with `EXPO_PUBLIC_API_URL=http://<computer LAN IP>:4000`
- [ ] `set -a; source .env; set +a && pnpm db:migrate` prints "Migrations applied."
- [ ] `pnpm dev` starts the API, the web app and the Expo dev server
- [ ] Each phone's browser shows `{"status":"ok"}` at `http://<LAN IP>:4000/health`

## A. Live API connection (criterion 13)

| Step                                 | Expected                                           | iPhone | Android |
| ------------------------------------ | -------------------------------------------------- | ------ | ------- |
| Scan the QR code with Expo Go        | App opens on **Status**                            | ☐      | ☐       |
| Read the status line                 | **API: ok** in green, LAN address shown underneath | ☐      | ☐       |
| Stop the API, tap **Check again**    | **API: unavailable**                               | ☐      | ☐       |
| Restart the API, tap **Check again** | **API: ok**                                        | ☐      | ☐       |

Evidence: one screenshot of "API: ok" per phone.

## B. 1,000-item feed (criterion 14a)

Restart Expo with a production bundle first: `pnpm --filter @film/mobile exec expo start --no-dev --minify`

| Step                                         | Expected                                 | iPhone | Android |
| -------------------------------------------- | ---------------------------------------- | ------ | ------- |
| Open **1,000-item feed scroll test**         | List appears straight away               | ☐      | ☐       |
| Dev menu > **Toggle performance monitor**    | UI and JS fps visible                    | ☐      | ☐       |
| Fling-scroll top to bottom and back for 30 s | No blank rows, no visible stutter        | ☐      | ☐       |
| Lowest sustained UI fps                      | 55 or more (brief dips under 50 allowed) | ___    | ___     |
| Last row reads "Post 1000"                   | Yes                                      | ☐      | ☐       |

Evidence: a screen recording per phone with the performance monitor visible.

## C. Accessibility (criterion 14b)

Turn on VoiceOver (iPhone) or TalkBack (Android), open **Screen reader form test** and swipe through.

| Element                    | Expected announcement                                   | iPhone | Android |
| -------------------------- | ------------------------------------------------------- | ------ | ------- |
| Name field                 | "Full name, text field"                                 | ☐      | ☐       |
| Role field                 | "Primary role, text field" plus the hint                | ☐      | ☐       |
| Switch                     | "Available for work, switch, off"                       | ☐      | ☐       |
| Save with an empty name    | "Save, button, dimmed" or "disabled"                    | ☐      | ☐       |
| Type a name, activate Save | "Saved locally (prototype, nothing was sent)" announced | ☐      | ☐       |
| A feed row                 | Read as one item: "Post 1. …"                           | ☐      | ☐       |

Evidence: a screen recording per phone with the screen reader's speech audible or captions on.

## Result

| Criterion                      | iPhone                 | Android     | Evidence links |
| ------------------------------ | ---------------------- | ----------- | -------------- |
| 2: Docker Compose + `pnpm dev` | Pass / Fail (computer) |             |                |
| 13: live API connection        | Pass / Fail            | Pass / Fail |                |
| 14a: feed performance          | Pass / Fail            | Pass / Fail |                |
| 14b: accessibility             | Pass / Fail            | Pass / Fail |                |

Post the filled-in table and attachments as a comment on PR #1. A failure on 14a or 14b sends the
stack decision (D1) back to the owner with these measurements.
