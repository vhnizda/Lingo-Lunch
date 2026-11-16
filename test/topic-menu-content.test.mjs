import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('topic menu renders its introduction through translations', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="intro" class="intro"/);
  assert.match(app, /intro'\)\.textContent = tr\('intro'\)/);
});

test('masthead presents Lingo Lunch Basics with a left-lower slanted edition sticker', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const manifest = await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8');

  assert.match(html, /<title>Lingo Lunch Basics<\/title>/);
  assert.match(manifest, /"name": "Lingo Lunch Basics"/);
  assert.match(html, /<h1>LINGO<br \/>LUNCH<\/h1>\s*<span class="edition-sticker">BASICS<\/span>/);
  assert.match(css, /\.edition-sticker \{[\s\S]*transform:\s*rotate\(-8deg\)/);
  assert.match(css, /\.edition-sticker \{[\s\S]*position:\s*absolute/);
});

test('phone portrait moves the Basics sticker lower and closer to LUNCH', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const portraitRule = css.match(/@media \(pointer: coarse\) and \(orientation: portrait\) and \(max-width: 650px\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(portraitRule, 'phone portrait sticker rule must exist');
  assert.match(portraitRule, /\.edition-sticker \{ top:\s*48px; left:\s*calc\(50% \+ 68px\); \}/);
});

test('progress moves from the legacy key to Lingo Lunch storage', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /const PROGRESS_KEY = 'lingo-lunch-progress';/);
  assert.match(app, /const LEGACY_PROGRESS_KEY = 'language-munchers-progress';/);
  assert.match(app, /localStorage\.setItem\(PROGRESS_KEY, JSON\.stringify\(progress\)\)/);
});

test('topic menu renders the translated cumulative completed-level total', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="total-levels-label"/);
  assert.match(app, /total-levels-label'\)\.textContent = tr\('total_levels_cleared'\)/);
  assert.match(app, /progress\.completedLevels \+= 1;/);
  assert.match(css, /\.completed-levels-banner \{/);
});

test('topic review opens as a dimmed, translated, scrollable vocabulary dialog', async () => {
  const [html, css, app] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="topic-review-dialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(app, /topicReviewTitle\.textContent = tr\('vocabulary_title'/);
  assert.match(app, /const languages = languageOptions\.filter/);
  assert.match(css, /\.topic-review-content \{[\s\S]*overflow:\s*auto/);
});
