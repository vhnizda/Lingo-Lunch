import { languageOptions } from './i18n.js';

const languageKeys = new Set(languageOptions.map((language) => language.key));
const defaultSettings = {
  sourceLanguage: 'english',
  targetLanguages: ['portuguese_pt'],
};

export function normalizeSettings(value) {
  const sourceLanguage = languageKeys.has(value?.sourceLanguage) ? value.sourceLanguage : defaultSettings.sourceLanguage;
  const targets = [...new Set((value?.targetLanguages ?? defaultSettings.targetLanguages)
    .filter((language) => languageKeys.has(language) && language !== sourceLanguage))];
  return {
    sourceLanguage,
    targetLanguages: targets.length ? targets : [sourceLanguage === 'english' ? 'portuguese_pt' : 'english'],
  };
}

export function settingsForSourceLanguage(settings, sourceLanguage) {
  const current = normalizeSettings(settings);
  return normalizeSettings({
    sourceLanguage,
    targetLanguages: [current.sourceLanguage, ...current.targetLanguages.filter((language) => language !== sourceLanguage)],
  });
}
