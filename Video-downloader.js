// ==UserScript==
// @name         WTA Module: Video Downloader (Visual Progress v3.3)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Met live voortgangsbalk en bestandsgrootte weergave
// @match        *://*/*
// @grant        GM_download
// @grant        GM_info
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const pageWindow = unsafeWindow;

    function waitForCore() {
        if (typeof unsafeWindow.__WTA_MODULE_UI__ !== 'undefined') {
            registerModule();
        } else if (typeof window.__WTA_MODULE_UI__ !== 'undefined') {
             registerModule();
        } else {
            setTimeout(waitForCore, 200);
        }
    }

    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 'en';

    const I18N = {
        nl: {
            name: 'Video Downloader (Visual)',
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
            toastDlStart: 'Download initialiseren...',
            toastDlSuccess: 'Download voltooid!',
            toastDlFail: 'Download mislukt. Check console.',
            statusRec: '🔴 Opnemen...',
            manualTip: '⚠️ Klik rechts op de video -> Opslaan als',
            progress: 'Bezig: {0}% ({1})',
            progressUnknown: 'Bezig: {0} gedownload...',
            fallback: 'Power mislukt, openen in nieuw tabblad...'
        },
        en: {
            name: 'Video Downloader (Visual)',
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
            toastDlStart: 'Initializing download...',
            toastDlSuccess: 'Download complete!',
            toastDlFail: 'Download failed. Check console.',
            statusRec: '🔴 Recording...',
            manualTip: '⚠️ Right click video -> Save Video As',
            progress: 'Downloading: {0}% ({1})',
            progressUnknown: 'Downloading: {0} received...',
            fallback: 'Power failed, opening in new tab...'
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

    // Helper: Bytes naar leesbare tekst (MB/KB)
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function detectVideos() {
        videos = [];
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

    pageWindow.__wtaDownloadFile = function(index) {
        const v = videos[index];
        if (!v || !v.src) return;

        showToast(T.toastDlStart);
        
        // Reset en toon progress bar in UI
        const statusEl = document.getElementById(`wta-status-${index}`);
        const barEl = document.getElementById(`wta-bar-${index}`);
        const barContainer = document.getElementById(`wta-bar-container-${index}`);
        
        if (barContainer) barContainer.style.display = 'block';
        if (barEl) barEl.style.width = '0%';
        if (statusEl) statusEl.innerText = 'Start...';

        const fileName = `video_${Date.now()}.mp4`;

        if (typeof GM_download === 'function') {
            GM_download({
                url: v.src,
                name: fileName,
                saveAs: true, // Vraagt waar op te slaan (werkt vaak beter)
                headers: {
                    'Referer': window.location.href,
                    'User-Agent': navigator.userAgent
                },
                onload: () => {
                    if (statusEl) statusEl.innerText = '✅ Klaar!';
                    if (barEl) barEl.style.width = '100%';
                    if (barEl) barEl.style.backgroundColor = '#10b981';
                    showToast(T.toastDlSuccess);
                },
                onprogress: (progress) => {
                    // Update de balk!
                    if (progress.lengthComputable) {
                        const percent = Math.floor((progress.loaded / progress.total) * 100);
                        if (barEl) barEl.style.width = percent + '%';
                        if (statusEl) statusEl.innerText = `${percent}% (${formatBytes(progress.loaded)})`;
                    } else {
                        // Geen totaalgrootte bekend
                        if (barEl) barEl.style.width = '100%';
                        if (barEl) barEl.style.animation = 'pulse 1s infinite'; // Laat zien dat hij leeft
                        if (statusEl) statusEl.innerText = `${formatBytes(progress.loaded)}...`;
                    }
                },
                onerror: (err) => {
                    console.error('[PowerDL] Error:', err);
                    if (statusEl) statusEl.innerText = '❌ Fout!';
                    
                    let msg = T.toastDlFail;
                    if (err.error === 'not_permitted') msg = '⚠️ Geen rechten! Check Tampermonkey settings.';
                    showToast(msg);
                    
                    // Fallback na 2 seconden
                    setTimeout(() => fallbackDownload(v.src), 2000);
                }
            });
        } else {
            fallbackDownload(v.src);
        }
    };

    function fallbackDownload(src) {
        showToast(T.fallback);
        window.open(src, '_blank');
        alert(T.manualTip);
    }

    // --- OPNEEM FUNCTIES (Ongewijzigd) ---
    // ... (Zelfde logica als v3.2, ingekort voor leesbaarheid hier) ...
    
    pageWindow.__wtaStartRecord = function(index) {
        const v = videos[index];
        if (!v || !v.el) return;
        try {
            const stream = v.el.captureStream ? v.el.captureStream() : v.el.mozCaptureStream();
            if (!stream) { alert('Capture niet ondersteund'); return; }
            activeStream = stream; recordedChunks = [];
            let options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' };
            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = function() { saveRecording(); };
            mediaRecorder.start(1000); 
            currentRecordingIndex = index; recordingStartTime = Date.now();
            recordingInterval = setInterval(() => {
                const timerEl = document.getElementById(`wta-rec-timer-${index}`);
                if (timerEl) timerEl.innerText = T.statusRec + ' ' + formatTime(Date.now() - recordingStartTime);
            }, 1000);
            v.el.play(); updatePanel(); showToast(T.toastRecStart);
        } catch (e) { console.error(e); showToast(T.toastErr); }
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
        const a = document.createElement('a'); a.href = url; a.download = `opname_${Date.now()}.webm`;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        showToast(T.toastRecSave); updatePanel();
    }

    pageWindow.__wtaCopyLink = function(text) {
        navigator.clipboard.writeText(text).then(() => { showToast(T.toastLinkCopied); });
    };

    function showToast(msg) { if (pageWindow.__WTA_MODULE_UI__) pageWindow.__WTA_MODULE_UI__.toast(msg); }
    function updatePanel() { if (pageWindow.__WTA_MODULE_UI__) pageWindow.__WTA_MODULE_UI__.updatePanel(MODULE.id, getPanelHtml()); }

    // --- GUI (Met Progress Bar!) ---
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
                
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">`;

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

            // PROGRESS BAR SECTIE
            html += `
            <div id="wta-bar-container-${i}" style="display:none;margin-top:8px;background:#e5e7eb;height:6px;border-radius:3px;overflow:hidden">
                <div id="wta-bar-${i}" style="width:0%;height:100%;background:#6366f1;transition:width 0.3s"></div>
            </div>
            <div id="wta-status-${i}" style="font-size:10px;color:#6b7280;margin-top:4px;text-align:right;height:14px"></div>
            `;

            if (isRecording) {
                html += `<div id="wta-rec-timer-${i}" style="margin-top:8px;text-align:center;color:#ef4444;font-weight:bold;font-size:13px">${T.statusRec} 00:00</div>`;
            }
            html += `</div>`;
        });
        html += `<style>@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }</style>`;
        return html;
    }

    function registerModule() { 
        if (pageWindow.__WTA_MODULE_UI__) {
            pageWindow.__WTA_MODULE_UI__.register({ ...MODULE, onAction: (c) => { c.innerHTML = getPanelHtml(); } });
        }
    }
    
    waitForCore();
})();