import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('game screen uses touch-first instructions and a status-bar pause button', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /id="munch-button"|class="arrow-pad"|data-move=/);
  assert.match(html, /<button id="pause-button" class="leave-button" type="button">PAUSE<\/button>/);
  assert.match(html, /class="instruction instruction--pointer"/);
  assert.match(html, /Tap any box once to move the frog there and eat it\./);
  assert.match(html, /Click any box to select it\. Click the selected box again to eat it\./);
  assert.match(html, /class="instruction instruction--keyboard"/);
  assert.match(html, /<kbd class="key" aria-label="Arrow up">↑<\/kbd>/);
  assert.match(html, /<kbd class="key key--space">Space<\/kbd>/);
});

test('touch-first play enables one-tap movement and munching', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /matchMedia\('\(pointer: coarse\)'\)\.matches/);
  assert.match(app, /navigator\.maxTouchPoints > 0/);
  assert.match(app, /isTouchFirstDevice: isTouchFirstDevice\(\)/);
  assert.match(app, /appShell\.classList\.toggle\('is-touch-first', isTouchFirstDevice\(\)\)/);
});

test('lives use frog sprites instead of text circles', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /function renderLives\(lives\)/);
  assert.match(app, /life-frog/);
  assert.doesNotMatch(app, /livesElement\.textContent = '●'/);
});

test('language flags use local SVG images and never disable the final selection', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  const languageToggleRenderer = app.match(/function renderLanguageToggles\(\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(languageToggleRenderer, 'language toggle renderer must exist');
  assert.match(app, /assets\/flags\/cz\.svg/);
  assert.match(app, /assets\/flags\/es\.svg/);
  assert.match(app, /assets\/flags\/it\.svg/);
  assert.match(app, /key: 'spanish_standard'.*label: 'Spanish'/);
  assert.match(app, /key: 'italian_standard'.*label: 'Italian'/);
  assert.match(languageToggleRenderer, /flag\.src/);
  assert.doesNotMatch(languageToggleRenderer, /button\.disabled/);
  assert.match(languageToggleRenderer, /if \(enabled && selectedLanguages\.size === 1\) return;/);
});

test('styles provide room for frog lives and keep the instructions centered', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.lives-panel \{/);
  assert.match(css, /\.life-frog \{/);
  assert.match(css, /\.play-instructions \{[^}]*text-align:\s*center/);
  assert.match(css, /\.key--space \{[^}]*min-width:/);
  assert.match(css, /\.app-shell\.is-touch-first \.instruction--keyboard \{ display: none; \}/);
});

test('active play uses the viewport height and keeps a four-row board scalable', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(app, /appShell\.classList\.toggle\('is-playing', screen === screens\.game\)/);
  assert.match(css, /\.app-shell\.is-playing \{[\s\S]*min-height:\s*100dvh/);
  assert.match(css, /\.app-shell\.is-playing \.game-screen \{[\s\S]*height:\s*calc\(100dvh - 16px\)/);
  assert.match(css, /\.app-shell\.is-playing \.game-screen \{[\s\S]*grid-template-rows:\s*auto auto auto minmax\(229px, 1fr\) auto/);
});

test('short touch landscape screens use a compact orientation layout', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@media \(pointer: coarse\) and \(orientation: landscape\) and \(max-height: 520px\)/);
  assert.match(css, /\.app-shell\.is-playing \.game-screen \{ min-height: 0; padding: 6px 10px; \}/);
  assert.match(css, /\.app-shell\.is-playing \.board \{ min-height: 152px; grid-template-rows: repeat\(4, minmax\(38px, 1fr\)\);/);
});
