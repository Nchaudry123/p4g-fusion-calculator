# Velvet Fusion Deck

A **Persona 4 Golden** fusion planner with reverse recipes, skill inheritance hints, multi-step craft paths, forward fusion, and a personal compendium log.

**Repo:** [github.com/Nchaudry123/p4g-fusion-calculator](https://github.com/Nchaudry123/p4g-fusion-calculator)

## Features

- **Reverse fusion** — search a Persona and see every way to craft it (normal, same Arcana, special)
- **Priority queue** — click ingredients to build an ordered craft list
- **Owned-aware recipes** — filter ready / partial recipes and sort by missing ingredients
- **Easiest recipe stamp** — efficiency score from missing ingredients + level sum
- **Craft tab** — what you can fuse from owned Personas (ready / 1 missing / specials)
- **Skill inheritance planner** — desired skills, affinity matrix, and parent skill sources
- **Auto craft path** — multi-branch reverse planner with checklist progress
- **Forward fusion** — A + B result lookup, plus owned-partner previews
- **Compare** — side-by-side stats and skill diffs
- **Player data** — owned log, levels, completion dashboard, ultimates, recents, bookmarks
- **Margaret checklist** — ranks 2–10 requests with skill requirements
- **Offline pack** — precache Persona art for offline use
- **Accessibility** — high contrast mode, keyboard shortcuts, mobile queue sheet
- **Share links** — URL encodes persona, queue, tab, and tracked skills
- **Export / import** — portable JSON for your log
- **PWA** — installable, offline app shell + cached images

## Quick start

This is a static site. Any local server works:

```bash
# from this directory
python3 -m http.server 4173
# open http://localhost:4173
```

Or open via GitHub Pages / Vercel after deploy.

## Tests

```bash
node tests/fusion-test.mjs
```

Checks data integrity, special recipes, and reverse↔forward round-trips for sample Personas.

## Project layout

```
index.html              App shell
scripts/app.js          UI + fusion engine
scripts/needed-features.js  Craft, compare, inheritance sources, a11y extras
styles/main.css         Persona-inspired styling
styles/needed-features.css  Feature panel styles
styles/ui-polish.css    Layout/mobile polish layer
data/
  personas.json         205 P4G Personas
  fusion-chart.json     Arcana fusion table (incl. Aeon / Jester)
  special-recipes.json  Multi-Persona specials
  skills.json           Skill metadata for inheritance display
  persona-images.json   Sprite path map
assets/                 Logos, Arcana cards, Persona art
service-worker.js       Offline caching
tests/fusion-test.mjs   Headless accuracy checks
```

## Data & credits

- Fusion logic and Persona stats follow common community **Megaten fusion tool** conventions for Persona 4 Golden.
- Persona card sprites mapped from [The Spriters Resource — Persona Cards (P4G Vita)](https://www.spriters-resource.com/playstation_vita/persona4golden/asset/76204/).
- Some early asset experiments used Megami Tensei Fandom thumbnails; the app ships local sprites.
- Persona 4 Golden is © Atlus / SEGA. This is a fan-made planning tool, not an official product.

## Share URL params

| Param | Example | Meaning |
|-------|---------|---------|
| `persona` | `Trumpeter` | Active reverse-fusion target |
| `queue` | `Trumpeter,Matador,...` | Priority queue list |
| `tab` | `player` / `forward` / `margaret` | Active tab |
| `skills` | `Mind Charge,Bufula` | Desired inheritance skills |
| `recipe` | `0` | Optional recipe index hint |

## Privacy

Player data (owned list, levels, Margaret checks, desired skills) stays in **browser `localStorage`**. Nothing is uploaded unless you export a file yourself.
