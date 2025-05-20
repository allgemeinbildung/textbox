// script.js - Rewritten with IIFE for Scope Isolation

(function() {
    'use strict'; // Optional: Enforces stricter parsing and error handling

    // Constants for storage keys (now local to this IIFE)
    const STORAGE_PREFIX = 'textbox-assignment_';
    const SUB_STORAGE_PREFIX = 'textbox-sub_';
    const QUESTIONS_PREFIX = 'textbox-questions_'; // New prefix for storing questions

    // Global variable for the Quill editor (now local to this IIFE)
    let quill;

    // Markdown parsing function (now local to this IIFE)
    function parseMarkdown(text) {
        if (!text) return '';
        text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
        text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
        return text;
    }

    // Utility functions for URL parameters (now local to this IIFE)
    function getQueryParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        for (const [key, value] of urlParams.entries()) {
            if (key === 'subIds' || key.startsWith('question')) {
                if (!params[key]) {
                    params[key] = [];
                }
                params[key].push(value);
            } else {
                params[key] = value;
            }
        }
        return params;
    }

    function getQueryParam(param) {
        return getQueryParams()[param];
    }

    function getCurrentSubIdAndQuestions() {
        const params = getQueryParams();
        const subId = params.subIds ? params.subIds[0] : null;
        const questions = {};
        Object.keys(params).forEach(key => {
            if (key.startsWith('question') && params[key]) {
                questions[key] = params[key][0];
            }
        });
        return { subId, questions };
    }

    function showSaveIndicator() {
        const saveIndicator = document.getElementById('saveIndicator');
        if (!saveIndicator) return;
        saveIndicator.style.opacity = '1';
        setTimeout(() => {
            saveIndicator.style.opacity = '0';
        }, 2000);
    }

    function saveQuestionsToLocal(assignmentId, subId, questions) {
        if (!subId || Object.keys(questions).length === 0) return;
        const storageKey = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(questions));
            console.log(`Questions for ${storageKey} saved`);
        } catch (e) {
            console.error("Error saving questions to localStorage:", e);
        }
    }

    function saveToLocal() {
        if (!quill) return;
        const htmlContent = quill.root.innerHTML;
        if (htmlContent === '<p><br></p>' || htmlContent === '') {
            console.log("Attempted to save empty content. Skipping.");
            return;
        }
        const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
        const { subId } = getCurrentSubIdAndQuestions();
        const storageKey = subId
            ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
            : `${STORAGE_PREFIX}${assignmentId}`;
        try {
            localStorage.setItem(storageKey, htmlContent);
            console.log(`Text for ${storageKey} saved`);
            showSaveIndicator();
        } catch (e) {
            console.error("Error saving content to localStorage:", e);
            alert("Fehler beim Speichern. Möglicherweise ist der Speicherplatz voll.");
        }
    }

    function clearLocalStorage() {
        const keysToRemove = [];
        const prefix = 'textbox-';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (quill) quill.setText('');
        console.log("All textbox-* prefixed keys cleared from localStorage");
        alert("Alle gespeicherten Texte wurden gelöscht.");
    }

    function printSingleAnswer(title, content, questions = {}) {
        const existingPrintDiv = document.getElementById('printSingleContent');
        if (existingPrintDiv) {
            document.body.removeChild(existingPrintDiv);
        }
        const printDiv = document.createElement('div');
        printDiv.id = 'printSingleContent';
        printDiv.style.visibility = 'hidden';
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        printDiv.appendChild(titleElement);
        if (Object.keys(questions).length > 0) {
            const questionsElement = document.createElement('div');
            questionsElement.className = 'questions-print';
            let questionsHtml = '';
            Object.values(questions).forEach(question => {
                questionsHtml += `<div>- ${parseMarkdown(question)}</div>`;
            });
            questionsElement.innerHTML = questionsHtml;
            printDiv.appendChild(questionsElement);
        }
        const contentElement = document.createElement('div');
        contentElement.innerHTML = content;
        printDiv.appendChild(contentElement);
        document.body.appendChild(printDiv);
        document.body.classList.add('print-single');
        function handleAfterPrint() {
            document.body.classList.remove('print-single');
            const printDivAfter = document.getElementById('printSingleContent');
            if (printDivAfter) {
                document.body.removeChild(printDivAfter);
            }
            window.removeEventListener('afterprint', handleAfterPrint);
            window.removeEventListener('beforeprint', handleBeforePrint);
        }
        function handleBeforePrint() {
            printDiv.style.visibility = 'visible';
        }
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        window.print();
    }

    function printFormattedContent(content, printWindowTitle = 'Alle Antworten') {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (!printWindow) {
            alert("Bitte erlauben Sie Pop-up-Fenster, um drucken zu können.");
            return;
        }
        const lineHeight = '1.6em'; // Define base line height for consistency
        const lineColor = '#d2d2d2'; // Light gray for lines

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>${printWindowTitle}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #333; /* Dark gray text for readability */
                        line-height: ${lineHeight};
                        padding: ${lineHeight}; /* Padding around the page, equal to one line */
                        margin: 0;

                        /* Crucial for printing background graphics */
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .lined-content {
                        background-color: #fdfdfa; /* Slightly off-white paper color */
                        background-image: linear-gradient(to bottom, transparent 0%, transparent calc(${lineHeight} - 1px), ${lineColor} calc(${lineHeight} - 1px), ${lineColor} ${lineHeight});
                        background-size: 100% ${lineHeight};
                        background-position: 0 0; /* Start lines from top-left of padding box */
                        background-repeat: repeat-y;
                        min-height: calc(100vh - var(--content-offset, 0px))
                    }

                    /* Ensure common text elements inherit line-height and have transparent backgrounds */
                    h1, h2, h3, h4, h5, h6, p, li, div, blockquote, pre,
                    .questions-print, .questions-print div,
                    .sub-assignment-block, .sub-assignment-block > div,
                    .ql-editor, .ql-editor p, .ql-editor ol, .ql-editor ul, .ql-editor li {
                        line-height: inherit; /* Inherit from body for alignment */
                        background-color: transparent !important; /* Ensure no element hides the lines */
                    }

                    /* Adjust margins to align with the line grid */
                    h2 {
                        color: #003f5c;
                        margin-top: ${lineHeight}; 
                        margin-bottom: ${lineHeight};
                    }
                    h3 {
                        color: #2f4b7c;
                        margin-top: ${lineHeight};
                        margin-bottom: ${lineHeight};
                        page-break-after: avoid;
                    }
                    p, .ql-editor p, .ql-editor li { /* Quill paragraphs and list items */
                        margin-top: 0 !important;
                        margin-bottom: 0 !important; /* Remove bottom margin to sit on lines */
                    }
                     ul, ol, .ql-editor ul, .ql-editor ol {
                        margin-top: 0;
                        margin-bottom: ${lineHeight}; /* Space after a list */
                        padding-left: 2em; /* Standard list indentation */
                    }
                    li {
                        margin-bottom: 0; /* Handled by line-height */
                    }
                    hr {
                        border: 0;
                        height: 1px;
                        background-color: #999; /* Make hr a visible solid line */
                        margin: ${lineHeight} 0; /* Align with grid */
                    }
                    .questions-print {
                        margin-top: 0; /* Adjusted if needed */
                        margin-bottom: ${lineHeight};
                    }
                    .sub-assignment-block {
                        page-break-inside: avoid;
                        margin-bottom: ${lineHeight}; /* Space after a block */
                        padding-top: 0.1px; /* Fixes potential margin collapsing issue, ensuring block starts "on" a line */
                    }
                    .sub-assignment-block.new-page {
                        page-break-before: always;
                    }
                    strong { font-weight: bold; }
                    em { font-style: italic; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            const pageHeight = Math.max(printWindow.innerHeight, printWindow.document.documentElement.clientHeight);
            const blocks = printWindow.document.querySelectorAll('.sub-assignment-block');
            blocks.forEach(block => {
                const lined = block.querySelector('.lined-content');
                if (lined) {
                    const rect = lined.getBoundingClientRect();
                    const offset = rect.top % pageHeight;
                    lined.style.setProperty('--content-offset', offset + 'px');
                }
            });
            printWindow.focus();
            printWindow.print();
        }, 500);
    }

    function getQuestionsFromStorage(assignmentId, subId) {
        const storageKey = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
        const storedQuestions = localStorage.getItem(storageKey);
        if (storedQuestions) {
            try {
                return JSON.parse(storedQuestions);
            } catch (e) {
                console.error(`Error parsing questions for ${subId}:`, e);
                return {};
            }
        }
        return {};
    }

    function getQuestionsHtmlFromStorage(assignmentId, subId) {
        const questions = getQuestionsFromStorage(assignmentId, subId);
        if (Object.keys(questions).length > 0) {
            let html = '<div class="questions-print">';
            Object.values(questions).forEach(question => {
                html += `<div>- ${parseMarkdown(question)}</div>`;
            });
            html += '</div>';
            return html;
        }
        return '';
    }

    function printAllSubIdsForAssignment() {
        const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
        const assignmentPrefix = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}`;
        const storageKeys = Object.keys(localStorage).filter(key => key.startsWith(assignmentPrefix));
        if (storageKeys.length === 0) {
            alert("Keine gespeicherten Themen für dieses Kapitel gefunden.");
            return;
        }
        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;
        let allContent = `<h2>Aufgabe: ${assignmentSuffix}</h2>`;
        storageKeys.sort((a, b) => {
            const subIdA = a.replace(assignmentPrefix, '');
            const subIdB = b.replace(assignmentPrefix, '');
            return subIdA.localeCompare(subIdB, undefined, {numeric: true, sensitivity: 'base'});
        });
        storageKeys.forEach((key, index) => {
            const content = localStorage.getItem(key);
            if (content) {
                const subId = key.replace(assignmentPrefix, '');
                const questionsHtml = getQuestionsHtmlFromStorage(assignmentId, subId);
                const blockClass = index > 0 ? 'sub-assignment-block new-page' : 'sub-assignment-block';
                allContent += `<div class="${blockClass}">`;
                allContent += `<h3>Thema: ${subId}</h3>`;
                if (questionsHtml) {
                    allContent += questionsHtml;
                }
                allContent += `<div class="lined-content">${content}</div>`; // Wrapped in lined content for background lines
                allContent += `</div>`;
                if (index < storageKeys.length - 1) {
                    allContent += `<hr>`;
                }
            }
        });
        if (allContent.endsWith('<hr>')) {
            allContent = allContent.slice(0, -4);
        }
        printFormattedContent(allContent, `Alle Themen für Kapitel ${assignmentSuffix}`);
    }

    function updateSubIdInfo() {
        const subIdInfoElement = document.getElementById('subIdInfo');
        if (!subIdInfoElement) return;
        const { subId, questions } = getCurrentSubIdAndQuestions();
        if (subId) {
            let html = `<h4>Thema: ${subId}</h4>`;
            if (Object.keys(questions).length > 0) {
                html += '<div class="questions-container">';
                Object.values(questions).forEach(question => {
                    html += `<div>- ${parseMarkdown(question)}</div>`;
                });
                html += '</div>';
            }
            subIdInfoElement.innerHTML = html;
            subIdInfoElement.style.display = 'block';
        } else {
            subIdInfoElement.innerHTML = '';
            subIdInfoElement.style.display = 'none';
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedSave = debounce(saveToLocal, 1500);

    function adjustEditorHeight() {
        if (!quill || !quill.root) return;
        const editorNode = quill.root;
        editorNode.style.boxSizing = 'border-box';
        editorNode.style.height = 'auto';
        let scrollHeight = editorNode.scrollHeight;
        const maxHeight = 300;
        if (scrollHeight > maxHeight) {
            editorNode.style.height = maxHeight + 'px';
            editorNode.style.overflowY = 'auto';
        } else {
            editorNode.style.height = scrollHeight + 'px';
            editorNode.style.overflowY = 'hidden';
        }
    }
    const debouncedAdjustEditorHeight = debounce(adjustEditorHeight, 150);

    document.addEventListener("DOMContentLoaded", function() {
        const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;
        const assignmentInfo = document.getElementById('assignmentInfo');
        if (assignmentInfo) {
            assignmentInfo.textContent = assignmentSuffix ? `Aufgabe: ${assignmentSuffix}` : 'Kapitel';
        }

        const answerBox = document.getElementById('answerBox');
        if (answerBox) {
            console.log("Initializing Quill editor");
            try {
                quill = new Quill('#answerBox', {
                    theme: 'snow',
                    placeholder: 'Gib hier deinen Text ein...',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            ['clean']
                        ]
                    }
                });
                if (quill.root) {
                    quill.root.style.overflowY = 'hidden';
                    quill.root.style.boxSizing = 'border-box';
                }
                quill.root.addEventListener('paste', function(e) {
                    e.preventDefault();
                    alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
                });
                quill.on('text-change', function(delta, oldDelta, source) {
                    if (source === 'user') {
                        debouncedSave();
                    }
                    adjustEditorHeight();
                });
                const { subId } = getCurrentSubIdAndQuestions();
                const storageKey = subId
                    ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
                    : `${STORAGE_PREFIX}${assignmentId}`;
                const savedText = localStorage.getItem(storageKey);
                if (savedText) {
                    quill.root.innerHTML = savedText;
                    console.log(`Gespeicherten Text für ${storageKey} geladen`);
                } else {
                    console.log(`Kein gespeicherter Text für ${storageKey} gefunden`);
                }
                adjustEditorHeight();
            } catch (error) {
                console.error("Failed to initialize Quill:", error);
                answerBox.innerHTML = "Fehler beim Laden des Editors.";
            }
        } else {
            console.log("Element #answerBox not found. Quill not initialized.");
        }

        updateSubIdInfo();
        const { subId: currentSubId, questions: currentQuestions } = getCurrentSubIdAndQuestions();
        if (currentSubId && Object.keys(currentQuestions).length > 0) {
            saveQuestionsToLocal(assignmentId, currentSubId, currentQuestions);
        }

        const downloadCurrentBtn = document.getElementById('downloadAllBtn');
        if (downloadCurrentBtn) {
            downloadCurrentBtn.textContent = 'Aktuelle Antwort drucken / als PDF speichern';
            downloadCurrentBtn.addEventListener('click', function() {
                if (!quill) {
                    alert("Editor nicht initialisiert.");
                    return;
                }
                const content = quill.root.innerHTML;
                if (content === '<p><br></p>' || content === '') {
                    alert("Kein Inhalt zum Drucken vorhanden.");
                    return;
                }
                const { subId, questions } = getCurrentSubIdAndQuestions();
                let title = `Aufgabe: ${assignmentSuffix}`;
                if(subId) {
                    title += ` - Thema: ${subId}`;
                }
                // For single answer print, we could use similar styling, but it's not requested here.
                // For now, it uses the browser's default print style for the main page content.
                printSingleAnswer(title, content, questions);
            });
        }

        const buttonContainer = document.querySelector('.button-container');
        if (buttonContainer) {
            let printAllSubIdsBtn = document.getElementById('printAllSubIdsBtn');
            if (!printAllSubIdsBtn) {
                printAllSubIdsBtn = document.createElement('button');
                printAllSubIdsBtn.id = 'printAllSubIdsBtn';
                buttonContainer.appendChild(printAllSubIdsBtn);
            }
            printAllSubIdsBtn.textContent = 'Alle Themen dieses Kapitels drucken';
            printAllSubIdsBtn.addEventListener('click', printAllSubIdsForAssignment);
        }
        
        window.addEventListener('resize', debouncedAdjustEditorHeight);
        console.log("Initialization complete (within IIFE)");
    });

})();
