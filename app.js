import {
  dateFromSearch,
  fetchReport,
  nextAvailableDate,
  previousAvailableDate,
  sortedReportDates,
  taipeiDay
} from './scripts/archive-utils.mjs';
import {
  loadSavedItems,
  persistSavedItems,
  toggleSavedItem,
  generateSqlExport,
  generateJsonExport,
  isStarredView
} from './scripts/starred-utils.mjs';

const state = {
  items: [],
  savedItems: loadSavedItems(),
  viewMode: isStarredView(location.search) ? 'starred' : 'daily',
  filter: '全部',
  query: '',
  dates: [],
  selectedDate: null,
  latestDate: null
};

const legacySavedIds = new Set();
try {
  const parsed = JSON.parse(localStorage.getItem('saved') || '[]');
  if (Array.isArray(parsed)) {
    for (const id of parsed) {
      if (id) legacySavedIds.add(id);
    }
  }
} catch {}

const feed = document.querySelector('#feed');
const template = document.querySelector('#card-template');
const empty = document.querySelector('#empty');
const status = document.querySelector('#feed-status');

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei'
  }).format(new Date(value));
}

function formatReportDate(date) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date(`${date}T12:00:00+08:00`));
}

function isSaved(itemId) {
  return state.savedItems.some(item => item.id === itemId) || legacySavedIds.has(itemId);
}

function setLoading(loading) {
  status.hidden = !loading;
  status.textContent = loading ? '正在載入報告…' : '';
  if (state.viewMode !== 'starred') {
    document.querySelector('#previous-day').disabled = loading || !previousAvailableDate(state.dates, state.selectedDate || state.latestDate || '');
    document.querySelector('#next-day').disabled = loading || !state.selectedDate || !nextAvailableDate(state.dates, state.selectedDate);
  }
}

function render() {
  const isStarred = state.viewMode === 'starred';
  const pool = isStarred ? state.savedItems : state.items;
  const query = state.query.toLowerCase().trim();

  const items = pool.filter(item => {
    const matchesCategory = state.filter === '全部' || item.category === state.filter;
    const text = `${item.title} ${item.summary} ${item.opportunity} ${item.category} ${item.source}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    return matchesCategory && matchesQuery;
  });

  feed.replaceChildren(...items.map(item => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.querySelector('.category').textContent = item.category;
    const link = node.querySelector('.title');
    link.textContent = item.title;
    link.href = item.url;
    node.querySelector('.summary').textContent = item.summary;
    node.querySelector('.relevance').textContent = item.whyItMatters;
    node.querySelector('.opportunity').textContent = item.opportunity;
    node.querySelector('.action').textContent = item.action;
    node.querySelector('.source').textContent = item.source;
    node.querySelector('time').textContent = formatDate(item.publishedAt);
    node.querySelector('.score').textContent = `分數 ${item.score}`;

    const save = node.querySelector('.save');
    const saved = isSaved(item.id);
    save.textContent = saved ? '★' : '☆';
    save.setAttribute('aria-label', saved ? '取消收藏' : '收藏');
    save.classList.toggle('saved', saved);

    save.addEventListener('click', (e) => {
      e.stopPropagation();
      state.savedItems = toggleSavedItem(state.savedItems, item);
      if (saved) {
        legacySavedIds.delete(item.id);
      } else {
        legacySavedIds.add(item.id);
      }
      persistSavedItems(localStorage, state.savedItems);
      renderFilters();
      render();
      updateNavigation();
    });

    return node;
  }));

  empty.hidden = items.length > 0;
  if (!items.length) {
    if (isStarred) {
      empty.textContent = state.savedItems.length === 0
        ? '目前尚未有任何收藏的機會。點擊卡片右上角的「☆」即可加入收藏！'
        : '沒有符合搜尋或篩選條件的收藏機會。';
    } else {
      empty.textContent = query || state.filter !== '全部'
        ? '沒有符合篩選條件的機會。'
        : '這一天尚無可顯示的機會。';
    }
  }
}

function renderFilters() {
  const filtersContainer = document.querySelector('#filters');
  const isStarred = state.viewMode === 'starred';

  if (isStarred) {
    const categories = ['全部', ...new Set(state.savedItems.map(item => item.category).filter(Boolean))];
    const buttons = categories.map(category => {
      const button = document.createElement('button');
      if (category === '全部') {
        button.className = 'filter-starred';
        button.innerHTML = `<span class="star-icon">★</span>全部收藏 (${state.savedItems.length})`;
      } else {
        button.textContent = category;
      }
      button.classList.toggle('active', category === state.filter);
      button.onclick = () => {
        state.filter = category;
        renderFilters();
        render();
      };
      return button;
    });
    filtersContainer.replaceChildren(...buttons);
  } else {
    const categories = [...new Set(state.items.map(item => item.category).filter(Boolean))];

    const allBtn = document.createElement('button');
    allBtn.textContent = '全部';
    allBtn.classList.toggle('active', state.filter === '全部');
    allBtn.onclick = () => {
      state.filter = '全部';
      renderFilters();
      render();
    };

    const starredBtn = document.createElement('button');
    starredBtn.className = 'filter-starred';
    starredBtn.innerHTML = `<span class="star-icon">★</span>收藏 (${state.savedItems.length})`;
    starredBtn.title = '瀏覽所有收藏的機會';
    starredBtn.onclick = () => {
      switchToStarredView();
    };

    const catButtons = categories.map(category => {
      const button = document.createElement('button');
      button.textContent = category;
      button.classList.toggle('active', category === state.filter);
      button.onclick = () => {
        state.filter = category;
        renderFilters();
        render();
      };
      return button;
    });

    filtersContainer.replaceChildren(allBtn, starredBtn, ...catButtons);
  }
}

function updateNavigation() {
  const isStarred = state.viewMode === 'starred';
  const label = document.querySelector('#view-mode-label');
  const selectedDateEl = document.querySelector('#selected-date');
  const datePickerWrap = document.querySelector('#date-picker-wrap');
  const prevBtn = document.querySelector('#previous-day');
  const nextBtn = document.querySelector('#next-day');
  const latestBtn = document.querySelector('#latest');
  const backToFeedBtn = document.querySelector('#back-to-feed');
  const starredActions = document.querySelector('#starred-actions');

  if (isStarred) {
    if (label) label.textContent = '我的收藏庫';
    selectedDateEl.textContent = `★ 我的收藏清單（共 ${state.savedItems.length} 個項目）`;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    datePickerWrap.hidden = true;
    latestBtn.hidden = true;
    backToFeedBtn.hidden = false;
    starredActions.hidden = false;
    document.querySelector('#count').textContent = `共 ${state.savedItems.length} 個收藏項目`;
    setLoading(false);
  } else {
    if (label) label.textContent = '目前瀏覽';
    const date = state.selectedDate || state.latestDate || taipeiDay();
    selectedDateEl.textContent = state.selectedDate ? formatReportDate(date) : `最新報告（${formatReportDate(date)}）`;
    document.querySelector('#date-picker').value = date;
    document.querySelector('#date-picker').max = state.latestDate || '';
    prevBtn.hidden = false;
    nextBtn.hidden = false;
    datePickerWrap.hidden = false;
    latestBtn.hidden = !state.selectedDate;
    backToFeedBtn.hidden = true;
    starredActions.hidden = true;
    document.querySelector('#count').textContent = `${state.items.length} 個機會`;
    setLoading(false);
  }
}

function switchToStarredView() {
  state.viewMode = 'starred';
  state.filter = '全部';
  const url = new URL(location.href);
  url.searchParams.set('view', 'starred');
  history.pushState({ view: 'starred' }, '', url);
  renderFilters();
  render();
  updateNavigation();
}

function switchToDailyView(date = state.selectedDate) {
  state.viewMode = 'daily';
  state.filter = '全部';
  const url = new URL(location.href);
  url.searchParams.delete('view');
  if (date) {
    url.searchParams.set('date', date);
  } else {
    url.searchParams.delete('date');
  }
  history.pushState({}, '', url);
  renderFilters();
  render();
  updateNavigation();
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadIndex() {
  try {
    const response = await fetch('data/archive/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const index = await response.json();
    state.dates = sortedReportDates(index.dates || []);
  } catch {
    state.dates = [];
  }
}

async function loadCurrent() {
  const isStarred = isStarredView(location.search);
  const selected = dateFromSearch(location.search);
  state.selectedDate = selected;

  if (isStarred) {
    state.viewMode = 'starred';
    state.filter = '全部';
  } else {
    state.viewMode = 'daily';
  }

  setLoading(true);
  try {
    const data = await fetchReport(fetch, selected);
    state.items = Array.isArray(data.items) ? data.items : [];
    state.latestDate = taipeiDay(new Date(data.generatedAt));
    if (!state.dates.includes(state.latestDate)) {
      state.dates = sortedReportDates([...state.dates, state.latestDate]);
    }
    document.querySelector('#updated').textContent = `更新於 ${formatDate(data.generatedAt)}`;

    let migrated = false;
    for (const item of state.items) {
      if (legacySavedIds.has(item.id) && !state.savedItems.some(s => s.id === item.id)) {
        state.savedItems.push({ ...item, savedAt: item.publishedAt || new Date().toISOString() });
        migrated = true;
      }
    }
    if (migrated) {
      persistSavedItems(localStorage, state.savedItems);
    }

    renderFilters();
    render();
  } catch {
    state.items = [];
    document.querySelector('#updated').textContent = selected ? '找不到此日期的報告' : '無法載入最新報告';
    renderFilters();
    render();
    if (state.viewMode === 'daily') {
      empty.hidden = false;
      empty.textContent = selected
        ? `${formatReportDate(selected)} 尚無報告。請選擇其他日期或查看最新報告。`
        : '目前無法載入報告，請稍後再試。';
    }
  }
  updateNavigation();
}

function goTo(date) {
  state.viewMode = 'daily';
  state.filter = '全部';
  const url = new URL(location.href);
  url.searchParams.delete('view');
  if (date) url.searchParams.set('date', date);
  else url.searchParams.delete('date');
  history.pushState({}, '', url);
  loadCurrent();
}

document.querySelector('#search').addEventListener('input', event => {
  state.query = event.target.value;
  render();
});

document.querySelector('#theme').addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
});

document.querySelector('#previous-day').addEventListener('click', () => {
  goTo(previousAvailableDate(state.dates, state.selectedDate || state.latestDate));
});

document.querySelector('#next-day').addEventListener('click', () => {
  goTo(nextAvailableDate(state.dates, state.selectedDate));
});

document.querySelector('#date-picker').addEventListener('change', event => {
  goTo(event.target.value);
});

document.querySelector('#latest').addEventListener('click', () => {
  goTo(null);
});

document.querySelector('#back-to-feed').addEventListener('click', () => {
  switchToDailyView(state.selectedDate);
});

document.querySelector('#export-sql').addEventListener('click', () => {
  const date = taipeiDay();
  const sql = generateSqlExport(state.savedItems);
  downloadFile(`starred-opportunities-${date}.sql`, sql, 'application/sql;charset=utf-8');
});

document.querySelector('#export-json').addEventListener('click', () => {
  const date = taipeiDay();
  const json = generateJsonExport(state.savedItems);
  downloadFile(`starred-opportunities-${date}.json`, json, 'application/json;charset=utf-8');
});

window.addEventListener('popstate', loadCurrent);

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}

await loadIndex();
loadCurrent();
