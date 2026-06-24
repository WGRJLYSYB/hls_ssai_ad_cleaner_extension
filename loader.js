/**
 * loader.js - ISOLATED World Content Script
 *
 * 运行在浏览器扩展的隔离世界中，可以访问 chrome.runtime API。
 * 职责：将扩展内部打包的 hls.js 的 URL 传递给运行在 MAIN 世界的 content.js。
 *
 * Chrome/Edge 保证 ISOLATED 世界的脚本先于同扩展的 MAIN 世界脚本执行，
 * 所以 content.js 读取 dataset 时，值一定已经就绪。
 */
document.documentElement.dataset.hlsJsUrl = chrome.runtime.getURL('lib/hls.min.js');
