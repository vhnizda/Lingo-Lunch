# Language Munchers

A browser-based language-recognition game inspired by the grid-and-munch loop of the classic *Number Munchers* games.

The frog moves across a 4-row × 6-column word board. Each level gives an English prompt. Eat every word in another language that matches the English word at the top; avoid the distractors.

## Play

The MVP is deployed to GitHub Pages from `main` after the Pages workflow runs. It is designed for public, browser-only play with no login.

### Controls

- Click or tap a different tile to move the frog; click or tap the focused tile again to eat it.
- **Arrow keys** move the frog; **Space** eats the focused tile.
- **Escape** or the **Pause** button beside the lives: pause the game. The pause panel freezes the board and feedback timer, and offers **Continue** or **Quit topic**.
- **Full Screen**: requests native operating-system full screen, including hidden browser navigation where the browser permits it. If a browser refuses this (common on iPad Safari), the game explains that it can only maximize in-page; use **Safari Share → Add to Home Screen** and launch the installed app for screen-filling play.

Touch/pointer and connected keyboards use the same move-then-munch interaction. Tapping a different square moves focus; tapping the already focused square explicitly munches it.

## MVP rules

- Select one vocabulary topic; its 20 concepts are shuffled and played once each.
- At the topic menu, `pt-PT` Portuguese is enabled by default. Toggle Czech, German, Portuguese, Spanish, and Italian local SVG flags to choose the session languages. They do not rely on browser emoji support, so they render in Brave as well. At least one language remains enabled; the final selected flag stays coloured and clickable, but clicking it leaves it enabled. The selection is fixed for that topic run and can be changed again only after returning to the topic menu.
- Each 24-tile board has 10 correct answers and 14 distractors—about 42% correct / 58% distractors. Tiles and correct answers are distributed as evenly as possible among the active languages. With all five enabled, each language has either four or five tiles and exactly two correct translations.
- Correct answers repeat intentionally and are mixed across the board. Distractors are drawn from a small per-language pool and intentionally repeat as well; there are no language labels or positional language patterns.
- A run starts with three resting-frog life icons. A wrong answer shows its English meaning for one second, then clears only the word content and costs one life. The board square remains available for frog movement but cannot be eaten again.
- Every cleared level adds one to the highlighted **Completed Levels Total** on the topic menu. It is a cumulative lifetime total stored only in that browser's local storage. Version 1 has no sound.

## Vocabulary source

The canonical source remains the private [`vhnizda/vaclav-language-learning-path`](https://github.com/vhnizda/vaclav-language-learning-path) repository:

- [`vocabulary/first-300-family-life.csv`](https://github.com/vhnizda/vaclav-language-learning-path/blob/main/vocabulary/first-300-family-life.csv)

`data/vocabulary.json` is a reviewed playable export of the CSV. It contains 301 concepts and includes only `id`, `group`, `english`, `czech`, `german_standard`, `portuguese_pt`, `spanish_standard`, and `italian_standard`; the source `notes` field is intentionally omitted. Each target-language field is shown as one indivisible tile, including articles and written alternatives.

Regenerate the export from an authorized local checkout with:

```bash
npm run export:vocabulary
```

## Development

No runtime dependencies are required.

```bash
npm test
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

The full MVP contract and future feature boundaries are in [docs/game-design-document.md](docs/game-design-document.md).
