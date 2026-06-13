import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage globally before anything else runs
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock axios and config since api.js imports them
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  }
}));

vi.mock('../config', () => ({
  API_CONFIG: {
    BACKEND_URL: 'http://localhost:8000'
  }
}));

// Now import the api under test
import { api } from './api';

describe('Draft persistence helpers', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save a new draft and generate a draft_id and updated_at', () => {
    const draftData = {
      title: 'VPN issue',
      issue: 'Cannot connect to VPN',
      activatedTemplateId: 'vpn-connectivity',
      formValues: { error_message: 'Auth failed' },
      selectedLanguage: 'en',
    };

    const saved = api.saveDraft(userId, draftData);

    expect(saved.draft_id).toBeDefined();
    expect(saved.updated_at).toBeDefined();
    expect(saved.title).toBe(draftData.title);
    expect(saved.issue).toBe(draftData.issue);

    const storedDrafts = api.getDrafts(userId);
    expect(storedDrafts).toHaveLength(1);
    expect(storedDrafts[0].draft_id).toBe(saved.draft_id);
  });

  it('should update an existing draft if draft_id is provided', () => {
    const draftData = {
      title: 'VPN issue',
      issue: 'Cannot connect to VPN',
      activatedTemplateId: 'vpn-connectivity',
      formValues: { error_message: 'Auth failed' },
      selectedLanguage: 'en',
    };

    const saved = api.saveDraft(userId, draftData);
    const originalDraftId = saved.draft_id;

    // Modify draft
    saved.title = 'Updated VPN issue';
    const updated = api.saveDraft(userId, saved);

    expect(updated.draft_id).toBe(originalDraftId);
    expect(updated.title).toBe('Updated VPN issue');

    const storedDrafts = api.getDrafts(userId);
    expect(storedDrafts).toHaveLength(1);
    expect(storedDrafts[0].title).toBe('Updated VPN issue');
  });

  it('should limit stored drafts to 5 and drop the oldest draft', () => {
    const savedDrafts = [];
    for (let i = 1; i <= 6; i++) {
      savedDrafts.push(
        api.saveDraft(userId, {
          title: `Draft ${i}`,
          issue: `Description ${i}`,
          updated_at: new Date(Date.now() - (7 - i) * 1000).toISOString() // make each draft newer than the last
        })
      );
    }

    const currentDrafts = api.getDrafts(userId);
    expect(currentDrafts).toHaveLength(5);
    
    // The oldest draft (Draft 1) should be removed
    const draftTitles = currentDrafts.map(d => d.title);
    expect(draftTitles).not.toContain('Draft 1');
    expect(draftTitles).toContain('Draft 6');
  });

  it('should delete a specific draft', () => {
    const draft1 = api.saveDraft(userId, { title: 'Draft 1', issue: 'desc 1' });
    const draft2 = api.saveDraft(userId, { title: 'Draft 2', issue: 'desc 2' });

    expect(api.getDrafts(userId)).toHaveLength(2);

    api.deleteDraft(userId, draft1.draft_id);

    const currentDrafts = api.getDrafts(userId);
    expect(currentDrafts).toHaveLength(1);
    expect(currentDrafts[0].draft_id).toBe(draft2.draft_id);
  });

  it('should automatically remove drafts older than 30 days during getDrafts/cleanup', () => {
    // Save a fresh draft
    api.saveDraft(userId, { title: 'Fresh Draft', issue: 'fresh' });

    // Directly write a stale draft into localStorage to simulate passage of time
    const key = `helpdesk_drafts_${userId}`;
    const drafts = JSON.parse(localStorage.getItem(key));
    
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    drafts.push({
      draft_id: 'old-id',
      title: 'Old Draft',
      issue: 'stale',
      updated_at: fortyDaysAgo
    });

    localStorage.setItem(key, JSON.stringify(drafts));

    // Retrieve drafts - should trigger cleanup
    const currentDrafts = api.getDrafts(userId);
    expect(currentDrafts).toHaveLength(1);
    expect(currentDrafts[0].title).toBe('Fresh Draft');
  });
});
