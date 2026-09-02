import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSavedItems,
  persistSavedItems,
  toggleSavedItem,
  generateSqlExport,
  generateJsonExport,
  isStarredView
} from '../scripts/starred-utils.mjs';

function createMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: key => { map.delete(key); },
    _map: map
  };
}

const sampleItem = {
  id: 'opp-1',
  title: "AI Agent's New Tool",
  url: 'https://example.com/item1',
  category: 'Agent',
  summary: "It's an autonomous agent tool.",
  whyItMatters: 'Reduces manual workflow.',
  opportunity: 'Build integrations.',
  action: 'Evaluate the API docs.',
  source: 'Hacker News',
  publishedAt: '2026-09-01T12:00:00.000Z',
  score: 85
};

test('loads empty saved items when storage is empty or invalid', () => {
  const emptyStorage = createMockStorage();
  assert.deepEqual(loadSavedItems(emptyStorage), []);

  const invalidStorage = createMockStorage({ saved_items: '{not-json}' });
  assert.deepEqual(loadSavedItems(invalidStorage), []);
});

test('persists saved items and updates backward-compatible saved id list', () => {
  const storage = createMockStorage();
  const items = [{ ...sampleItem, savedAt: '2026-09-02T10:00:00.000Z' }];

  persistSavedItems(storage, items);

  const savedItemsRaw = storage.getItem('saved_items');
  const savedIdsRaw = storage.getItem('saved');
  assert.ok(savedItemsRaw);
  assert.ok(savedIdsRaw);

  assert.deepEqual(JSON.parse(savedItemsRaw), items);
  assert.deepEqual(JSON.parse(savedIdsRaw), ['opp-1']);
});

test('toggles item: adds new item with savedAt timestamp to beginning of list', () => {
  const initial = [];
  const updated = toggleSavedItem(initial, sampleItem);

  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, 'opp-1');
  assert.equal(updated[0].title, sampleItem.title);
  assert.ok(updated[0].savedAt);
});

test('toggles item: removes existing item if already saved', () => {
  const initial = [{ ...sampleItem, savedAt: '2026-09-02T10:00:00.000Z' }];
  const updated = toggleSavedItem(initial, sampleItem);

  assert.equal(updated.length, 0);
});

test('generates valid SQL schema and escaped insert statements for starred items', () => {
  const items = [{
    ...sampleItem,
    title: "John's 'Special' Agent",
    savedAt: '2026-09-02T10:00:00.000Z'
  }];

  const sql = generateSqlExport(items);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS starred_opportunities/);
  assert.match(sql, /INSERT INTO starred_opportunities/);
  // Single quotes should be escaped as ''
  assert.match(sql, /John''s ''Special'' Agent/);
  assert.match(sql, /opp-1/);
});

test('generates valid SQL schema without insert statement when items list is empty', () => {
  const sql = generateSqlExport([]);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS starred_opportunities/);
  assert.doesNotMatch(sql, /INSERT INTO starred_opportunities/);
  assert.match(sql, /Total items: 0/);
});

test('generates valid JSON export format', () => {
  const items = [{ ...sampleItem, savedAt: '2026-09-02T10:00:00.000Z' }];
  const jsonStr = generateJsonExport(items);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.count, 1);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].id, 'opp-1');
  assert.ok(parsed.exportedAt);
});

test('identifies starred view from url query string', () => {
  assert.equal(isStarredView('?view=starred'), true);
  assert.equal(isStarredView('?view=starred&other=1'), true);
  assert.equal(isStarredView('?view=other'), false);
  assert.equal(isStarredView('?date=2026-08-10'), false);
  assert.equal(isStarredView(''), false);
});
