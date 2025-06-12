// script.js - v3 (Corrected Extension-Aware Logic)

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const STORAGE_PREFIX = 'textbox-assignment_';
    const SUB_STORAGE_PREFIX = 'textbox-sub_';
    const QUESTIONS_PREFIX = 'textbox-questions_';
    // The content.js script from the extension adds this attribute to the <html> tag.
    const isExtensionInstalled = document.documentElement.hasAttribute('data-extension-installed');

    console.log(`Page Initializing. Extension detected: ${isExtensionInstalled}`);

    // --- GLOBAL STATE ---
    let quill;

    // --- UTILITY FUNCTIONS ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const getQueryParams = () => new URLSearchParams(window.location.search);

    const parseMarkdown = (text) => {
        if (!text) return '';
        text = text.replace(/(\*\*|__)(?=\S)(.*?)(?<=\S)\1/g, '<strong>$2</strong>');
        text = text.replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/g, '<em>$2</em>');
        return text;
    };

    function showSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        if (!indicator) return;
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
    }

    // --- DATA SAVING (EXTENSION or LOCALSTORAGE) ---
    function saveContent() {
        if (!quill) return;
        const htmlContent = quill.root.innerHTML;
        if (htmlContent === '<p><br></p>' || htmlContent === '') {
            return; // Don't save empty content
        }

        const params = getQueryParams();
        const assignmentId = params.get('assignmentId');
        const subId = params.get('subIds');
        if (!assignmentId || !subId) return;

        // The key format is different for the extension vs localStorage
        const extensionKey = `${assignmentId}|${subId}`;
        const localStorageKey = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;

        if (isExtensionInstalled) {
            console.log(`Saving to Extension with key: ${extensionKey}`);
            window.dispatchEvent(new CustomEvent('ab-save-request', {
                detail: { key: extensionKey, content: htmlContent }
            }));
        } else {
            console.log(`Saving to LocalStorage with key: ${localStorageKey}`);
            localStorage.setItem(localStorageKey, htmlContent);
        }
        showSaveIndicator();
    }
    const debouncedSave = debounce(saveContent, 1500);

    // --- DATA LOADING (EXTENSION or LOCALSTORAGE) ---
    function loadContent() {
        const params = getQueryParams();
        const assignmentId = params.get('assignmentId');
        const subId = params.get('subIds');
        if (!assignmentId || !subId || !quill) return;

        if (isExtensionInstalled) {
            const extensionKey = `${assignmentId}|${subId}`;
            console.log(`Requesting data from Extension for key: ${extensionKey}`);

            window.addEventListener('ab-load-response', (e) => {
                if (e.detail.key === extensionKey && e.detail.content) {
                    console.log('Extension data received, loading into Quill.');
                    quill.root.innerHTML = e.detail.content;
                } else {
                    console.log('No data returned from extension for this key.');
                }
            }, { once: true });

            window.dispatchEvent(new CustomEvent('ab-load-request', {
                detail: { key: extensionKey }
            }));
        } else {
            const localStorageKey = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
            console.log(`Loading from LocalStorage with key: ${localStorageKey}`);
            const savedText = localStorage.getItem(localStorageKey);
            if (savedText) {
                quill.root.innerHTML = savedText;
            }
        }
    }

    // --- PRINTING LOGIC (EXTENSION or LOCALSTORAGE) ---
    function printAllSubIdsForAssignment() {
        const assignmentId = getQueryParams().get('assignmentId') || 'defaultAssignment';

        const processAndPrint = (data) => {
            const subIdAnswerMap = new Map();
            const subIdSet = new Set();
            const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;

            // In localStorage mode, data is flat. In extension mode, it's structured.
            if (!isExtensionInstalled) {
                 // For localStorage, data is the whole localStorage object.
                 const answerPrefix = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}`;
                 for (let i = 0; i < data.length; i++) {
                     const key = data.key(i);
                     if (key && key.startsWith(answerPrefix)) {
                         const subId = key.substring(answerPrefix.length);
                         subIdAnswerMap.set(subId, data.getItem(key));
                         subIdSet.add(subId);
                     }
                 }
            } else {
                 // For extension, data is an object of { key: content }
                 for (const key in data) {
                    const [keyAssignmentId, subId] = key.split('|');
                    if (keyAssignmentId === assignmentId) {
                        subIdAnswerMap.set(subId, data[key]);
                        subIdSet.add(subId);
                    }
                }
            }

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${QUESTIONS_PREFIX}${assignmentId}`)) {
                    const subId = key.substring(key.indexOf(SUB_STORAGE_PREFIX) + SUB_STORAGE_PREFIX.length);
                    subIdSet.add(subId);
                }
            }
            if (subIdSet.size === 0) {
                 alert("Keine gespeicherten Themen für dieses Kapitel gefunden.");
                 return;
            }

            const sortedSubIds = Array.from(subIdSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

            let allContent = `<h2>${assignmentSuffix}</h2>`;
            sortedSubIds.forEach((subId, index) => {
                const answerContent = subIdAnswerMap.get(subId);
                const questionsHtml = getQuestionsHtmlFromStorage(assignmentId, subId);

                if (questionsHtml || answerContent) {
                    const blockClass = 'sub-assignment-block' + (index > 0 ? ' new-page' : '');
                    allContent += `<div class="${blockClass}">`;
                    allContent += `<h3>Thema: ${subId}</h3>`;
                    if (questionsHtml) allContent += questionsHtml;
                    allContent += `<div class="lined-content">${answerContent || '<p><em>Antworten:</em></p>'}</div>`;
                    allContent += `</div>`;
                }
            });

            printFormattedContent(allContent, assignmentSuffix);
        };

        if (isExtensionInstalled) {
            console.log("Requesting all data from extension for printing.");
            window.addEventListener('ab-get-all-response', (e) => {
                console.log("Received all data from extension.", e.detail.allData);
                processAndPrint(e.detail.allData || {});
            }, { once: true });
            window.dispatchEvent(new CustomEvent('ab-get-all-request'));
        } else {
            console.log("Gathering data from localStorage for printing.");
            processAndPrint(localStorage);
        }
    }

    // --- QUESTION HANDLING (Uses LocalStorage, which is fine) ---
    function getQuestionsFromUrlAndSave() {
        const params = getQueryParams();
        const assignmentId = params.get('assignmentId');
        const subId = params.get('subIds');
        if (!assignmentId || !subId) return { subId: null, questions: {} };

        const questions = {};
        params.forEach((value, key) => {
            if (key.startsWith('question')) {
                questions[key] = value;
            }
        });

        if (Object.keys(questions).length > 0) {
            const storageKey = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
            try {
                localStorage.setItem(storageKey, JSON.stringify(questions));
            } catch (e) {
                console.error("Error saving questions to localStorage:", e);
            }
        }
        return { subId, questions };
    }

    function getQuestionsHtmlFromStorage(assignmentId, subId) {
        const key = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
        const stored = localStorage.getItem(key);
        if (!stored) return '';

        try {
            const questionsObject = JSON.parse(stored);
            const sortedKeys = Object.keys(questionsObject).sort((a, b) => {
                const numA = parseInt(a.replace('question', ''), 10);
                const numB = parseInt(b.replace('question', ''), 10);
                return numA - numB;
            });

            let html = '<div class="questions-print"><ol>';
            sortedKeys.forEach(qKey => {
                html += `<li>${parseMarkdown(questionsObject[qKey])}</li>`;
            });
            html += '</ol></div>';
            return html;
        } catch (e) { return ''; }
    }

    // --- Print Window Function ---
    // Moved out of the old IIFE to be globally accessible by the print logic.
    function printFormattedContent(content, printWindowTitle = 'Alle Antworten') {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (!printWindow) {
            alert("Bitte erlauben Sie Pop-up-Fenster, um drucken zu können.");
            return;
        }
        const lineHeight = '1.4em';
        const lineColor = '#d2d2d2';
        printWindow.document.write(`
            <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${printWindowTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; line-height: ${lineHeight}; padding: ${lineHeight}; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                @page { size: A4; margin: 1cm; }
                .lined-content { background-color: #fdfdfa; position: relative; min-height: calc(22 * ${lineHeight}); height: auto; overflow: visible; background-image: repeating-linear-gradient(to bottom, transparent 0px, transparent calc(${lineHeight} - 1px), ${lineColor} calc(${lineHeight} - 1px), ${lineColor} ${lineHeight}); background-size: 100% ${lineHeight}; background-position: 0 0; background-repeat: repeat-y; }
                h1, h2, h3, p, li, div, .questions-print, .sub-assignment-block { line-height: inherit; background-color: transparent !important; margin-top: 0; margin-bottom: 0; }
                h2 { color: #003f5c; margin-bottom: ${lineHeight}; }
                h3 { color: #2f4b7c; margin-top: ${lineHeight}; margin-bottom: ${lineHeight}; page-break-after: avoid; }
                ul, ol { margin-top: 0; margin-bottom: ${lineHeight}; padding-left: 2em; }
                .questions-print ol { margin-bottom: ${lineHeight}; padding-left: 1.5em; }
                .questions-print li { margin-bottom: 0.25em; }
                .sub-assignment-block { margin-bottom: ${lineHeight}; padding-top: 0.1px; }
                @media print { .sub-assignment-block { page-break-after: always; } .sub-assignment-block:last-child { page-break-after: auto; } }
            </style>
            </head><body>${content}</body></html>
        `);
        printWindow.document.close();
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        };
    }

    // --- PAGE INITIALIZATION ---
    document.addEventListener("DOMContentLoaded", function() {
        // 1. Initialize Quill Editor
        quill = new Quill('#answerBox', {
            theme: 'snow',
            placeholder: 'Gib hier deinen Text ein...',
            modules: { toolbar: [ ['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['clean'] ] }
        });
        quill.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') { debouncedSave(); }
        });

        // 2. Display current assignment/question info
        const { subId, questions } = getQuestionsFromUrlAndSave();
        const subIdInfoElement = document.getElementById('subIdInfo');
        if (subId) {
            let infoHtml = `<h4>${subId}</h4>`;
            const sortedQuestionKeys = Object.keys(questions).sort((a, b) => {
                const numA = parseInt(a.replace('question', ''), 10);
                const numB = parseInt(b.replace('question', ''), 10);
                return numA - numB;
            });
            if (sortedQuestionKeys.length > 0) {
                infoHtml += '<div class="questions-container"><ol>';
                sortedQuestionKeys.forEach(key => { infoHtml += `<li>${parseMarkdown(questions[key])}</li>`; });
                infoHtml += '</ol></div>';
            }
            subIdInfoElement.innerHTML = infoHtml;
        }

        // 3. Load existing content into editor (works for both modes)
        loadContent();

        // 4. Setup Print Button
        const printAllSubIdsBtn = document.createElement('button');
        printAllSubIdsBtn.id = 'printAllSubIdsBtn';
        printAllSubIdsBtn.textContent = 'Alle Inhalte drucken / Als PDF speichern';
        printAllSubIdsBtn.addEventListener('click', printAllSubIdsForAssignment);
        document.querySelector('.button-container').appendChild(printAllSubIdsBtn);
    });

})();