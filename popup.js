/*
HLS SSAI Ad Cleaner — Browser extension for cleaning SSAI ads in HLS video streams
Copyright (C) 2026 WGRJLYSYB

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License v3.0.
See LICENSE file in repository root for full license text.
*/

const STORAGE_KEY = 'hlsAdCleanerDisabledSites';
const GLOBAL_STORAGE_KEY = 'hlsAdCleanerGlobalDisabled';

const siteToggle = window.SiteToggle || {
  normalizeSiteKey(rawUrl) {
    if (!rawUrl) return '';
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch (error) {
      return String(rawUrl).replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').toLowerCase();
    }
  },
  getDisableMode(disabledSites, globalDisabled, rawUrl) {
    const key = this.normalizeSiteKey(rawUrl);
    if (globalDisabled) return 'global';
    if (key && disabledSites && disabledSites[key]) return 'site';
    return 'on';
  }
};

const elements = {
  popupTitle: document.getElementById('popupTitle'),
  siteName: document.getElementById('siteName'),
  hintText: document.getElementById('hintText'),
  statusBadge: document.getElementById('statusBadge'),
  modeButtons: Array.from(document.querySelectorAll('.segment-option'))
};

function translate(key, fallback) {
  const value = chrome.i18n && chrome.i18n.getMessage ? chrome.i18n.getMessage(key) : '';
  return value || fallback;
}

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY, GLOBAL_STORAGE_KEY], (result) => {
      resolve({
        disabledSites: result[STORAGE_KEY] || {},
        globalDisabled: Boolean(result[GLOBAL_STORAGE_KEY])
      });
    });
  });
}

function renderMode(mode, siteName) {
  const normalizedMode = mode === 'site' || mode === 'global' ? mode : 'on';

  elements.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === normalizedMode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  const siteLabel = siteName || translate('popup_unknown_site', 'unknown site');
  elements.siteName.textContent = `${translate('popup_current_site', 'Current site')}: ${siteLabel}`;

  if (normalizedMode === 'global') {
    elements.statusBadge.textContent = translate('popup_global_state', 'GLOBAL OFF');
    elements.statusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
    elements.statusBadge.style.color = '#fcd34d';
    elements.statusBadge.classList.add('global');
    elements.statusBadge.classList.remove('site');
    elements.hintText.textContent = translate('popup_global_hint', 'All pages are currently disabled.');
  } else if (normalizedMode === 'site') {
    elements.statusBadge.textContent = translate('popup_site_state', 'SITE OFF');
    elements.statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
    elements.statusBadge.style.color = '#fecaca';
    elements.statusBadge.classList.add('site');
    elements.statusBadge.classList.remove('global');
    elements.hintText.textContent = translate('popup_site_hint', 'This site is disabled, but other sites remain enabled.');
  } else {
    elements.statusBadge.textContent = translate('popup_enabled', 'ON');
    elements.statusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
    elements.statusBadge.style.color = '#bbf7d0';
    elements.statusBadge.classList.remove('global', 'site');
    elements.hintText.textContent = translate('popup_enabled_hint', 'Enabled and will clean HLS ads on this page.');
  }
}

async function updateCurrentState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url ? tab.url : '';
  const siteName = siteToggle.normalizeSiteKey(url) || translate('popup_unknown_site', 'unknown site');
  const settings = await readSettings();
  const mode = siteToggle.getDisableMode(settings.disabledSites, settings.globalDisabled, url);

  elements.popupTitle.textContent = translate('popup_title', 'Site control');
  renderMode(mode, siteName);
}

async function saveMode(mode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url ? tab.url : '';
  const siteKey = siteToggle.normalizeSiteKey(url);
  const settings = await readSettings();

  if (!siteKey && mode !== 'global') return;

  const disabledSites = { ...(settings.disabledSites || {}) };
  const globalDisabled = mode === 'global';

  if (mode === 'site') {
    disabledSites[siteKey] = true;
  } else if (mode === 'on') {
    delete disabledSites[siteKey];
  }

  chrome.storage.local.set({
    [STORAGE_KEY]: disabledSites,
    [GLOBAL_STORAGE_KEY]: globalDisabled
  }, () => {
    if (tab && typeof tab.id === 'number') {
      try {
        chrome.tabs.reload(tab.id, { bypassCache: true });
      } catch (error) {
        console.warn('[葡萄AdCleaner][popup] reloadTab failed:', error);
      }
    }
  });

  renderMode(mode, siteKey || translate('popup_unknown_site', 'unknown site'));
}

document.addEventListener('DOMContentLoaded', async () => {
  elements.popupTitle.textContent = translate('popup_title', 'Site control');
  await updateCurrentState();
});

elements.modeButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const mode = button.dataset.mode;
    await saveMode(mode);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab && tab.url ? tab.url : '';
    const siteName = siteToggle.normalizeSiteKey(url) || translate('popup_unknown_site', 'unknown site');
    const settings = await readSettings();
    const currentMode = siteToggle.getDisableMode(settings.disabledSites, settings.globalDisabled, url);
    renderMode(currentMode, siteName);
  });
});
