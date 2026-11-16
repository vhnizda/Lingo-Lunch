const LANGUAGES = [
  'czech',
  'german_standard',
  'portuguese_pt',
  'spanish_standard',
  'italian_standard',
];
const DEFAULT_LAYOUT = { columns: 6, rows: 4, correctTiles: 10 };
const DISTRACTOR_POOL_SIZE = 3;

function boardSize(layout) {
  return layout.columns * layout.rows;
}

function validateLayout(layout, languageCount) {
  if (!Number.isInteger(layout?.columns) || !Number.isInteger(layout?.rows) || !Number.isInteger(layout?.correctTiles)
    || layout.columns < 1 || layout.rows < 1 || layout.correctTiles < languageCount || layout.correctTiles >= boardSize(layout)) {
    throw new Error('A board layout needs positive dimensions and enough correct tiles for every selected language.');
  }
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function distributeCount(total, languages, random) {
  const counts = new Map(languages.map((language) => [language, Math.floor(total / languages.length)]));
  const remainder = total % languages.length;
  for (const language of shuffle(languages, random).slice(0, remainder)) {
    counts.set(language, counts.get(language) + 1);
  }
  return counts;
}

function createTile({ concept, language, isCorrect, sequence }) {
  return {
    id: `${concept.id}-${language}-${sequence}`,
    conceptId: concept.id,
    language,
    displayText: concept[language],
    english: concept.english,
    isCorrect,
  };
}

function hasSpatialCue(tiles, layout, checkLanguagePattern = true) {
  const rows = Array.from({ length: layout.rows }, (_, row) =>
    tiles.slice(row * layout.columns, (row + 1) * layout.columns),
  );
  const columns = Array.from({ length: layout.columns }, (_, column) =>
    rows.map((row) => row[column]),
  );

  return [...rows, ...columns].some((line) => {
    const languages = new Set(line.map((tile) => tile.language));
    const concepts = new Set(line.map((tile) => tile.conceptId));
    return (checkLanguagePattern && languages.size === 1) || concepts.size === 1;
  });
}

function buildCandidateTiles({ topicRows, prompt, languages, layout, random }) {
  const activeLanguages = languages ?? LANGUAGES;
  if (activeLanguages.length === 0 || activeLanguages.some((language) => !LANGUAGES.includes(language))) {
    throw new Error('A board needs at least one supported target language.');
  }
  if (new Set(activeLanguages).size !== activeLanguages.length) {
    throw new Error('Selected target languages must be unique.');
  }
  validateLayout(layout, activeLanguages.length);
  const distractors = topicRows.filter((row) => row.id !== prompt.id);
  if (distractors.length < 4) {
    throw new Error('A topic needs at least five concepts to build an MVP board.');
  }

  const tiles = [];
  const tileCounts = distributeCount(boardSize(layout), activeLanguages, random);
  const extraCorrectCounts = distributeCount(layout.correctTiles - activeLanguages.length, activeLanguages, random);
  const correctCounts = new Map(activeLanguages.map((language) => [language, 1 + extraCorrectCounts.get(language)]));
  let sequence = 0;
  for (const language of activeLanguages) {
    const correctCount = correctCounts.get(language);
    const distractorCount = tileCounts.get(language) - correctCount;
    for (let count = 0; count < correctCount; count += 1) {
      tiles.push(createTile({ concept: prompt, language, isCorrect: true, sequence: sequence++ }));
    }

    const distractorPool = shuffle(distractors, random)
      .filter((row, index, rows) => (
        rows.findIndex((candidate) => candidate[language] === row[language]) === index
      ))
      .slice(0, Math.min(DISTRACTOR_POOL_SIZE, distractorCount));
    if (distractorPool.length < Math.min(DISTRACTOR_POOL_SIZE, distractorCount)) {
      throw new Error(`A topic needs ${Math.min(DISTRACTOR_POOL_SIZE, distractorCount)} distinct ${language} distractors to build an MVP board.`);
    }
    for (let count = 0; count < distractorCount; count += 1) {
      tiles.push(createTile({
        concept: distractorPool[count % distractorPool.length],
        language,
        isCorrect: false,
        sequence: sequence++,
      }));
    }
  }
  return tiles;
}

export function createTopicRun(rows, group, random = Math.random) {
  return shuffle(rows.filter((row) => row.group === group), random);
}

export function buildBoard({ topicRows, prompt, languages = LANGUAGES, layout = DEFAULT_LAYOUT, random = Math.random }) {
  const candidateTiles = buildCandidateTiles({ topicRows, prompt, languages, layout, random });
  let tiles = candidateTiles;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const shuffled = shuffle(candidateTiles, random);
    if (!hasSpatialCue(shuffled, layout, languages.length > 1)) {
      tiles = shuffled;
      break;
    }
  }

  return { prompt, languages: [...languages], layout: { ...layout }, tiles };
}

export function isBoardValid(board) {
  const activeLanguages = board.languages ?? LANGUAGES;
  if (activeLanguages.length === 0 || new Set(activeLanguages).size !== activeLanguages.length) return false;

  const layout = board.layout ?? DEFAULT_LAYOUT;
  try {
    validateLayout(layout, activeLanguages.length);
  } catch {
    return false;
  }
  const size = boardSize(layout);
  if (board.tiles.length !== size || hasSpatialCue(board.tiles, layout, activeLanguages.length > 1)) return false;

  const correctTiles = board.tiles.filter((tile) => tile.isCorrect);
  const distractorTiles = board.tiles.filter((tile) => !tile.isCorrect);
  if (correctTiles.length !== layout.correctTiles || distractorTiles.length !== size - layout.correctTiles) return false;

  const minimumTilesPerLanguage = Math.floor(size / activeLanguages.length);
  const maximumTilesPerLanguage = Math.ceil(size / activeLanguages.length);
  const minimumCorrectTilesPerLanguage = Math.floor(layout.correctTiles / activeLanguages.length);
  const maximumCorrectTilesPerLanguage = Math.ceil(layout.correctTiles / activeLanguages.length);
  for (const language of activeLanguages) {
    const languageTiles = board.tiles.filter((tile) => tile.language === language);
    const languageCorrectTiles = languageTiles.filter((tile) => tile.isCorrect).length;
    if (languageTiles.length < minimumTilesPerLanguage || languageTiles.length > maximumTilesPerLanguage
      || languageCorrectTiles < minimumCorrectTilesPerLanguage || languageCorrectTiles > maximumCorrectTilesPerLanguage) return false;
  }
  return !board.tiles.some((tile) => !activeLanguages.includes(tile.language));
}

export function resolveMunch({ tile, lives }) {
  if (tile.cleared) {
    return { kind: 'ignored', lives, clearTile: false };
  }
  if (tile.isCorrect) {
    return { kind: 'correct', lives, clearTile: true };
  }
  return {
    kind: 'wrong',
    lives: Math.max(0, lives - 1),
    clearTile: true,
    englishMeaning: tile.english,
  };
}

export const boardConfig = {
  columns: DEFAULT_LAYOUT.columns,
  rows: DEFAULT_LAYOUT.rows,
  languages: LANGUAGES,
};
