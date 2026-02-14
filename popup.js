document.addEventListener('DOMContentLoaded', () => {
    const configSection = document.getElementById('configSection');
    const toggleConfig = document.getElementById('toggleConfig');
    const engineSelect = document.getElementById('engine');
    const minimaxFields = document.getElementById('minimaxFields');
    const apiKeyInput = document.getElementById('apiKey');
    const saveConfigBtn = document.getElementById('saveConfig');
    const statusDiv = document.getElementById('status');
    const translateDocsBtn = document.getElementById('translateDocs');

    // Toggle Config Section
    toggleConfig.addEventListener('click', () => {
        configSection.classList.toggle('hidden');
    });

    // Toggle Engine Specific Fields
    engineSelect.addEventListener('change', () => {
        if (engineSelect.value === 'minimax') {
            minimaxFields.classList.remove('hidden');
        } else {
            minimaxFields.classList.add('hidden');
        }
    });

    // Load Settings
    chrome.storage.local.get(['engine', 'apiKey'], (result) => {
        if (result.engine) engineSelect.value = result.engine;
        if (result.apiKey) apiKeyInput.value = result.apiKey;
        if (result.engine === 'minimax') {
            minimaxFields.classList.remove('hidden');
        }
    });

    // Save Settings
    saveConfigBtn.addEventListener('click', () => {
        const engine = engineSelect.value;
        const apiKey = apiKeyInput.value.trim();

        if (engine === 'minimax' && !apiKey) {
            statusDiv.innerText = "请输入 API Key";
            statusDiv.style.color = "red";
            return;
        }

        chrome.storage.local.set({ engine, apiKey }, () => {
            statusDiv.innerText = "配置已保存";
            statusDiv.style.color = "green";
            setTimeout(() => {
                statusDiv.innerText = "";
                configSection.classList.add('hidden');
            }, 1500);
        });
    });

    // Helper: Ensure Content Script is Loaded
    async function ensureContentScript(tabId) {
        try {
            // Try pinging
            await chrome.tabs.sendMessage(tabId, { action: "ping" });
            return true;
        } catch (e) {
            // If failed, inject
            console.log("Ping failed, injecting script...");
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                // Wait a bit for script to init
                await new Promise(r => setTimeout(r, 100));
                return true;
            } catch (injectError) {
                console.error("Injection failed:", injectError);
                statusDiv.innerText = "无法注入脚本: " + injectError.message;
                return false;
            }
        }
    }

    // Translate Docs
    translateDocsBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            statusDiv.innerText = "未找到活动标签页";
            return;
        }

        // Check/Inject script first
        const ready = await ensureContentScript(tab.id);
        if (!ready) return;

        // Fetch config
        chrome.storage.local.get(['engine', 'apiKey'], (config) => {
            if (config.engine === 'minimax' && !config.apiKey) {
                statusDiv.innerText = "请先配置 MiniMax Key";
                statusDiv.style.color = "red";
                configSection.classList.remove('hidden');
                return;
            }
            
            // Get selected mode
            const modeInput = document.querySelector('input[name="transMode"]:checked');
            const mode = modeInput ? modeInput.value : 'stream';

            // Send actual command
            chrome.tabs.sendMessage(tab.id, { 
                action: "translateDocs",
                config: config,
                mode: mode
            }, (response) => {
                if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message;
                    statusDiv.innerText = "错误: " + msg;
                    statusDiv.style.color = "red";
                } else {
                    statusDiv.innerText = response?.status || "正在启动...";
                    statusDiv.style.color = "#57606a";
                }
            });
        });
    });
});
