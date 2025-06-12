// background.js

// Listens for messages from content scripts or the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "saveData":
            // The key is a combination of assignmentId and subId
            chrome.storage.local.set({ [request.key]: request.content }, () => {
                console.log(`Data saved for key: ${request.key}`);
                sendResponse({ status: "success" });
            });
            return true; // Indicates that the response is sent asynchronously

        case "loadData":
            chrome.storage.local.get(request.key, (result) => {
                sendResponse(result);
            });
            return true; // Indicates that the response is sent asynchronously

        case "getAllData":
            chrome.storage.local.get(null, (items) => {
                sendResponse(items);
            });
            return true;

        case "deleteData":
            chrome.storage.local.remove(request.key, () => {
                 sendResponse({ status: "success", key: request.key });
            });
            return true;
        
        case "deleteAllData":
            chrome.storage.local.clear(() => {
                sendResponse({ status: "success" });
            });
            return true;
    }
});

// Injects the content script when the target page is loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://allgemeinbildung.github.io/textbox/answers.html')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    }
});