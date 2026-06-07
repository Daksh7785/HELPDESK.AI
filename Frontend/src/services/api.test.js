import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { create } from 'zustand';

// Inline the utility functions for testing (same as in api.js)
const getStorage = (key, defaultData) => {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) {
            setStorage(key, defaultData);
            return defaultData;
        }
        return JSON.parse(stored);
    } catch (error) {
        console.warn(`[Storage Error] Failed to read or parse '${key}':`, error);
        return defaultData;
    }
};

const setStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn(`[Storage Error] Failed to write '${key}'. Possible quota exceeded:`, error);
    }
};

// Validate AI backend response shape
const validateAIResponse = (result) => {
    if (!result || typeof result !== 'object') return false;
    const required = ['category', 'subcategory', 'priority'];
    return required.every(field => result[field] != null && result[field] !== '');
};

describe('getStorage', () => {
    let originalLocalStorage;

    beforeEach(() => {
        originalLocalStorage = globalThis.localStorage;
        globalThis.localStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
    });

    afterEach(() => {
        globalThis.localStorage = originalLocalStorage;
    });

    it('returns default and writes to storage when key does not exist', () => {
        globalThis.localStorage.getItem.mockReturnValue(null);
        const defaultData = [{ id: 1 }];
        const result = getStorage('tickets', defaultData);
        expect(result).toEqual(defaultData);
        expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('tickets', JSON.stringify(defaultData));
    });

    it('returns parsed JSON when key exists with valid data', () => {
        const storedData = [{ id: 1, name: 'Test' }];
        globalThis.localStorage.getItem.mockReturnValue(JSON.stringify(storedData));
        const result = getStorage('tickets', []);
        expect(result).toEqual(storedData);
    });

    it('returns default when localStorage throws (e.g., private mode)', () => {
        globalThis.localStorage.getItem.mockImplementation(() => {
            throw new Error('SecurityError: localStorage not available');
        });
        const defaultData = [{ id: 1 }];
        const result = getStorage('tickets', defaultData);
        expect(result).toEqual(defaultData);
    });

    it('returns default when stored JSON is invalid', () => {
        globalThis.localStorage.getItem.mockReturnValue('not valid json {');
        const defaultData = [{ id: 1 }];
        const result = getStorage('tickets', defaultData);
        expect(result).toEqual(defaultData);
    });

    it('returns default for empty string stored value', () => {
        globalThis.localStorage.getItem.mockReturnValue('');
        const defaultData = [{ id: 1 }];
        const result = getStorage('tickets', defaultData);
        expect(result).toEqual(defaultData);
        expect(globalThis.localStorage.setItem).toHaveBeenCalled();
    });
});

describe('setStorage', () => {
    let originalLocalStorage;

    beforeEach(() => {
        originalLocalStorage = globalThis.localStorage;
        globalThis.localStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
    });

    afterEach(() => {
        globalThis.localStorage = originalLocalStorage;
    });

    it('writes stringified data to localStorage', () => {
        setStorage('tickets', [{ id: 1 }]);
        expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('tickets', '[{\"id\":1}]');
    });

    it('does not throw when QuotaExceeded error occurs', () => {
        globalThis.localStorage.setItem.mockImplementation(() => {
            const err = new Error('QuotaExceeded');
            err.name = 'QuotaExceededError';
            throw err;
        });
        // Should not throw
        expect(() => setStorage('large_data', new Array(10000).fill('x'))).not.toThrow();
    });

    it('does not throw on generic storage errors', () => {
        globalThis.localStorage.setItem.mockImplementation(() => {
            throw new Error('Unknown storage error');
        });
        expect(() => setStorage('key', { data: 'value' })).not.toThrow();
    });
});

describe('validateAIResponse', () => {
    it('returns true for valid response with all required fields', () => {
        const result = {
            category: 'Hardware',
            subcategory: 'Printer',
            priority: 'High'
        };
        expect(validateAIResponse(result)).toBe(true);
    });

    it('returns false for null input', () => {
        expect(validateAIResponse(null)).toBe(false);
    });

    it('returns false for undefined input', () => {
        expect(validateAIResponse(undefined)).toBe(false);
    });

    it('returns false for non-object input (string)', () => {
        expect(validateAIResponse('not an object')).toBe(false);
    });

    it('returns false for non-object input (number)', () => {
        expect(validateAIResponse(123)).toBe(false);
    });

    it('returns false when category is missing', () => {
        const result = { subcategory: 'Printer', priority: 'High' };
        expect(validateAIResponse(result)).toBe(false);
    });

    it('returns false when subcategory is missing', () => {
        const result = { category: 'Hardware', priority: 'High' };
        expect(validateAIResponse(result)).toBe(false);
    });

    it('returns false when priority is missing', () => {
        const result = { category: 'Hardware', subcategory: 'Printer' };
        expect(validateAIResponse(result)).toBe(false);
    });

    it('returns false when category is empty string', () => {
        const result = { category: '', subcategory: 'Printer', priority: 'High' };
        expect(validateAIResponse(result)).toBe(false);
    });

    it('returns false when category is null', () => {
        const result = { category: null, subcategory: 'Printer', priority: 'High' };
        expect(validateAIResponse(result)).toBe(false);
    });

    it('returns false when priority is undefined', () => {
        const result = { category: 'Hardware', subcategory: 'Printer', priority: undefined };
        expect(validateAIResponse(result)).toBe(false);
    });

    it('returns true when extra fields are present', () => {
        const result = {
            category: 'Hardware',
            subcategory: 'Printer',
            priority: 'High',
            extra_field: 'some value',
            assigned_team: 'IT Support'
        };
        expect(validateAIResponse(result)).toBe(true);
    });
});