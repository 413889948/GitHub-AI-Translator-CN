// content.js
console.log("GitHub Translator: Script Loaded at " + new Date().toISOString());

// Flag to indicate we are alive (used by logic, not for preventing load)
window.ghTranslatorLoaded = true;

// --- Message Listener (Unconditional) ---
// Remove any existing listeners if possible? No, we can't.
// But in a fresh injection (executeScript), this is a fresh listener.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Filter out messages not for us if needed, but we own this channel
  if (request.action === "ping") {
      sendResponse({ status: "alive" });
      return false; // Sync response
  }

  if (request.action === "translateDocs") {
    console.log("GitHub Translator: Starting translation...", request);
    if (request.config) currentConfig = request.config;
    if (request.mode) currentMode = request.mode;
    
    startDocTranslation().catch(err => console.error("Start Error:", err));
    sendResponse({ status: "指令已接收" });
  }
  
  // Important: If we return true, we promise to sendResponse asynchronously.
  // But here we responded synchronously above. So return false/undefined unless needed.
  return false; 
});

// Configuration state
let currentConfig = {
    engine: 'google',
    apiKey: ''
};
let currentMode = 'stream'; 

// Global Control State
let isTranslating = false;
let isPaused = false;
let isShowingOriginal = false;
let processedElements = []; 

// UI State
let consoleElement = null;
let minimizedElement = null; // New: Minimized Handle
let logContainer = null;
let btnPause = null;
let btnToggle = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- UI: Minimized Handle ---
function createMinimizedHandle() {
    if (minimizedElement) return;

    minimizedElement = document.createElement('div');
    minimizedElement.id = 'gh-translator-minimized';
    minimizedElement.innerText = "AI 译";
    minimizedElement.title = "点击恢复翻译控制台";
    minimizedElement.style.cssText = `
        position: fixed; top: 100px; right: 0; width: 40px; height: 40px;
        background: #2da44e; color: white; border-top-left-radius: 6px; border-bottom-left-radius: 6px;
        box-shadow: -2px 2px 5px rgba(0,0,0,0.2); z-index: 2147483647;
        display: none; align-items: center; justify-content: center;
        font-weight: bold; cursor: pointer; font-size: 12px; user-select: none;
        transition: width 0.2s;
    `;
    
    minimizedElement.addEventListener('mouseenter', () => {
        minimizedElement.style.width = "60px";
        minimizedElement.innerText = "恢复";
    });
    minimizedElement.addEventListener('mouseleave', () => {
        minimizedElement.style.width = "40px";
        minimizedElement.innerText = "AI 译";
    });

    minimizedElement.addEventListener('click', () => {
        minimizedElement.style.display = 'none';
        if (consoleElement) consoleElement.style.display = 'flex';
    });

    document.body.appendChild(minimizedElement);
}

// --- UI: Floating Console ---
function createConsole() {
    if (consoleElement) {
        consoleElement.style.display = 'flex'; // Ensure visible
        if (minimizedElement) minimizedElement.style.display = 'none'; // Hide minimized if showing full
        return;
    }

    createMinimizedHandle(); // Ensure handle exists

    consoleElement = document.createElement('div');
    consoleElement.id = 'gh-translator-console';
    consoleElement.style.cssText = `
        position: fixed; top: 80px; right: 20px; width: 380px; height: 600px;
        background: #ffffff; border: 1px solid #d0d7de; border-radius: 8px;
        box-shadow: 0 8px 24px rgba(140,149,159,0.2); z-index: 2147483647;
        display: flex; flex-direction: column;
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
        font-size: 13px; transition: transform 0.3s ease;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 10px 15px; background: #f6f8fa; border-bottom: 1px solid #d0d7de;
        border-top-left-radius: 8px; border-top-right-radius: 8px; font-weight: 600;
        display: flex; flex-direction: column; gap: 8px; color: #24292f;
    `;
    
    const titleRow = document.createElement('div');
    titleRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
    titleRow.innerHTML = `<span>AI 深度翻译</span><button id="gh-console-close" style="border:none;background:none;cursor:pointer;color:#57606a;font-size:16px;">✕</button>`;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = "display:flex;gap:8px;";

    btnPause = createButton("⏸ 中断", "#cf222e", "white");
    btnToggle = createButton("👁 对照", "#0969da", "white");

    btnPause.addEventListener('click', togglePause);
    btnToggle.addEventListener('click', toggleView);

    btnRow.appendChild(btnPause);
    btnRow.appendChild(btnToggle);
    header.appendChild(titleRow);
    header.appendChild(btnRow);

    logContainer = document.createElement('div');
    logContainer.style.cssText = `flex: 1; overflow-y: auto; padding: 15px; background: #fff; scroll-behavior: smooth;`;

    const footer = document.createElement('div');
    footer.id = 'gh-console-status';
    footer.style.cssText = `
        padding: 10px 15px; border-top: 1px solid #d0d7de; color: #57606a;
        font-size: 12px; background: #f6f8fa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;
    `;
    footer.innerHTML = `<span id="status-text">准备就绪</span>`;

    consoleElement.appendChild(header);
    consoleElement.appendChild(logContainer);
    consoleElement.appendChild(footer);
    document.body.appendChild(consoleElement);

    document.getElementById('gh-console-close').addEventListener('click', () => {
        consoleElement.style.display = 'none';
        if (minimizedElement) minimizedElement.style.display = 'flex'; 
    });
}

function createButton(text, bgColor, textColor) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.style.cssText = `
        flex: 1; padding: 5px 10px; border: 1px solid rgba(27,31,36,0.15);
        border-radius: 6px; background-color: ${bgColor}; color: ${textColor};
        font-size: 12px; font-weight: 500; cursor: pointer; transition: opacity 0.2s;
    `;
    return btn;
}

function showConsole() {
    if (!consoleElement) createConsole();
    consoleElement.style.display = 'flex';
}

function updateStatus(text) {
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.innerText = text;
}

function logToConsole(type, text) {
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.style.marginBottom = "12px";
    
    const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    const displayValues = safeText.length > 800 ? safeText.substring(0, 800) + "..." : safeText;

    let color = "#24292f";
    let bg = "#f6f8fa";
    let label = "INFO";
    let labelColor = "#57606a";

    if (type === 'USER') { label = "原文预览"; labelColor = "#0969da"; }
    else if (type === 'AI') { label = "译文结果"; labelColor = "#2da44e"; bg = "#dafbe1"; }
    else if (type === 'ERROR') { label = "错误"; labelColor = "#cf222e"; bg = "#ffebe9"; color="#cf222e"; }

    if (type === 'INFO') {
        entry.innerHTML = `<div style="color:#57606a;font-style:italic;font-size:12px;text-align:center;">${safeText}</div>`;
    } else {
        entry.innerHTML = `
            <div style="font-weight:600;color:${labelColor};margin-bottom:4px;font-size:12px;">${label}</div>
            <div style="background:${bg};padding:8px;border-radius:6px;color:${color};line-height:1.4;font-family:monospace;font-size:11px;word-break:break-all;white-space:pre-wrap;">${escapeHtml(displayValues)}</div>
        `;
    }
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// --- Control Logic ---
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        btnPause.innerText = "▶ 继续";
        btnPause.style.backgroundColor = "#2da44e";
        updateStatus("任务已暂停");
    } else {
        btnPause.innerText = "⏸ 中断";
        btnPause.style.backgroundColor = "#cf222e";
        updateStatus("任务继续中...");
    }
}

function toggleView() {
    isShowingOriginal = !isShowingOriginal;
    if (isShowingOriginal) {
        btnToggle.innerText = "📖 译文";
        btnToggle.style.backgroundColor = "#24292f";
        updateStatus("原文模式");
        processedElements.forEach(el => {
            if (el._originalHTML) {
                el.innerHTML = el._originalHTML;
                el.style.backgroundColor = ''; 
            }
        });
    } else {
        btnToggle.innerText = "👁 原文";
        btnToggle.style.backgroundColor = "#0969da";
        updateStatus("译文模式");
        processedElements.forEach(el => {
            if (el._translatedHTML) {
                el.innerHTML = el._translatedHTML;
                el.style.backgroundColor = ''; 
            }
        });
    }
}

// --- Translation Logic ---
async function translateWithMiniMax(textHTML, customSystemPrompt) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "callMiniMax",
            text: textHTML,
            apiKey: currentConfig.apiKey,
            customSystemPrompt: customSystemPrompt
        }, (response) => {
            if (chrome.runtime.lastError) {
                logToConsole('ERROR', "通信错误: " + chrome.runtime.lastError.message);
                resolve(null);
                return;
            }
            if (response && response.success) {
                resolve(response.data);
            } else {
                const err = response ? response.error : "Unknown Error";
                logToConsole('ERROR', err);
                resolve(null);
            }
        });
    });
}

async function translateWithGoogle(textHTML) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "callGoogle",
            text: textHTML
        }, (response) => {
            if (chrome.runtime.lastError) {
                logToConsole('ERROR', "Google 翻译通信错误: " + chrome.runtime.lastError.message);
                resolve(null);
                return;
            }
            if (response && response.success) {
                resolve(response.data);
            } else {
                const err = response ? response.error : "Unknown Error";
                logToConsole('ERROR', "Google 翻译错误: " + err);
                resolve(null);
            }
        });
    });
}

async function translateHTML(html, customSystemPrompt) {
    if (currentConfig.engine === 'minimax') {
        return await translateWithMiniMax(html, customSystemPrompt);
    } else if (currentConfig.engine === 'google') {
        return await translateWithGoogle(html);
    }
    return html;
}

async function processBlock(element) {
    if (!element._originalHTML) {
        element._originalHTML = element.innerHTML;
        processedElements.push(element);
    }

    element.style.transition = "background-color 0.3s";
    element.style.backgroundColor = "#fff8c5"; // Yellow

    const translatedHTML = await translateHTML(element._originalHTML);
    
    if (translatedHTML && translatedHTML !== element._originalHTML) {
        element._translatedHTML = translatedHTML;
        if (!isShowingOriginal) {
            element.innerHTML = translatedHTML;
            element.style.backgroundColor = ""; // Remove background
        }
    } else {
        element.style.backgroundColor = "#ffebe9"; // Red
        if (!translatedHTML) console.warn("Translation failed for", element);
    }
}

// --- Modes ---
async function runStreamMode(elements) {
    for (let i = 0; i < elements.length; i++) {
        while (isPaused) await sleep(500);
        await processBlock(elements[i]);
        updateStatus(`[精翻] 进度: ${i + 1} / ${elements.length}`);
        
        if (elements[i]._translatedHTML) {
            logToConsole('AI', elements[i]._translatedHTML);
        } else {
            logToConsole('ERROR', "翻译失败");
        }
        
        await sleep(currentConfig.engine === 'minimax' ? 1000 : 300);
    }
}

async function runBatchMode(elements) {
    const BATCH_SIZE = 5; 
    for (let i = 0; i < elements.length; i += BATCH_SIZE) {
        while (isPaused) await sleep(500);
        const chunk = elements.slice(i, i + BATCH_SIZE);
        updateStatus(`[快翻] 进度: ${i + 1}-${Math.min(i + BATCH_SIZE, elements.length)} / ${elements.length}`);
        
        await Promise.all(chunk.map(el => processBlock(el)));
        
        logToConsole('AI', `完成 ${chunk.length} 个段落`);
        await sleep(1000); 
    }
}

async function runViolenceMode(elements) {
    const MAX_CHARS = 2000; 
    const MAX_ITEMS_PER_CHUNK = 10; 
    const SEPARATOR = "|||"; 

    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const el of elements) {
        if (!el._originalHTML) {
            el._originalHTML = el.innerHTML;
            processedElements.push(el);
        }
        const html = el.innerHTML;
        if ((currentLength + html.length > MAX_CHARS || currentChunk.length >= MAX_ITEMS_PER_CHUNK) && currentChunk.length > 0) {
            chunks.push([...currentChunk]);
            currentChunk = [];
            currentLength = 0;
        }
        currentChunk.push(el);
        currentLength += html.length;
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    logToConsole('INFO', `暴力模式：${chunks.length} 个大块 (每块约 ${MAX_ITEMS_PER_CHUNK} 段)`);

    for (let i = 0; i < chunks.length; i++) {
        while (isPaused) await sleep(500);

        const chunkElements = chunks[i];
        const count = chunkElements.length;
        
        chunkElements.forEach(el => el.style.backgroundColor = "#fff8c5");
        updateStatus(`[暴力] 处理块 ${i + 1}/${chunks.length} (含 ${count} 段)...`);

        const combinedHTML = chunkElements.map(el => el.innerHTML).join(` ${SEPARATOR} `);
        
        const batchSystemPrompt = `Role: You are a professional BATCH translator.
Task: You will receive ${count} separate HTML segments, joined by the delimiter "${SEPARATOR}".
CRITICAL RULES:
1. TARGET LANGUAGE: Simplified Chinese (简体中文). Do NOT output English except for technical terms.
2. Translate each segment independently.
3. Maintain the HTML structure (tags like <a>, <code>, <b>) within each segment.
4. OUTPUT EXACTLY ${count} segments, separated by "${SEPARATOR}".
5. Do not merge segments. Do not omit any segment.`;

        logToConsole('USER', `[块 ${i+1} 发送预览] (共${count}段):\n${combinedHTML}`);

        let resultHTML = await translateHTML(combinedHTML, batchSystemPrompt);
        
        if (!resultHTML) {
            logToConsole('ERROR', "API请求失败，转为逐段重试...");
            for (const el of chunkElements) await processBlock(el);
            continue;
        }

        resultHTML = resultHTML.replace(/\[SYSTEM:.*?\]/s, '').trim();
        let parts = resultHTML.split(new RegExp(`\\s*\\|\\|\\|\\s*`)); 
        parts = parts.filter(p => p.trim().length > 0);

        if (parts.length !== count) {
            logToConsole('ERROR', `数量不匹配 (预期 ${count}, 实际 ${parts.length})。转为逐段重试...`);
            logToConsole('AI', `[异常返回预览]:\n${resultHTML}`);
            for (const el of chunkElements) {
                await processBlock(el);
                await sleep(300);
            }
        } else {
             logToConsole('AI', `[块 ${i+1} 翻译成功]:\n${resultHTML}`);
             for (let j = 0; j < chunkElements.length; j++) {
                if (parts[j]) {
                    const translatedPart = parts[j].trim();
                    chunkElements[j]._translatedHTML = translatedPart;
                    if (!isShowingOriginal) {
                        chunkElements[j].innerHTML = translatedPart;
                        chunkElements[j].style.backgroundColor = ""; 
                    }
                }
            }
        }
        await sleep(1500); 
    }
}

async function startDocTranslation() {
  if (isTranslating) {
      logToConsole('INFO', "翻译已在进行中...");
      createConsole();
      return; 
  }
  isTranslating = true;
  processedElements = []; 
  
  const readme = document.querySelector('.markdown-body') || document.querySelector('#readme');
  
  if (!readme) {
    alert("未找到 GitHub 文档区域 (README)。");
    isTranslating = false;
    return;
  }

  createConsole();
  showConsole();
  
  isPaused = false;
  isShowingOriginal = false;
  if(btnPause) {
      btnPause.innerText = "⏸ 中断";
      btnPause.style.backgroundColor = "#cf222e";
      btnPause.style.display = 'block';
  }
  if(btnToggle) btnToggle.innerText = "👁 对照";

  let modeLabel = "精翻";
  if (currentMode === 'batch') modeLabel = "快翻";
  if (currentMode === 'violence') modeLabel = "暴力";
  logToConsole('INFO', `模式: ${modeLabel}`);

  const selectors = 'p, li, h1, h2, h3, h4, h5, h6, th, td, blockquote';
  const allElements = Array.from(readme.querySelectorAll(selectors));
  const leafElements = allElements.filter(el => {
      if (el.closest('pre') || (el.tagName === 'CODE' && el.parentElement.tagName === 'PRE')) return false;
      if (!el.innerText.trim()) return false;
      return !el.querySelector(selectors);
  });

  updateStatus(`发现 ${leafElements.length} 个段落，开始翻译...`);

  if (currentMode === 'violence') {
      await runViolenceMode(leafElements);
  } else if (currentMode === 'batch') {
      await runBatchMode(leafElements);
  } else {
      await runStreamMode(leafElements);
  }

  updateStatus("完成！");
  logToConsole('INFO', "🎉 所有任务已完成");
  isTranslating = false;
  if(btnPause) btnPause.style.display = 'none'; 
}
