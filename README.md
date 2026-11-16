# AYUSH Unified – face sign-in for every role, demo Aadhaar, WhatsApp, voice + English / Hindi / Kannada

One project made from your three zips:

| Part | Came from |
|---|---|
| React + Vite screens, Express + SQLite backend, 30-table database, role forms, admin approval | `ayush-with-database` (base and style) |
| WhatsApp bot (Meta / QR / mock), same patient record by mobile number | `ayush-platform-v3_5` (ported onto this database) |
| Voice typing, read aloud, face check idea, translate | `ayush-ayurveda-service-updated` (re-written in React) |

## Folder layout
```
ayush-unified/
  frontend/    React (Vite) app + nginx config + Dockerfile
  backend/     Express API (server.js, face, OTP, Aadhaar, WhatsApp bot, OCR data) + tests + Dockerfile
  database/    SQLite schema/seed (db.js), legacy migration, DATABASE.md. ayush.db is created here
  ml-service/  Flask Prakriti model (unchanged)
  k8s/ env/ docker-compose*.yml
```

## Run
```
npm run install:all     # installs database/, backend/ and frontend/ (also copies the face models into frontend/public/models)
npm run build && npm start      # everything on http://localhost:4000 (backend serves frontend/dist)
# or for development:  npm run dev:all   -> app on http://localhost:5173, API on :4000
npm run smoke          # 58 backend checks + 15 one-time-code checks (face, OTP, Aadhaar, all roles, WhatsApp in 3 languages)
```
(Each folder can also be run on its own: `cd backend && npm start`, `cd frontend && npm run dev`.)
Backend settings: copy `backend/.env.example` to `backend/.env`.
Camera and microphone need `localhost` or HTTPS (phones need HTTPS). Voice typing needs Chrome or Edge.

## The flow
1. **Start screen:** choose role, type the **mobile number**.
2. Number has an account → **Scan my face** (just look at the camera) → face matched → **a new OTP is sent to that number** → enter it → signed in. "Use OTP instead" (OTP only, no camera) is always there.
3. No account → **Create an account** → same step for all four roles (**patient, doctor, clinic, admin**): mobile + consent + **face scan** → face found → **a new OTP is sent** → enter it.
4. Then the role's own details. **Fetch my details from Aadhaar (demo)** fills name, date of birth, gender, address, city, state, pincode from a demo number.
5. After sign-in, **My details** (`/me`) fetches everything stored for that person, for any role.
6. One number can hold several roles with the **same face**. Accounts made on WhatsApp are asked to add a face at their first website sign-in.

### Demo Aadhaar numbers (made-up people, valid checksum)
`2345 6789 0124` Ananya Rao · `3456 7890 1238` Ravi Kumar · `4567 8901 2341` Lakshmi Devi · `5678 9012 3458` Dr. Suresh Hegde · `6789 0123 4560` Priya Sharma · `7890 1234 5674` Mohammed Irfan

Other demo logins (the OTP is shown on screen and printed in the server terminal): doctor 9000000001, clinic 9000000005, admin 9000000009, auditor 9000000008. Admin registration is disabled until `ADMIN_INVITE` is configured; use a unique value outside local demos.

## Languages and voice
- English, हिन्दी, ಕನ್ನಡ switch in the top bar. Texts live in `src/i18n/dict.js` (keyed by the English text).
- 🎤 on every text field (numbers like "double nine" and Hindi/Kannada digit words work; email: "name at the rate gmail dot com"). "Fill this form by voice" asks each field aloud.
- **Speak & translate** page: speak, translate, read aloud. Needs internet (`TRANSLATE_URL`/`TRANSLATE_KEY` for your own LibreTranslate, otherwise MyMemory).
- The doctor-side Ayurveda clinical forms are still English; the registration, sign-in, my-details and WhatsApp bot are fully 3-language.

## One-time codes (OTP)
- Every person and every request gets a **different random 6-digit code** (`otp.js`): stored only as a keyed hash, valid 5 minutes, single use, 5 wrong tries burn it, a new code can be asked every 30 seconds (6 per hour).
- Delivery: **on WhatsApp** when the bot is linked and the number has WhatsApp; **always printed in the server terminal** (`[OTP] +91 98xxxxxx -> 123456`); and in demo mode **shown on screen** (`OTP_SHOW=0` hides it). To use SMS, send the code from `POST /v1/auth/otp/send` in `server.js`.
- `OTP_CODE=123456` in `.env` forces one fixed code for everybody (old behaviour; the smoke test uses it).
- After a code is accepted the number is "proven" for 10 minutes, so registration (face → OTP → details form → submit) asks for the code only once.

## WhatsApp (`WHATSAPP_MODE` in `.env`, see `.env.example`)
`auto` (**default**: Meta if `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` are set, otherwise Baileys, otherwise mock) · `baileys` · `meta` (official Cloud API, webhook `/whatsapp`) · `mock` (`POST /whatsapp-mock`) · `off`.
Meta mode requires locally configured `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET`; webhook verification fails closed if the verify token is unset.
**Linking (Baileys):** run `npm start`. A **QR code is printed in the terminal** (and shown at http://localhost:4000/whatsapp-link on the same computer). On the phone of the bot's number: WhatsApp → Linked devices → Link a device → scan. The link is kept in `data/wa_auth`, so you scan only once. Use a spare number: this is the unofficial route.
Bot: language → register (name, date of birth, allergies, consent) → menu: summary, timeline, medicines, view by system, add by typing, uploads, who can see my data, allow a doctor, change language, unregister.
**Send a photo or PDF of a prescription/report**: the bot reads it (AI vision if `ANTHROPIC_API_KEY` is set in `.env`, otherwise the offline Tesseract reader for printed English), shows a draft → **Save / Edit here / Cancel** → safety check (allergies, metal preparations, duplicates, mixing systems) → summary. Unfinished drafts wait under **My uploads**. "Unregister" deletes the account and all records. Type "bye" any time to end the chat. Records saved on the website are also sent to opted-in WhatsApp users.
(The new draft / edit / safety / unregister messages are in English; the menu and registration are in English, Hindi and Kannada.)
Voice notes: set `STT_URL` (+ `STT_KEY`, `STT_MODEL`) to an OpenAI-compatible transcription endpoint; without it the bot says it cannot read voice notes.

## Face recognition: what it does and does not do
- face-api.js runs in the browser; the photo never leaves it. Only a 128-number template is sent, stored **AES-256-GCM encrypted** in `face_profiles`, one per mobile number, with a consent record and an entry in `biometric_verifications`.
- Sign-in is a 1:1 check against that number's template (distance ≤ 0.5, `FACE_THRESHOLD`), followed by a one-time code. 5 failed scans lock face sign-in for 15 minutes (OTP-only sign-in still works).
- Registration without the face step is refused by the server (`FACE_REQUIRED=0` turns that off).
- **Limit:** there is no liveness check (no blink), so a photo or video of the person may be accepted. Real use needs server-side liveness (presentation-attack detection) or a certified provider.
- **Demo-level, as before:** the OTP is shown on screen in demo mode (`OTP_SHOW=0` to hide); Aadhaar is a demo directory (no UIDAI call); the older doctor/admin screens still trust role headers; only `/v1/me` uses the signed session token. Set `AYUSH_SECRET` in production.

## New files
`face.js`, `aadhaar.js`, `security.js`, `whatsapp/` (backend) · `src/components/FaceCapture.jsx`, `AadhaarFetch.jsx`, `VoiceMic.jsx`, `RoleRegister.jsx`, `src/voice/speech.js`, `src/i18n/`, `src/pages/Me.jsx`, `Assistant.jsx`, `Landing.jsx` (frontend). New tables: `face_profiles`, `face_pending`, `face_attempts`, `demo_aadhaar`, `wa_chats`.

## Latest changes
- **Different OTP for every person**, sent after the face is found (registration and sign-in); WhatsApp delivery; shown on screen in demo mode.
- **WhatsApp connects by default** (`auto` mode) and prints the **QR in the terminal**.
- **Voice listens until you pause**, shows the words live, waits longer for numbers; tap the mic again to finish early.
- **Prescription reading is real now.** `/v1/records/extract` reads the uploaded photo with the same reader as the WhatsApp bot (AI vision when `ANTHROPIC_API_KEY` is set, otherwise the offline Tesseract reader). One Tesseract worker stays warm, so the second photo takes about half a second. Prakriti is matched to the allowed options. The doctor's forms are pre-filled from the patient's newest record (`lastExtracted` in the summary).
- **Faster face scan.** Face models load (and do one dummy scan) while the person types the number or fills the form; the scan itself uses a smaller detector size and shorter gaps between samples. No blink needed.
- **Better voice input.** The speech engine returns up to 5 guesses; the guided form fill and the mic buttons use the first guess that fits the field (digits, email, a choice). `listen()` still works as before.
- **Hindi / Kannada everywhere.** 209 more screen and server messages translated (518 keys per language), and `src/i18n/domTranslate.js` translates any remaining English text on screen automatically. Have a native speaker review the wording before real use.

## WhatsApp voice notes and "read my details" button
- **Voice notes in the bot**: a person can answer by voice (language, "yes", name, date of birth, allergies, menu number). The bot shows what it heard, then continues the normal steps. Speech-to-text is `whatsapp/voice.js`: it uses `STT_URL` if set, otherwise the built-in offline Whisper (optional packages `@huggingface/transformers` + `ffmpeg-static`; the model downloads once). Test: `npm run test:voice`.
- **Website**: the My details page has one voice button that reads all the stored details aloud in the chosen language.
- **OTP**: a different code per person; it is sent to WhatsApp and, in demo mode, also shown on screen (`OTP_SHOW=0` hides it).

## Architecture

```text
Browser ──► React + Vite / nginx ──► Express API ──► SQLite patient data
                                             └─────► Flask ML API ──► MySQL prediction history
```

- `frontend/`: React 19, Vite, React Router, face-api models, API client, voice and translation UI.
- `backend/`: Node.js 22 and Express REST API, OTP/face/Aadhaar flows, OCR, WhatsApp integration and static production frontend hosting.
- `database/`: SQLite schema and initialization in `db.js`, plus legacy migration and database documentation. The database file is created locally on first use.
- `ml-service/`: Flask prediction API; prediction history uses MySQL when configured and SQLite for local development.
- `k8s/`, `docker-compose*.yml`, `scripts/`, `.github/workflows/`: deployment and automation configuration.

The API and application are demo-level in several areas (including Aadhaar data, OTP display, and some role-header authorization). Do not use this deployment with real patient data without a security and privacy review.

## Prerequisites and installation

- Node.js 22 and npm for the frontend, backend and database package.
- Python 3.12 and pip to run the ML service locally.
- Docker with Compose v2 for container deployment.
- Kubernetes and `kubectl` only for the optional Kubernetes deployment.

Install the JavaScript dependencies from the repository root:

```sh
npm run install:all
```

For direct backend development, copy `backend/.env.example` to `backend/.env`, then set local values for `AYUSH_SECRET` and `ADMIN_INVITE`. Keep real values in ignored local files; never commit them. The backend initializes the SQLite database automatically. See [database/docs/DATABASE.md](database/docs/DATABASE.md) for tables and migration behavior.

### Run the frontend and backend

```sh
npm run dev:all
```

The Vite UI is at `http://localhost:5173` and the API is at `http://localhost:4000`. The ML service is optional for general app use; start it separately for Prakriti predictions:

```sh
cd ml-service
python -m venv .venv
# Activate .venv for your shell, then:
pip install -r requirements.txt
python train.py
python app.py
```

For a production-style local run, build the frontend and start the backend, which serves `frontend/dist`:

```sh
npm run build
npm start
```

### Environment configuration

For Docker Compose, copy `env/dev.env.example` to `env/dev.env` and replace every `replace-with-...` value with local-only values before starting the services. `env/dev.env`, `env/staging.env`, `env/k8s-secret.env`, backend `.env` files and other environment files are ignored by Git. Safe templates remain tracked. Never put API keys, passwords, tokens or production secrets in a template or Kubernetes manifest.

### Docker and Kubernetes

Docker Compose development, production overrides, image builds and Kubernetes instructions are in [DOCKER.md](DOCKER.md). The Kubernetes Secret is created from a local ignored file; the checked-in manifests contain no secret values.

## API reference

Unless noted, routes below are served by the backend on port `4000`; most application routes are under `/v1`.

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Authentication | `POST /v1/auth/register`, `/v1/auth/register/practitioner`, `/v1/auth/register/facility`, `/v1/auth/register/admin`, `/v1/auth/otp/send`, `/v1/auth/otp/confirm`, `/v1/auth/login` |
| Face and demo Aadhaar | `POST /v1/face/status`, `/v1/face/enroll`, `/v1/face/verify`, `/v1/aadhaar/fetch` |
| Patient records | `POST /v1/records`, `POST /v1/records/extract`, `GET /v1/patients/:id/summary`, `GET /v1/patients/:id/profile`, `POST /v1/patients/:id/medical-history`, `POST /v1/patients/:id/health-concerns`, `POST /v1/patients/:id/consents` |
| Providers and administration | `GET /v1/doctors`, `GET|PUT /v1/doctors/:id/availability`, `GET /v1/admin/pending`, `POST /v1/admin/decisions`, `GET /v1/admin/audit` |
| Current user and ML proxy | `GET /v1/me`, `GET /v1/ml/questions`, `POST /v1/ml/predict`, `GET /v1/ml/history` |
| Translation and WhatsApp | `POST /v1/translate`, `POST /whatsapp` (Meta webhook), `POST /whatsapp-mock` (demo mode) |

The ML service also exposes `/health`, `/questions`, `/predict` and `/history` directly on port `5000`. Request details and response schemas are defined in `backend/server.js` and `ml-service/app.py`.

## Git branching workflow

`integration` is the central/default branch. It and each component branch contain the complete application tree:

| Branch | Focus for development |
|---|---|
| `integration` | Complete application; merges completed work through pull requests |
| `frontend` | React/Vite UI, API client, voice/language interfaces and frontend container |
| `backend` | Express APIs, authentication, OTP, Aadhaar, WhatsApp, security and backend container |
| `database` | SQLite schema/connection, migration, seed/model work and database documentation |

Create focused commits on the relevant component branch and open a pull request targeting `integration`. Review and resolve conflicts in the pull request; do not force-push or overwrite another team's work. Keep each branch based on the latest `integration` and merge completed work back through reviewed PRs.

## Validation commands

```sh
npm --prefix backend run smoke
npm --prefix frontend run build
python -m compileall -q ml-service
```

The CI workflow runs the backend smoke suite, frontend production build and Python syntax check for pushes and pull requests targeting `integration`.
