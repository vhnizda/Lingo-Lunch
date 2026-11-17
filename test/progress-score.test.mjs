import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('completed-level total uses a five-digit score box', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /<strong id="completed-levels-total" class="completed-levels-score">00000<\/strong>/);
  assert.match(app, /function formatCompletedLevels\(value\)/);
  assert.match(app, /String\(Math\.max\(0, value\)\)\.padStart\(5, '0'\)/);
  assert.match(app, /completedLevelsTotal\.textContent = formatCompletedLevels\(progress\.completedLevels\)/);
  assert.match(css, /\.completed-levels-score \{[^}]*display:\s*inline-block/);
});
