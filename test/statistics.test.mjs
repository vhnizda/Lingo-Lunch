import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProgress, recordCategoryCleared, recordLevelCompletion, topCategory } from '../src/statistics.js';

test('level completion tracks totals, flawless clears, and category level counts', () => {
  const progress = recordLevelCompletion({ wonTopics: [] }, 'animals_and_nature', false);

  assert.deepEqual(progress, {
    wonTopics: [],
    completedLevels: 1,
    perfectLevels: 1,
    completedLevelsByCategory: { animals_and_nature: 1 },
  });
});

test('mistake-containing levels do not increment the flawless-clear total', () => {
  const progress = recordLevelCompletion({
    wonTopics: [],
    completedLevels: 4,
    perfectLevels: 3,
    completedLevelsByCategory: { animals_and_nature: 4 },
  }, 'animals_and_nature', true);

  assert.equal(progress.completedLevels, 5);
  assert.equal(progress.perfectLevels, 3);
  assert.equal(progress.completedLevelsByCategory.animals_and_nature, 5);
});

test('category clears remain unique and top category selects the highest level count', () => {
  const progress = recordCategoryCleared(recordCategoryCleared(normalizeProgress({
    completedLevelsByCategory: { animals_and_nature: 4, food_and_drink: 6 },
  }), 'animals_and_nature'), 'animals_and_nature');

  assert.deepEqual(progress.wonTopics, ['animals_and_nature']);
  assert.equal(topCategory(progress), 'food_and_drink');
});

test('legacy progress gains zero-value statistics without losing existing progress', () => {
  assert.deepEqual(normalizeProgress({ wonTopics: ['animals_and_nature'], completedLevels: 7 }), {
    wonTopics: ['animals_and_nature'],
    completedLevels: 7,
    perfectLevels: 0,
    completedLevelsByCategory: {},
  });
});
