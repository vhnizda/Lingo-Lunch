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

test('statistics labels are translated in every supported language', () => {
  for (const { key } of languageOptions) {
    assert.notEqual(t(key, 'perfect_levels_cleared'), 'perfect_levels_cleared');
    assert.notEqual(t(key, 'total_categories_cleared'), 'total_categories_cleared');
    assert.notEqual(t(key, 'top_category'), 'top_category');
    assert.notEqual(t(key, 'no_top_category'), 'no_top_category');
  }
});

test('language registry includes English with the local American flag asset', () => {
  assert.deepEqual(languageOptions.find((language) => language.key === 'english'), {
    key: 'english',
    flag: 'assets/flags/us.svg',
    locale: 'en',
  });
});
