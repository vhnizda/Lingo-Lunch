import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('completed-level total uses a right-aligned score box without padding zeros', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /<strong id="completed-levels-total" class="completed-levels-score">0<\/strong>/);
  assert.match(app, /function formatCompletedLevels\(value\)/);
  assert.match(app, /return String\(Math\.max\(0, value\)\);/);
  assert.doesNotMatch(app, /padStart\(5, '0'\)/);
  assert.match(app, /completedLevelsTotal\.textContent = formatCompletedLevels\(progress\.completedLevels\)/);
  assert.match(css, /\.completed-levels-score \{[^}]*display:\s*inline-block[^}]*text-align:\s*right/);
  assert.match(css, /\.completed-levels-banner \.completed-levels-score \{ margin:\s*5px 0 0; text-align:\s*right; \}/);
});
