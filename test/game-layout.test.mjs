import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('game screen renders translated touch-first instructions and a status-bar pause button', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="pause-button" class="leave-button prompt-pause-button"/);
  assert.match(html, /id="pause-instructions" class="pause-instructions"/);
  assert.match(app, /\['touch_or_mouse', 'touch_or_mouse_instruction'\]/);
  assert.match(app, /\['keyboard', 'keyboard_instruction'\]/);
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

test('settings language controls use local flags and keep one target language enabled', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /flag\.src = language\.flag/);
  assert.match(app, /languageOptions/);
  assert.match(app, /enabled && settings\.targetLanguages\.length === 1/);
  assert.match(app, /minimumTargetLanguage\.classList\.add\('is-visible'\)/);
});

test('settings defaults to Portuguese targets and exposes a main-menu settings button', async () => {
  const [html, settings] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/settings.js', import.meta.url), 'utf8'),
  ]);

  assert.match(settings, /targetLanguages: \['portuguese_pt'\]/);
  assert.match(html, /id="settings-button"/);
  assert.doesNotMatch(html, /id="language-toggles"/);
});

test('styles provide room for frog lives and show controls in the pause menu', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.lives-panel \{/);
  assert.match(css, /\.life-frog \{/);
  assert.match(css, /\.pause-instructions \{[^}]*text-align:\s*left/);
});

test('phone portrait centers the language label above the flag row', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  const portraitRule = css.match(/@media \(pointer: coarse\) and \(orientation: portrait\) and \(max-width: 650px\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(portraitRule, 'phone portrait language layout rule must exist');
  assert.match(portraitRule, /\.language-controls \{ flex-direction:\s*column; align-items:\s*center; justify-content:\s*center; \}/);
  assert.match(portraitRule, /\.language-label \{ text-align:\s*center; \}/);
  assert.match(portraitRule, /\.language-toggles \{ justify-content:\s*center; \}/);
});

test('phone portrait puts the cleared-level total on a centered second line', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const portraitRule = css.match(/@media \(pointer: coarse\) and \(orientation: portrait\) and \(max-width: 650px\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(portraitRule, 'phone portrait rule must exist');
  assert.match(portraitRule, /\.completed-levels-banner strong \{ display:\s*block; text-align:\s*center; \}/);
});

test('phone portrait keeps the topic menu in a fixed outer frame with touch scrolling inside it', async () => {
  const [html, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /<section id="topic-screen"[^>]*>\s*<div class="topic-scroll-content">/);
  const portraitRule = css.match(/@media \(pointer: coarse\) and \(orientation: portrait\) and \(max-width: 650px\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(portraitRule, 'phone portrait rule must exist');
  assert.match(portraitRule, /\.app-shell\.is-menu \{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/);
  assert.match(portraitRule, /\.app-shell\.is-menu \{[^}]*padding-bottom:\s*max\(10px, env\(safe-area-inset-bottom\)\)/);
  assert.match(portraitRule, /#topic-screen \{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/);
  assert.match(portraitRule, /\.topic-scroll-content \{[^}]*overflow-y:\s*auto/);
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

test('short touch landscape compacts the pause dialog below gameplay text scale', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const landscapeRule = css.match(/@media \(pointer: coarse\) and \(orientation: landscape\) and \(max-height: 520px\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(landscapeRule, 'short touch landscape rule must exist');
  assert.match(landscapeRule, /\.pause-panel \{[^}]*max-height:\s*calc\(100dvh - 16px\)[^}]*padding:\s*12px 16px/);
  assert.match(landscapeRule, /\.pause-instructions \{[^}]*font-size:\s*16px/);
  assert.match(landscapeRule, /\.pause-panel \.intro \{[^}]*font-size:\s*16px/);
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
