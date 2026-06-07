/**
 * translationService.js
 * Uses the free MyMemory Translation API (https://mymemory.translated.net)
 * - No API key required for basic usage (5000 word/day limit)
 * - Supports 60+ language pairs
 */

/**
 * @typedef {Object} Language
 * @property {string} code - ISO 639-1 language code (e.g., 'en', 'hi')
 * @property {string} label - Display label with flag emoji (e.g., '🇬🇧 English')
 * @property {string} nativeName - Language name in its native script (e.g., 'हिन्दी')
 */

/** @type {Language[]} Supported language codes for translation */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: '🇬🇧 English', nativeName: 'English' },
  { code: 'hi', label: '🇮🇳 Hindi', nativeName: 'हिन्दी' },
  { code: 'te', label: '🇮🇳 Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', label: '🇮🇳 Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', label: '🇮🇳 Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', label: '🇮🇳 Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', label: '🇮🇳 Marathi', nativeName: 'मराठी' },
  { code: 'bn', label: '🇮🇳 Bengali', nativeName: 'বাংলা' },
  { code: 'fr', label: '🇫🇷 French', nativeName: 'Français' },
  { code: 'de', label: '🇩🇪 German', nativeName: 'Deutsch' },
  { code: 'es', label: '🇪🇸 Spanish', nativeName: 'Español' },
  { code: 'ar', label: '🇸🇦 Arabic', nativeName: 'العربية' },
];

/**
 * Translates text from one language to another using the MyMemory Translation API.
 * Falls back to the original text if translation fails (network error, API error, timeout).
 *
 * @param {string} text - The text to translate. If empty or whitespace-only, returns as-is.
 * @param {string} [fromLang='en'] - Source language code (ISO 639-1). See SUPPORTED_LANGUAGES.
 * @param {string} [toLang='en'] - Target language code (ISO 639-1). See SUPPORTED_LANGUAGES.
 * @returns {Promise<string>} - Translated text. Returns original text on any failure.
 *
 * @throws {Error} Only throws on non-200 HTTP responses (handled internally, never surfaced).
 *
 * @example
 * // Translate English to Hindi
 * const translated = await translateText('Hello world', 'en', 'hi');
 * // => 'नमस्ते दुनिया' (or original text if API fails)
 *
 * @example
 * // Same-language call returns original immediately (no API call)
 * const result = await translateText('Hello', 'en', 'en');
 * // => 'Hello'
 */
export async function translateText(text, fromLang = 'en', toLang = 'en') {
  if (!text?.trim() || fromLang === toLang) return text;

  try {
    const langPair = `${fromLang}|${toLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

    const data = await response.json();

    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    }
    throw new Error(data.responseDetails || 'Translation failed');
  } catch (err) {
    console.error('[translationService] Translation error:', err);
    // Graceful degradation — return original text on failure
    return text;
  }
}
