# Running "Sensationalize Science" on Replit (frontend-only)

This is the **`replit-frontend` branch** — a stripped-down, **frontend-only**
build of the app (package name `paper2video`) meant for collaborative,
page-to-page **website/UI design** work on Replit.

There is **no backend** on this branch: no API routes, no auth, no Stripe, no
AI/video pipeline, no database, and no native server dependencies. Every route
still renders and you can click from page to page — pages that used to pull
live data now show static placeholder content.

> ⚠️ Do **not** merge this branch into `main`. `main` is the live full-stack
> Railway production app. This branch exists purely for lightweight design
> collaboration.

---

## What's on this branch

- Only frontend deps: `next`, `react`, `react-dom`, `framer-motion`,
  `lucide-react`, plus `tailwindcss` / `postcss` / `autoprefixer` and
  TypeScript types. No native builds, so install is fast (a couple of seconds).
- `app/api/**`, `lib/**`, and `remotion/**` are removed.
- `next.config.js` keeps only `images.remotePatterns` (no `output: standalone`,
  no `serverComponentsExternalPackages`).

---

## Import THIS branch into Replit

1. Go to https://replit.com and log in.
2. **Create Repl → Import from GitHub.**
3. Paste the repo URL:
   `https://github.com/batoolsalman2027-bit/sensationalizescience`
4. After it imports, open the **Shell** tab and switch to this branch:

```bash
git checkout replit-frontend
```

   (Alternatively, when importing you can pick the branch directly if Replit
   offers a branch selector.)

5. Install dependencies:

```bash
npm install
```

   This is a pure-JS install — no native compilation — so it finishes quickly.

6. Click **Run**. The `.replit` file already starts Next.js bound to
   `0.0.0.0:3000` (`npm run dev -- -H 0.0.0.0 -p 3000`) so the Replit webview
   can reach it. First startup can take ~60–100s.

   If the webview stays blank, open the Shell and run the same command
   manually, then click the forwarded port:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
```

7. **Invite collaborators** via the **Invite** button (multiplayer editing +
   shared live preview).

No secrets or environment variables are required on this branch.

---

## Pages: static vs. stubbed

Fully static / design-ready (no backend, unchanged behavior):
`/`, `/about`, `/enterprise` (+`/[slug]`), `/faq`, `/gallery` (+`/[id]`),
`/platform` (+`/[slug]`), `/pricing`, `/resources` (+`/[slug]`),
`/scroll-demo`.

Stubbed for the frontend-only build (render fine, but backend behavior is
replaced):

| Route / component | What changed |
| --- | --- |
| `/login`, `/signup` (`components/AuthForm.tsx`) | Form still renders; submit is a no-op that just navigates to the `next` destination (no auth call). |
| `/create` (`components/Uploader.tsx`) | Keeps the dropzone + voice/aspect-ratio pickers, but does not upload or generate. The "Generate" button is disabled and a "video generation is disabled" notice is shown. Previously called `/api/script`, `/api/video`, `/api/billing/*`. |
| `/library` (`components/Library.tsx`) | Renders the designed empty state (previously fetched `/api/library`). |
| `/projects` (`app/projects/page.tsx`) | Lists two hard-coded sample projects (previously read the DB via `lib/figures/store`). |
| `/projects/[id]` (`app/projects/[id]/page.tsx`) | Shows a hard-coded sample project with two placeholder figures and an audit trail (previously read the DB). |
| `components/figures/FigureReviewBoard.tsx` | Approve/Reject/Replace buttons update local React state only; figure image `src` still points at the old `/api/.../assets/...` path (renders as a broken image / alt text). |
| `components/figures/ProjectIntake.tsx` | Choosing/dropping a PDF routes to the sample project instead of uploading. |

### Things you may want to revisit
- **Figure images** in `/projects/[id]` reference the removed asset API, so they
  show broken-image placeholders. Swap in static images under `public/` if you
  want the review board to look complete.
- The **sample project/figure data** is illustrative only — edit the arrays in
  `app/projects/page.tsx` and `app/projects/[id]/page.tsx` to taste.

---

## Troubleshooting

- **Blank page / "connection refused":** make sure the server is bound to
  `-H 0.0.0.0` (the `.replit` run command already does this). Replit can't
  reach a server bound to `localhost`.
- **`EMFILE: too many open files` when running `next dev`/`build` locally on
  macOS:** raise the descriptor limit in the same shell first, e.g.
  `ulimit -n 10240 && npm run dev`. (Not an issue on Replit.)
