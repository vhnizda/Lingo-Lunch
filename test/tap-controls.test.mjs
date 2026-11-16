import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldMoveToEmptyOnTouchTap, shouldMunchOnTileTap } from '../src/tap-controls.js';

test('tapping the focused available square requests a munch', () => {
  assert.equal(shouldMunchOnTileTap({ focusedIndex: 7, tappedIndex: 7, isPending: false }), true);
});

test('tapping another square moves focus without munching', () => {
  assert.equal(shouldMunchOnTileTap({ focusedIndex: 7, tappedIndex: 8, isPending: false }), false);
});

test('a touch-first device munches any available tile with one tap', () => {
  assert.equal(shouldMunchOnTileTap({
    focusedIndex: 7,
    tappedIndex: 8,
    isPending: false,
    isTouchFirstDevice: true,
  }), true);
});

test('tapping a pending square never requests a munch', () => {
  assert.equal(shouldMunchOnTileTap({ focusedIndex: 7, tappedIndex: 7, isPending: true }), false);
  assert.equal(shouldMunchOnTileTap({
    focusedIndex: 7,
    tappedIndex: 8,
    isPending: true,
    isTouchFirstDevice: true,
  }), false);
});

test('a touch tap moves the frog onto a cleared square without munching', () => {
  assert.equal(shouldMoveToEmptyOnTouchTap({ isCleared: true, isTouchInput: true }), true);
  assert.equal(shouldMoveToEmptyOnTouchTap({ isCleared: true, isTouchInput: false }), false);
  assert.equal(shouldMoveToEmptyOnTouchTap({ isCleared: false, isTouchInput: true }), false);
});
