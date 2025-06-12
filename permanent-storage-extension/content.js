// content.js

(function() {
    // Prevent script from running multiple times on the same page
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    let quillInstance = null;
    let storageKey = '';

    // Utility to get URL parameters
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const assignmentId = params.get('assignmentId') || 'defaultAssignment';
        const subId = params.get('subIds') || 'defaultSubId';
        return { assignmentId, subId };
    }
    
    // Simple debounce function to limit how often we save
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Function to save content to extension storage
    const saveContent = debounce(() => {
        if (quillInstance && storageKey) {
            const htmlContent = quillInstance.root.innerHTML;
            // Avoid saving the default empty state
            if (htmlContent === '<p><br></p>') return;

            chrome.runtime.sendMessage({
                action: "saveData",
                key: storageKey,
                content: htmlContent
            });
        }
    }, 1500); // Save 1.5 seconds after the user stops typing

    // Function to load content from extension storage
    function loadContent() {
        if (storageKey) {
            chrome.runtime.sendMessage({ action: "loadData", key: storageKey }, (response) => {
                if (response && response[storageKey]) {
                    quillInstance.root.innerHTML = response[storageKey];
                    console.log(`Extension loaded data for: ${storageKey}`);
                }
            });
        }
    }

    // Main initialization logic
    function initialize() {
        const { assignmentId, subId } = getUrlParams();
        // Create a unique key for storage. Using '|' as a separator.
        storageKey = `${assignmentId}|${subId}`;

        // Wait for the Quill editor to be available on the page
        const editorCheck = setInterval(() => {
            // The page's script assigns the editor to window.quill
            if (window.quill) {
                clearInterval(editorCheck);
                quillInstance = window.quill;

                // 1. Load existing data from extension storage
                loadContent();

                // 2. Listen for changes in the editor to save them
                quillInstance.on('text-change', (delta, oldDelta, source) => {
                    if (source === 'user') {
                        saveContent();
                    }
                });

                console.log("Permanent Storage Extension initialized for Quill.");
            }
        }, 100); // Check every 100ms
    }

    initialize();
})();