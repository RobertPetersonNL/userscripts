(function() {
    'use strict';
    
    // Meertalige ondersteuning (Nu met Nederlands en Engels)
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 
                 navLang.startsWith('en') ? 'en' :
                    'en'; // Standaard naar Engels

    const I18N = {
        nl: {
            name: 'Elementen Blokkeerder',
            blocked: 'Element geblokkeerd',
            unblocked: 'Blokkade opgeheven',
            selected: 'Geselecteerd',
            dblClickToBlock: 'dubbelklik om te blokkeren',
            selectMode: 'Selectiemodus: Klik om te selecteren, Dubbelklik om te blokkeren, ESC om te stoppen',
            clearedAll: 'Alle blokkades gewist',
            selectElement: 'Selecteer te blokkeren element',
            blockedCount: '{0} elementen geblokkeerd',
            delete: 'Verwijderen',
            clearAll: 'Alles wissen',
            clickToSelect: 'Klik op de knop hierboven om elementen te kiezen'
        },
        en: {
            name: 'Element Blocker',
            blocked: 'Element blocked',
            unblocked: 'Unblocked',
            selected: 'Selected',
            dblClickToBlock: 'double-click to block',
            selectMode: 'Select mode: click to select, double-click to block, ESC to exit',
            clearedAll: 'All blocks cleared',
            selectElement: 'Select element to block',
            blockedCount: '{0} elements blocked',
            delete: 'Delete',
            clearAll: 'Clear all blocks',
            clickToSelect: 'Click the button above to select elements'
        },
    };
    const T = I18N[LANG] || I18N.en;
    
    const MODULE = { id: 'element-blocker', name: T.name, icon: '🚫', color: '#ef4444' };
    const STORAGE_KEY = 'wta_blocked_elements';
    let blockedSelectors = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let selectMode = false;
    let hoveredElement = null;
    let highlightOverlay = null;
    
    // Creëer de rode markering (overlay)
    function createOverlay() {
        if (highlightOverlay) return;
        highlightOverlay = document.createElement('div');
        highlightOverlay.id = 'wta-element-highlight';
        // Z-index hoog gehouden, pointer-events:none zorgt dat je door de overlay heen klikt op het element eronder
        highlightOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #ef4444;background:rgba(239,68,68,0.15);transition:all 0.1s ease;display:none';
        document.body.appendChild(highlightOverlay);
    }
    
    // Genereer een unieke selector voor het element
    function getSelector(el) {
        if (!el || el === document.body || el === document.documentElement) return null;
        if (el.id) return '#' + CSS.escape(el.id);
        
        let path = [];
        while (el && el !== document.body && el !== document.documentElement) {
            let selector = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                // Filter wta- classes eruit zodat de tool zichzelf niet blokkeert
                const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes('wta-'));
                if (classes.length) selector += '.' + classes.map(c => CSS.escape(c)).join('.');
            }
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
                if (siblings.length > 1) {
                    const idx = siblings.indexOf(el) + 1;
                    selector += ':nth-of-type(' + idx + ')';
                }
            }
            path.unshift(selector);
            el = parent;
            // Beperk diepte tot 4 om performance te bewaken en selector leesbaar te houden
            if (path.length >= 4) break;
        }
        return path.join(' > ');
    }
    
    // Pas de blokkeerregels toe (injecteer CSS)
    function applyBlockedRules() {
        let styleEl = document.getElementById('wta-blocked-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'wta-blocked-styles';
            document.head.appendChild(styleEl);
        }
        if (blockedSelectors.length) {
            styleEl.textContent = blockedSelectors.map(s => s + '{display:none!important}').join('');
        } else {
            styleEl.textContent = '';
        }
    }
    
    // Opslaan in LocalStorage
    function saveRules() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(blockedSelectors));
        applyBlockedRules();
    }
    
    // Element blokkeren
    function blockElement(selector) {
        if (!selector || blockedSelectors.includes(selector)) return;
        blockedSelectors.push(selector);
        saveRules();
        __WTA_MODULE_UI__.toast(T.blocked);
    }
    
    // Blokkade opheffen
    function unblockElement(index) {
        blockedSelectors.splice(index, 1);
        saveRules();
        __WTA_MODULE_UI__.toast(T.unblocked);
        __WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
    }
    
    // Muisbeweging tijdens selectiemodus
    function onMouseMove(e) {
        if (!selectMode) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        // Negeer de UI panelen en de overlay zelf
        if (!el || el === highlightOverlay || el.closest('#wta-module-panel') || el.closest('#wta-module-fab')) {
            if (highlightOverlay) highlightOverlay.style.display = 'none';
            hoveredElement = null;
            return;
        }
        hoveredElement = el;
        const rect = el.getBoundingClientRect();
        if (highlightOverlay) {
            highlightOverlay.style.display = 'block';
            highlightOverlay.style.left = rect.left + 'px';
            highlightOverlay.style.top = rect.top + 'px';
            highlightOverlay.style.width = rect.width + 'px';
            highlightOverlay.style.height = rect.height + 'px';
        }
    }
    
    // Klikken = Selecteren (info tonen)
    function onClick(e) {
        if (!selectMode || !hoveredElement) return;
        e.preventDefault();
        e.stopPropagation();
        const selector = getSelector(hoveredElement);
        if (selector) {
            __WTA_MODULE_UI__.toast(T.selected + ': ' + hoveredElement.tagName.toLowerCase() + ' (' + T.dblClickToBlock + ')');
        }
    }
    
    // Dubbelklikken = Blokkeren
    function onDblClick(e) {
        if (!selectMode || !hoveredElement) return;
        e.preventDefault();
        e.stopPropagation();
        const selector = getSelector(hoveredElement);
        if (selector) {
            blockElement(selector);
            exitSelectMode();
        }
    }
    
    // Start selectiemodus
    function enterSelectMode() {
        selectMode = true;
        createOverlay();
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('dblclick', onDblClick, true);
        document.body.style.cursor = 'crosshair'; // Cursor verandert in een kruisje
        __WTA_MODULE_UI__.toast(T.selectMode);
        __WTA_MODULE_UI__.closePanel();
        
        // ESC toets om te annuleren
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                exitSelectMode();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
    
    // Stop selectiemodus
    function exitSelectMode() {
        selectMode = false;
        hoveredElement = null;
        if (highlightOverlay) highlightOverlay.style.display = 'none';
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('dblclick', onDblClick, true);
        document.body.style.cursor = '';
    }
    
    // Alles wissen
    function clearAll() {
        blockedSelectors = [];
        saveRules();
        __WTA_MODULE_UI__.toast(T.clearedAll);
        __WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
    }
    
    // HTML voor het paneel genereren
    function getPanelHtml() {
        let html = '<div style="margin-bottom:20px">' +
            '<button onclick="__wtaEnterSelectMode()" style="width:100%;background:linear-gradient(135deg,#ef4444,#f87171);color:white;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +
            '<span>👆</span> ' + T.selectElement + '</button></div>';
        
        html += '<div style="font-size:14px;color:#6b7280;margin-bottom:12px">' + T.blockedCount.replace('{0}', blockedSelectors.length) + '</div>';
        
        if (blockedSelectors.length) {
            html += '<div style="max-height:200px;overflow-y:auto">';
            blockedSelectors.forEach((selector, i) => {
                html += '<div style="display:flex;align-items:center;gap:8px;padding:10px;background:#f9fafb;border-radius:8px;margin-bottom:8px">' +
                    '<span style="flex:1;font-size:12px;color:#4b5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace">' + selector.replace(/</g, '&lt;') + '</span>' +
                    '<button onclick="__wtaUnblock(' + i + ')" style="background:#fee2e2;color:#dc2626;border:none;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer">' + T.delete + '</button></div>';
            });
            html += '</div>';
            html += '<button onclick="__wtaClearAllBlocks()" style="width:100%;margin-top:12px;background:#f3f4f6;color:#6b7280;border:none;padding:10px;border-radius:8px;font-size:13px;cursor:pointer">' + T.clearAll + '</button>';
        } else {
            html += '<div style="text-align:center;padding:24px;color:#9ca3af"><div style="font-size:32px;margin-bottom:8px">🎯</div><div style="font-size:13px">' + T.clickToSelect + '</div></div>';
        }
        
        return html;
    }
    
    // Globale functies beschikbaar maken voor onclick events
    window.__wtaEnterSelectMode = enterSelectMode;
    window.__wtaUnblock = unblockElement;
    window.__wtaClearAllBlocks = clearAll;
    
    function register() {
        if (typeof __WTA_MODULE_UI__ === 'undefined') { setTimeout(register, 100); return; }
        __WTA_MODULE_UI__.register({ ...MODULE, onAction: c => c.innerHTML = getPanelHtml() });
    }
    
    applyBlockedRules();
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', register) : register();
})();