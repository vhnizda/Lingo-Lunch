import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('statistics dialog keeps right-aligned score boxes while the menu uses a stats button', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /<button id="statistics-button" class="primary-button statistics-button" type="button">Player Game Stats<\/button>/);
  assert.doesNotMatch(html, /completed-levels-button|total-levels-label/);
  assert.match(html, /<strong id="statistics-completed-levels-total" class="completed-levels-score">0<\/strong>/);
  assert.match(app, /function formatCompletedLevels\(value\)/);
  assert.match(app, /return String\(Math\.max\(0, value\)\);/);
  assert.doesNotMatch(app, /padStart\(5, '0'\)/);
  assert.match(app, /statisticsCompletedLevelsTotal\.textContent = formatCompletedLevels\(progress\.completedLevels\)/);
  assert.match(css, /\.statistics-row > \.completed-levels-score \{[^}]*text-align:\s*right/);
});
