// background.js: Handles all data storage logic.

// Listens for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SAVE_DATA') {
        const { assignmentId, subId, content } = message.payload;
        if (!assignmentId || !subId) return;

        // Use chrome.storage.sync to save data
        chrome.storage.sync.get([assignmentId], (result) => {
            const assignmentData = result[assignmentId] || {};
            assignmentData[subId] = { content, timestamp: new Date().toISOString() };
            chrome.storage.sync.set({ [assignmentId]: assignmentData }, () => {
                console.log(`Data saved for ${assignmentId}`);
            });
        });
    }

    if (message.type === 'GET_SAVED_DATA') {
        const { assignmentId, subId } = message.payload;
        if (!assignmentId || !subId) {
            sendResponse(null);
            return true;
        }

        // Get data from chrome.storage.sync
        chrome.storage.sync.get([assignmentId], (result) => {
            if (result[assignmentId] && result[assignmentId][subId]) {
                sendResponse({ content: result[assignmentId][subId].content });
            } else {
                sendResponse(null); // No data found
            }
        });
        return true; // Required for asynchronous sendResponse
    }
});