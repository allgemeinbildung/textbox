// background.js (Simplified)

// Listens for messages from content scripts or the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`[Background] Received message: ${request.action}`);

    switch (request.action) {
        case "saveData":
            chrome.storage.local.set({ [request.key]: request.content }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`[Background] Save failed for ${request.key}:`, chrome.runtime.lastError);
                    sendResponse({ status: "error", error: chrome.runtime.lastError.message });
                } else {
                    console.log(`[Background] Data saved for key: ${request.key}`);
                    sendResponse({ status: "success" });
                }
            });
            return true; // Indicates that the response is sent asynchronously

        case "loadData":
            chrome.storage.local.get(request.key, (result) => {
                if (chrome.runtime.lastError) {
                    console.error(`[Background] Load failed for ${request.key}:`, chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    console.log(`[Background] Data loaded for key: ${request.key}`, Object.keys(result));
                    sendResponse(result);
                }
            });
            return true;

        case "getAllData":
            chrome.storage.local.get(null, (items) => {
                if (chrome.runtime.lastError) {
                    console.error("[Background] Get all data failed:", chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    console.log(`[Background] Retrieved ${Object.keys(items).length} items`);
                    sendResponse(items);
                }
            });
            return true;

        case "deleteData":
            chrome.storage.local.remove(request.key, () => {
                if (chrome.runtime.lastError) {
                    console.error(`[Background] Delete failed for ${request.key}:`, chrome.runtime.lastError);
                    sendResponse({ status: "error", error: chrome.runtime.lastError.message });
                } else {
                    console.log(`[Background] Data deleted for key: ${request.key}`);
                    sendResponse({ status: "success", key: request.key });
                }
            });
            return true;

        case "deleteAllData":
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    console.error("[Background] Clear all failed:", chrome.runtime.lastError);
                    sendResponse({ status: "error", error: chrome.runtime.lastError.message });
                } else {
                    console.log("[Background] All data cleared");
                    sendResponse({ status: "success" });
                }
            });
            return true;
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log("[Background] Extension started");
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log("[Background] Extension installed/updated:", details.reason);
});