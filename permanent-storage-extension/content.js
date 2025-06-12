// content.js (v5 - Simple Message Relay)

console.log('[Extension] Content script loaded. Marking page as extension-enabled.');
// 1. Signal to the page that the extension is present.
document.documentElement.setAttribute('data-extension-installed', 'true');

// 2. Listen for custom events from the page and relay them to the background script.

// Relay SAVE requests from the page to the extension's storage
window.addEventListener('ab-save-request', (e) => {
    const { key, content } = e.detail;
    console.log(`[Extension] Relaying save request for key: ${key}`);
    chrome.runtime.sendMessage({ action: 'saveData', key, content });
});

// Relay LOAD requests, and send the response back to the page
window.addEventListener('ab-load-request', (e) => {
    const { key } = e.detail;
    console.log(`[Extension] Relaying load request for key: ${key}`);
    chrome.runtime.sendMessage({ action: 'loadData', key }, (response) => {
        const content = response ? response[key] : null;
        window.dispatchEvent(new CustomEvent('ab-load-response', {
            detail: { key, content }
        }));
    });
});

// Relay requests for ALL data (for printing)
window.addEventListener('ab-get-all-request', (e) => {
    console.log('[Extension] Relaying get-all-data request for printing.');
    chrome.runtime.sendMessage({ action: 'getAllData' }, (response) => {
        window.dispatchEvent(new CustomEvent('ab-get-all-response', {
            detail: { allData: response }
        }));
    });
});