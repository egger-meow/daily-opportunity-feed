export function loadSavedItems(storage = globalThis.localStorage) {
  try {
    if (!storage) return [];
    const raw = storage.getItem('saved_items');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedItems(storage = globalThis.localStorage, items = []) {
  if (!storage) return;
  const list = Array.isArray(items) ? items : [];
  storage.setItem('saved_items', JSON.stringify(list));
  storage.setItem('saved', JSON.stringify(list.map(item => item.id)));
}

export function toggleSavedItem(currentSavedItems = [], itemToToggle) {
  if (!itemToToggle || !itemToToggle.id) return currentSavedItems;
  const exists = currentSavedItems.some(item => item.id === itemToToggle.id);
  if (exists) {
    return currentSavedItems.filter(item => item.id !== itemToToggle.id);
  }
  const newItem = {
    ...itemToToggle,
    savedAt: itemToToggle.savedAt || new Date().toISOString()
  };
  return [newItem, ...currentSavedItems];
}

function escapeSqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function generateSqlExport(items = [], exportedAt = new Date().toISOString()) {
  const count = items.length;
  const header = `-- Starred Opportunities Export\n-- Exported At: ${exportedAt}\n-- Total items: ${count}\n\nCREATE TABLE IF NOT EXISTS starred_opportunities (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  url TEXT NOT NULL,\n  category TEXT,\n  summary TEXT,\n  why_it_matters TEXT,\n  opportunity TEXT,\n  action TEXT,\n  source TEXT,\n  published_at TEXT,\n  score INTEGER,\n  saved_at TEXT\n);\n`;

  if (count === 0) {
    return header;
  }

  const valuesRows = items.map(item => {
    const values = [
      escapeSqlString(item.id),
      escapeSqlString(item.title || ''),
      escapeSqlString(item.url || ''),
      escapeSqlString(item.category || ''),
      escapeSqlString(item.summary || ''),
      escapeSqlString(item.whyItMatters || ''),
      escapeSqlString(item.opportunity || ''),
      escapeSqlString(item.action || ''),
      escapeSqlString(item.source || ''),
      escapeSqlString(item.publishedAt || ''),
      typeof item.score === 'number' ? item.score : (item.score ? Number(item.score) : 'NULL'),
      escapeSqlString(item.savedAt || '')
    ];
    return `  (${values.join(', ')})`;
  });

  const insertStatement = `INSERT INTO starred_opportunities (\n  id, title, url, category, summary, why_it_matters, opportunity, action, source, published_at, score, saved_at\n) VALUES\n${valuesRows.join(',\n')};\n`;

  return `${header}\n${insertStatement}`;
}

export function isStarredView(search) {
  try {
    return new URLSearchParams(search).get('view') === 'starred';
  } catch {
    return false;
  }
}

export function generateJsonExport(items = [], exportedAt = new Date().toISOString()) {
  return JSON.stringify({
    exportedAt,
    count: items.length,
    items
  }, null, 2) + '\n';
}
