import { boardConfig, buildBoard, createTopicRun, resolveMunch } from './src/game.js';
import { pauseTimer, resumeTimer } from './src/pause.js';
import { shouldMunchOnTileTap } from './src/tap-controls.js';
import { FROG_EAT_ANIMATION, FROG_EAT_DURATION_MS, frogAnimationForMove } from './src/frog.js';

const vocabulary = await fetch('./data/vocabulary.json').then((response) => {
  if (!response.ok) throw new Error('Could not load vocabulary data.');
  return response.json();
});

const screens = {
  topics: document.querySelector('#topic-screen'),
  game: document.querySelector('#game-screen'),
  result: document.querySelector('#result-screen'),
};
const appShell = document.querySelector('.app-shell');
const topicList = document.querySelector('#topic-list');
const languageToggles = document.querySelector('#language-toggles');
const boardElement = document.querySelector('#board');
const feedbackElement = document.querySelector('#feedback');
const pauseDialog = document.querySelector('#pause-dialog');
const fullscreenButton = document.querySelector('#fullscreen-button');
const fullscreenNotice = document.querySelector('#fullscreen-notice');
const topicName = document.querySelector('#topic-name');
const wordProgress = document.querySelector('#word-progress');
const livesElement = document.querySelector('#lives');
const promptWord = document.querySelector('#prompt-word');
const resultTitle = document.querySelector('#result-title');
const resultMessage = document.querySelector('#result-message');
const completedLevelsTotal = document.querySelector('#completed-levels-total');
const topicReviewDialog = document.querySelector('#topic-review-dialog');
const topicReviewTitle = document.querySelector('#topic-review-title');
const topicReviewContent = document.querySelector('#topic-review-content');
const topicReviewClose = document.querySelector('#topic-review-close');

const LANGUAGE_OPTIONS = [
  { key: 'czech', flag: 'assets/flags/cz.svg', label: 'Czech' },
  { key: 'german_standard', flag: 'assets/flags/de.svg', label: 'German' },
  { key: 'portuguese_pt', flag: 'assets/flags/pt.svg', label: 'Portuguese' },
  { key: 'spanish_standard', flag: 'assets/flags/es.svg', label: 'Spanish' },
  { key: 'italian_standard', flag: 'assets/flags/it.svg', label: 'Italian' },
];
const PROGRESS_KEY = 'lingo-lunch-progress';
const LEGACY_PROGRESS_KEY = 'language-munchers-progress';
const HELD_MOVE_INITIAL_DELAY_MS = 250;
const HELD_MOVE_INTERVAL_MS = 120;
const ARROW_MOVES = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

let state = null;
let selectedLanguages = new Set(['portuguese_pt']);
let heldMovement = { key: null, timeoutId: null };
let topicReviewOrigin = null;

function groups() {
  return [...new Set(vocabulary.map((row) => row.group))];
}

function readProgress() {
  const savedProgress = localStorage.getItem(PROGRESS_KEY);
  const legacyProgress = savedProgress === null ? localStorage.getItem(LEGACY_PROGRESS_KEY) : null;
  const progress = JSON.parse(savedProgress ?? legacyProgress ?? '{"wonTopics":[]}');
  if (savedProgress === null && legacyProgress !== null) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
  return { wonTopics: [], completedLevels: 0, ...progress };
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function isTouchFirstDevice() {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const touchOnlyDevice = navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches;
  return coarsePointer || touchOnlyDevice;
}

function show(screen) {
  Object.values(screens).forEach((element) => element.classList.add('hidden'));
  screen.classList.remove('hidden');
  appShell.classList.toggle('is-playing', screen === screens.game);
  appShell.classList.toggle('is-menu', screen === screens.topics);
  appShell.classList.toggle('is-touch-first', isTouchFirstDevice());
}

function clearWrongTimer() {
  if (state?.wrongTimer?.timeoutId) window.clearTimeout(state.wrongTimer.timeoutId);
  if (state) state.wrongTimer = null;
}

function clearEatTimer() {
  if (state?.eatTimer?.timeoutId) window.clearTimeout(state.eatTimer.timeoutId);
  if (state) state.eatTimer = null;
}

function stopHeldMovement(key = null) {
  if (key !== null && heldMovement.key !== key) return;
  if (heldMovement.timeoutId !== null) window.clearTimeout(heldMovement.timeoutId);
  heldMovement = { key: null, timeoutId: null };
}

function resolveCorrectAnswer() {
  const timer = state?.eatTimer;
  if (!timer || state.paused || state.board !== timer.board) return false;

  timer.tile.cleared = true;
  state.eatTimer = null;
  state.frogAnimation = 'idle';
  renderGame();
  return completeLevelWhenReady();
}

function finishEatingForMovement() {
  const timer = state?.eatTimer;
  if (!timer) return false;
  window.clearTimeout(timer.timeoutId);
  return resolveCorrectAnswer();
}

function scheduleCorrectAnswer() {
  const timer = state?.eatTimer;
  if (!timer || state.paused) return;
  timer.timeoutId = window.setTimeout(resolveCorrectAnswer, Math.max(0, timer.dueAt - Date.now()));
}

function resolveWrongAnswer() {
  const timer = state?.wrongTimer;
  if (!timer || state.paused || state.board !== timer.board) return;

  timer.tile.cleared = true;
  state.pendingTiles.delete(timer.tile.id);
  state.wrongTimer = null;
  state.frogAnimation = 'idle';
  feedbackElement.textContent = '';
  feedbackElement.className = 'feedback';
  if (state.lives === 0) {
    finishTopic(false);
    return;
  }
  renderGame();
  completeLevelWhenReady();
}

function scheduleWrongAnswer() {
  const timer = state?.wrongTimer;
  if (!timer || state.paused) return;
  timer.timeoutId = window.setTimeout(resolveWrongAnswer, Math.max(0, timer.dueAt - Date.now()));
}

function pauseGame() {
  if (!state || state.paused) return;
  stopHeldMovement();
  for (const timer of [state.wrongTimer, state.eatTimer]) {
    if (!timer) continue;
    window.clearTimeout(timer.timeoutId);
    Object.assign(timer, pauseTimer(timer, Date.now()), { timeoutId: null });
  }
  state.paused = true;
  appShell.classList.add('is-paused');
  pauseDialog.classList.remove('hidden');
  document.querySelector('#continue-button').focus();
}

function resumeGame() {
  if (!state || !state.paused) return;
  state.paused = false;
  if (state.wrongTimer) {
    Object.assign(state.wrongTimer, resumeTimer(state.wrongTimer, Date.now()));
    scheduleWrongAnswer();
  }
  if (state.eatTimer) {
    Object.assign(state.eatTimer, resumeTimer(state.eatTimer, Date.now()));
    scheduleCorrectAnswer();
  }
  appShell.classList.remove('is-paused');
  pauseDialog.classList.add('hidden');
  renderGame();
}

function quitTopic() {
  if (!state) return;
  stopHeldMovement();
  clearWrongTimer();
  clearEatTimer();
  state = null;
  appShell.classList.remove('is-paused');
  pauseDialog.classList.add('hidden');
  renderTopics();
}

function showFullscreenNotice() {
  fullscreenNotice.textContent = 'This browser cannot enter system full screen. Maximize is active. On iPad, use Safari Share → Add to Home Screen, then open Lingo Lunch from the Home Screen for a screen-filling app.';
  fullscreenNotice.classList.remove('hidden');
}

function hideFullscreenNotice() {
  fullscreenNotice.classList.add('hidden');
}

function toggleCssMaximize() {
  appShell.classList.toggle('maximized');
  if (appShell.classList.contains('maximized')) showFullscreenNotice();
  else hideFullscreenNotice();
  updateFullscreenButton();
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (appShell.classList.contains('maximized')) {
    toggleCssMaximize();
    return;
  }

  const requestFullscreen = appShell.requestFullscreen ?? appShell.webkitRequestFullscreen;
  if (!document.fullscreenEnabled || !requestFullscreen) {
    toggleCssMaximize();
    return;
  }
  try {
    await requestFullscreen.call(appShell, { navigationUI: 'hide' });
    hideFullscreenNotice();
  } catch {
    toggleCssMaximize();
  }
}

function updateFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement) || appShell.classList.contains('maximized');
  fullscreenButton.innerHTML = isFullscreen ? 'EXIT<br />FULL' : 'FULL<br />SCREEN';
  fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Enter full screen');
}

function renderLanguageToggles() {
  languageToggles.replaceChildren(...LANGUAGE_OPTIONS.map((language) => {
    const enabled = selectedLanguages.has(language.key);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-toggle';
    const flag = document.createElement('img');
    flag.src = language.flag;
    flag.alt = '';
    button.append(flag);
    button.setAttribute('aria-label', `${enabled ? 'Disable' : 'Enable'} ${language.label}`);
    button.setAttribute('aria-pressed', String(enabled));
    button.addEventListener('click', () => {
      if (enabled && selectedLanguages.size === 1) return;
      if (enabled) selectedLanguages.delete(language.key);
      else selectedLanguages.add(language.key);
      renderTopics();
    });
    return button;
  }));
}

function renderLives(lives) {
  livesElement.replaceChildren(...Array.from({ length: 3 }, (_, index) => {
    const life = document.createElement('span');
    life.className = `life-frog${index >= lives ? ' life-frog--lost' : ''}`;
    life.setAttribute('aria-hidden', 'true');
    const sprite = document.createElement('img');
    sprite.src = 'assets/frog-sprites.png';
    sprite.alt = '';
    life.append(sprite);
    return life;
  }));
}

function renderTopics() {
  renderLanguageToggles();
  const progress = readProgress();
  completedLevelsTotal.textContent = progress.completedLevels;
  topicList.replaceChildren(...groups().map((group) => {
    const count = vocabulary.filter((row) => row.group === group).length;
    const card = document.createElement('div');
    card.className = 'topic-card';
    const button = document.createElement('button');
    button.className = 'topic-button';
    button.type = 'button';
    button.innerHTML = `${group}<small>${count} words${progress.wonTopics.includes(group) ? ' · completed' : ''}</small>`;
    button.addEventListener('click', () => startTopic(group));
    const infoButton = document.createElement('button');
    infoButton.className = 'topic-info-button';
    infoButton.type = 'button';
    infoButton.textContent = 'i';
    infoButton.setAttribute('aria-label', `Review ${group} vocabulary`);
    infoButton.addEventListener('click', () => openTopicReview(group, infoButton));
    card.append(button, infoButton);
    return card;
  }));
  show(screens.topics);
}

function openTopicReview(group, origin) {
  topicReviewOrigin = origin;
  topicReviewTitle.textContent = `${group} vocabulary`;
  const languages = LANGUAGE_OPTIONS.filter((language) => selectedLanguages.has(language.key));
  const table = document.createElement('table');
  table.className = 'topic-review-table';
  const headerRow = document.createElement('tr');
  for (const label of ['English', ...languages.map((language) => language.label)]) {
    const header = document.createElement('th');
    header.scope = 'col';
    header.textContent = label;
    headerRow.append(header);
  }
  const head = document.createElement('thead');
  head.append(headerRow);
  const body = document.createElement('tbody');
  for (const row of vocabulary.filter((row) => row.group === group)) {
    const tableRow = document.createElement('tr');
    for (const value of [row.english, ...languages.map((language) => row[language.key])]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      tableRow.append(cell);
    }
    body.append(tableRow);
  }
  table.append(head, body);
  topicReviewContent.replaceChildren(table);
  document.body.classList.add('topic-review-open');
  topicReviewDialog.classList.remove('hidden');
  topicReviewClose.focus();
}

function closeTopicReview() {
  if (topicReviewDialog.classList.contains('hidden')) return;
  topicReviewDialog.classList.add('hidden');
  document.body.classList.remove('topic-review-open');
  topicReviewContent.replaceChildren();
  topicReviewOrigin?.focus();
  topicReviewOrigin = null;
}

function startTopic(group) {
  const run = createTopicRun(vocabulary, group);
  state = {
    group,
    languages: [...selectedLanguages],
    run,
    index: 0,
    lives: 3,
    board: null,
    focus: 0,
    frogAnimation: 'idle',
    pendingTiles: new Set(),
    paused: false,
    wrongTimer: null,
    eatTimer: null,
  };
  show(screens.game);
  startLevel();
}

function startLevel() {
  state.board = buildBoard({
    topicRows: state.run,
    prompt: state.run[state.index],
    languages: state.languages,
  });
  state.focus = 0;
  state.pendingTiles = new Set();
  feedbackElement.textContent = '';
  feedbackElement.className = 'feedback';
  renderGame();
}

function renderGame() {
  const { board, focus, frogAnimation, group, index, run, lives, pendingTiles } = state;
  topicName.textContent = group;
  wordProgress.textContent = `${index + 1} / ${run.length}`;
  renderLives(lives);
  promptWord.textContent = board.prompt.english;
  const tileElements = board.tiles.map((tile, tileIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    const text = document.createElement('span');
    text.className = 'tile-text';
    text.textContent = tile.cleared ? '' : tile.displayText;
    button.append(text);
    button.disabled = pendingTiles.has(tile.id);
    if (tile.cleared) button.classList.add('empty');
    if (tileIndex === focus) {
      button.classList.add('focused');
      const frog = document.createElement('span');
      frog.className = `frog frog--${frogAnimation}`;
      frog.setAttribute('aria-hidden', 'true');
      const frogSprite = document.createElement('img');
      frogSprite.src = 'assets/frog-sprites.png';
      frogSprite.alt = '';
      frog.append(frogSprite);
      button.prepend(frog);
    }
    if (pendingTiles.has(tile.id)) button.classList.add('pending');
    button.addEventListener('pointerdown', (event) => {
      button.dataset.pointerType = event.pointerType;
    });
    button.addEventListener('touchstart', () => {
      button.dataset.pointerType = 'touch';
    }, { passive: true });
    button.addEventListener('click', () => {
      if (finishEatingForMovement() || !state) return;
      if (shouldMunchOnTileTap({
        focusedIndex: state.focus,
        tappedIndex: tileIndex,
        isPending: pendingTiles.has(tile.id),
        isTouchFirstDevice: isTouchFirstDevice() || button.dataset.pointerType === 'touch',
      })) {
        state.focus = tileIndex;
        munch();
        return;
      }
      state.focus = tileIndex;
      state.frogAnimation = frogAnimationForMove('up', { isTouch: button.dataset.pointerType === 'touch' });
      renderGame();
    });
    return button;
  });
  boardElement.replaceChildren(...tileElements);
}

function move(direction) {
  if (!state || state.paused) return false;
  if (finishEatingForMovement() || !state) return false;
  const row = Math.floor(state.focus / boardConfig.columns);
  const column = state.focus % boardConfig.columns;
  const offsets = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const [rowOffset, columnOffset] = offsets[direction];
  const nextRow = Math.min(boardConfig.rows - 1, Math.max(0, row + rowOffset));
  const nextColumn = Math.min(boardConfig.columns - 1, Math.max(0, column + columnOffset));
  const nextFocus = nextRow * boardConfig.columns + nextColumn;
  if (nextFocus === state.focus) return true;
  state.focus = nextFocus;
  state.frogAnimation = frogAnimationForMove(direction);
  renderGame();
  return true;
}

function startHeldMovement(key, direction) {
  if (heldMovement.key === key) return;
  stopHeldMovement();
  if (!move(direction)) return;
  heldMovement = { key, timeoutId: null };
  const repeat = () => {
    if (!move(direction)) {
      stopHeldMovement(key);
      return;
    }
    heldMovement.timeoutId = window.setTimeout(repeat, HELD_MOVE_INTERVAL_MS);
  };
  heldMovement.timeoutId = window.setTimeout(repeat, HELD_MOVE_INITIAL_DELAY_MS);
}

function finishTopic(won) {
  stopHeldMovement();
  clearWrongTimer();
  clearEatTimer();
  appShell.classList.remove('is-paused');
  pauseDialog.classList.add('hidden');
  const progress = readProgress();
  if (won && !progress.wonTopics.includes(state.group)) {
    progress.wonTopics.push(state.group);
    saveProgress(progress);
  }
  resultTitle.textContent = won ? 'TOPIC CLEARED!' : 'GAME OVER';
  resultMessage.textContent = won
    ? `You completed every word in ${state.group}. Choose another topic or play it again with a fresh shuffle.`
    : "You have lost all your lives. I'm sure you will do better next time!";
  show(screens.result);
  state = null;
}

function completeLevelWhenReady() {
  if (state.board.tiles.every((tile) => tile.cleared || !tile.isCorrect)) {
    const progress = readProgress();
    progress.completedLevels += 1;
    saveProgress(progress);
    if (state.index === state.run.length - 1) {
      finishTopic(true);
    } else {
      state.index += 1;
      window.setTimeout(startLevel, 450);
    }
    return true;
  }
  return false;
}

function munch() {
  if (!state || state.paused || state.eatTimer) return;
  const tile = state.board.tiles[state.focus];
  if (!tile || tile.cleared || state.pendingTiles.has(tile.id)) return;
  const outcome = resolveMunch({ tile, lives: state.lives });
  state.frogAnimation = FROG_EAT_ANIMATION;

  if (outcome.kind === 'correct') {
    feedbackElement.textContent = 'CORRECT!';
    feedbackElement.className = 'feedback';
    renderGame();
    state.eatTimer = {
      board: state.board,
      tile,
      dueAt: Date.now() + FROG_EAT_DURATION_MS,
      timeoutId: null,
    };
    scheduleCorrectAnswer();
    return;
  }

  state.lives = outcome.lives;
  state.pendingTiles.add(tile.id);
  feedbackElement.textContent = `${tile.displayText} = ${outcome.englishMeaning}`;
  feedbackElement.className = 'feedback wrong';
  renderGame();
  state.wrongTimer = {
    board: state.board,
    tile,
    dueAt: Date.now() + 1000,
    timeoutId: null,
  };
  scheduleWrongAnswer();
}

document.querySelector('#pause-button').addEventListener('click', pauseGame);
document.querySelector('#continue-button').addEventListener('click', resumeGame);
document.querySelector('#quit-button').addEventListener('click', quitTopic);
document.querySelector('#return-button').addEventListener('click', renderTopics);
topicReviewClose.addEventListener('click', closeTopicReview);
fullscreenButton.addEventListener('click', () => { toggleFullscreen().catch(() => {}); });
document.addEventListener('fullscreenchange', updateFullscreenButton);

document.addEventListener('keydown', (event) => {
  if (!topicReviewDialog.classList.contains('hidden') && event.key === 'Escape') {
    event.preventDefault();
    closeTopicReview();
    return;
  }
  if (!state) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (state.paused) resumeGame(); else pauseGame();
    return;
  }
  if (state.paused) return;
  if (ARROW_MOVES[event.key]) {
    event.preventDefault();
    if (!event.repeat) startHeldMovement(event.key, ARROW_MOVES[event.key]);
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    munch();
  }
});

document.addEventListener('keyup', (event) => {
  if (ARROW_MOVES[event.key]) stopHeldMovement(event.key);
});

renderTopics();
