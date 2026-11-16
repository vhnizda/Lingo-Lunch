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

test('wrong-answer cleanup returns the frog to idle before rerendering', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const wrongAnswerCleanup = app.match(/function resolveWrongAnswer\(\) \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(wrongAnswerCleanup, 'wrong-answer cleanup must exist');
  assert.match(wrongAnswerCleanup, /state\.frogAnimation = 'idle';[\s\S]*?renderGame\(\);/);
});

test('eating animation holds its final frame until the word is cleared', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.frog--eating img \{ animation: frog-eating 360ms steps\(5, end\) forwards; \}/);
});

test('arrow movement completes a correct eat immediately while Space remains ignored', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /function finishEatingForMovement\(\)[\s\S]*?resolveCorrectAnswer\(\)/);
  assert.match(app, /function move\(direction\) \{\n  if \(!state \|\| state\.paused\) return false;\n  if \(finishEatingForMovement\(\) \|\| !state\) return false;/);
  assert.match(app, /function munch\(\) \{\n  if \(!state \|\| state\.paused \|\| state\.eatTimer\) return;/);
});

test('held arrow movement uses a controlled repeat and stops on key release', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /const HELD_MOVE_INITIAL_DELAY_MS = 250;/);
  assert.match(app, /const HELD_MOVE_INTERVAL_MS = 120;/);
  assert.match(app, /document\.addEventListener\('keyup', \(event\) => \{[\s\S]*?stopHeldMovement\(event\.key\)/);
});
