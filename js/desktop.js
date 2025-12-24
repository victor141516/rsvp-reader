// --- State ---
let words = [];
let currentIndex = 0;
let isPlaying = false;
let timerOut = null;
let isContextOpen = false;

// --- DOM Elements ---
const inputText = document.getElementById('inputText');
const wordOutput = document.getElementById('wordOutput');
const btnToggle = document.getElementById('btnToggle');
const btnReset = document.getElementById('btnReset');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnContext = document.getElementById('btnContext');
const readerDisplay = document.getElementById('reader-display');
const wpmInput = document.getElementById('wpm');
const toast = document.getElementById('toast');
const contextOverlay = document.getElementById('context-overlay');

// --- Init ---
window.addEventListener('DOMContentLoaded', () => { renderWord("Ready", wordOutput); });

function initData() {
    const rawText = inputText.value.trim();
    if (!rawText) { alert("Please enter some text."); return false; }
    words = parseText(rawText);
    return true;
}

// --- RSVP Engine ---
function startReader() {
    if (words.length === 0) { if (!initData()) return; }
    if (currentIndex >= words.length) currentIndex = 0;
    isPlaying = true;
    btnToggle.textContent = "Pause";
    if (isContextOpen) toggleContextView();
    loopReader();
}

function loopReader() {
    if (!isPlaying) return;
    if (currentIndex >= words.length) { pauseReader(); currentIndex = 0; return; }

    const currentWord = words[currentIndex];
    renderWord(currentWord, wordOutput);

    const wpm = parseInt(wpmInput.value) || 300;
    const baseDelay = 60000 / wpm;
    let finalDelay = baseDelay;

    if (currentWord === PARAGRAPH_TOKEN) {
        finalDelay = baseDelay * 4.0;
    } else {
        const lastChar = currentWord.slice(-1);
        if (',;'.includes(lastChar)) finalDelay = baseDelay * 2.0; 
        else if ('.?!:”。'.includes(lastChar)) finalDelay = baseDelay * 3.0;
    }

    currentIndex++;
    timerOut = setTimeout(loopReader, finalDelay);
}

function pauseReader() {
    isPlaying = false; clearTimeout(timerOut); btnToggle.textContent = "Continue";
}

function togglePlayPause() {
    if (isContextOpen) { toggleContextView(); startReader(); }
    else { isPlaying ? pauseReader() : startReader(); }
}

function resetReader() {
    pauseReader(); currentIndex = 0; words = []; 
    btnToggle.textContent = "Start"; renderWord("Ready", wordOutput);
}

// --- UI Functions ---
function changeSpeed(delta) {
    let current = parseInt(wpmInput.value) || 300;
    let newVal = current + delta;
    if (newVal < 60) newVal = 60; 
    wpmInput.value = newVal; 
    showToast(`Speed: ${newVal} WPM`, toast);
}

function skipWords(direction) {
    if (words.length === 0) return;
    const wpm = parseInt(wpmInput.value) || 300;
    const jumpSize = Math.max(5, Math.floor((wpm / 60) * 2)); 
    const delta = direction === 'left' ? -jumpSize : jumpSize;
    let newIndex = currentIndex + delta;
    if (newIndex < 0) newIndex = 0; 
    if (newIndex >= words.length) newIndex = words.length - 1;
    currentIndex = newIndex; 
    renderWord(words[currentIndex], wordOutput); 
    showToast(direction === 'left' ? `⏪ ${jumpSize}` : `⏩ ${jumpSize}`, toast);
}

function skipParagraph(direction) {
    if (words.length === 0) return;
    let newIndex = currentIndex;
    if (direction === 'prev') {
        newIndex = Math.max(0, newIndex - 2); 
        while (newIndex > 0 && words[newIndex] !== PARAGRAPH_TOKEN) newIndex--;
        if (words[newIndex] === PARAGRAPH_TOKEN) newIndex++;
    } else {
        while (newIndex < words.length && words[newIndex] !== PARAGRAPH_TOKEN) newIndex++;
        if (newIndex < words.length) newIndex++;
    }
    if (newIndex >= words.length) newIndex = words.length - 1; 
    if (newIndex < 0) newIndex = 0;
    currentIndex = newIndex; 
    renderWord(words[currentIndex], wordOutput); 
    showToast(direction === 'prev' ? "Prev Paragraph Start" : "Next Paragraph Start", toast);
}

function toggleContextView() {
    if (words.length === 0) { if (!initData()) return; }
    isContextOpen = !isContextOpen;
    if (isContextOpen) {
        pauseReader(); contextOverlay.innerHTML = '';
        words.forEach((word, index) => {
            if (word === PARAGRAPH_TOKEN) {
                const br = document.createElement('div'); br.className = 'ctx-break'; 
                contextOverlay.appendChild(br);
            } else {
                const span = document.createElement('span'); 
                span.textContent = word + " "; span.className = 'ctx-word';
                if (index === currentIndex || (index === currentIndex - 1 && currentIndex > 0)) {
                    span.classList.add('current'); 
                    setTimeout(() => span.scrollIntoView({block: "center", behavior: "smooth"}), 50);
                }
                span.onclick = () => { 
                    currentIndex = index; renderWord(words[currentIndex], wordOutput); 
                    showToast("Jump to position", toast); toggleContextView(); 
                };
                contextOverlay.appendChild(span);
            }
        });
        contextOverlay.classList.add('active');
    } else { contextOverlay.classList.remove('active'); }
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => {
    if (document.activeElement === inputText || document.activeElement === wpmInput) return;
    switch(e.code) {
        case 'Space': e.preventDefault(); togglePlayPause(); break;
        case 'ArrowUp': e.preventDefault(); changeSpeed(25); break;
        case 'ArrowDown': e.preventDefault(); changeSpeed(-25); break;
        case 'ArrowLeft': e.preventDefault(); e.ctrlKey ? skipParagraph('prev') : skipWords('left'); break;
        case 'ArrowRight': e.preventDefault(); e.ctrlKey ? skipParagraph('next') : skipWords('right'); break;
        case 'KeyV': e.preventDefault(); toggleContextView(); break;
    }
});

btnToggle.addEventListener('click', togglePlayPause);
btnReset.addEventListener('click', resetReader);
btnContext.addEventListener('click', toggleContextView);
btnFullscreen.addEventListener('click', () => { 
    if (!document.fullscreenElement) { readerDisplay.requestFullscreen().catch(err => alert(err)); } 
    else { document.exitFullscreen(); } 
});
readerDisplay.addEventListener('click', (e) => { if (e.target.closest('#context-overlay')) return; togglePlayPause(); });
