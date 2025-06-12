// content.js (v4 - Complete Storage Override)

(function() {
    // Prevent script from running multiple times
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    console.log("[Extension] Content script loaded");

    // --- 1. Completely override localStorage methods ---

    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;
    
    const answerPrefix = 'textbox-assignment_';
    const subPrefix = '_textbox-sub_';
    const questionPrefix = 'textbox-questions_';

    // Override setItem to intercept answer saves
    localStorage.setItem = function(key, value) {
        if (key.startsWith(answerPrefix) && !key.startsWith(questionPrefix)) {
            console.log(`[Extension] Intercepted localStorage.setItem for key: ${key}`);
            
            const assignmentPart = key.substring(answerPrefix.length);
            const subIndex = assignmentPart.indexOf(subPrefix);

            if (subIndex > -1) {
                const assignmentId = assignmentPart.substring(0, subIndex);
                const subId = assignmentPart.substring(subIndex + subPrefix.length);
                const extensionKey = `${assignmentId}|${subId}`;

                // Save to extension storage
                chrome.runtime.sendMessage({
                    action: "saveData",
                    key: extensionKey,
                    content: value
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("[Extension] Save failed:", chrome.runtime.lastError.message);
                    } else {
                        console.log(`[Extension] Saved to extension storage with key: ${extensionKey}`);
                    }
                });
            }
            // Don't save to localStorage
            return;
        }

        // For other keys, use original function
        originalSetItem.apply(this, arguments);
    };

    // Override getItem to return extension data for answer keys
    localStorage.getItem = function(key) {
        if (key.startsWith(answerPrefix) && !key.startsWith(questionPrefix)) {
            console.log(`[Extension] Intercepted localStorage.getItem for key: ${key}`);
            
            const assignmentPart = key.substring(answerPrefix.length);
            const subIndex = assignmentPart.indexOf(subPrefix);

            if (subIndex > -1) {
                const assignmentId = assignmentPart.substring(0, subIndex);
                const subId = assignmentPart.substring(subIndex + subPrefix.length);
                const extensionKey = `${assignmentId}|${subId}`;

                // This is synchronous, but we need async data
                // We'll handle this with a custom loading mechanism
                return window.extensionData && window.extensionData[extensionKey] || null;
            }
        }

        // For other keys, use original function
        return originalGetItem.apply(this, arguments);
    };

    // Override removeItem for completeness
    localStorage.removeItem = function(key) {
        if (key.startsWith(answerPrefix) && !key.startsWith(questionPrefix)) {
            console.log(`[Extension] Intercepted localStorage.removeItem for key: ${key}`);
            
            const assignmentPart = key.substring(answerPrefix.length);
            const subIndex = assignmentPart.indexOf(subPrefix);

            if (subIndex > -1) {
                const assignmentId = assignmentPart.substring(0, subIndex);
                const subId = assignmentPart.substring(subIndex + subPrefix.length);
                const extensionKey = `${assignmentId}|${subId}`;

                chrome.runtime.sendMessage({
                    action: "deleteData",
                    key: extensionKey
                });
            }
            return;
        }

        originalRemoveItem.apply(this, arguments);
    };

    // --- 2. Pre-load extension data into window object ---
    
    function preloadExtensionData() {
        const params = new URLSearchParams(window.location.search);
        const assignmentId = params.get('assignmentId') || 'defaultAssignment';
        const subId = params.get('subIds') || 'defaultSubId';
        const extensionKey = `${assignmentId}|${subId}`;

        console.log(`[Extension] Pre-loading data for key: ${extensionKey}`);

        chrome.runtime.sendMessage({ action: "loadData", key: extensionKey }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("[Extension] Pre-load failed:", chrome.runtime.lastError.message);
                return;
            }

            // Store the data in window object so localStorage.getItem can access it
            window.extensionData = window.extensionData || {};
            if (response && response[extensionKey]) {
                window.extensionData[extensionKey] = response[extensionKey];
                console.log(`[Extension] Pre-loaded data for: ${extensionKey}`);
            }

            // Trigger a custom event to let the page know data is ready
            window.dispatchEvent(new CustomEvent('extensionDataReady', { 
                detail: { key: extensionKey, hasData: !!response[extensionKey] } 
            }));
        });
    }

    // --- 3. Override the page's initialization if needed ---
    
    function overridePageInitialization() {
        // Wait for the page's script to load, then override key functions
        const checkForPageScript = setInterval(() => {
            // Look for signs that the page script has loaded
            if (document.getElementById('answerBox')) {
                clearInterval(checkForPageScript);
                
                // Add event listener for when extension data is ready
                window.addEventListener('extensionDataReady', (event) => {
                    console.log('[Extension] Extension data ready event received');
                    
                    // Find Quill instance and load data if available
                    const answerBox = document.getElementById('answerBox');
                    if (answerBox && answerBox.__quill && event.detail.hasData) {
                        const data = window.extensionData[event.detail.key];
                        if (data) {
                            answerBox.__quill.root.innerHTML = data;
                            console.log(`[Extension] Loaded data into Quill editor`);
                        }
                    }
                });

                // Pre-load the data
                preloadExtensionData();
            }
        }, 100);
    }

    // --- 4. Enhanced print function override for extension data ---
    
    function overridePrintFunctions() {
        // Wait for page to be ready
        setTimeout(() => {
            // Override the printAllSubIdsForAssignment function to use extension data
            const originalPrintAll = window.printAllSubIdsForAssignment;
            if (typeof originalPrintAll === 'function') {
                window.printAllSubIdsForAssignment = function() {
                    console.log('[Extension] Overriding print function to use extension data');
                    
                    // Get all extension data and format it for printing
                    chrome.runtime.sendMessage({ action: "getAllData" }, (allExtensionData) => {
                        if (chrome.runtime.lastError) {
                            console.error("[Extension] Failed to get all data for printing");
                            // Fall back to original function
                            originalPrintAll.call(this);
                            return;
                        }

                        const params = new URLSearchParams(window.location.search);
                        const assignmentId = params.get('assignmentId') || 'defaultAssignment';
                        
                        // Filter data for current assignment
                        const relevantData = {};
                        Object.keys(allExtensionData).forEach(key => {
                            const [keyAssignmentId, subId] = key.split('|');
                            if (keyAssignmentId === assignmentId) {
                                relevantData[subId] = allExtensionData[key];
                            }
                        });

                        if (Object.keys(relevantData).length === 0) {
                            alert("Keine gespeicherten Antworten für dieses Kapitel gefunden.");
                            return;
                        }

                        // Create print content using extension data
                        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;
                        let allContent = `<h2>${assignmentSuffix}</h2>`;

                        const sortedSubIds = Object.keys(relevantData).sort((a, b) => {
                            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                        });

                        sortedSubIds.forEach((subId, index) => {
                            const content = relevantData[subId];
                            const blockClass = 'sub-assignment-block' + (index > 0 ? ' new-page' : '');
                            allContent += `<div class="${blockClass}">`;
                            allContent += `<h3>Thema: ${subId}</h3>`;
                            allContent += `<div class="lined-content">${content}</div>`;
                            allContent += `</div>`;
                        });

                        // Use the page's print function with our content
                        if (typeof window.printFormattedContent === 'function') {
                            window.printFormattedContent(allContent, assignmentSuffix);
                        }
                    });
                };
            }
        }, 2000); // Give page time to fully load
    }

    // --- 5. Start the override process ---
    
    console.log("[Extension] Starting initialization");
    overridePageInitialization();
    overridePrintFunctions();

})();