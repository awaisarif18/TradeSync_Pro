# Implementation Prompt — TradeSync Pro Docs Site + Downloads (Cursor)

> Give Cursor this prompt **together with**:
> - `TradeSyncPro-Docs-Content.md` (the documentation content, already split into per-page blocks)
> - `frontendReadme.md` and `SYSTEM_CONTRACT_MATRIX.md` (architecture/contracts context)

---

## Role and how to work

You are extending the existing **`trade-sync-frontend`** app (Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 with `@theme` tokens in `globals.css`, Redux Toolkit, design system in `src/components/ui/`). Use `frontendReadme.md` for architecture; **do not crawl the whole repo** — open only the files listed under "Files to open."

This is a **frontend-only** task. Build an in-app MDX documentation site under `/docs`, plus a `/downloads` page, and wire two existing links. **No backend changes. No new external service, no separate docs framework (no Docusaurus/Nextra/Fumadocs), no hosted docs tool.** The docs render through the project's own design system so they match the site exactly.

Read `/mnt/skills/public/frontend-design/SKILL.md` (if available in your environment) before building UI, and pull all colors/fonts/spacing from the existing `@theme` tokens in `globals.css` — **do not hardcode hex values or invent new colors.** The look to emulate is a three-column documentation layout (left nav, center content, right "On this page") in the existing dark + mint TradeSyncPro theme.

---

## Objective

1. A documentation site at `/docs` that renders the MDX content from `TradeSyncPro-Docs-Content.md`.
2. A `/downloads` page offering the Provider and Copier desktop apps (Windows), and role-aware download CTAs on the dashboard.
3. Wire the existing **"Docs"** navbar link to `/docs`, and the existing **`/downloads`** placeholder CTA (in the provider first-time hero) to the real page.

---

## Approach (decided — do not substitute)

- **MDX content in a content folder.** Create the pages from `TradeSyncPro-Docs-Content.md` as `.mdx` files at the exact paths given in each `=== FILE: <path> ===` marker, preserving frontmatter and prose verbatim. Do not rewrite the content.
- **One catch-all route** `app/docs/[[...slug]]/page.tsx` reads the requested MDX file, parses frontmatter, and renders it inside a shared docs layout. `generateStaticParams` makes every page **statically generated (SSG)** — docs are public and static.
- **Sidebar and TOC are generated, not hand-maintained.** Build the sidebar from the frontmatter (`section` + `order`, using the section order specified at the top of the content file). Build the right-hand "On this page" list from the page's `h2`/`h3` headings.

### Suggested libraries (add to `package.json`; justify if you deviate)
- `next-mdx-remote` (or native `@next/mdx`) for MDX rendering.
- `gray-matter` for frontmatter parsing.
- `remark-gfm` (tables/lists), `rehype-slug` + `rehype-autolink-headings` (anchored headings + TOC extraction).
- For prose styling, **prefer styling with the existing `@theme` tokens** (a scoped `.docs-prose` class) so it stays on-brand. `@tailwindcss/typography` is acceptable only if you theme it to the existing tokens; do not let it introduce off-brand defaults.
- **Do not** add a second UI, animation, or icon library — reuse `lucide-react` and `components/ui/*`.

---

## Layout requirements (`/docs`)

Match the reference three-column documentation layout, in the project's theme:

- **Left sidebar:** grouped by section (Getting Started → Account & Web App → For Copiers → For Providers → Trading & Risk → Reference), items ordered by `order`. Current page highlighted (use the mint accent token). Collapsible sections. Sticky on desktop; drawer/disclosure on mobile (reuse the Navbar's mobile pattern, no new library).
- **Center content:** breadcrumb (e.g. *Docs › For Copiers › Symbol Mapping*) at top, then the rendered MDX in `.docs-prose`, then **Previous / Next** links at the bottom derived from sidebar order.
- **Right rail ("On this page"):** anchor links to the page's `h2`/`h3`, hidden on small screens. Optional scroll-spy highlight if cheap; not required.
- **`/docs` index:** redirect to the first page (`/docs/getting-started/introduction`) or render a short landing that links into the sections.
- All internal doc links in the content use `/docs/...` paths — ensure they resolve.
- Headings get anchor links (via `rehype-slug`) so deep links work.

Styling must use existing tokens: mint for links/active state, the existing card/surface colors, `JetBrains Mono` for inline code and code blocks, `Inter` for body. Code blocks should have a dark token-based background consistent with the app.

---

## Downloads (`/downloads`) + dashboard wiring

- **`/downloads` page (public):** two cards — **Provider app** and **Copier app** — each with a short description, the **Windows + MetaTrader 5** requirement note, and a download button. Use `components/ui` primitives and existing tokens.
- **Binary URLs:** the desktop apps are distributed as Windows installers (built from the Python client). Put the two download URLs in a single constants module (e.g. `src/lib/downloads.ts`) with clearly-named placeholder values (e.g. a GitHub Releases URL) for me to fill in. Do not hardcode URLs inline in components.
- **Dashboard CTAs (role-aware):** on the dashboard, show the **Provider** download to `MASTER` users and the **Copier** download to `SLAVE` users. Reuse the existing dashboard components; do not change auth or data fetching.
- **Fix the existing placeholder:** the provider first-time hero currently links to `/downloads` which doesn't exist — point it at the new page.

---

## Wiring the navbar

- In the **active** navbar (`src/components/navigation/Navbar.tsx` — not the legacy `layout/Navbar.tsx`), change the "Docs" link from its current anchor-only state to a real link to `/docs`. Keep it visible for both unauthenticated and authenticated states as it is today.

---

## Hard constraints (do not violate)

1. **No backend changes.** No new/changed API routes, sockets, auth, or contracts. Docs and downloads are public, static frontend only.
2. **Do not touch** auth flows, Redux auth shape, storage keys, `useIncomingSignals`, or any existing service in `services/api.ts`.
3. **Design fidelity:** reuse `@theme` tokens, `components/ui/*`, `sonner` for any toasts, `lucide-react` icons, `@/...` imports. No new color system, no second UI/animation/icon/HTTP library, no `tailwind.config.ts` (Tailwind v4 uses `@theme` in `globals.css`).
4. **Content is authored already** — render the provided MDX content verbatim; do not paraphrase, shorten, or "improve" the wording. The risk/disclaimer language in the Trading & Risk pages must be preserved exactly.
5. **`@/...` imports** everywhere, matching the existing tsconfig alias.
6. **SSG:** docs pages must be statically generated; no client-side data fetching for content.
7. **Update `frontendReadme.md`** with the new routes (`/docs`, `/docs/[[...slug]]`, `/downloads`), the content folder, the new deps, and the navbar/CTA wiring. (No `SYSTEM_CONTRACT_MATRIX.md` change is expected since no cross-service contract changes — confirm this.)

---

## Files to open to confirm (do NOT read beyond these)

- `src/app/layout.tsx` (root layout, where Navbar mounts)
- `src/components/navigation/Navbar.tsx` (active navbar; the Docs link)
- `src/app/globals.css` (the `@theme` tokens, fonts, existing keyframes — source all styling from here)
- `package.json` and `next.config.ts` (MDX config goes here if using `@next/mdx`)
- `tsconfig.json` (the `@/*` alias)
- `src/components/ui/index.ts` (and skim `Card.tsx`, `Button.tsx`, `Pill.tsx` for primitives to reuse)
- The provider dashboard component and its first-time hero with the `/downloads` CTA (per `frontendReadme.md`: `ProviderDashboard` / `FirstTimeProviderHero`)
- The copier dashboard component (for the role-aware copier download CTA)

---

## New files expected (state create vs modify in your plan)

**Create**
- `src/app/docs/[[...slug]]/page.tsx` — catch-all docs route (SSG + `generateStaticParams`).
- `src/app/docs/layout.tsx` — three-column docs shell (sidebar / content / TOC).
- Docs UI pieces, e.g. `src/components/docs/Sidebar.tsx`, `TableOfContents.tsx`, `Breadcrumb.tsx`, `PrevNext.tsx`, `MdxComponents.tsx`.
- `src/lib/docs.ts` — read content files, parse frontmatter, build the nav tree + page order.
- `src/lib/downloads.ts` — provider/copier download URL constants (placeholders).
- `src/app/downloads/page.tsx` — the downloads page.
- All `src/content/docs/**/*.mdx` files, created from `TradeSyncPro-Docs-Content.md`.
- A scoped `.docs-prose` style (in `globals.css` or a module) built from existing tokens, if not using a themed typography plugin.

**Modify**
- `src/components/navigation/Navbar.tsx` — Docs link → `/docs`.
- The provider dashboard hero — `/downloads` CTA → real page; add role-aware download CTAs on provider/copier dashboards.
- `package.json` — MDX/markdown deps.
- `next.config.ts` — only if using `@next/mdx`.
- `frontendReadme.md` — document the additions.

---

## What to deliver

1. A short plan: confirmed approach, the file create/modify list, and the deps you'll add.
2. Then implement it. Build the MDX pipeline + layout first, generate all content pages from the provided file, then the downloads page and wiring.
3. Confirm the build is static and that every internal `/docs/...` link in the content resolves.
4. Note anything I must fill in (the two download URLs in `src/lib/downloads.ts`).

Keep it on-theme, keep it frontend-only, and don't touch anything outside the scope above.
