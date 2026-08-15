const STORAGE_KEY = 'hlsAdCleanerDisabledSites';
const GLOBAL_STORAGE_KEY = 'hlsAdCleanerGlobalDisabled';

function normalizeSiteKey(rawUrl) {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (error) {
    return String(rawUrl).replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '').toLowerCase();
  }
}

function getModeForUrl(url, disabledSites, globalDisabled) {
  if (globalDisabled) return 'global';
  const siteKey = normalizeSiteKey(url);
  if (siteKey && disabledSites[siteKey]) return 'site';
  return 'on';
}

async function ensureTabMode(tabId, url) {
  if (!tabId || !url || !/^https?:\/\//i.test(url)) {
    return;
  }

  const result = await new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY, GLOBAL_STORAGE_KEY], resolve);
  });

  const disabledSites = result[STORAGE_KEY] || {};
  const globalDisabled = Boolean(result[GLOBAL_STORAGE_KEY]);
  const mode = getModeForUrl(url, disabledSites, globalDisabled);

  if (mode !== 'on') {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['src/loader.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['src/content.js'],
      world: 'MAIN'
    });
  } catch (error) {
    console.warn('[葡萄AdCleaner][background] 注入失败:', error);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    ensureTabMode(tabId, tab.url);
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details && details.tabId && details.url) {
    ensureTabMode(details.tabId, details.url);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details && details.tabId && details.url) {
    ensureTabMode(details.tabId, details.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      ensureTabMode(tab.id, tab.url);
    }
  } catch (error) {
    console.warn('[葡萄AdCleaner][background] onActivated 失败:', error);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (!changes[STORAGE_KEY] && !changes[GLOBAL_STORAGE_KEY]) return;

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab && tab.id && tab.url) {
        ensureTabMode(tab.id, tab.url);
      }
    });
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab && tab.id && tab.url) {
        ensureTabMode(tab.id, tab.url);
      }
    });
  });
});
