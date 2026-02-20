// ==UserScript==
// @name         WTA Core UI Framework
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  De basis interface voor alle WTA tools (Video downloader, Dark mode, etc.)
// @author       Jij
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Voorkom dubbel laden
    if (window.__WTA_MODULE_UI__) return;

    // --- Instellingen & Talen ---
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            title: 'WTA Tools',
            close: 'Sluiten',
            back: 'Terug',
            version: 'v1.0'
        },
        en: {
            title: 'WTA Tools',
            close: 'Close',
            back: 'Back',
            version: 'v1.0'
        }
    };
    const T = I18N[LANG];

    // --- State ---
    const modules = []; // Hier komen alle tools in
    let activeModuleId = null;
    let isOpen = false;

    // --- CSS Stijlen ---
    const style = document.createElement('style');
    style.innerHTML = `
        #wta-fab {
            position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 50%; box-shadow: 0 4px 12px rgba(99,102,241,0.4);
            cursor: pointer; z-index: 2147483646; display: flex; align-items: center; justify-content: center;
            font-size: 24px; color: white; transition: transform 0.2s, opacity 0.3s;
            user-select: none; -webkit-user-select: none;
        }
        #wta-fab:hover { transform: scale(1.1); }
        #wta-fab.hidden { opacity: 0; pointer-events: none; }
        
        #wta-panel {
            position: fixed; bottom: 80px; right: 20px; width: 320px; max-height: 500px;
            background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
            z-index: 2147483647; display: flex; flex-direction: column;
            opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #wta-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        
        .wta-header {
            padding: 16px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between;
        }
        .wta-title { font-weight: 700; color: #111827; font-size: 16px; }
        .wta-close { cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 50%; transition: background 0.2s; }
        .wta-close:hover { background: #f3f4f6; color: #4b5563; }
        
        .wta-content { padding: 16px; overflow-y: auto; max-height: 400px; }
        
        /* Grid voor de iconen */
        .wta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .wta-item {
            display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
            padding: 8px 4px; border-radius: 12px; transition: background 0.2s;
        }
        .wta-item:hover { background: #f9fafb; }
        .wta-icon-box {
            width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
            font-size: 22px; color: white; transition: transform 0.2s;
        }
        .wta-item:hover .wta-icon-box { transform: scale(1.1); }
        .wta-name { font-size: 11px; color: #4b5563; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        /* Toasts (Meldingen) */
        .wta-toast {
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 30px;
            font-size: 14px; z-index: 2147483647; animation: wta-fade-in 0.3s, wta-fade-out 0.3s 2.7s forwards;
            backdrop-filter: blur(4px); box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        @keyframes wta-fade-in { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes wta-fade-out { to { opacity: 0; pointer-events: none; } }
    `;
    document.head.appendChild(style);

    // --- UI Opbouw ---
    // 1. De knop (FAB)
    const fab = document.createElement('div');
    fab.id = 'wta-fab';
    fab.innerHTML = '⚡️';
    fab.onclick = togglePanel;
    document.body.appendChild(fab);

    // 2. Het Paneel
    const panel = document.createElement('div');
    panel.id = 'wta-panel';
    panel.innerHTML = `
        <div class="wta-header">
            <div class="wta-title" id="wta-header-title">${T.title}</div>
            <div class="wta-close" onclick="__WTA_MODULE_UI__.closePanel()">✕</div>
        </div>
        <div class="wta-content" id="wta-content-area">
            </div>
    `;
    document.body.appendChild(panel);

    // --- Functies ---

    function togglePanel() {
        isOpen = !isOpen;
        panel.classList.toggle('open', isOpen);
        if (isOpen && !activeModuleId) {
            renderGrid();
        }
    }

    // Laat het hoofdmenu (de grid met icoontjes) zien
    function renderGrid() {
        activeModuleId = null;
        document.getElementById('wta-header-title').innerText = T.title;
        const container = document.getElementById('wta-content-area');
        
        if (modules.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px">Nog geen modules geladen...</div>';
            return;
        }

        let html = '<div class="wta-grid">';
        modules.forEach(m => {
            html += `
                <div class="wta-item" onclick="__WTA_MODULE_UI__.openModule('${m.id}')">
                    <div class="wta-icon-box" style="background:${m.color || '#666'}">${m.icon || '📦'}</div>
                    <div class="wta-name">${m.name}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
        // Terugknop verbergen in header (door te resetten)
        const headerTitle = document.getElementById('wta-header-title');
        headerTitle.innerHTML = T.title;
        headerTitle.style.cursor = 'default';
        headerTitle.onclick = null;
    }

    // Open een specifieke module
    function openModule(id) {
        const mod = modules.find(m => m.id === id);
        if (!mod) return;
        
        activeModuleId = id;
        const container = document.getElementById('wta-content-area');
        container.innerHTML = ''; // Leegmaken
        
        // Header aanpassen met terugknop
        const headerTitle = document.getElementById('wta-header-title');
        headerTitle.innerHTML = `<span style="margin-right:8px;cursor:pointer">◀</span> ${mod.name}`;
        headerTitle.style.cursor = 'pointer';
        headerTitle.onclick = renderGrid; // Klik op titel gaat terug

        // Module content laden
        if (mod.onAction) {
            mod.onAction(container);
        } else {
            container.innerHTML = 'Module geladen';
        }
    }

    // --- Public API (Dit gebruiken de andere scripts) ---
    window.__WTA_MODULE_UI__ = {
        // Registreer een nieuwe tool
        register: function(moduleConfig) {
            // Check of hij al bestaat, zo ja, update hem
            const existingIdx = modules.findIndex(m => m.id === moduleConfig.id);
            if (existingIdx >= 0) {
                modules[existingIdx] = moduleConfig;
            } else {
                modules.push(moduleConfig);
            }
            
            // Als het paneel open staat op de grid, ververs het dan
            if (isOpen && !activeModuleId) {
                renderGrid();
            }
            console.log(`[WTA Core] Module geregistreerd: ${moduleConfig.name}`);
        },

        // Toon een melding
        toast: function(msg) {
            const t = document.createElement('div');
            t.className = 'wta-toast';
            t.innerText = msg;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 3000);
        },

        // Update de inhoud van een module terwijl deze open staat (bv. Dark mode knop veranderen)
        updatePanel: function(moduleId, htmlContent) {
            if (activeModuleId === moduleId && isOpen) {
                const container = document.getElementById('wta-content-area');
                if (container) container.innerHTML = htmlContent;
            }
        },

        // Open specifiek
        openModule: openModule,

        // Sluit alles
        closePanel: function() {
            isOpen = false;
            panel.classList.remove('open');
        }
    };

    console.log('[WTA Core] Framework geladen en klaar!');

})();