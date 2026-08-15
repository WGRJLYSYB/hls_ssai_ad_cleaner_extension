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
