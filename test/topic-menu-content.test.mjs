import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('topic menu introduces the completion goal', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<p class="eyebrow">A retro inspired language game<\/p>/);
  assert.match(html, /<p class="intro">Eat your way to language mastery\. Pick a topic below and complete all the levels\.<\/p>/);
  assert.doesNotMatch(html, /Eat every word in another language/);
});

test('masthead presents Lingo Lunch Basics with a slanted edition sticker', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const manifest = await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8');

  assert.match(html, /<title>Lingo Lunch Basics<\/title>/);
  assert.match(manifest, /"name": "Lingo Lunch Basics"/);
  assert.match(html, /<h1>LINGO<br \/>LUNCH<\/h1>\s*<span class="edition-sticker">BASICS<\/span>/);
  assert.match(css, /\.edition-sticker \{[\s\S]*transform:\s*rotate\(8deg\)/);
  assert.match(css, /\.edition-sticker \{[\s\S]*position:\s*absolute/);
});

test('progress moves from the legacy key to Lingo Lunch storage', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /const PROGRESS_KEY = 'lingo-lunch-progress';/);
  assert.match(app, /const LEGACY_PROGRESS_KEY = 'language-munchers-progress';/);
  assert.match(app, /localStorage\.setItem\(PROGRESS_KEY, JSON\.stringify\(progress\)\)/);
});

test('topic menu highlights the cumulative completed-level total', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(html, /<p class="completed-levels-banner">TOTAL LEVELS CLEARED: <strong id="completed-levels-total">0<\/strong><\/p>/);
  assert.match(css, /\.completed-levels-banner \{/);
  assert.match(app, /progress\.completedLevels \+= 1;/);
  assert.match(app, /completedLevels: 0/);
});
