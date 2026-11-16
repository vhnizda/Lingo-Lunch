import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('game screen uses touch-first instructions and a status-bar pause button', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /id="munch-button"|class="arrow-pad"|data-move=/);
  assert.match(html, /<div class="prompt-heading">[\s\S]*<button id="pause-button" class="leave-button prompt-pause-button" type="button">PAUSE<\/button>/);
  assert.doesNotMatch(html, /class="play-instructions"/);
  assert.match(html, /class="pause-instructions" aria-label="Game controls"/);
  assert.match(html, /Tap a box to move the frog there and eat it\./);
  assert.match(html, /Arrow keys move\. Space eats\./);
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

test('topic menu defaults to Portuguese and points the language prompt at the flags', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(app, /let selectedLanguages = new Set\(\['portuguese_pt'\]\);/);
  assert.match(html, /<span class="language-label">PICK YOUR LANGUAGE\(S\) →<\/span>/);
});

test('styles provide room for frog lives and show controls in the pause menu', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.lives-panel \{/);
  assert.match(css, /\.life-frog \{/);
  assert.match(css, /\.pause-instructions \{[^}]*text-align:\s*left/);
});

test('mobile topic controls compact five flags beside the language prompt', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  const mobileRule = css.match(/@media \(max-width: 650px\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(mobileRule, 'mobile layout rule must exist');
  assert.match(mobileRule, /\.language-toggle \{ min-width: 42px; min-height: 38px; \}/);
  assert.match(mobileRule, /\.language-toggles \{ gap: 4px; \}/);
});

test('phone portrait keeps the play status on one compact line', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.app-shell\.is-playing \.fullscreen-button \{ display: none; \}/);
  assert.match(css, /\.app-shell\.is-playing \.status-bar \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) minmax\(0, 1fr\);/);
  assert.match(css, /\.app-shell\.is-playing \.status-bar > div \{ min-width: 0; text-align: left; \}/);
  assert.match(css, /\.app-shell\.is-playing \.lives-panel \{ grid-column: auto; gap: 4px; \}/);
  assert.match(css, /\.app-shell\.is-playing \.prompt-pause-button \{[^}]*margin-left: auto;/);
  assert.match(css, /\.app-shell\.is-playing \.prompt-box, \.app-shell\.is-playing \.board-stage \{ max-width: 100%; \}/);
});

test('tablet menus compact all topics into the visible fullscreen viewport', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(app, /appShell\.classList\.toggle\('is-menu', screen === screens\.topics\)/);
  assert.match(css, /@media \(min-width: 600px\) and \(min-height: 600px\) \{[\s\S]*\.app-shell\.is-menu/);
  assert.match(css, /\.app-shell\.is-menu \.topic-list \{\s+grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
});

test('active play uses the viewport height and keeps a four-row board scalable', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(app, /appShell\.classList\.toggle\('is-playing', screen === screens\.game\)/);
  assert.match(css, /\.app-shell\.is-playing \{[\s\S]*min-height:\s*100dvh/);
  assert.match(css, /\.app-shell\.is-playing \.game-screen \{[\s\S]*height:\s*calc\(100dvh - 16px\)/);
  assert.match(css, /\.app-shell\.is-playing \.game-screen \{[\s\S]*grid-template-rows:\s*auto auto auto minmax\(229px, 1fr\);/);
  assert.match(css, /\.app-shell\.is-playing \.board-stage \{ min-height: 229px; \}/);
  assert.match(css, /\.board-stage > \.board \{ width: 100%; height: 100%; \}/);
  assert.match(css, /\.frog \{[\s\S]*height:\s*65%;[\s\S]*aspect-ratio:\s*1;[\s\S]*width:\s*auto;/);
});

test('short touch landscape screens use a compact orientation layout', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@media \(pointer: coarse\) and \(orientation: landscape\) and \(max-height: 520px\)/);
  assert.match(css, /\.app-shell\.is-playing \.game-screen \{ min-height: 0; padding: 6px 10px; \}/);
  assert.match(css, /\.app-shell\.is-playing \.board \{ min-height: 152px; grid-template-rows: repeat\(var\(--board-rows, 4\), minmax\(38px, 1fr\)\);/);
});

test('topic cards use equal-height rows with centered labels', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.topic-list \{[\s\S]*grid-auto-rows:\s*1fr/);
  assert.match(css, /\.topic-button \{[\s\S]*height:\s*100%/);
  assert.match(css, /\.topic-button \{[\s\S]*text-align:\s*center/);
});
