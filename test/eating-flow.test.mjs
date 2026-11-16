import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('correct eating clears the word without pending-tile styling or a second animation', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const correctBranch = app.match(/if \(outcome\.kind === 'correct'\) \{([\s\S]*?)\n  \}\n\n  state\.lives/)?.[1];

  assert.ok(correctBranch, 'correct-answer flow must exist');
  assert.doesNotMatch(correctBranch, /pendingTiles\.add/);
  assert.match(app, /function resolveCorrectAnswer\(\)[\s\S]*?state\.frogAnimation = 'idle';/);
});

test('non-final level completion translates its brief overlay before sliding in the next board', async () => {
  const [app, html, css] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="level-complete-overlay"/);
  assert.match(app, /level-complete-overlay'\)\.textContent = tr\('level_complete'\)/);
  assert.match(app, /window\.setTimeout\(beginBoardSlide, LEVEL_COMPLETE_OVERLAY_MS\)/);
  assert.match(css, /@keyframes board-enter-right/);
});

test('a wrong-answer tile clears after its eat animation while review feedback remains', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const clearWrongTile = app.match(/function clearWrongTile\(\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(clearWrongTile, 'wrong-tile cleanup must exist');
  assert.match(clearWrongTile, /review\.tile\.cleared = true;/);
  assert.match(clearWrongTile, /state\.pendingTiles\.delete\(review\.tile\.id\);/);
  assert.match(app, /dueAt: Date\.now\(\) \+ FROG_EAT_DURATION_MS,/);
  assert.match(app, /scheduleWrongTileClear\(\);/);
});

test('wrong-answer review persists through movement and changes only on the next eat', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const moveBody = app.match(/function move\(direction\) \{([\s\S]*?)\n\}/)?.[1];
  const munchBody = app.match(/function munch\(\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(moveBody, 'movement flow must exist');
  assert.ok(munchBody, 'munch flow must exist');
  assert.doesNotMatch(moveBody, /wrongTimer/);
  assert.match(munchBody, /clearWrongReview\(\);[\s\S]*?resolveMunch/);
  assert.doesNotMatch(app, /scheduleWrongAnswer|WRONG_ANSWER_REVIEW_DURATION_MS/);
});

test('eating animation holds its final frame until the word is cleared', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.frog--eating img \{ animation: frog-eating 360ms steps\(5, end\) forwards; \}/);
});

test('arrow movement completes a correct eat immediately while Space remains ignored', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /function finishEatingForMovement\(\)[\s\S]*?resolveCorrectAnswer\(\)/);
  assert.match(app, /function move\(direction\) \{\n  if \(!state \|\| state\.paused\) return false;\n  if \(state\.transitioning\) return false;\n  if \(finishEatingForMovement\(\) \|\| !state\) return false;/);
  assert.match(app, /function munch\(\) \{\n  if \(!state \|\| state\.paused \|\| state\.transitioning \|\| state\.eatTimer\) return;/);
});

test('held arrow movement uses a controlled repeat and stops on key release', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /const HELD_MOVE_INITIAL_DELAY_MS = 250;/);
  assert.match(app, /const HELD_MOVE_INTERVAL_MS = 120;/);
  assert.match(app, /document\.addEventListener\('keyup', \(event\) => \{[\s\S]*?stopHeldMovement\(event\.key\)/);
});
