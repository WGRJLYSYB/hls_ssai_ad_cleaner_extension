/*
HLS SSAI Ad Cleaner — Browser extension for cleaning SSAI ads in HLS video streams
Copyright (C) 2026 WGRJLYSYB

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License v3.0.
See LICENSE file in repository root for full license text.
*/

const assert = require('assert');
const { normalizeSiteKey, isSiteDisabled } = require('../src/siteToggle');

assert.strictEqual(normalizeSiteKey('https://www.example.com/path?a=1'), 'example.com');
assert.strictEqual(normalizeSiteKey('http://localhost:3000/test'), 'localhost');
assert.strictEqual(isSiteDisabled({ 'example.com': true }, 'https://www.example.com/video.m3u8'), true);
assert.strictEqual(isSiteDisabled({ 'example.com': true }, 'https://other.example.com/video.m3u8'), false);

console.log('site toggle tests passed');
