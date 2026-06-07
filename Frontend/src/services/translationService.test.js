import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { translateText, SUPPORTED_LANGUAGES } from './translationService.js';

describe('SUPPORTED_LANGUAGES', () => {
    it('is a non-empty array', () => {
        expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
        expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
    });

    it('each language has code, label, and nativeName', () => {
        SUPPORTED_LANGUAGES.forEach(lang => {
            expect(lang).toHaveProperty('code');
            expect(lang).toHaveProperty('label');
            expect(lang).toHaveProperty('nativeName');
            expect(typeof lang.code).toBe('string');
            expect(typeof lang.label).toBe('string');
            expect(typeof lang.nativeName).toBe('string');
        });
    });
});

describe('translateText', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('returns original text when fromLang equals toLang', async () => {
        const result = await translateText('Hello world', 'en', 'en');
        expect(result).toBe('Hello world');
    });

    it('returns original text for whitespace-only input', async () => {
        const result = await translateText('   ', 'en', 'fr');
        expect(result).toBe('   ');
    });

    it('returns original text for empty input', async () => {
        const result = await translateText('', 'en', 'fr');
        expect(result).toBe('');
    });

    it('returns translated text on successful API response', async () => {
        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({
                responseStatus: 200,
                responseData: { translatedText: 'Hola mundo' }
            })
        });

        const result = await translateText('Hello world', 'en', 'es');
        expect(result).toBe('Hola mundo');
    });

    it('returns original text on HTTP error response', async () => {
        globalThis.fetch = async () => ({
            ok: false,
            status: 500
        });

        const result = await translateText('Hello', 'en', 'fr');
        expect(result).toBe('Hello');
    });

    it('returns original text on non-200 API status', async () => {
        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({
                responseStatus: 403,
                responseDetails: 'Rate limit exceeded'
            })
        });

        const result = await translateText('Hello', 'en', 'fr');
        expect(result).toBe('Hello');
    });

    it('returns original text when fetch throws', async () => {
        globalThis.fetch = async () => {
            throw new Error('Network failure');
        };

        const result = await translateText('Hello', 'en', 'fr');
        expect(result).toBe('Hello');
    });
});