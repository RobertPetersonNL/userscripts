(function() {
    'use strict';
    
    // Taaldetectie (Alleen NL en EN)
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Content Verbeteraar',
            enableCopy: 'Kopieerbeperking opheffen',
            copyText: 'Paginatekst kopiëren',
            copyHtml: 'Pagina HTML kopiëren',
            scrollTop: 'Naar boven',
            scrollBottom: 'Naar beneden',
            toastUnlocked: 'Kopieerbeperkingen opgeheven',
            toastTextCopied: 'Paginatekst gekopieerd',
            toastHtmlCopied: 'Pagina HTML gekopieerd',
            toastTop: 'Bovenaan pagina',
            toastBottom: 'Onderaan pagina',
            toastError: 'Kopiëren mislukt (geen permissie?)'
        },
        en: {
            name: 'Content Enhancer',
            enableCopy: 'Remove Copy Limits',
            copyText: 'Copy Page Text',
            copyHtml: 'Copy Page HTML',
            scrollTop: 'Scroll to Top',
            scrollBottom: 'Scroll to Bottom',
            toastUnlocked: 'Copy restrictions removed',
            toastTextCopied: 'Page text copied',
            toastHtmlCopied: 'Page HTML copied',
            toastTop: 'Scrolled to top',
            toastBottom: 'Scrolled to bottom',
            toastError: 'Copy failed (permission denied?)'
        }
    };
    const T = I18N[LANG];

    const MODULE = { id: 'content-enhancer', name: T.name, icon: '✨', color: '#f59e0b' };
    
    // Functie 1: Kopieerbeveiliging opheffen
    function enableCopy() {
        // 1. CSS Forceer regels
        const cssId = 'wta-enable-copy-style';
        if (!document.getElementById(cssId)) {
            const style = document.createElement('style');
            style.id = cssId;
            style.textContent = '*{user-select:auto!important;-webkit-user-select:auto!important;pointer-events:auto!important}';
            document.head.appendChild(style);
        }

        // 2. Events resetten (capture phase om sites voor te zijn)
        const events = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'keydown', 'keyup', 'mousedown', 'mouseup'];
        events.forEach(e => {
            document.addEventListener(e, ev => {
                ev.stopPropagation(); // Stop bubbling naar site scripts
            }, true);
        });

        // 3. Simpele inline styles op body resetten
        document.body.style.userSelect = 'auto';
        document.body.style.webkitUserSelect = 'auto';
        
        __WTA_MODULE_UI__.toast(T.toastUnlocked);
    }
    
    // Functie 2: Tekst kopiëren
    function copyPageText() {
        const text = document.body.innerText;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => __WTA_MODULE_UI__.toast(T.toastTextCopied))
                .catch(err => __WTA_MODULE_UI__.toast(T.toastError));
        } else {
            // Fallback voor oudere contexten
            alert(T.toastError);
        }
    }
    
    // Functie 3: HTML kopiëren
    function copyPageHtml() {
        const html = document.documentElement.outerHTML;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(html)
                .then(() => __WTA_MODULE_UI__.toast(T.toastHtmlCopied))
                .catch(err => __WTA_MODULE_UI__.toast(T.toastError));
        }
    }
    
    // Scroll functies
    function scrollToTop() { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        __WTA_MODULE_UI__.toast(T.toastTop); 
    }
    
    function scrollToBottom() { 
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); 
        __WTA_MODULE_UI__.toast(T.toastBottom); 
    }
    
    // HTML Paneel bouwen
    function getPanelHtml() {
        // Configuratie van de knoppen
        const tools = [
            { icon: '🔓', name: T.enableCopy, fn: '__wtaEnableCopy()' }, // Icon veranderd naar slotje
            { icon: '📄', name: T.copyText, fn: '__wtaCopyText()' },
            { icon: '📝', name: T.copyHtml, fn: '__wtaCopyHtml()' }, // Iets ander icon voor HTML
            { icon: '⬆️', name: T.scrollTop, fn: '__wtaScrollTop()' },
            { icon: '⬇️', name: T.scrollBottom, fn: '__wtaScrollBottom()' }
        ];
        
        // Grid layout genereren (2 kolommen)
        const buttonsHtml = tools.map(t => 
            `<button onclick="${t.fn}" style="padding:16px 8px;border-radius:12px;border:none;background:#f9fafb;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;transition:background .2s">
                <span style="font-size:24px">${t.icon}</span>
                <span style="font-size:12px;color:#374151;text-align:center;line-height:1.2">${t.name}</span>
            </button>`
        ).join('');

        return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${buttonsHtml}</div>`;
    }
    
    // Globale functies exporteren
    window.__wtaEnableCopy = enableCopy;
    window.__wtaCopyText = copyPageText;
    window.__wtaCopyHtml = copyPageHtml;
    window.__wtaScrollTop = scrollToTop;
    window.__wtaScrollBottom = scrollToBottom;
    
    function register() {
        if (typeof __WTA_MODULE_UI__ === 'undefined') { setTimeout(register, 100); return; }
        __WTA_MODULE_UI__.register({ ...MODULE, onAction: c => c.innerHTML = getPanelHtml() });
    }
    
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', register) : register();
})();