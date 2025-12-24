// Global Constants
const PARAGRAPH_TOKEN = "___PB___";

/**
 * Parses raw text and returns an array of words with paragraph tokens.
 */
function parseText(rawText) {
    if (!rawText) return [];
    // Replace line breaks (double or single) with tokens
    const textWithTokens = rawText.replace(/\n\s*\n/g, ` ${PARAGRAPH_TOKEN} `) // Double enter
                                  .replace(/\n/g, ` ${PARAGRAPH_TOKEN} `);    // Single enter
    return textWithTokens.split(/\s+/).filter(w => w.length > 0);
}

/**
 * Renders a word in the container using pivot logic.
 */
function renderWord(rawWord, outputElement) {
    if (!outputElement) return;

    if (rawWord === PARAGRAPH_TOKEN) {
        outputElement.innerHTML = `<div class="part-left"></div><div class="pivot paragraph-symbol">¶</div><div class="part-right"></div>`;
        return;
    }

    // Regex to separate punctuation from the word core (supports international characters)
    const regex = /^([^\wáéíóúÁÉÍÓÚñÑüÜ]*)([\wáéíóúÁÉÍÓÚñÑüÜ\-\']+)([^\wáéíóúÁÉÍÓÚñÑüÜ]*)$/;
    const match = rawWord.match(regex);
    let prefix = "", core = rawWord, suffix = "";
    
    if (match) { 
        prefix = match[1]; 
        core = match[2]; 
        suffix = match[3]; 
    }

    const len = core.length;
    let left = "", piv = "", right = "";
    
    if (len < 2) { 
        piv = core; 
    } else if (len % 2 === 0) {
        const mid2 = len / 2; 
        left = core.slice(0, mid2 - 1); 
        piv = core.slice(mid2 - 1, mid2 + 1); 
        right = core.slice(mid2 + 1);
    } else {
        const mid = Math.floor(len / 2); 
        left = core.slice(0, mid); 
        piv = core[mid]; 
        right = core.slice(mid + 1);
    }
    
    outputElement.innerHTML = `<div class="part-left">${prefix}${left}</div><div class="pivot">${piv}</div><div class="part-right">${right}${suffix}</div>`;
}

/**
 * Shows a temporary toast message.
 */
let toastTimer;
function showToast(msg, toastElement) {
    if (!toastElement) return;
    toastElement.textContent = msg; 
    toastElement.classList.add('show'); 
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove('show'), 1000);
}
