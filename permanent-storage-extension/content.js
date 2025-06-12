// content.js: The bridge between the webpage and the extension background.

// Listen for the custom event from the page to save data
window.addEventListener('saveDataToExtension', (event) => {
    chrome.runtime.sendMessage({
        type: 'SAVE_DATA',
        payload: event.detail
    });
});

// On page load, ask the background for saved data
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignmentId');
    const subId = urlParams.get('subIds'); // Your URL uses 'subIds'

    if (assignmentId && subId) {
        chrome.runtime.sendMessage({
            type: 'GET_SAVED_DATA',
            payload: { assignmentId, subId }
        }, (response) => {
            if (response && response.content) {
                // Dispatch a custom event for the page script to catch
                window.dispatchEvent(new CustomEvent('loadDataIntoEditor', {
                    detail: { content: response.content }
                }));
            }
        });
    }
});