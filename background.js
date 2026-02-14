// background.js
console.log("GitHub Translator: Background Service Worker Starting...");

const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";

// Listener MUST be registered synchronously at the top level
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  if (request.action === "callMiniMax") {
    // Keep the message channel open for async response
    handleMiniMaxRequest(request, sendResponse)
      .catch(err => {
        console.error("Handler error:", err);
        sendResponse({ success: false, error: "Internal Handler Error: " + err.message });
      });
    return true; // CRITICAL: Indicates we will respond asynchronously
  }
  
  if (request.action === "callGoogle") {
      handleGoogleTranslateRequest(request, sendResponse)
          .catch(err => {
              console.error("Handler error:", err);
              sendResponse({ success: false, error: "Internal Handler Error: " + err.message });
          });
      return true;
  }
  
  if (request.action === "ping") {
      sendResponse({ status: "pong" });
      return false;
  }
  
  // Return false for unknown messages to close channel
  return false; 
});

async function handleGoogleTranslateRequest(request, sendResponse) {
    const { text } = request;
    if (!text) {
        sendResponse({ success: false, error: "Missing text for Google Translate" });
        return;
    }

    // Google Translate API (Unofficial via POST to avoid URL length limits)
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t";
    
    try {
        const formData = new URLSearchParams();
        formData.append('q', text);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Google Translate API Error:", response.status, errText);
            sendResponse({ success: false, error: `Google API Error: ${response.status}` });
            return;
        }

        const data = await response.json();
        // data[0] contains the translated segments
        let translatedText = "";
        if (data && data[0]) {
            data[0].forEach(segment => {
                if (segment[0]) translatedText += segment[0];
            });
        }

        if (!translatedText) {
             console.warn("Unexpected Google Translate response structure:", data);
             translatedText = text; 
        }

        sendResponse({ success: true, data: translatedText });

    } catch (error) {
        console.error("Google Translate Fetch Error:", error);
        sendResponse({ success: false, error: "Network Error: " + error.message });
    }
}

async function handleMiniMaxRequest(request, sendResponse) {
  const { text, apiKey, customSystemPrompt } = request;

  if (!apiKey) {
      sendResponse({ success: false, error: "API Key is missing in background request" });
      return;
  }

  // Default System Prompt
  const defaultSystemPrompt = `Role: You are a professional technical translator.
Task: Translate the provided HTML content into Simplified Chinese (简体中文).
Rules:
1. TARGET LANGUAGE: Simplified Chinese.
2. HTML PRESERVATION: You MUST preserve all HTML tags (<a>, <code>, <b>, <span>, etc.) and their attributes EXACTLY as they appear in the source.
3. CONTENT: Translate the text content inside the tags.
4. TERMINOLOGY: Keep technical terms (e.g., "request", "middleware", "token") in English.
5. OUTPUT: Return ONLY the translated HTML string.`;

  const finalSystemPrompt = customSystemPrompt || defaultSystemPrompt;

  const payload = {
    model: "abab5.5-chat",
    max_tokens: 4096, // Use max_tokens for OpenAI compatible endpoint
    messages: [
      {
        role: "system",
        content: finalSystemPrompt
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.1,
    top_p: 0.95,
  };

  try {
    console.log("Sending request to MiniMax...");
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MiniMax API Error:", response.status, errText);
      sendResponse({ success: false, error: `API Error: ${response.status} - ${errText}` });
      return;
    }

    const data = await response.json();
    let translatedText = text;

    if (data.choices && data.choices[0] && data.choices[0].message) {
      translatedText = data.choices[0].message.content;
    } else if (data.reply) {
       // Fallback for old style if somehow happens
       translatedText = data.reply;
    }

    // Cleanup
    translatedText = translatedText.replace(/^"|"$/g, '').trim(); 
    translatedText = translatedText.replace(/```html|```/g, '').trim();

    console.log("Translation success, length:", translatedText.length);
    sendResponse({ success: true, data: translatedText });

  } catch (error) {
    console.error("Fetch error:", error);
    sendResponse({ success: false, error: "Network/Fetch Error: " + error.message });
  }
}
