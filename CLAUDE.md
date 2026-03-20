# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wedding RSVP app for Ayush & Nikita. Vanilla HTML/CSS/JS frontend with Node.js serverless functions on Vercel, using Google Sheets as the database.

## Development & Deployment

There are no build steps or local dev scripts. The app is deployed directly to Vercel.

**To test locally with Vercel CLI:**
```bash
npx vercel dev
```

**Deploy:**
```bash
npx vercel --prod
```

## Architecture

```
api/          # Vercel serverless functions (Node.js)
public/       # Static frontend (served via vercel.json rewrite)
```

**Request flow:**
1. `public/index.html` — Single-page app with 3 screens (lookup → RSVP → confirmation)
2. `/api/lookup?first=X&last=Y` — Finds guest by name in Google Sheets, returns their eligible events and guest limit
3. `/api/submit` (POST) — Appends RSVP responses to the response sheet (one row per event)

**`vercel.json`** rewrites all `/*` to `/public/$1`, while `/api/*` routes auto-resolve to serverless functions.

## Google Sheets Database

Two tabs in the same spreadsheet:

- **Guest sheet** (`Sheet1`): Columns are `First Name`, `Last Name`, event name columns (cell value truthy = guest can attend), optional `Limit` column
- **Response sheet** (`Sheet2`): Rows appended as `timestamp | firstName | lastName | event | response | guestCount`

Authentication uses a Google Service Account with JWT via the `googleapis` npm package.

## Environment Variables

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GUEST_SHEET_ID=<spreadsheet_id>
GUEST_SHEET_NAME=Sheet1
RESPONSE_SHEET_ID=<spreadsheet_id>
RESPONSE_SHEET_NAME=Sheet2
```

Set these in Vercel dashboard for production, or in `.env` for local dev (loaded automatically by `vercel dev`).

## Frontend

`public/index.html` contains all JS inline. The three screens are toggled by showing/hiding `<div>` sections. Key variables passed between screens are stored in JS module scope.

**Design tokens** (defined in `style.css`):
- Background: `#0e0c0a` (dark brown)
- Accent: `#c9a96e` (gold)
- Fonts: Fraunces (serif headings), Great Vibes (script), Nunito (body)
- Layout: 55/45 split — hero photo left, form right; collapses to single column on mobile
