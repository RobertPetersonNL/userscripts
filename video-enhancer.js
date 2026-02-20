(function() {
    'use strict';
    
    // Taaldetectie (Alleen NL en EN)
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Video Verbeteraar',
            noVideo: 'Geen video gevonden',
            speedTitle: 'Afspeelsnelheid',
            funcTitle: 'Functies',
            pip: 'Beeld-in-Beeld', // Picture in Picture
            loop: 'Herhalen',
            loopOn: 'Herhalen AAN',
            loopOff: 'Herhalen UIT',
            pipOn: 'PiP modus gestart',
            pipOff: 'PiP modus gestopt',
            pipError: 'PiP niet beschikbaar',
            speed: 'Snelheid',
            forward: 'Vooruit',
            backward: 'Terug',
            seconds: 'sec'
        },
        en: {
            name: 'Video Enhancer',
            noVideo: 'No video detected',
            speedTitle: 'Playback Speed',
            funcTitle: 'Functions',
            pip: 'Picture-in-Picture',
            loop: 'Loop',
            loopOn: 'Loop ON',
            loopOff: 'Loop OFF',
            pipOn: 'PiP mode started',
            pipOff: 'PiP mode stopped',
            pipError: 'PiP not available',
            speed: 'Speed',
            forward: 'Forward',
            backward: 'Rewind',
            seconds: 'sec'
        }
    };
    const T = I18N[LANG];

    const MODULE = { id: 'video-enhancer', name: T.name, icon: '🎬', color: '#8b5cf6' };
    let currentSpeed = 1.0;
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
    
    function getVideo() { return document.querySelector('video'); }
    
    function setSpeed(speed) {
        const v = getVideo();
        if (v) { 
            v.playbackRate = speed; 
            currentSpeed = speed; 
            // Update het paneel om de actieve knop te kleuren
            const panel = document.getElementById('wta-panel-content');
            if (panel) panel.innerHTML = getPanelHtml();
            __WTA_MODULE_UI__.toast(`${T.speed}: ${speed}x`); 
        }
    }
    
    function togglePiP() {
        const v = getVideo();
        if (!v) return;
        if (document.pictureInPictureElement) { 
            document.exitPictureInPicture(); 
            __WTA_MODULE_UI__.toast(T.pipOff); 
        } else { 
            v.requestPictureInPicture()
                .then(() => __WTA_MODULE_UI__.toast(T.pipOn))
                .catch(() => __WTA_MODULE_UI__.toast(T.pipError)); 
        }
    }

    function toggleLoop() {
        const v = getVideo(); 
        if (v) { 
            v.loop = !v.loop; 
            __WTA_MODULE_UI__.toast(v.loop ? T.loopOn : T.loopOff); 
        }
    }

    function skip(s) {
        const v = getVideo(); 
        if (v) { 
            v.currentTime += s; 
            const direction = s > 0 ? T.forward : T.backward;
            __WTA_MODULE_UI__.toast(`${direction} ${Math.abs(s)} ${T.seconds}`); 
        }
    }
    
    function getPanelHtml() {
        const v = getVideo();
        if (!v) return `<div style="text-align:center;padding:40px;color:#9ca3af">
            <div style="font-size:48px;margin-bottom:16px">🎬</div>
            <div>${T.noVideo}</div>
        </div>`;
        
        // Snelheid knoppen genereren
        const speedButtons = speeds.map(s => {
            const isActive = currentSpeed === s;
            const bg = isActive ? 'linear-gradient(135deg,#8b5cf6,#a78bfa)' : '#f3f4f6';
            const color = isActive ? 'white' : '#374151';
            return `<button onclick="__wtaSetSpeed(${s})" style="flex:1;min-width:60px;padding:12px 8px;border-radius:8px;border:none;font-size:14px;cursor:pointer;background:${bg};color:${color}">${s}x</button>`;
        }).join('');

        return `
        <div id="wta-panel-content">
            <div style="margin-bottom:20px">
                <div style="font-size:14px;color:#6b7280;margin-bottom:12px">${T.speedTitle}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">${speedButtons}</div>
            </div>
            
            <div style="margin-bottom:16px">
                <div style="font-size:14px;color:#6b7280;margin-bottom:12px">${T.funcTitle}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                    <button onclick="__wtaTogglePiP()" style="padding:14px;border-radius:12px;border:none;background:#f3f4f6;font-size:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
                        <span style="font-size:20px">📺</span>${T.pip}
                    </button>
                    <button onclick="__wtaToggleLoop()" style="padding:14px;border-radius:12px;border:none;background:#f3f4f6;font-size:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
                        <span style="font-size:20px">🔁</span>${T.loop}
                    </button>
                    <button onclick="__wtaSkip(-10)" style="padding:14px;border-radius:12px;border:none;background:#f3f4f6;font-size:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
                        <span style="font-size:20px">⏪</span>-10s
                    </button>
                    <button onclick="__wtaSkip(10)" style="padding:14px;border-radius:12px;border:none;background:#f3f4f6;font-size:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
                        <span style="font-size:20px">⏩</span>+10s
                    </button>
                </div>
            </div>
        </div>`;
    }
    
    // Globale functies koppelen
    window.__wtaSetSpeed = setSpeed;
    window.__wtaTogglePiP = togglePiP;
    window.__wtaToggleLoop = toggleLoop;
    window.__wtaSkip = skip;
    
    function register() {
        if (typeof __WTA_MODULE_UI__ === 'undefined') { setTimeout(register, 100); return; }
        __WTA_MODULE_UI__.register({ ...MODULE, onAction: c => c.innerHTML = getPanelHtml() });
    }
    
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', register) : register();
})();