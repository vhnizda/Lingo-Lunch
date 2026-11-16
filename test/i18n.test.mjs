import assert from 'node:assert/strict';
import test from 'node:test';
import { languageOptions, t } from '../src/i18n.js';

test('translations use the reviewed Portuguese settings text', () => {
  assert.equal(t('portuguese_pt', 'settings'), 'DEFINIÇÕES');
  assert.equal(t('portuguese_pt', 'language_native_portuguese_pt'), 'Português');
});

test('translations format placeholders and plural forms for the active language', () => {
  assert.equal(t('german_standard', 'review_vocabulary', { topic: 'Tiere und Natur' }), 'Wortschatz zum Thema Tiere und Natur ansehen');
  assert.equal(t('czech', 'topic_word_count', { count: 3 }), '3 slova');
  assert.equal(t('italian_standard', 'topic_word_count', { count: 2 }), '2 parole');
});

test('language registry includes English with the local American flag asset', () => {
  assert.deepEqual(languageOptions.find((language) => language.key === 'english'), {
    key: 'english',
    flag: 'assets/flags/us.svg',
    locale: 'en',
  });
});
