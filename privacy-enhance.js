(function() {
    'use strict';
    
    // Taaldetectie (Alleen NL en EN)
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Privacy Bescherming',
            desc: 'Bescherm uw online privacy',
            toastOn: 'Ingeschakeld',
            toastOff: 'Uitgeschakeld',
            blockTrackers: 'Trackers blokkeren',
            blockTrackersDesc: 'Blokkeert bekende volgscripts',
            fingerprint: 'Vingerafdruk maskeren',
            fingerprintDesc: 'Verbergt apparaat-informatie',
            cookies: 'Cookies wissen',
            cookiesDesc: 'Wist cookies bij verlaten pagina',
            trackerBlocked: '[Privacy] Tracker geblokkeerd:'
        },
        en: {
            name: 'Privacy Protection',
            desc: 'Protect your online privacy',
            toastOn: 'Enabled',
            toastOff: 'Disabled',
            blockTrackers: 'Block Trackers',
            blockTrackersDesc: 'Blocks common tracking scripts',
            fingerprint: 'Mask Fingerprint',
            fingerprintDesc: 'Obscures device information',
            cookies: 'Clear Cookies',
            cookiesDesc: 'Clears cookies on page exit',
            trackerBlocked: '[Privacy] Tracker blocked:'
        }
    };
    const T = I18N[LANG];

    const MODULE = { id: 'privacy', name: T.name, icon: '🛡️', color: '#dc2626' };
    const STORAGE_KEY = 'wta_privacy';
    
    // Standaard instellingen laden
    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"tracking":true,"fingerprint":true,"cookies":false}');
    
    function save() { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); 
    }
    
    // Helper om cookies te wissen
    function clearCookies() {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + document.domain;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + document.domain;
        }
    }

    function applyProtection() {
        // 1. Trackers blokkeren
        if (settings.tracking) {
            const blockedDomains = ['google-analytics.com', 'googletagmanager.com', 'facebook.net', 'doubleclick.net', 'hotjar.com', 'clarity.ms', 'baidu.com'];
            
            // Override fetch
            const origFetch = window.fetch;
            window.fetch = function(url, opts) {
                if (blockedDomains.some(b => url.toString().includes(b))) { 
                    console.log(T.trackerBlocked, url); 
                    return Promise.reject(new TypeError('Blocked by Privacy Module')); 
                }
                return origFetch.apply(this, arguments);
            };

            // Override XHR (voor oudere trackers)
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (blockedDomains.some(b => url.toString().includes(b))) {
                    console.log(T.trackerBlocked, url);
                    // We maken de URL onbruikbaar
                    arguments[1] = 'about:blank'; 
                }
                return origOpen.apply(this, arguments);
            };
        }

        // 2. Fingerprinting tegengaan (Hardware info faken)
        if (settings.fingerprint) {
            try {
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
                Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
                // Extra: Platform maskeren
                // Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            } catch(e) {
                // Soms blokkeren browsers dit, negeren we.
            }
        }

        // 3. Cookies wissen bij afsluiten
        if (settings.cookies) {
            window.addEventListener('beforeunload', () => {
                clearCookies();
            });
        }
    }
    
    // HTML Paneel genereren
    function getPanelHtml() {
        const items = [
            { key: 'tracking', icon: '🚫', name: T.blockTrackers, desc: T.blockTrackersDesc },
            { key: 'fingerprint', icon: '🎭', name: T.fingerprint, desc: T.fingerprintDesc },
            { key: 'cookies', icon: '🍪', name: T.cookies, desc: T.cookiesDesc }
        ];
        
        const header = `
            <div style="margin-bottom:16px;text-align:center">
                <div style="font-size:48px;margin-bottom:8px">🛡️</div>
                <div style="font-size:13px;color:#9ca3af">${T.desc}</div>
            </div>`;

        const toggles = items.map(item => {
            const isChecked = settings[item.key];
            const bg = isChecked ? '#22c55e' : '#d1d5db';
            const knobPos = isChecked ? '22px' : '2px';
            
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:16px;background:#f9fafb;border-radius:12px;margin-bottom:8px">
                <span style="font-size:24px">${item.icon}</span>
                <div style="flex:1">
                    <div style="font-weight:500;color:#1f2937">${item.name}</div>
                    <div style="font-size:12px;color:#9ca3af">${item.desc}</div>
                </div>
                <label style="position:relative;width:48px;height:28px;cursor:pointer">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="__wtaPrivacyToggle('${item.key}')" style="opacity:0;width:0;height:0">
                    <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:${bg};border-radius:14px;transition:.3s"></span>
                    <span style="position:absolute;height:24px;width:24px;left:${knobPos};bottom:2px;background:white;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
                </label>
            </div>`;
        }).join('');

        return header + toggles;
    }
    
    // Toggle functie
    window.__wtaPrivacyToggle = function(key) {
        settings[key] = !settings[key];
        save();
        
        const status = settings[key] ? T.toastOn : T.toastOff;
        __WTA_MODULE_UI__.toast(`${status}`);
        
        // Paneel updaten
        if (typeof __WTA_MODULE_UI__ !== 'undefined') {
            __WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
        }
        
        // Als de gebruiker tracking aan/uit zet, moeten we eigenlijk herladen, 
        // maar dat is storend. We geven een hint.
        if(key === 'tracking' && settings[key]) {
            __WTA_MODULE_UI__.toast('Herlaad pagina voor effect');
        }
    };
    
    function register() {
        if (typeof __WTA_MODULE_UI__ === 'undefined') { setTimeout(register, 100); return; }
        __WTA_MODULE_UI__.register({ ...MODULE, onAction: c => c.innerHTML = getPanelHtml() });
    }
    
    applyProtection();
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', register) : register();
})();