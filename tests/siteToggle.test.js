const assert = require('assert');
const { normalizeSiteKey, isSiteDisabled } = require('../src/siteToggle');

assert.strictEqual(normalizeSiteKey('https://www.example.com/path?a=1'), 'example.com');
assert.strictEqual(normalizeSiteKey('http://localhost:3000/test'), 'localhost');
assert.strictEqual(isSiteDisabled({ 'example.com': true }, 'https://www.example.com/video.m3u8'), true);
assert.strictEqual(isSiteDisabled({ 'example.com': true }, 'https://other.example.com/video.m3u8'), false);

console.log('site toggle tests passed');
