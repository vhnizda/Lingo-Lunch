import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('topic menu introduces the completion goal', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<p class="eyebrow">A retro inspired language game<\/p>/);
  assert.match(html, /<p class="intro">Eat your way to language mastery\. Pick a topic below and complete all the levels\.<\/p>/);
  assert.doesNotMatch(html, /Eat every word in another language/);
});

test('topic menu highlights the cumulative completed-level total', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(html, /<p class="completed-levels-banner">Completed Levels Total: <strong id="completed-levels-total">0<\/strong><\/p>/);
  assert.match(css, /\.completed-levels-banner \{/);
  assert.match(app, /progress\.completedLevels \+= 1;/);
  assert.match(app, /completedLevels: 0/);
});
