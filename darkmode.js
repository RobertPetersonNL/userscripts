(function() {
    'use strict';
    
    // Taaldetectie (Alleen NL en EN)
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Donkere Modus',
            on: 'AAN',
            off: 'UIT',
            enabled: 'Donkere modus is AAN',
            disabled: 'Donkere modus is UIT',
            desc: 'Slimme kleuromkering, rustig voor de ogen',
            turnOff: '☀️ Schakel uit',
            turnOn: '🌙 Schakel in',
            toastOn: 'Donkere modus ingeschakeld',
            toastOff: 'Donkere modus uitgeschakeld'
        },
        en: {
            name: 'Dark Mode',
            on: 'ON',
            off: 'OFF',
            enabled: 'Dark mode is ON',
            disabled: 'Dark mode is OFF',
            desc: 'Smart color inversion, protects your eyes',
            turnOff: '☀️ Turn Off',
            turnOn: '🌙 Turn On',
            toastOn: 'Dark mode enabled',
            toastOff: 'Dark mode disabled'
        }
    };
    const T = I18N[LANG];

    const MODULE = { id: 'dark-mode', name: T.name, icon: '🌙', color: '#6366f1' };
    const STORAGE_KEY = 'wta_dark_mode';
    
    // Check of het aanstaat in opslag
    let enabled = localStorage.getItem(STORAGE_KEY) === 'true';
    let styleEl = null;
    
    // Verbeterde CSS:
    // 1. html filter draait alles om.
    // 2. De tweede regel draait afbeeldingen, video's, iframes, canvas en SVG's TERUG zodat ze normaal kleuren.
    const darkCSS = `
        html { filter: invert(1) hue-rotate(180deg) !important; background: #111 !important; }
        img, video, picture, canvas, iframe, svg, :fullscreen, [style*="background-image"] { 
            filter: invert(1) hue-rotate(180deg) !important; 
        }
    `;
    
    // Schakelaar functie
    function toggle() {
        enabled = !enabled;
        localStorage.setItem(STORAGE_KEY, enabled);
        apply();
        __WTA_MODULE_UI__.toast(enabled ? T.toastOn : T.toastOff);
        
        // Update het paneel direct zodat de knop verandert
        if (typeof __WTA_MODULE_UI__ !== 'undefined') {
            __WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
        }
    }
    
    // CSS toepassen
    function apply() {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'wta-dark-mode-style';
            document.head.appendChild(styleEl);
        }
        // Als enabled: vul CSS. Als disabled: maak leeg.
        styleEl.textContent = enabled ? darkCSS : '';
    }
    
    // HTML Paneel genereren
    function getPanelHtml() {
        // Status bepalen voor kleuren en iconen
        const statusIcon = enabled ? '🌙' : '☀️';
        const statusText = enabled ? T.enabled : T.disabled;
        const btnText = enabled ? T.turnOff : T.turnOn;
        const btnBg = enabled ? 'background:#f3f4f6;color:#374151' : 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white';
        
        return `
        <div style="text-align:center;padding:20px">
            <div style="font-size:64px;margin-bottom:20px">${statusIcon}</div>
            <div style="font-size:18px;font-weight:600;color:#1f2937;margin-bottom:8px">${statusText}</div>
            <div style="font-size:13px;color:#9ca3af;margin-bottom:24px">${T.desc}</div>
            
            <button onclick="__wtaToggleDark()" style="width:100%;padding:14px;border-radius:12px;border:none;font-size:15px;font-weight:500;cursor:pointer;${btnBg}">
                ${btnText}
            </button>
        </div>`;
    }
    
    // Globale functie voor de knop
    window.__wtaToggleDark = toggle;
    
    function register() {
        if (typeof __WTA_MODULE_UI__ === 'undefined') { setTimeout(register, 100); return; }
        __WTA_MODULE_UI__.register({ ...MODULE, onAction: c => c.innerHTML = getPanelHtml() });
    }
    
    // Direct toepassen bij laden pagina (voorkomt flits)
    apply();
    
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', register) : register();
})();