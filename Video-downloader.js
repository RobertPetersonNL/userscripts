(function() {
    'use strict';
    
    // Meertalige ondersteuning
    const navLang = (navigator.language || 'en').toLowerCase();
    const LANG = navLang.startsWith('nl') ? 'nl' : 
                 'en';

    const I18N = {
        nl: {
            name: 'Video Downloader',
            noVideos: 'Geen video\'s gevonden',
            detected: '{0} video(\'s) gevonden',
            videoLabel: 'Video',
            blobStream: 'Stream (Blob)',
            file: 'Bestand',
            download: 'Downloaden',
            blobError: 'Blob-streams kunnen niet direct gedownload worden',
            downloadStarted: 'Download gestart...',
            clickToDownload: 'Klik om te downloaden'
        },
        en: {
            name: 'Video Downloader',
            noVideos: 'No videos detected',
            detected: '{0} video(s) detected',
            videoLabel: 'Video',
            blobStream: 'Blob Stream',
            file: 'File',
            download: 'Download',
            blobError: 'Blob streams cannot be downloaded directly',
            downloadStarted: 'Download started...',
            clickToDownload: 'Click to download'
        },
        zh: {
            name: '视频下载',
            noVideos: '未检测到视频',
            detected: '检测到 {0} 个视频',
            videoLabel: '视频',
            blobStream: 'Blob流',
            file: '文件',
            download: '下载',
            blobError: 'Blob流暂不支持直接下载',
            downloadStarted: '开始下载...',
            clickToDownload: '点击下载'
        },
        ar: {
            name: 'تحميل الفيديو',
            noVideos: 'لم يتم العثور على مقاطع فيديو',
            detected: 'تم العثور على {0} مقاطع فيديو',
            videoLabel: 'فيديو',
            blobStream: 'تدفق (Blob)',
            file: 'ملف',
            download: 'تحميل',
            blobError: 'لا يمكن تحميل تدفقات Blob مباشرة',
            downloadStarted: 'جاري التحميل...',
            clickToDownload: 'انقر للتحميل'
        }
    };
    const T = I18N[LANG] || I18N.en;

    const MODULE = { id: 'video-downloader', name: T.name, icon: '⬇️', color: '#667eea' };
    let videos = [];
    
    // Video's op de pagina zoeken
    function detectVideos() {
        videos = [];
        document.querySelectorAll('video').forEach((v, i) => {
            // Probeer verschillende bronnen te vinden
            const src = v.currentSrc || v.src || v.querySelector('source')?.src;
            
            // Alleen toevoegen als er een source is
            if (src) {
                videos.push({ 
                    i, 
                    src, 
                    blob: src.startsWith('blob:'), 
                    w: v.videoWidth || 0, 
                    h: v.videoHeight || 0 
                });
            }
        });
        return videos;
    }
    
    // HTML Paneel genereren
    function getPanelHtml() {
        detectVideos();
        
        if (!videos.length) {
            return `<div style="text-align:center;padding:40px;color:#9ca3af">
                <div style="font-size:48px;margin-bottom:16px">🎬</div>
                <div>${T.noVideos}</div>
            </div>`;
        }
        
        const listHtml = videos.map((v, i) => {
            const typeLabel = v.blob ? T.blobStream : T.file;
            const resLabel = (v.w && v.h) ? `${v.w}x${v.h}` : 'Unknown res';
            
            return `<div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
                <div style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px">🎬</div>
                <div style="flex:1">
                    <div style="font-weight:600;color:#1f2937">${T.videoLabel} ${i + 1}</div>
                    <div style="font-size:12px;color:#9ca3af">${resLabel} · ${typeLabel}</div>
                </div>
                <button onclick="__wtaDownloadVideo(${i})" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer">
                    ${T.download}
                </button>
            </div>`;
        }).join('');

        return `<div style="color:#6b7280;font-size:13px;margin-bottom:16px">${T.detected.replace('{0}', videos.length)}</div>${listHtml}`;
    }
    
    // Download actie
    window.__wtaDownloadVideo = function(i) {
        const v = videos[i];
        if (!v) return;
        
        // Waarschuwing voor Blob streams (die kun je vaak niet zomaar downloaden)
        if (v.blob) { 
            __WTA_MODULE_UI__.toast(T.blobError); 
            return; 
        }
        
        const fileName = 'video_' + Date.now() + '.mp4';

        // 1. Probeer NativeBridge (voor de specifieke app omgeving)
        if (typeof NativeBridge !== 'undefined' && NativeBridge.downloadVideo) {
            NativeBridge.downloadVideo(v.src, fileName);
            __WTA_MODULE_UI__.toast(T.downloadStarted);
            __WTA_MODULE_UI__.closePanel();
        } 
        // 2. Fallback: Probeer standaard browser download (als NativeBridge er niet is)
        else {
            try {
                const a = document.createElement('a');
                a.href = v.src;
                a.download = fileName;
                a.target = '_blank'; // Voor de zekerheid
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                __WTA_MODULE_UI__.toast(T.downloadStarted);
            } catch (e) {
                console.error(e);
                window.open(v.src, '_blank'); // Laatste redmiddel: open in nieuw tabblad
            }
        }
    };
    
    function register() {
        if (typeof __WTA_MODULE_UI__ === 'undefined') { setTimeout(register, 100); return; }
        __WTA_MODULE_UI__.register({ ...MODULE, onAction: c => c.innerHTML = getPanelHtml() });
    }
    
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', register) : register();
})();