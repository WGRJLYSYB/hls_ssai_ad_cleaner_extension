/*
HLS SSAI Ad Cleaner — Browser extension for cleaning SSAI ads in HLS video streams
Copyright (C) 2026 WGRJLYSYB

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License v3.0.
See LICENSE file in repository root for full license text.
*/

(function (global) {
    function normalizeSiteKey(rawUrl) {
        if (!rawUrl) return '';
        const value = String(rawUrl).trim().toLowerCase();
        if (!value) return '';

        try {
            const parsed = new URL(value);
            return parsed.hostname.replace(/^www\./, '');
        } catch (error) {
            const withoutProtocol = value.replace(/^https?:\/\//, '').replace(/^\/+/, '');
            return withoutProtocol.split('/')[0].replace(/^www\./, '');
        }
    }

    function getDisableMode(disabledSites, globalDisabled, rawUrl) {
        const key = normalizeSiteKey(rawUrl);
        if (Boolean(globalDisabled)) return 'global';
        const map = disabledSites && typeof disabledSites === 'object' ? disabledSites : {};
        if (key && map[key]) return 'site';
        return 'on';
    }

    function isSiteDisabled(disabledSites, rawUrl) {
        return getDisableMode(disabledSites, false, rawUrl) === 'site';
    }

    function isGlobalDisabled(globalDisabled) {
        return Boolean(globalDisabled);
    }

    const api = { normalizeSiteKey, getDisableMode, isSiteDisabled, isGlobalDisabled };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    global.SiteToggle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
