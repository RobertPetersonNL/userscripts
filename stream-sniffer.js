// ==UserScript==
// @name         WTA Module: Video Sniffer (Bron Onderschepper)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Onderschept verborgen .m3u8 en .mp4 links uit het netwerkverkeer
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function waitForCore() {
        if (typeof __WTA_MODULE_UI__ !== 'undefined') {
            registerModule();
        } else {
            setTimeout(waitForCore, 200);
        }
    }

    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Video Bron Sniffer',
            found: 'Streams gevonden:',
            copy: 'Kopieer Link',
            clear: 'Lijst wissen',
            typeHLS: 'HLS Stream (.m3u8)',
            typeMP4: 'MP4 Bestand',
            typeDash: 'DASH Stream (.mpd)',
            help: '💡 Plak deze link in VLC (Media > Netwerkstream openen) om te downloaden/kijken.',
            waiting: 'Wachten op netwerkverkeer... (Start de video)',
            toastCopied: 'Link gekopieerd!',
            toastClear: 'Lijst gewist'
        },
        en: {
            name: 'Video Source Sniffer',
            found: 'Streams found:',
            copy: 'Copy Link',
            clear: 'Clear List',
            typeHLS: 'HLS Stream (.m3u8)',
            typeMP4: 'MP4 File',
            typeDash: 'DASH Stream (.mpd)',
            help: '💡 Paste link in VLC (Media > Open Network Stream) to download/watch.',
            waiting: 'Waiting for network traffic... (Start the video)',
            toastCopied: 'Link copied!',
            toastClear: 'List cleared'
        }
    };
    const T = I18N[LANG];

    const MODULE = { id: 'video-sniffer', name: T.name, icon: '🕵️‍♂️', color: '#10b981' };

    // Hier slaan we unieke links in op
    let capturedLinks = new Set();
    
    // --- NETWERK INTERCEPTIE ---
    // We "hacken" de standaard browser functies om mee te kijken
    
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalFetch = window.fetch;

    function checkUrl(url) {
        if (!url) return;
        const u = url.toString();
        
        // Filter: We zoeken alleen interessante video formaten
        if (u.includes('.m3u8') || u.includes('.mpd') || (u.includes('.mp4') && !u.includes('blob:'))) {
            // Voeg toe aan de set (Set zorgt automatisch dat dubbele niet worden opgeslagen)
            if (!capturedLinks.has(u)) {
                capturedLinks.add(u);
                console.log('[WTA Sniffer] Gevonden:', u);
                
                // Als het paneel open staat, update het direct
                if (typeof __WTA_MODULE_UI__ !== 'undefined') {
                    // Kleine hack om te checken of deze module actief is
                    const panel = document.getElementById('wta-sniffer-list');
                    if (panel) __WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
                    __WTA_MODULE_UI__.toast('Nieuwe stream gevonden!');
                }
            }
        }
    }

    // 1. Intercept XHR (Oude manier van laden)
    XMLHttpRequest.prototype.open = function(method, url) {
        checkUrl(url);
        return originalOpen.apply(this, arguments);
    };

    // 2. Intercept Fetch (Nieuwe manier van laden)
    window.fetch = function(input, init) {
        let url;
        if (typeof input === 'string') url = input;
        else if (input instanceof Request) url = input.url;
        
        checkUrl(url);
        return originalFetch.apply(this, arguments);
    };

    // --- ACTIES ---
    
    window.__wtaCopySniff = function(urlEncoded) {
        const url = decodeURIComponent(urlEncoded);
        navigator.clipboard.writeText(url).then(() => {
            __WTA_MODULE_UI__.toast(T.toastCopied);
        });
    };

    window.__wtaClearSniff = function() {
        capturedLinks.clear();
        __WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
        __WTA_MODULE_UI__.toast(T.toastClear);
    };

    // --- GUI ---

    function getPanelHtml() {
        const links = Array.from(capturedLinks);

        if (links.length === 0) {
            return `<div style="text-align:center;padding:30px;color:#9ca3af">
                <div style="font-size:40px;margin-bottom:10px;animation:pulse 2s infinite">📡</div>
                <div style="font-size:13px">${T.waiting}</div>
            </div>
            <style>@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }</style>`;
        }

        let html = `<div id="wta-sniffer-list">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div style="font-size:12px;color:#6b7280">${T.found} ${links.length}</div>
                <button onclick="__wtaClearSniff()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px">🗑️ ${T.clear}</button>
            </div>`;

        links.forEach((url, i) => {
            let type = 'Onbekend';
            let color = '#6b7280';
            
            if (url.includes('.m3u8')) { type = T.typeHLS; color = '#f59e0b'; } // Oranje
            else if (url.includes('.mp4')) { type = T.typeMP4; color = '#3b82f6'; } // Blauw
            else if (url.includes('.mpd')) { type = T.typeDash; color = '#8b5cf6'; } // Paars

            // URL inkorten voor weergave
            const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;

            html += `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <div style="width:8px;height:8px;border-radius:50%;background:${color}"></div>
                    <div style="font-weight:600;font-size:13px;color:#374151">${type}</div>
                </div>
                <div style="font-size:11px;color:#9ca3af;word-break:break-all;margin-bottom:8px;font-family:monospace;max-height:40px;overflow:hidden">${shortUrl}</div>
                <button onclick="__wtaCopySniff('${encodeURIComponent(url)}')" style="width:100%;background:${color};color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px">
                    📋 ${T.copy}
                </button>
            </div>`;
        });

        html += `<div style="margin-top:16px;padding:12px;background:#ecfdf5;border-radius:8px;color:#065f46;font-size:11px;line-height:1.4">
            ${T.help}
        </div></div>`;

        return html;
    }

    function registerModule() {
        __WTA_MODULE_UI__.register({
            ...MODULE,
            onAction: (container) => {
                container.innerHTML = getPanelHtml();
            }
        });
    }

    waitForCore();

})();