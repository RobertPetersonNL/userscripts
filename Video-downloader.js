// ==UserScript==
// @name         WTA Module: Video Downloader (Power Fix)
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Met Sandbox-bridge (unsafeWindow) fix
// @match        *://*/*
// @grant        GM_download
// @grant        GM_info
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // BRUG NAAR DE PAGINA
    // Omdat we in een 'sandbox' zitten, moeten we functies aan 'unsafeWindow' hangen
    // zodat de knoppen op de pagina ze kunnen vinden.
    const pageWindow = unsafeWindow;

    function waitForCore() {
        // We checken zowel de sandbox als de pageWindow voor de zekerheid
        if (typeof unsafeWindow.__WTA_MODULE_UI__ !== 'undefined') {
            registerModule();
        } else if (typeof window.__WTA_MODULE_UI__ !== 'undefined') {
             // Soms lekt hij toch door
             registerModule();
        } else {
            setTimeout(waitForCore, 200);
        }
    }

    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Video Downloader (Power)',
            noVideos: 'Geen video\'s gevonden',
            detected: '{0} video(s) gevonden',
            video: 'Video',
            resUnknown: '?',
            typeBlob: 'Stream (Gebruik opname)',
            typeFile: 'Bestand (Direct Download)',
            recStart: '● Opnemen',
            recStop: '⏹️ Stop & Opslaan',
            download: '⬇️ Power Download',
            copyLink: 'Link',
            toastRecStart: 'Opname gestart...',
            toastRecSave: 'Video opgeslagen!',
            toastLinkCopied: 'Link gekopieerd',
            toastErr: 'Fout bij starten opname',
            toastDlStart: 'Download gestart...',
            toastDlSuccess: 'Download voltooid!',
            toastDlFail: 'GM Download mislukt (Zie Console F12)',
            statusRec: '🔴 Opnemen...',
            manualTip: '⚠️ Klik rechts op de video -> Opslaan als'
        },
        en: {
            name: 'Video Downloader (Power)',
            noVideos: 'No videos detected',
            detected: '{0} video(s) detected',
            video: 'Video',
            resUnknown: '?',
            typeBlob: 'Stream (Use Record)',
            typeFile: 'File (Direct Download)',
            recStart: '● Record',
            recStop: '⏹️ Stop & Save',
            download: '⬇️ Power Download',
            copyLink: 'Link',
            toastRecStart: 'Recording started...',
            toastRecSave: 'Video saved!',
            toastLinkCopied: 'Link copied',
            toastErr: 'Error starting record',
            toastDlStart: 'Download started...',
            toastDlSuccess: 'Download complete!',
            toastDlFail: 'GM Download failed (Check Console F12)',
            statusRec: '🔴 Recording...',
            manualTip: '⚠️ Right click video -> Save Video As'
        }
    };
    const T = I18N[LANG];

    const MODULE = { id: 'video-downloader', name: T.name, icon: '⬇️', color: '#667eea' };

    let videos = [];
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingInterval = null;
    let recordingStartTime = 0;
    let currentRecordingIndex = -1;
    let activeStream = null;

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function detectVideos() {
        videos = [];
        // We zoeken in de echte DOM
        document.querySelectorAll('video').forEach((v, i) => {
            let src = v.currentSrc || v.src || v.querySelector('source')?.src;
            const isBlob = src && (src.startsWith('blob:') || src.includes('.m3u8'));
            if (src || v) {
                videos.push({
                    id: i, el: v, src: src, isBlob: isBlob,
                    w: v.videoWidth, h: v.videoHeight
                });
            }
        });
        return videos;
    }

    // --- DOWNLOAD FUNCTIES ---

    // LET OP: We gebruiken nu 'pageWindow' ipv 'window'
    pageWindow.__wtaDownloadFile = function(index) {
        const v = videos[index];
        if (!v || !v.src) return;

        showToast(T.toastDlStart);
        console.log('[PowerDL] Start download voor:', v.src);

        const fileName = `video_${Date.now()}.mp4`;

        if (typeof GM_download === 'function') {
            GM_download({
                url: v.src,
                name: fileName,
                saveAs: true,
                headers: {
                    'Referer': window.location.href,
                    'User-Agent': navigator.userAgent
                },
                onload: () => {
                    console.log('[PowerDL] Succes!');
                    showToast(T.toastDlSuccess);
                },
                onerror: (err) => {
                    console.error('[PowerDL] FOUT:', err);
                    let msg = T.toastDlFail;
                    if (err.error === 'not_permitted') msg = 'Geen toestemming (Check Tampermonkey)';
                    showToast(msg);
                    setTimeout(() => fallbackDownload(v.src), 1500);
                }
            });
        } else {
            fallbackDownload(v.src);
        }
    };

    function fallbackDownload(src) {
        window.open(src, '_blank');
        alert(T.manualTip);
    }

    // --- OPNEEM FUNCTIES ---

    pageWindow.__wtaStartRecord = function(index) {
        const v = videos[index];
        if (!v || !v.el) return;

        try {
            const stream = v.el.captureStream ? v.el.captureStream() : v.el.mozCaptureStream();
            if (!stream) { alert('Capture niet ondersteund'); return; }

            activeStream = stream;
            recordedChunks = [];

            let options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' };

            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = function() { saveRecording(); };

            mediaRecorder.start(1000);
            currentRecordingIndex = index;
            recordingStartTime = Date.now();

            recordingInterval = setInterval(() => {
                const timerEl = document.getElementById(`wta-rec-timer-${index}`);
                if (timerEl) timerEl.innerText = T.statusRec + ' ' + formatTime(Date.now() - recordingStartTime);
            }, 1000);

            v.el.play();
            updatePanel();
            showToast(T.toastRecStart);

        } catch (e) {
            console.error(e);
            showToast(T.toastErr);
        }
    };

    pageWindow.__wtaStopRecord = function(index) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            if (activeStream) activeStream.getTracks().forEach(track => track.stop());
        }
    };

    function saveRecording() {
        clearInterval(recordingInterval);
        currentRecordingIndex = -1;
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opname_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        showToast(T.toastRecSave);
        updatePanel();
    }

    pageWindow.__wtaCopyLink = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(T.toastLinkCopied);
        });
    };

    // --- Helpers voor UI communicatie ---
    // Omdat we in sandbox zitten, moeten we via unsafeWindow praten met de Core UI
    function showToast(msg) {
        if (pageWindow.__WTA_MODULE_UI__) pageWindow.__WTA_MODULE_UI__.toast(msg);
    }

    function updatePanel() {
        if (pageWindow.__WTA_MODULE_UI__) pageWindow.__WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml());
    }

    // --- GUI ---
    function getPanelHtml() {
        detectVideos();
        if (videos.length === 0) return `<div style="text-align:center;padding:30px;color:#9ca3af"><div style="font-size:40px;margin-bottom:10px">🕵️</div><div>${T.noVideos}</div></div>`;

        let html = `<div style="font-size:12px;color:#6b7280;margin-bottom:10px;text-align:center">${T.detected.replace('{0}', videos.length)}</div>`;

        videos.forEach((v, i) => {
            const isRecording = (currentRecordingIndex === i);
            const res = (v.w && v.h) ? `${v.w}x${v.h}` : T.resUnknown;

            html += `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px">
                <div style="display:flex;gap:10px;margin-bottom:8px">
                    <div style="width:40px;height:40px;background:#e0e7ff;color:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px">🎬</div>
                    <div style="flex:1;overflow:hidden">
                        <div style="font-weight:600;color:#374151;font-size:14px">${T.video} ${i+1}</div>
                        <div style="font-size:11px;color:#9ca3af">${res} • ${v.isBlob ? T.typeBlob : T.typeFile}</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">`;

            if (v.isBlob) {
                if (isRecording) {
                    html += `<button onclick="__wtaStopRecord(${i})" style="flex:1;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:8px;border-radius:6px;cursor:pointer;font-weight:600;animation:pulse 1.5s infinite">${T.recStop}</button>`;
                } else {
                    html += `<button onclick="__wtaStartRecord(${i})" style="flex:1;background:#fff;border:1px solid #d1d5db;color:#374151;padding:8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><span style="color:#ef4444">●</span> ${T.recStart}</button>`;
                }
            } else {
                html += `<button onclick="__wtaDownloadFile(${i})" style="flex:1;background:#667eea;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer">${T.download}</button>`;
            }

            if (v.src) html += `<button onclick="__wtaCopyLink('${v.src}')" title="${T.copyLink}" style="width:36px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer">🔗</button>`;
            html += `</div>`;

            if (isRecording) {
                html += `<div id="wta-rec-timer-${i}" style="margin-top:8px;text-align:center;color:#ef4444;font-weight:bold;font-size:13px">${T.statusRec} 00:00</div>`;
            }
            html += `</div>`;
        });
        html += `<style>@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }</style>`;
        return html;
    }

    function registerModule() {
        // Registreer via pageWindow, want daar draait de Core
        if (pageWindow.__WTA_MODULE_UI__) {
            pageWindow.__WTA_MODULE_UI__.register({ ...MODULE, onAction: (c) => { c.innerHTML = getPanelHtml(); } });
        }
    }

    waitForCore();
})();