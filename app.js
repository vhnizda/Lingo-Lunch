import { buildBoard, createTopicRun, resolveMunch } from './src/game.js';
import { pauseTimer, resumeTimer } from './src/pause.js';
import { shouldMoveToEmptyOnTouchTap, shouldMunchOnTileTap } from './src/tap-controls.js';
import { FROG_EAT_ANIMATION, FROG_EAT_DURATION_MS, frogAnimationForMove } from './src/frog.js';
import { languageOptions, t, topicKey } from './src/i18n.js';
import { normalizeSettings, settingsForSourceLanguage } from './src/settings.js';

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
const boardStage = document.querySelector('#board-stage');
const boardElement = document.querySelector('#board');
const levelCompleteOverlay = document.querySelector('#level-complete-overlay');
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
const completedLevelsButton = document.querySelector('#completed-levels-button');
const statisticsDialog = document.querySelector('#statistics-dialog');
const statisticsClose = document.querySelector('#statistics-close');
const statisticsCompletedLevelsTotal = document.querySelector('#statistics-completed-levels-total');
const topicReviewDialog = document.querySelector('#topic-review-dialog');
const topicReviewTitle = document.querySelector('#topic-review-title');
const topicReviewContent = document.querySelector('#topic-review-content');
const topicReviewClose = document.querySelector('#topic-review-close');
const settingsDialog = document.querySelector('#settings-dialog');
const settingsClose = document.querySelector('#settings-close');
const settingsDone = document.querySelector('#settings-done');
const settingsButton = document.querySelector('#settings-button');
const menuLanguageSelect = document.querySelector('#menu-language-select');
const targetLanguageOptions = document.querySelector('#target-language-options');
const minimumTargetLanguage = document.querySelector('#minimum-target-language');

const PROGRESS_KEY = 'lingo-lunch-progress';
const LEGACY_PROGRESS_KEY = 'language-munchers-progress';
const SETTINGS_KEY = 'lingo-lunch-settings';
const HELD_MOVE_INITIAL_DELAY_MS = 250;
const HELD_MOVE_INTERVAL_MS = 120;
const LEVEL_COMPLETE_OVERLAY_MS = 500;
const LEVEL_BOARD_SLIDE_MS = 300;
const ARROW_MOVES = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

let state = null;
let settings = readSettings();
let heldMovement = { key: null, timeoutId: null };
let topicReviewOrigin = null;
let statisticsOrigin = null;
let settingsOrigin = null;

function groups() {
  return [...new Set(vocabulary.map((row) => row.group))];
}

function tr(key, values = {}) {
  return t(settings.sourceLanguage, key, values);
}

function readSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    return normalizeSettings(null);
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

function boardLayoutForCurrentViewport() {
  const isPhone = isTouchFirstDevice() && Math.max(window.innerWidth, window.innerHeight) <= 900;
  if (!isPhone) return { columns: 6, rows: 4, correctTiles: 10 };
  return window.matchMedia('(orientation: landscape)').matches
    ? { columns: 4, rows: 3, correctTiles: 5 }
    : { columns: 3, rows: 4, correctTiles: 5 };
}

function show(screen) {
  Object.values(screens).forEach((element) => element.classList.add('hidden'));
  screen.classList.remove('hidden');
  appShell.classList.toggle('is-playing', screen === screens.game);
  appShell.classList.toggle('is-menu', screen === screens.topics);
  appShell.classList.toggle('is-touch-first', isTouchFirstDevice());
}

function clearWrongReview() {
  const review = state?.wrongReview;
  if (!review) return;
  if (review.timeoutId !== null) window.clearTimeout(review.timeoutId);
  review.tile.cleared = true;
  state.pendingTiles.delete(review.tile.id);
  state.wrongReview = null;
  feedbackElement.textContent = '';
  feedbackElement.className = 'feedback';
}

function clearWrongTile() {
  const review = state?.wrongReview;
  if (!review || state.paused || state.board !== review.board || review.tile.cleared) return;
  review.tile.cleared = true;
  review.timeoutId = null;
  state.pendingTiles.delete(review.tile.id);
  state.frogAnimation = 'idle';
  renderGame();
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

function scheduleWrongTileClear() {
  const review = state?.wrongReview;
  if (!review || state.paused || review.tile.cleared) return;
  review.timeoutId = window.setTimeout(clearWrongTile, Math.max(0, review.dueAt - Date.now()));
}

function pauseGame() {
  if (!state || state.paused || state.transitioning) return;
  stopHeldMovement();
  if (state.eatTimer) {
    window.clearTimeout(state.eatTimer.timeoutId);
    Object.assign(state.eatTimer, pauseTimer(state.eatTimer, Date.now()), { timeoutId: null });
  }
  if (state.wrongReview && !state.wrongReview.tile.cleared) {
    window.clearTimeout(state.wrongReview.timeoutId);
    Object.assign(state.wrongReview, pauseTimer(state.wrongReview, Date.now()), { timeoutId: null });
  }
  state.paused = true;
  appShell.classList.add('is-paused');
  pauseDialog.classList.remove('hidden');
  document.querySelector('#continue-button').focus();
}

function resumeGame() {
  if (!state || !state.paused) return;
  state.paused = false;
  if (state.eatTimer) {
    Object.assign(state.eatTimer, resumeTimer(state.eatTimer, Date.now()));
    scheduleCorrectAnswer();
  }
  if (state.wrongReview && !state.wrongReview.tile.cleared) {
    Object.assign(state.wrongReview, resumeTimer(state.wrongReview, Date.now()));
    scheduleWrongTileClear();
  }
  appShell.classList.remove('is-paused');
  pauseDialog.classList.add('hidden');
  renderGame();
}

function quitTopic() {
  if (!state) return;
  stopHeldMovement();
  clearWrongReview();
  clearEatTimer();
  clearLevelTransition();
  state = null;
  appShell.classList.remove('is-paused');
  pauseDialog.classList.add('hidden');
  renderTopics();
}

function showFullscreenNotice() {
  fullscreenNotice.textContent = tr('fullscreen_unavailable');
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
  fullscreenButton.textContent = isFullscreen ? tr('fullscreen_exit_label') : tr('fullscreen_label');
  fullscreenButton.setAttribute('aria-label', isFullscreen ? tr('fullscreen_exit') : tr('fullscreen_enter'));
}

function languageName(language, native = false) {
  return tr(`${native ? 'language_native_' : 'language_'}${language.key}`);
}

function languageOption(language, selected, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'language-toggle';
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', tr(selected ? 'disable_language' : 'enable_language', { language: languageName(language) }));
  const flag = document.createElement('img');
  flag.src = language.flag;
  flag.alt = '';
  const label = document.createElement('span');
  label.textContent = languageName(language, true);
  button.append(flag, label);
  button.addEventListener('click', onClick);
  return button;
}

function renderSettings() {
  document.querySelector('#settings-title').textContent = tr('settings');
  document.querySelector('#settings-help').textContent = tr('settings_help');
  document.querySelector('#menu-language-label').textContent = tr('menu_language');
  document.querySelector('#playing-against-label').textContent = tr('playing_against');
  settingsClose.setAttribute('aria-label', tr('close_settings'));
  settingsDone.textContent = tr('done');
  minimumTargetLanguage.textContent = tr('minimum_target_language');
  menuLanguageSelect.replaceChildren(...languageOptions.map((language) => {
    const option = document.createElement('option');
    option.value = language.key;
    option.textContent = languageName(language, true);
    option.selected = settings.sourceLanguage === language.key;
    return option;
  }));
  targetLanguageOptions.replaceChildren(...languageOptions
    .filter((language) => language.key !== settings.sourceLanguage)
    .map((language) => languageOption(language, settings.targetLanguages.includes(language.key), () => {
      const enabled = settings.targetLanguages.includes(language.key);
      if (enabled && settings.targetLanguages.length === 1) {
        minimumTargetLanguage.classList.add('is-visible');
        return;
      }
      settings = normalizeSettings({
        ...settings,
        targetLanguages: enabled
          ? settings.targetLanguages.filter((key) => key !== language.key)
          : [...settings.targetLanguages, language.key],
      });
      saveSettings();
      minimumTargetLanguage.classList.remove('is-visible');
      renderSettings();
    })));
}

function openSettings(origin) {
  settingsOrigin = origin;
  renderSettings();
  document.body.classList.add('topic-review-open');
  settingsDialog.classList.remove('hidden');
  settingsClose.focus();
}

function closeSettings() {
  if (settingsDialog.classList.contains('hidden')) return;
  settingsDialog.classList.add('hidden');
  document.body.classList.remove('topic-review-open');
  settingsOrigin?.focus();
  settingsOrigin = null;
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

function renderChrome() {
  document.documentElement.lang = languageOptions.find((language) => language.key === settings.sourceLanguage).locale;
  document.querySelector('#app-tagline').textContent = tr('app_tagline');
  document.querySelector('#topic-screen').setAttribute('aria-label', tr('choose_topic'));
  document.querySelector('#total-levels-label').textContent = tr('total_levels_cleared');
  completedLevelsButton.setAttribute('aria-label', tr('total_levels_cleared'));
  document.querySelector('#statistics-title').textContent = 'ALL GAME STATS';
  document.querySelector('#statistics-completed-levels-label').textContent = tr('total_levels_cleared');
  statisticsClose.setAttribute('aria-label', tr('done'));
  document.querySelector('#intro').textContent = tr('intro');
  settingsButton.textContent = 'GAME SETTINGS';
  document.querySelector('#topic-label').textContent = tr('topic');
  document.querySelector('#word-label').textContent = tr('word');
  document.querySelector('#lives-label').textContent = tr('lives');
  document.querySelector('#lives').setAttribute('aria-label', tr('lives'));
  document.querySelector('#eat-every-translation-label').textContent = tr('eat_every_translation_of');
  document.querySelector('#pause-button').textContent = tr('pause');
  document.querySelector('#level-complete-overlay').textContent = tr('level_complete');
  document.querySelector('#return-button').textContent = tr('try_again');
  document.querySelector('#game-paused-label').textContent = tr('game_paused');
  document.querySelector('#pause-title').textContent = tr('take_a_breath');
  document.querySelector('#pause-message').textContent = tr('pause_message');
  document.querySelector('#pause-instructions').replaceChildren(...[
    ['touch_or_mouse', 'touch_or_mouse_instruction'],
    ['keyboard', 'keyboard_instruction'],
  ].map(([heading, instruction]) => {
    const paragraph = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = tr(heading);
    paragraph.append(label, ` ${tr(instruction)}`);
    return paragraph;
  }));
  document.querySelector('#continue-button').textContent = tr('continue');
  document.querySelector('#quit-button').textContent = tr('quit_topic');
  boardElement.setAttribute('aria-label', tr('board_aria_label'));
  updateFullscreenButton();
}

function formatCompletedLevels(value) {
  return String(Math.max(0, value));
}

function renderTopics() {
  renderChrome();
  const progress = readProgress();
  completedLevelsTotal.textContent = formatCompletedLevels(progress.completedLevels);
  statisticsCompletedLevelsTotal.textContent = formatCompletedLevels(progress.completedLevels);
  topicList.replaceChildren(...groups().map((group) => {
    const count = vocabulary.filter((row) => row.group === group).length;
    const card = document.createElement('div');
    card.className = 'topic-card';
    const button = document.createElement('button');
    button.className = 'topic-button';
    button.type = 'button';
    button.innerHTML = `${tr(topicKey(group))}<small>${tr('topic_word_count', { count })}${progress.wonTopics.includes(group) ? ` · ${tr('topic_completed')}` : ''}</small>`;
    button.addEventListener('click', () => startTopic(group));
    const infoButton = document.createElement('button');
    infoButton.className = 'topic-info-button';
    infoButton.type = 'button';
    infoButton.textContent = 'i';
    infoButton.setAttribute('aria-label', tr('review_vocabulary', { topic: tr(topicKey(group)) }));
    infoButton.addEventListener('click', () => openTopicReview(group, infoButton));
    card.append(button, infoButton);
    return card;
  }));
  show(screens.topics);
}

function openTopicReview(group, origin) {
  topicReviewOrigin = origin;
  topicReviewTitle.textContent = tr('vocabulary_title', { topic: tr(topicKey(group)) });
  topicReviewClose.setAttribute('aria-label', tr('close_vocabulary'));
  const languages = languageOptions.filter((language) => settings.targetLanguages.includes(language.key));
  const table = document.createElement('table');
  table.className = 'topic-review-table';
  const headerRow = document.createElement('tr');
  for (const label of [languageName(languageOptions.find((language) => language.key === settings.sourceLanguage)), ...languages.map((language) => languageName(language))]) {
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
    for (const value of [row[settings.sourceLanguage], ...languages.map((language) => row[language.key])]) {
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

function openStatistics(origin) {
  statisticsOrigin = origin;
  document.body.classList.add('topic-review-open');
  statisticsDialog.classList.remove('hidden');
  statisticsClose.focus();
}

function closeStatistics() {
  if (statisticsDialog.classList.contains('hidden')) return;
  statisticsDialog.classList.add('hidden');
  document.body.classList.remove('topic-review-open');
  statisticsOrigin?.focus();
  statisticsOrigin = null;
}

function startTopic(group) {
  const run = createTopicRun(vocabulary, group);
  state = {
    group,
    sourceLanguage: settings.sourceLanguage,
    languages: [...settings.targetLanguages],
    run,
    index: 0,
    lives: 3,
    board: null,
    focus: 0,
    frogAnimation: 'idle',
    pendingTiles: new Set(),
    paused: false,
    wrongReview: null,
    eatTimer: null,
    transitioning: false,
    transitionTimers: [],
  };
  show(screens.game);
  startLevel();
}

function startLevel() {
  state.board = buildBoard({
    topicRows: state.run,
    prompt: state.run[state.index],
    sourceLanguage: state.sourceLanguage,
    languages: state.languages,
    layout: boardLayoutForCurrentViewport(),
  });
  state.focus = 0;
  state.pendingTiles = new Set();
  feedbackElement.textContent = '';
  feedbackElement.className = 'feedback';
  renderGame();
}

function beginLevelTransition() {
  state.transitioning = true;
  stopHeldMovement();
  boardStage.classList.add('is-level-complete');
  levelCompleteOverlay.removeAttribute('aria-hidden');
  state.transitionTimers.push(window.setTimeout(beginBoardSlide, LEVEL_COMPLETE_OVERLAY_MS));
}

function beginBoardSlide() {
  if (!state?.transitioning) return;
  const outgoingBoard = boardElement.cloneNode(true);
  outgoingBoard.removeAttribute('id');
  outgoingBoard.className = 'board board--outgoing';
  outgoingBoard.setAttribute('aria-hidden', 'true');
  boardStage.append(outgoingBoard);
  boardStage.classList.remove('is-level-complete');
  boardStage.classList.add('is-board-sliding');
  state.index += 1;
  startLevel();
  boardElement.classList.add('board--incoming');
  state.transitionTimers.push(window.setTimeout(finishBoardSlide, LEVEL_BOARD_SLIDE_MS));
}

function finishBoardSlide() {
  if (!state?.transitioning) return;
  boardStage.querySelector('.board--outgoing')?.remove();
  boardStage.classList.remove('is-board-sliding');
  boardElement.classList.remove('board--incoming');
  levelCompleteOverlay.setAttribute('aria-hidden', 'true');
  state.transitioning = false;
  state.transitionTimers = [];
}

function clearLevelTransition() {
  if (!state) return;
  state.transitionTimers.forEach((timeoutId) => window.clearTimeout(timeoutId));
  state.transitionTimers = [];
  state.transitioning = false;
  boardStage.classList.remove('is-level-complete', 'is-board-sliding');
  boardStage.querySelector('.board--outgoing')?.remove();
  boardElement.classList.remove('board--incoming');
  levelCompleteOverlay.setAttribute('aria-hidden', 'true');
}

function renderGame() {
  const { board, focus, frogAnimation, group, index, run, lives, pendingTiles } = state;
  topicName.textContent = tr(topicKey(group));
  wordProgress.textContent = `${index + 1} / ${run.length}`;
  renderLives(lives);
  promptWord.textContent = board.promptText;
  boardElement.style.setProperty('--board-columns', board.layout.columns);
  boardElement.style.setProperty('--board-rows', board.layout.rows);
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
      if (!state || state.transitioning) return;
      if (finishEatingForMovement() || !state) return;
      const isTouchInput = isTouchFirstDevice() || button.dataset.pointerType === 'touch';
      if (shouldMoveToEmptyOnTouchTap({ isCleared: tile.cleared, isTouchInput })) {
        state.focus = tileIndex;
        state.frogAnimation = frogAnimationForMove('up', { isTouch: true });
        renderGame();
        return;
      }
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
  if (state.transitioning) return false;
  if (finishEatingForMovement() || !state) return false;
  const { columns, rows } = state.board.layout;
  const row = Math.floor(state.focus / columns);
  const column = state.focus % columns;
  const offsets = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const [rowOffset, columnOffset] = offsets[direction];
  const nextRow = Math.min(rows - 1, Math.max(0, row + rowOffset));
  const nextColumn = Math.min(columns - 1, Math.max(0, column + columnOffset));
  const nextFocus = nextRow * columns + nextColumn;
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
  clearWrongReview();
  clearEatTimer();
  clearLevelTransition();
  appShell.classList.remove('is-paused');
  pauseDialog.classList.add('hidden');
  const progress = readProgress();
  if (won && !progress.wonTopics.includes(state.group)) {
    progress.wonTopics.push(state.group);
    saveProgress(progress);
  }
  resultTitle.textContent = won ? tr('topic_cleared') : tr('game_over');
  resultMessage.textContent = won
    ? tr('topic_cleared_message', { topic: tr(topicKey(state.group)) })
    : tr('game_over_message');
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
    } else beginLevelTransition();
    return true;
  }
  return false;
}

function munch() {
  if (!state || state.paused || state.transitioning || state.eatTimer) return;
  const tile = state.board.tiles[state.focus];
  if (!tile || tile.cleared || state.pendingTiles.has(tile.id)) return;
  if (state.lives === 0) {
    clearWrongReview();
    finishTopic(false);
    return;
  }
  clearWrongReview();
  const outcome = resolveMunch({ tile, lives: state.lives });
  state.frogAnimation = FROG_EAT_ANIMATION;

  if (outcome.kind === 'correct') {
    feedbackElement.textContent = tr('correct');
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
  feedbackElement.textContent = `${tile.displayText} = ${outcome.sourceText}`;
  feedbackElement.className = 'feedback wrong';
  renderGame();
  state.wrongReview = {
    board: state.board,
    tile,
    dueAt: Date.now() + FROG_EAT_DURATION_MS,
    timeoutId: null,
  };
  scheduleWrongTileClear();
}

document.querySelector('#pause-button').addEventListener('click', pauseGame);
document.querySelector('#continue-button').addEventListener('click', resumeGame);
document.querySelector('#quit-button').addEventListener('click', quitTopic);
document.querySelector('#return-button').addEventListener('click', renderTopics);
topicReviewClose.addEventListener('click', closeTopicReview);
completedLevelsButton.addEventListener('click', () => openStatistics(completedLevelsButton));
statisticsClose.addEventListener('click', closeStatistics);
settingsButton.addEventListener('click', () => openSettings(settingsButton));
menuLanguageSelect.addEventListener('change', () => {
  settings = settingsForSourceLanguage(settings, menuLanguageSelect.value);
  saveSettings();
  renderSettings();
  renderTopics();
});
settingsClose.addEventListener('click', closeSettings);
settingsDone.addEventListener('click', closeSettings);
fullscreenButton.addEventListener('click', () => { toggleFullscreen().catch(() => {}); });
document.addEventListener('fullscreenchange', updateFullscreenButton);

document.addEventListener('keydown', (event) => {
  if (!settingsDialog.classList.contains('hidden') && event.key === 'Escape') {
    event.preventDefault();
    closeSettings();
    return;
  }
  if (!statisticsDialog.classList.contains('hidden') && event.key === 'Escape') {
    event.preventDefault();
    closeStatistics();
    return;
  }
  if (!topicReviewDialog.classList.contains('hidden') && event.key === 'Escape') {
    event.preventDefault();
    closeTopicReview();
    return;
  }
  if (!state) return;
  if (state.transitioning) return;
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

window.addEventListener('resize', () => {
  if (!state || state.transitioning) return;
  const layout = boardLayoutForCurrentViewport();
  if (layout.columns * layout.rows !== state.board.tiles.length) return;
  if (layout.columns === state.board.layout.columns && layout.rows === state.board.layout.rows) return;
  state.board.layout = layout;
  state.focus = Math.min(state.focus, state.board.tiles.length - 1);
  renderGame();
});

renderTopics();
