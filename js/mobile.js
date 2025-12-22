// --- Estado ---
let words = [];
let currentIndex = 0;
let isPlaying = false;
let timerOut = null;
let isContextOpen = false;
let currentWpm = 300;
let lastTapTime = 0;
let tapCount = 0;
let tapTimeout = null;

// --- Elementos DOM ---
const inputText = document.getElementById('inputText');
const wordOutput = document.getElementById('wordOutput');
const btnToggle = document.getElementById('btnToggle');
const btnReset = document.getElementById('btnReset');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnContext = document.getElementById('btnContext');
const readerDisplay = document.getElementById('reader-display');
const toast = document.getElementById('toast');
const contextOverlay = document.getElementById('context-overlay');
const wpmDisplay = document.getElementById('wpmDisplay');
const fsWpmDisplay = document.getElementById('fsWpmDisplay');
const btnFsExit = document.getElementById('btnFsExit');
const btnFsContext = document.getElementById('btnFsContext');
const feedbackLeft = document.getElementById('feedbackLeft');
const feedbackRight = document.getElementById('feedbackRight');

// --- Init ---
window.addEventListener('DOMContentLoaded', () => { 
    renderWord("Listo", wordOutput); 
    updateDisplays();
});

function initData() {
    const rawText = inputText.value.trim();
    if (!rawText) { alert("Por favor ingresa un texto."); return false; }
    words = parseText(rawText);
    return true;
}

// --- Velocidad ---
window.changeSpeedGlobal = function(delta) {
    currentWpm += delta;
    if (currentWpm < 60) currentWpm = 60;
    if (currentWpm > 1200) currentWpm = 1200;
    updateDisplays();
    showToast(`${currentWpm} WPM`, toast);
}

function updateDisplays() {
    wpmDisplay.textContent = currentWpm;
    fsWpmDisplay.textContent = currentWpm;
}

// --- Motor RSVP ---
function startReader() {
    if (words.length === 0) { if (!initData()) return; }
    if (currentIndex >= words.length) currentIndex = 0;
    isPlaying = true; btnToggle.textContent = "Pausa";
    if (isContextOpen) toggleContextView();
    loopReader();
}

function loopReader() {
    if (!isPlaying) return;
    if (currentIndex >= words.length) { pauseReader(); currentIndex = 0; return; }

    const currentWord = words[currentIndex];
    renderWord(currentWord, wordOutput);

    const baseDelay = 60000 / currentWpm;
    let finalDelay = baseDelay;

    if (currentWord === PARAGRAPH_TOKEN) {
        finalDelay = baseDelay * 4.5;
    } else {
        const lastChar = currentWord.slice(-1);
        if (',;'.includes(lastChar)) finalDelay = baseDelay * 2.0; 
        else if ('.?!:”。'.includes(lastChar)) finalDelay = baseDelay * 3.2;
        else if (currentWord.length > 10) finalDelay = baseDelay * 1.2;
    }

    currentIndex++;
    timerOut = setTimeout(loopReader, finalDelay);
}

function pauseReader() {
    isPlaying = false; clearTimeout(timerOut); btnToggle.textContent = "Continuar";
}

function togglePlayPause() {
    if (isContextOpen) { toggleContextView(); startReader(); }
    else { isPlaying ? pauseReader() : startReader(); }
}

function resetReader() {
    pauseReader(); currentIndex = 0; words = []; 
    btnToggle.textContent = "Iniciar"; renderWord("Listo", wordOutput);
}

// --- Navegación y Feedback ---
function flashFeedback(side) {
    const el = side === 'left' ? feedbackLeft : feedbackRight;
    el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 300);
}

function skipWords(direction) {
    if (words.length === 0) return;
    const jumpSize = Math.max(5, Math.floor((currentWpm / 60) * 3));
    const delta = direction === 'left' ? -jumpSize : jumpSize;
    currentIndex = Math.max(0, Math.min(words.length - 1, currentIndex + delta));
    renderWord(words[currentIndex], wordOutput);
    showToast(direction === 'left' ? `⏪ -${jumpSize}` : `⏩ +${jumpSize}`, toast);
    flashFeedback(direction);
}

function skipParagraphPrev() {
    if (words.length === 0) return;
    let newIndex = Math.max(0, currentIndex - 2);
    while (newIndex > 0 && words[newIndex] !== PARAGRAPH_TOKEN) newIndex--;
    if (words[newIndex] === PARAGRAPH_TOKEN) newIndex++;
    currentIndex = newIndex;
    renderWord(words[currentIndex], wordOutput);
    showToast("⏮ Inicio Párrafo", toast);
    flashFeedback('left');
}

// --- Gestos Táctiles ---
readerDisplay.addEventListener('touchend', (e) => {
    // Ignorar toques en toolbar, botones o contexto
    if (e.target.closest('#mobile-fs-toolbar') || e.target.tagName === 'BUTTON' || e.target.closest('#context-overlay')) return;

    const now = Date.now();
    const rect = readerDisplay.getBoundingClientRect();
    const x = e.changedTouches[0].clientX - rect.left;
    const y = e.changedTouches[0].clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    let zone = 'center';
    if (x < width * 0.25) zone = 'left';
    else if (x > width * 0.75) zone = 'right';

    // Zona segura central
    if (zone === 'center') {
        const yRatio = y / height;
        if (yRatio < 0.25 || yRatio > 0.75) return; 
    }

    if (now - lastTapTime < 400) tapCount++;
    else tapCount = 1;
    lastTapTime = now;

    clearTimeout(tapTimeout);

    if (tapCount === 1) {
        tapTimeout = setTimeout(() => {
            if (zone === 'center') togglePlayPause();
            tapCount = 0;
        }, 400);
    } else if (tapCount === 2) {
        if (zone === 'left') skipWords('left');
        else if (zone === 'right') skipWords('right');
        else togglePlayPause();
    } else if (tapCount === 3) {
        if (zone === 'left') { skipParagraphPrev(); tapCount = 0; }
    }
    e.preventDefault();
});

// --- Fullscreen & Orientación ---
async function toggleFullscreen() {
    if (!document.fullscreenElement) {
        try {
            await readerDisplay.requestFullscreen();
            document.body.classList.add('fullscreen-active');
            if (screen.orientation && screen.orientation.lock) {
                try { await screen.orientation.lock('landscape'); } catch (e) { console.warn(e); }
            }
        } catch (err) { alert("Error: " + err.message); }
    } else {
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        document.exitFullscreen();
        document.body.classList.remove('fullscreen-active');
    }
}
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen-active');
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
});

btnFullscreen.addEventListener('click', toggleFullscreen);
btnFsExit.addEventListener('click', toggleFullscreen);

// --- Context Overlay ---
function toggleContextView() {
    if (words.length === 0 && !initData()) return;
    isContextOpen = !isContextOpen;
    
    if (isContextOpen) {
        pauseReader();
        contextOverlay.innerHTML = '<button class="close-ctx-btn">Cerrar X</button>';
        contextOverlay.querySelector('.close-ctx-btn').onclick = toggleContextView;
        
        words.forEach((word, index) => {
            if (word === PARAGRAPH_TOKEN) { 
                contextOverlay.appendChild(document.createElement('div')).className = 'ctx-break'; 
            } else {
                const span = document.createElement('span'); 
                span.textContent = word + " "; 
                span.className = 'ctx-word';
                if (index === currentIndex || (index > 0 && index - 1 === currentIndex)) {
                    span.classList.add('current'); 
                    setTimeout(() => span.scrollIntoView({block: "center"}), 50);
                }
                span.onclick = () => { 
                    currentIndex = index; renderWord(words[currentIndex], wordOutput); 
                    toggleContextView(); 
                };
                contextOverlay.appendChild(span);
            }
        });
        contextOverlay.classList.add('active');
    } else {
        contextOverlay.classList.remove('active');
    }
}

btnToggle.addEventListener('click', togglePlayPause);
btnReset.addEventListener('click', resetReader);
btnContext.addEventListener('click', toggleContextView);
btnFsContext.addEventListener('click', toggleContextView);
