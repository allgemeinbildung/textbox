// content.js (v3 - Interception Method)

(function() {
    // Prevent script from running multiple times
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    // --- 1. Intercept the page's save mechanism ---

    const originalSetItem = localStorage.setItem;
    const answerPrefix = 'textbox-assignment_';
    const subPrefix = '_textbox-sub_';
    const questionPrefix = 'textbox-questions_';

    localStorage.setItem = function(key, value) {
        // Check if this is the key for the answer box content
        if (key.startsWith(answerPrefix) && !key.startsWith(questionPrefix)) {
            console.log(`[Extension] Intercepted localStorage.setItem for key: ${key}`);
            
            // The page is trying to save to localStorage. We'll save to extension storage instead.
            // First, parse the key to match the extension's format.
            // From: textbox-assignment_ASSIGNMENT_ID_textbox-sub_SUB_ID
            // To:   ASSIGNMENT_ID|SUB_ID
            
            const assignmentPart = key.substring(answerPrefix.length);
            const subIndex = assignmentPart.indexOf(subPrefix);

            if (subIndex > -1) {
                const assignmentId = assignmentPart.substring(0, subIndex);
                const subId = assignmentPart.substring(subIndex + subPrefix.length);
                const extensionKey = `${assignmentId}|${subId}`;

                // Send the data to the background script to be saved in chrome.storage
                chrome.runtime.sendMessage({
                    action: "saveData",
                    key: extensionKey,
                    content: value
                }, (response) => {
                     if (chrome.runtime.lastError) {
                        console.error("[Extension] Save failed:", chrome.runtime.lastError.message);
                    } else {
                        console.log(`[Extension] Redirected and saved to extension storage with key: ${extensionKey}`);
                    }
                });
            }

            // By NOT calling originalSetItem.apply(this, arguments), we prevent
            // the data from being saved to the page's localStorage.
            return; 
        }

        // For any other keys (like 'textbox-questions_'), let the original function run
        originalSetItem.apply(this, arguments);
    };

    // --- 2. Load data from extension storage into the editor on page load ---
    
    function loadContentFromExtension(quillInstance) {
        const params = new URLSearchParams(window.location.search);
        const assignmentId = params.get('assignmentId') || 'defaultAssignment';
        const subId = params.get('subIds') || 'defaultSubId';
        const extensionKey = `${assignmentId}|${subId}`;

        if (extensionKey) {
            chrome.runtime.sendMessage({ action: "loadData", key: extensionKey }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("[Extension] Load failed:", chrome.runtime.lastError.message);
                    return;
                }
                // Check if the extension has data for this key
                if (response && response[extensionKey]) {
                    // If so, put it in the editor. This will override anything
                    // the page's script might have loaded from its own localStorage.
                    quillInstance.root.innerHTML = response[extensionKey];
                    console.log(`[Extension] Loaded data for: ${extensionKey}`);
                }
            });
        }
    }

    // --- 3. Find the editor and trigger the load ---

    const editorCheck = setInterval(() => {
        const answerBox = document.getElementById('answerBox');
        if (answerBox && answerBox.__quill) {
            clearInterval(editorCheck);
            const quillInstance = answerBox.__quill;
            console.log("[Extension] Quill instance found. Loading permanent data.");
            loadContentFromExtension(quillInstance);
        }
    }, 100);

})();