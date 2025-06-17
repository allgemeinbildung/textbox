// popup.js - v1.6 - Using the File System Access API

// --- Helper Functions (unchanged) ---
function getCanonicalJSONString(data) {if (data === null || typeof data !== 'object') {return JSON.stringify(data);}if (Array.isArray(data)) {return `[${data.map(getCanonicalJSONString).join(',')}]`;}const sortedKeys = Object.keys(data).sort();const keyValuePairs = sortedKeys.map(key => {return `${JSON.stringify(key)}:${getCanonicalJSONString(data[key])}`;});return `{${keyValuePairs.join(',')}}`;}
async function createSha256Hash(str) {const textAsBuffer = new TextEncoder().encode(str);const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);const hashArray = Array.from(new Uint8Array(hashBuffer));return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');}
function collectDataFromLocalStorage() {const data = {};const ANSWER_PREFIX = 'textbox-assignment_';const QUESTION_PREFIX = 'textbox-questions_';const SUB_PREFIX_PART = '_textbox-sub_';for (let i = 0; i < localStorage.length; i++) {const key = localStorage.key(i);let assignmentId, subId;if (key.startsWith(ANSWER_PREFIX)) {const parts = key.substring(ANSWER_PREFIX.length).split(SUB_PREFIX_PART);if (parts.length === 2) {[assignmentId, subId] = parts;if (!data[assignmentId]) data[assignmentId] = {};if (!data[assignmentId][subId]) data[assignmentId][subId] = { questions: null, answer: null };data[assignmentId][subId].answer = localStorage.getItem(key);}} else if (key.startsWith(QUESTION_PREFIX)) {const tempKey = key.substring(QUESTION_PREFIX.length);const parts = tempKey.split(SUB_PREFIX_PART);if (parts.length === 2) {[assignmentId, subId] = parts;if (!data[assignmentId]) data[assignmentId] = {};if (!data[assignmentId][subId]) data[assignmentId][subId] = { questions: null, answer: null };try {data[assignmentId][subId].questions = JSON.parse(localStorage.getItem(key));} catch (e) {data[assignmentId][subId].questions = { "error": "Failed to parse questions JSON." };}}}}return data;}

// --- Main Export Logic ---

const exportBtn = document.getElementById('export-save-as-btn');
const statusMessage = document.getElementById('status-message');

exportBtn.addEventListener('click', async () => {
    // 1. Get and verify the data from the page (same as before)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { alert("Could not find an active tab."); return; }
    
    const allFrames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const targetFrame = allFrames.find(frame => frame.url && frame.url.includes('answers.html'));
    if (!targetFrame) { alert("Could not find the 'answers.html' content on this page."); return; }

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [targetFrame.frameId] },
        function: collectDataFromLocalStorage
    });
    
    if (!results || results.length === 0 || !results[0].result) {
        alert("Found the content frame, but failed to retrieve data."); return;
    }
    const studentData = results[0].result;
    if (Object.keys(studentData).length === 0) {
        alert("The data storage appears to be empty."); return;
    }

    // 2. Create the signed data package (same as before)
    const canonicalString = getCanonicalJSONString(studentData);
    const signature = await createSha256Hash(canonicalString);
    const signedPackage = {
        payload: studentData,
        signature: signature,
        createdAt: new Date().toISOString()
    };
    const jsonString = JSON.stringify(signedPackage, null, 2);

    // 3. NEW: Use showSaveFilePicker to save the file
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: `allgemeinbildung_export_signed_${new Date().toISOString().split('T')[0]}.json`,
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
            }],
        });

        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        statusMessage.textContent = 'File saved successfully!';
        setTimeout(() => { statusMessage.textContent = ''; }, 3000);

    } catch (err) {
        // This block handles the case where the user cancels the save dialog
        if (err.name === 'AbortError') {
            console.log('User cancelled the save dialog.');
        } else {
            console.error('Error saving file:', err);
            statusMessage.textContent = 'Error saving file.';
            setTimeout(() => { statusMessage.textContent = ''; }, 3000);
        }
    }
});