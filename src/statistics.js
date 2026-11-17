function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function categoryCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, count]) => typeof key === 'string' && key.length > 0 && nonNegativeInteger(count) > 0)
    .map(([key, count]) => [key, count]));
}

export function normalizeProgress(progress) {
  const value = progress && typeof progress === 'object' ? progress : {};
  return {
    wonTopics: [...new Set(Array.isArray(value.wonTopics) ? value.wonTopics.filter((topic) => typeof topic === 'string') : [])],
    completedLevels: nonNegativeInteger(value.completedLevels),
    perfectLevels: nonNegativeInteger(value.perfectLevels),
    completedLevelsByCategory: categoryCounts(value.completedLevelsByCategory),
  };
}

export function recordLevelCompletion(progress, category, madeMistake) {
  const next = normalizeProgress(progress);
  const count = next.completedLevelsByCategory[category] ?? 0;
  return {
    ...next,
    completedLevels: next.completedLevels + 1,
    perfectLevels: next.perfectLevels + (madeMistake ? 0 : 1),
    completedLevelsByCategory: { ...next.completedLevelsByCategory, [category]: count + 1 },
  };
}

export function recordCategoryCleared(progress, category) {
  const next = normalizeProgress(progress);
  return next.wonTopics.includes(category)
    ? next
    : { ...next, wonTopics: [...next.wonTopics, category] };
}

export function topCategory(progress) {
  const entries = Object.entries(normalizeProgress(progress).completedLevelsByCategory);
  if (entries.length === 0) return null;
  return entries.sort(([leftCategory, leftCount], [rightCategory, rightCount]) => (
    rightCount - leftCount || leftCategory.localeCompare(rightCategory)
  ))[0][0];
}
