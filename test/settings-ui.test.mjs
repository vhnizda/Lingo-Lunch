import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('main menu has a settings dialog rather than inline topic-language flags', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="settings-button"/);
  assert.match(html, /id="settings-dialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="menu-language-select"/);
  assert.match(html, /id="target-language-options"/);
  assert.doesNotMatch(html, /id="language-toggles"/);
  assert.match(app, /const SETTINGS_KEY = 'lingo-lunch-settings';/);
  assert.match(app, /settingsButton\.textContent = 'GAME SETTINGS';/);
  assert.match(app, /settingsForSourceLanguage\(settings, menuLanguageSelect\.value\)/);
  assert.match(app, /localStorage\.setItem\(SETTINGS_KEY, JSON\.stringify\(settings\)\)/);
});

test('app renders player-facing UI through the active source-language translator', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /import \{ languageOptions, t, topicKey \} from '.\/src\/i18n\.js';/);
  assert.match(app, /function tr\(key, values = \{\}\)/);
  assert.match(app, /topicName\.textContent = tr\(topicKey\(group\)\)/);
  assert.match(app, /promptWord\.textContent = board\.promptText/);
  assert.match(app, /feedbackElement\.textContent = `\$\{tile\.displayText\} = \$\{outcome\.sourceText\}`/);
});

test('settings and vocabulary dialogs restore focus and close on Escape', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /function openSettings\(origin\)/);
  assert.match(app, /function closeSettings\(\)/);
  assert.match(app, /settingsClose\.focus\(\)/);
  assert.match(app, /settingsOrigin\?\.focus\(\)/);
  assert.match(app, /event\.key === 'Escape'/);
});

test('Player Game Stats button opens a focus-managed dialog', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /<button id="statistics-button" class="primary-button statistics-button" type="button">Player Game Stats<\/button>/);
  assert.doesNotMatch(html, /completed-levels-button|total-levels-label/);
  assert.match(html, /id="statistics-dialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="statistics-close" class="topic-review-close"[^>]*>×<\/button>/);
  assert.match(html, /id="statistics-completed-levels-total" class="completed-levels-score">0<\/strong>/);
  assert.match(html, /id="statistics-perfect-levels-total" class="completed-levels-score">0<\/strong>/);
  assert.match(html, /id="statistics-categories-cleared-total" class="completed-levels-score">0<\/strong>/);
  assert.match(html, /id="statistics-top-category-total" class="completed-levels-score">/);
  assert.match(html, /id="statistics-most-confusing-word-total" class="completed-levels-score">/);
  assert.match(html, /class="statistics-row">\s*<span[^>]+><\/span>\s*<strong/);
  assert.match(app, /tr\('most_confusing_word'\)/);
  assert.match(app, /recordIncorrectWord\(readProgress\(\), tile\.displayText\)/);
  assert.match(app, /tr\('total_perfect_levels'\)/);
  assert.doesNotMatch(app, /tr\('perfect_levels_cleared'\)/);
  assert.match(app, /tr\('total_categories_cleared'\)/);
  assert.match(app, /tr\('top_category'\)/);
  assert.match(app, /document\.querySelector\('#statistics-title'\)\.textContent = 'Player Game Stats';/);
  assert.match(app, /statisticsButton\.addEventListener\('click', \(\) => openStatistics\(statisticsButton\)\)/);
  assert.match(css, /\.topic-heading \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.topic-heading > \.settings-button, \.topic-heading > \.statistics-button \{[^}]*width:\s*100%/);
  assert.match(app, /statisticsOrigin\?\.focus\(\)/);
});
