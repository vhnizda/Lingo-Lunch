import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSettings, settingsForSourceLanguage } from '../src/settings.js';

test('default settings preserve English prompts against Portuguese', () => {
  assert.deepEqual(normalizeSettings(null), {
    sourceLanguage: 'english',
    targetLanguages: ['portuguese_pt'],
  });
});

test('changing source language removes it and adds the previous source as a target', () => {
  assert.deepEqual(settingsForSourceLanguage({
    sourceLanguage: 'english',
    targetLanguages: ['portuguese_pt', 'german_standard'],
  }, 'portuguese_pt'), {
    sourceLanguage: 'portuguese_pt',
    targetLanguages: ['english', 'german_standard'],
  });
});
