# loggr

A rudimentary internship and networking tracker designed for personal use!

## Features

- **Application tracker** — company, role, date applied, contact, status
  (applied / interview / offer / rejected / ghosted), next follow-up date,
  notes. Add, edit, delete. Overdue follow-ups are pinned to the top.
- **Follow-up alerts** — a banner surfaces anything due or overdue today.
- **Daily checklist ("Today's Build Log")** — 8 fixed tasks that reset each
  day, with a progress counter. The "log activity in tracker" task
  auto-checks itself the moment you add or edit an application that day, and
  doubles as a shortcut straight into the add-application form.
- **Local persistence** — all data lives in the browser's `localStorage`,
  nothing leaves your machine.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Build

```bash
npm run build
npm run preview   # preview the production build locally
```

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds and deploys automatically on every push to `main`.

One-time setup after pushing:

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or re-run the workflow from the **Actions** tab).
4. Your site will be live at `https://<username>.github.io/loggr/`.

If you rename the repo, update `base` in `vite.config.js` to match.

## Tech

React + Vite, no backend. Icons from `lucide-react`. Fonts: Space Grotesk
(display) and JetBrains Mono (data/body), loaded via Google Fonts.

## Roadmap

- Weekly/monthly stats view (applications sent, response rate)
- Editable/customizable daily checklist items
- Search/filter on the applications table
- CSV export
- Mobile responsiveness pass
