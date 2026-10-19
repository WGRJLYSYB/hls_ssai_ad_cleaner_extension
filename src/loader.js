/*
HLS SSAI Ad Cleaner — Browser extension for cleaning SSAI ads in HLS video streams
Copyright (C) 2026 WGRJLYSYB

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License v3.0.
See LICENSE file in repository root for full license text.
*/

/**
 * loader.js - ISOLATED World Content Script
 *
 * 运行在浏览器扩展的隔离世界中，可以访问 chrome.runtime API。
 * 职责：将扩展内部打包的 hls.js 的 URL，以及当前站点/全局禁用状态传递给 MAIN 世界的 content.js。
 */
if (document.documentElement.dataset.hlsCleanerLoaderInjected === '1') {
    console.log('[葡萄AdCleaner][loader] 已被注入过，跳过重复执行');
} else {
    document.documentElement.dataset.hlsCleanerLoaderInjected = '1';
    const STORAGE_KEY = 'hlsAdCleanerDisabledSites';
    const GLOBAL_STORAGE_KEY = 'hlsAdCleanerGlobalDisabled';

    console.log('[葡萄AdCleaner][loader] 开始初始化，当前地址:', location.href);
    document.documentElement.dataset.hlsJsUrl = chrome.runtime.getURL('lib/hls.min.js');

    document.documentElement.dataset.hlsCleanerMode = 'on';
    document.documentElement.dataset.hlsCleanerSiteKey = '';

    function normalizeSiteKey(rawUrl) {
    if (!rawUrl) return '';
    try {
        return new URL(rawUrl).hostname.replace(/^www\./i, '').toLowerCase();
    } catch (error) {
        return String(rawUrl).replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '').toLowerCase();
    }
}

    const siteKey = normalizeSiteKey(location.href);
    if (siteKey) {
        document.documentElement.dataset.hlsCleanerSiteKey = siteKey;
    }

    chrome.storage.local.get([STORAGE_KEY, GLOBAL_STORAGE_KEY], (result) => {
        const disabledSites = result && result[STORAGE_KEY] ? result[STORAGE_KEY] : {};
        const globalDisabled = Boolean(result && result[GLOBAL_STORAGE_KEY]);
        const siteDisabled = Boolean(siteKey && disabledSites[siteKey]);
        const mode = globalDisabled ? 'global' : (siteDisabled ? 'site' : 'on');
        document.documentElement.dataset.hlsCleanerMode = mode;
        console.log('[葡萄AdCleaner][loader] 读取禁用状态:', {
            siteKey,
            globalDisabled,
            siteDisabled,
            disabledSites,
            mode
        });
    });
}
