/**
 * content.js - MAIN World Content Script
 * 葡萄广告拦截器 - HLS SSAI Ad Cleaner (Framerate Signature)
 *
 * 运行在页面的 MAIN 世界中，可以直接劫持页面原生 API (XHR, fetch, HTMLMediaElement.src)。
 * hls.js 从扩展内部加载（URL 由 ISOLATED 世界的 loader.js 通过 DOM dataset 传入）。
 *
 * 原始版本: Userscript v3.4 by Gavin Newsom
 * 改编为 Edge Extension (Manifest V3)
 */
(function () {
    'use strict';

    const LOG_PREFIX = '[葡萄AdCleaner]';
    const oldXhrOpen = XMLHttpRequest.prototype.open;
    const oldFetch = window.fetch;
    const ourBlobs = new Set();

    /**
     * 深度净化核心逻辑
     * 原理：拦截主索引，同步递归净化所有子资源并转换为 Blob URL，从而绕过内核原生请求限制。
     */
    function getPurifiedUrlSync(url) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) return url;
        if (!url.includes('m3u8')) return url;

        try {
            const xhr = new XMLHttpRequest();
            xhr.isInternalRequest = true;
            oldXhrOpen.apply(xhr, ['GET', url, false]);
            xhr.send();

            if (xhr.status === 200) {
                let content = xhr.responseText;
                const lines = content.split('\n');
                const newLines = [];
                const isMaster = content.includes('#EXT-X-STREAM-INF');
                const hasAds = content.includes('#EXT-X-DISCONTINUITY');

                if (isMaster) {
                    for (let line of lines) {
                        let t = line.trim();
                        if (t && !t.startsWith('#')) {
                            const absUrl = new URL(t, url).href;
                            newLines.push(getPurifiedUrlSync(absUrl));
                        } else {
                            newLines.push(line);
                        }
                    }
                    content = newLines.join('\n');
                } else if (hasAds) {
                    // 第一步：动态探测主视频的帧率 (FPS Signature)
                    // 盗版网站正片和广告的压制规格往往不同（例如正片是24fps，广告是30fps）
                    const commonFps = [23.976, 24, 25, 29.97, 30, 50, 60];
                    const fpsCounts = { 23.976: 0, 24: 0, 25: 0, 29.97: 0, 30: 0, 50: 0, 60: 0 };

                    let allDurs = [];
                    for (let line of lines) {
                        if (line.startsWith('#EXTINF:')) {
                            allDurs.push(parseFloat(line.split(':')[1].split(',')[0].trim()));
                        }
                    }

                    for (let dur of allDurs) {
                        for (let fps of commonFps) {
                            let frames = dur * fps;
                            let diff = Math.abs(frames - Math.round(frames));
                            if (diff < 0.05) { // 容忍 0.05 帧的浮点误差
                                fpsCounts[fps]++;
                            }
                        }
                    }

                    let mainFps = 24;
                    let maxMatch = 0;
                    for (let fps of commonFps) {
                        if (fpsCounts[fps] > maxMatch) {
                            maxMatch = fpsCounts[fps];
                            mainFps = fps;
                        }
                    }
                    console.log(`${LOG_PREFIX} 探测到主视频帧率为: ${mainFps}fps (完全吻合的切片数: ${maxMatch}/${allDurs.length})`);

                    // 第二步：遍历 Block，如果有任何一个切片严重违背主视频帧率基准，即判定为混入的广告
                    let finalLines = [];
                    let currentBlock = [];
                    let isAdBlock = false;

                    const flushBlock = () => {
                        if (currentBlock.length > 0) {
                            if (!isAdBlock) {
                                for (let l of currentBlock) {
                                    if (!l.startsWith('#') && !l.startsWith('http') && !l.startsWith('blob:') && !l.startsWith('data:')) {
                                        finalLines.push(new URL(l, url).href);
                                    } else {
                                        finalLines.push(l);
                                    }
                                }
                            } else {
                                console.log(`${LOG_PREFIX} 成功过滤一个广告区块 (帧率时基异常)`);
                            }
                        }
                    };

                    for (let line of lines) {
                        let t = line.trim();
                        if (!t) continue;

                        // 全局标签直接保留
                        if (t.startsWith('#EXTM3U') || t.startsWith('#EXT-X-VERSION') ||
                            t.startsWith('#EXT-X-TARGETDURATION') || t.startsWith('#EXT-X-MEDIA-SEQUENCE') ||
                            t.startsWith('#EXT-X-PLAYLIST-TYPE') || t.startsWith('#EXT-X-ENDLIST')) {
                            finalLines.push(t);
                            continue;
                        }

                        // 遇到不连续标签，结算上一个 Block
                        if (t.startsWith('#EXT-X-DISCONTINUITY')) {
                            flushBlock();
                            currentBlock = [t];
                            isAdBlock = false;
                            continue;
                        }

                        currentBlock.push(t);
                        if (t.startsWith('#EXTINF:')) {
                            const dur = parseFloat(t.split(':')[1].split(',')[0].trim());
                            let frames = dur * mainFps;
                            let diff = Math.abs(frames - Math.round(frames));

                            // 核心判定：如果切片时长乘以主帧率后，误差超过 0.1 帧
                            // 说明这个切片绝对不是用主视频的编码器压出来的，100%是外来广告！
                            if (diff > 0.1) {
                                isAdBlock = true;
                            }
                        }
                    }
                    flushBlock(); // 处理最后一个区块

                    content = finalLines.join('\n');
                } else {
                    for (let line of lines) {
                        let t = line.trim();
                        if (t && !t.startsWith('#') && !t.startsWith('http')) {
                            newLines.push(new URL(t, url).href);
                        } else {
                            newLines.push(line);
                        }
                    }
                    content = newLines.join('\n');
                }

                const finalBlob = URL.createObjectURL(new Blob([content], { type: 'application/vnd.apple.mpegurl' }));
                ourBlobs.add(finalBlob);
                console.log(`${LOG_PREFIX} 资源净化成功: ${url.split('?')[0]} -> ${finalBlob}`);
                return finalBlob;
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} 净化失败:`, e);
        }
        return url;
    }

    XMLHttpRequest.prototype.open = function (m, url, ...args) {
        if (!this.isInternalRequest && typeof url === 'string' && url.includes('m3u8')) {
            url = getPurifiedUrlSync(url);
        }
        return oldXhrOpen.apply(this, [m, url, ...args]);
    };

    window.fetch = function (input, init) {
        let url = (input instanceof Request) ? input.url : String(input);
        if (!init?.isInternal && url.includes('m3u8') && !url.startsWith('blob:')) {
            url = getPurifiedUrlSync(url);
            input = (input instanceof Request) ? new Request(url, input) : url;
        }
        return oldFetch(input, init);
    };

    function injectHlsJs(el, m3u8Url) {
        const videoEl = el.tagName === 'VIDEO' ? el : el.parentElement;
        if (!videoEl || videoEl.tagName !== 'VIDEO') return false;
        if (videoEl.__hls_hijacked) return true;
        videoEl.__hls_hijacked = true;

        console.log(`${LOG_PREFIX} 检测到试图将 Blob M3U8 喂给原生播放器。强制注入 hls.js 接管播放!`);

        el.removeAttribute('src');
        if (el !== videoEl) videoEl.removeAttribute('src');

        const startHls = (HlsClass) => {
            if (!HlsClass.isSupported()) {
                console.error(`${LOG_PREFIX} 当前浏览器不支持 hls.js (MSE)，接管失败。`);
                videoEl.src = m3u8Url;
                return;
            }
            if (videoEl.__hls_instance) {
                videoEl.__hls_instance.destroy();
            }

            console.log(`${LOG_PREFIX} 初始化 hls.js 实例...`);
            const hls = new HlsClass({
                debug: false
            });
            videoEl.__hls_instance = hls;

            // 严格按照 hls.js 官方生命周期：先 attach，成功后再 loadSource
            hls.on(HlsClass.Events.MEDIA_ATTACHED, function () {
                console.log(`${LOG_PREFIX} hls.js 成功挂载到 Video 标签，开始拉取 M3U8 数据源:`, m3u8Url);
                hls.loadSource(m3u8Url);
            });

            hls.on(HlsClass.Events.MANIFEST_PARSED, function (event, data) {
                console.log(`${LOG_PREFIX} M3U8 解析完成！发现 ${data.levels.length} 个画质，尝试自动播放...`);
                videoEl.play().catch(() => {}); // 忽略浏览器自动播放限制的报错
            });

            hls.on(HlsClass.Events.ERROR, function (event, data) {
                if (!data.fatal) return; // 忽略 bufferFullError 等非致命报错，避免刷屏
                console.error(`${LOG_PREFIX} hls.js 内部报错:`, data);
                if (data.fatal) {
                    switch (data.type) {
                        case HlsClass.ErrorTypes.NETWORK_ERROR:
                            console.log(`${LOG_PREFIX} 致命网络错误，尝试重启网络模块...`);
                            hls.startLoad();
                            break;
                        case HlsClass.ErrorTypes.MEDIA_ERROR:
                            console.log(`${LOG_PREFIX} 致命媒体错误，尝试恢复解码器...`);
                            hls.recoverMediaError();
                            break;
                        default:
                            console.log(`${LOG_PREFIX} 无法恢复的错误，销毁实例...`);
                            hls.destroy();
                            break;
                    }
                }
            });

            hls.attachMedia(videoEl);
            console.log(`${LOG_PREFIX} hls.js 已接管，正在等待挂载事件...`);
        };

        /**
         * 关键改动：从扩展内部加载 hls.js，而非 CDN。
         * loader.js (ISOLATED world) 已经将扩展内部的 hls.js URL 写入 DOM dataset。
         * MV3 的 CSP 禁止从外部 CDN 加载脚本，所以必须使用打包在扩展内的版本。
         */
        if (window.__MyHlsClass) {
            startHls(window.__MyHlsClass);
        } else {
            // 从扩展内部加载打包好的 hls.js
            const hlsJsUrl = document.documentElement.dataset.hlsJsUrl;
            if (!hlsJsUrl) {
                console.error(`${LOG_PREFIX} 无法获取扩展内部的 hls.js URL，loader.js 可能未正常执行。`);
                // 最后的兜底：尝试使用网站自带的 Hls
                if (window.Hls) {
                    startHls(window.Hls);
                }
                return true;
            }

            console.log(`${LOG_PREFIX} 正在从扩展内部加载打包的 hls.js...`);
            const script = document.createElement('script');
            script.src = hlsJsUrl;
            script.onload = () => {
                window.__MyHlsClass = window.Hls; // 截取刚加载出来的 Hls 类
                startHls(window.__MyHlsClass);
            };
            script.onerror = () => {
                console.error(`${LOG_PREFIX} 扩展内部 hls.js 加载失败，尝试退回网站自带的 Hls...`);
                if (window.Hls) startHls(window.Hls);
            };
            (document.head || document.documentElement).appendChild(script);
        }
        return true;
    }

    const hijackProperty = (proto, prop) => {
        const desc = Object.getOwnPropertyDescriptor(proto, prop);
        if (!desc) return;
        Object.defineProperty(proto, prop, {
            get: function () { return desc.get.call(this); },
            set: function (val) {
                if (val && typeof val === 'string') {
                    if (val.includes('m3u8') && !val.startsWith('blob:')) {
                        val = getPurifiedUrlSync(val);
                    }
                    if (ourBlobs.has(val)) {
                        const handled = injectHlsJs(this, val);
                        if (handled) return; // 阻止喂给系统底层原生播放器
                    }
                }
                return desc.set.call(this, val);
            }
        });
    };

    hijackProperty(HTMLMediaElement.prototype, 'src');
    if (window.HTMLSourceElement) hijackProperty(HTMLSourceElement.prototype, 'src');

    function checkAndCleanEl(el) {
        const currentSrc = el.getAttribute('src') || el.src;
        if (currentSrc && currentSrc.includes('m3u8') && !currentSrc.startsWith('blob:') && !el.dataset.cleaned) {
            el.dataset.cleaned = "true";

            // 瞬间拔掉网线：强行移除 src 并 load，打断原生播放器偷偷缓冲广告
            el.removeAttribute('src');
            const videoEl = el.tagName === 'VIDEO' ? el : el.parentElement;
            if (videoEl && videoEl.tagName === 'VIDEO') {
                videoEl.removeAttribute('src');
                videoEl.load(); // 强行中止媒体流抓取
            }

            // 放入微任务异步执行，避免阻塞页面的其他渲染
            setTimeout(() => {
                const newUrl = getPurifiedUrlSync(currentSrc);
                const handled = injectHlsJs(el, newUrl);
                if (!handled) {
                    el.src = newUrl;
                    if (videoEl && videoEl.tagName === 'VIDEO') {
                        videoEl.load();
                        videoEl.play().catch(() => { });
                    }
                }
            }, 10);
        }
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mut => {
            if (mut.type === 'childList') {
                mut.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        if (node.tagName === 'VIDEO' || node.tagName === 'SOURCE') {
                            checkAndCleanEl(node);
                        }
                        node.querySelectorAll('video, source').forEach(el => checkAndCleanEl(el));
                    }
                });
            } else if (mut.type === 'attributes' && mut.attributeName === 'src') {
                checkAndCleanEl(mut.target);
            }
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

    // 兜底轮询
    setInterval(() => {
        document.querySelectorAll('video, source').forEach(el => checkAndCleanEl(el));
    }, 1500);

    console.log(`${LOG_PREFIX} 葡萄广告拦截器就绪 (Edge Extension Mode)`);
})();
