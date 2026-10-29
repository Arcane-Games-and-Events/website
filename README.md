# Arcane Games & Events Website

The website for Arcane Games & Events (AGE), a Flesh and Blood TCG tournament organizer and publisher. Live at [age.events](https://www.age.events).

## What's on the site

- **Library:** strategy articles and videos
- **Academy:** courses and lessons
- **AGE Open:** the tournament series, with events, standings, decklists, results and player profiles
- **AGE Premium:** membership for premium articles, videos and courses
- **AGE Studios:** match coverage and video

## Built with

SvelteKit, Svelte 5 and Tailwind CSS 4, deployed on Vercel. Card data comes from the community [`@flesh-and-blood/cards`](https://www.npmjs.com/package/@flesh-and-blood/cards) package.

## Local development

Needs Node 20+ and pnpm, and access to the project's environment variables.

```bash
pnpm install
cp .env.example .env   # fill in the values from the team
pnpm dev               # http://localhost:5173
```

### Commands

```bash
pnpm dev        # Development server
pnpm build:ci   # Production build
pnpm preview    # Preview a production build
pnpm lint       # Prettier check + ESLint
pnpm format     # Format with Prettier
```

### Test data

`node scripts/seed-dev.mjs seed` fills a development database with a year of
activity: 100 accounts (password `seedpass123`), memberships, past events,
ticket sales and site browsing. `node scripts/seed-authnet.mjs run` then
gives those purchases real Authorize.net sandbox records (needs
`AUTHNET_ENVIRONMENT=sandbox`; relax the sandbox's velocity filter first).
`node scripts/seed-dev.mjs unseed` removes everything the seed added. Never
run these against production.

## Design guidelines

The site is styled like a print magazine. Keep new pages consistent:

- **Type:** Newsreader for headlines and body text, Libre Franklin for interface text. Small labels use small caps with a ◆ (`◆ Library`).
- **Colour:** use the tokens in `src/app.css` (`ink`, `paper`, `line`, `warm` and the rest) rather than raw colours.
- **No rounded corners.** Use hairlines and double rules instead of cards with shadows.
- **Cover images are 16:9** and are never cropped.

## New card sets

Dependabot opens a weekly PR when the card packages update; merging it brings in the new set. Hero portraits go in `static/hero_images/`, named after the hero (`kayo-armed-and-dangerous.webp`). Resize them with `node scripts/resize-images.js` before committing.

## License

Private. All rights reserved. The source is visible but not licensed for reuse.
