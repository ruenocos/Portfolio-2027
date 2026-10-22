# wessel.cv

Wessel's portfolio. Next.js (App Router) now, Sanity for content next, hosted on Netlify.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Where things live

- `src/styles/tokens.css`: colors, type scale, spacing, radius and motion tokens. Change the look here first.
- `src/content/site.ts`: placeholder content. It moves to Sanity once the account is connected.
- `src/components/`: one component per section, each with its own CSS module.
- `src/app/`: the pages (Home, Work, case studies, About, Playground).

## Motion rules

- One orchestrated moment per view. On Home, that's the tokens-to-SCSS loop in the hero, and it pauses when off screen.
- Archivo's width stretch only runs on the hero headline when it loads, page titles when you arrive, and big numbers as they come in.
- Hover changes color, not size.
- Reduced motion turns the stretch and the loop off.
