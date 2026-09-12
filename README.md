# Hostel Calendar — HAC, VIT Bhopal

A public hostel calendar with a passcode-protected admin panel. Calendar data is stored locally in `data/calendar.json` and can be managed manually through the admin panel.

## Features

- Hostel Calendar dashboard for HAC / VIT Bhopal
- Monthly calendar with color-toned date cards
- Left panel for exams
- Right panel for hostel events
- Exam cards show only the exam stage (`CAT-1`, `CAT-2`, `FAT`) and applicable batches/years
- Event, sports and holiday color coding
- Manual CSV/JSON upload with Replace or Append modes
- Add, edit, delete and export calendar data
- Admin session cookie works on local HTTP when `SECURE_COOKIES=false`
- No Google Sheets dependency

## Local setup

```bash
npm install
cp .env.example .env.local
```

Generate a session secret:

```bash
openssl rand -hex 32
```

Put the values into `.env.local`:

```env
ADMIN_PASSWORD=your-password
ADMIN_SESSION_SECRET=your-long-random-secret
SECURE_COOKIES=false
```

Run:

```bash
npm run dev
```

For a production-mode local test:

```bash
npm run build
npm run start
```

Open `http://localhost:3000` and `/admin/login`.

## Data format

CSV columns:

```text
Start Date,End Date,Type,Title,Batches / Years,Details
```

Example exam:

```text
2026-09-07,2026-09-09,Exam,CAT-1,"2026 (B.Tech/Int. M.Tech/B.Arch/B.B.A.)",Fall Semester 26-27
```

The public UI intentionally displays exam entries as `CAT-1`, `CAT-2`, or `FAT` plus the applicable batch. The detailed title/details remain available to the admin panel.

## Persistence note

`data/calendar.json` is suitable for a local machine or persistent server. Serverless deployments with ephemeral filesystems should use a persistent database or storage provider before relying on admin writes in production.

## Made by Tech Team HAC VITB
