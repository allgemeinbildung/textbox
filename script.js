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
        printDiv.style.visibility = 'hidden'; // Hide until beforeprint
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        printDiv.appendChild(titleElement);

        if (Object.keys(questions).length > 0) {
            const questionsElement = document.createElement('div');
            questionsElement.className = 'questions-print'; // For styling
            let questionsHtml = '';
            Object.values(questions).forEach(question => {
                questionsHtml += `<div>- ${parseMarkdown(question)}</div>`;
            });
            questionsElement.innerHTML = questionsHtml;
            printDiv.appendChild(questionsElement);
        }

        const contentElement = document.createElement('div');
        contentElement.innerHTML = content; // This is Quill's HTML content
        printDiv.appendChild(contentElement);

        document.body.appendChild(printDiv);
        document.body.classList.add('print-single'); // Add class to body

        function handleAfterPrint() {
            document.body.classList.remove('print-single'); // Remove class from body
            const printDivAfter = document.getElementById('printSingleContent');
            if (printDivAfter) {
                document.body.removeChild(printDivAfter);
            }
            window.removeEventListener('afterprint', handleAfterPrint);
            window.removeEventListener('beforeprint', handleBeforePrint); // Also remove beforeprint
        }
        function handleBeforePrint() {
            // Ensure the printDiv is visible for printing
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
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .lined-content {
                        background-color: #fdfdfa; /* Slightly off-white paper color */
                        background-image: linear-gradient(to bottom, transparent 0%, transparent calc(${lineHeight} - 1px), ${lineColor} calc(${lineHeight} - 1px), ${lineColor} ${lineHeight});
                        background-size: 100% ${lineHeight};
                        background-position: 0 0; /* Start lines from top-left of padding box */
                        background-repeat: repeat-y;
                        /* min-height ensures lines are drawn even for short content, relative to viewport or block */
                        min-height: calc(100vh - var(--content-offset, 0px)); 
                        padding: 0.1px; /* Small padding to ensure background covers area, can be adjusted */
                    }
                    /* Ensure common text elements inherit line-height and have transparent backgrounds */
                    h1, h2, h3, h4, h5, h6, p, li, div, blockquote, pre,
                    .questions-print, .questions-print div,
                    .sub-assignment-block, .sub-assignment-block > div,
                    .ql-editor, .ql-editor p, .ql-editor ol, .ql-editor ul, .ql-editor li {
                        line-height: inherit; /* Inherit from body for alignment */
                        background-color: transparent !important; /* Ensure no element hides the lines */
                         margin-top: 0; /* Reset top margin for these elements to align with lines */
                         margin-bottom: 0; /* Reset bottom margin */
                    }
                    h2 { /* Chapter Title */
                        color: #003f5c;
                        margin-top: 0; 
                        margin-bottom: ${lineHeight}; /* Space after chapter title */
                    }
                    h3 { /* Sub-Assignment (Thema) Title */
                        color: #2f4b7c;
                        margin-top: ${lineHeight}; /* Space before a new sub-assignment title */
                        margin-bottom: ${lineHeight}; /* Space after sub-assignment title */
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
                        margin-top: 0; 
                        margin-bottom: ${lineHeight}; /* Space after questions block */
                    }
                    .questions-print div { /* Individual question line */
                         margin-bottom: 0; /* Each question should take its natural line height */
                    }
                    .sub-assignment-block {
                        page-break-inside: avoid;
                        margin-bottom: ${lineHeight}; /* Space after a block */
                        padding-top: 0.1px; /* Fixes potential margin collapsing issue */
                    }
                    .sub-assignment-block.new-page {
                        page-break-before: always;
                         margin-top: 0; /* Reset margin after page break */
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
            // Adjust background position based on actual content offset on each page
            const pageHeight = Math.max(printWindow.innerHeight, printWindow.document.documentElement.clientHeight);
            const blocks = printWindow.document.querySelectorAll('.sub-assignment-block .lined-content'); // Target only lined content within blocks
            blocks.forEach(lined => {
                const rect = lined.getBoundingClientRect();
                // Calculate offset relative to the start of its print page.
                // This is tricky because getBoundingClientRect is relative to viewport.
                // For simplicity, assuming block starts somewhat fresh on a page or its offset calculation is for full page draw.
                // A more robust solution for multi-page background alignment might require complex calculations or CSS Houdini.
                // The current --content-offset approach is more for single, continuous blocks.
                // For now, we'll assume a simple 0 offset or a global one if needed.
                // lined.style.setProperty('--content-offset', '0px'); // Or a calculated offset if possible
            });
            printWindow.focus();
            printWindow.print();
        }, 500); // Delay to allow content and styles to render
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
            let html = '<div class="questions-print">'; // Class for styling
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
        const answerPrefix = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}`;
        const questionStoragePrefixForAssignment = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}`;

        const subIdSet = new Set();
        const subIdAnswerMap = new Map(); // To store answers if they exist

        // Collect all subIds that have saved answers or saved questions
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(answerPrefix)) {
                const subId = key.substring(answerPrefix.length);
                subIdSet.add(subId);
                subIdAnswerMap.set(subId, localStorage.getItem(key));
            } else if (key.startsWith(questionStoragePrefixForAssignment)) {
                const subId = key.substring(questionStoragePrefixForAssignment.length);
                subIdSet.add(subId);
            }
        }

        if (subIdSet.size === 0) {
            alert("Keine gespeicherten Themen oder Fragen für dieses Kapitel gefunden, die gedruckt werden könnten.\nStellen Sie sicher, dass die entsprechenden iframes mit den Fragen mindestens einmal geladen wurden.");
            return;
        }

        const sortedSubIds = Array.from(subIdSet).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;
        let allContent = `<h2>Aufgabe: ${assignmentSuffix}</h2>`;
        let contentAdded = false; // Flag to check if any meaningful content was added

        sortedSubIds.forEach((subId, index) => {
            const answerContent = subIdAnswerMap.get(subId);
            const questionsHtml = getQuestionsHtmlFromStorage(assignmentId, subId);

            if (questionsHtml || answerContent) { // Only create a block if there's something to show
                contentAdded = true;
                const blockClass = index > 0 ? 'sub-assignment-block new-page' : 'sub-assignment-block';
                allContent += `<div class="${blockClass}">`;
                allContent += `<h3>Thema: ${subId}</h3>`;

                if (questionsHtml) {
                    allContent += questionsHtml;
                }

                if (answerContent) {
                    allContent += `<div class="lined-content">${answerContent}</div>`;
                } else if (questionsHtml) { // If there were questions but no answer
                    allContent += `<div class="lined-content"><p><em>Antworten:</em></p></div>`;
                }
                allContent += `</div>`;
                // Add <hr> only if it's not the last item that will have content
                if (index < sortedSubIds.length - 1) {
                     // Check if next subId also has content/questions to avoid trailing hr before an empty block that gets skipped.
                     // For simplicity now, we add it and remove if it's the absolute last thing.
                     allContent += `<hr>`;
                }
            }
        });
        
        // Clean up trailing <hr> if present
        if (allContent.endsWith('<hr>')) {
            allContent = allContent.slice(0, -4);
        }

        if (!contentAdded) {
            alert("Obwohl Themen-IDs gefunden wurden, gab es keinen Inhalt (weder Fragen noch Antworten) zum Drucken.");
            return;
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
                html += '<div class="questions-container">'; // For styling
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
        editorNode.style.height = 'auto'; // Reset height to allow scrollHeight to be accurate
        let scrollHeight = editorNode.scrollHeight;
        const maxHeight = 300; // Max height in pixels

        if (scrollHeight > maxHeight) {
            editorNode.style.height = maxHeight + 'px';
            editorNode.style.overflowY = 'auto';
        } else {
            // Use scrollHeight if less than max, but ensure min-height from CSS is respected
            // The min-height is effectively handled by Quill's own padding and initial line.
            editorNode.style.height = scrollHeight + 'px';
            editorNode.style.overflowY = 'hidden';
        }
    }
    const debouncedAdjustEditorHeight = debounce(adjustEditorHeight, 150);


    document.addEventListener("DOMContentLoaded", function() {
        const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;
        
        // Update assignment info if element exists (it's not in answers.html but might be in a parent context)
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

                if (quill.root) { // .ql-editor element
                    quill.root.style.overflowY = 'hidden'; // Initial state, managed by adjustEditorHeight
                    quill.root.style.boxSizing = 'border-box';

                    // Prevent pasting
                    quill.root.addEventListener('paste', function(e) {
                        e.preventDefault();
                        alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
                    });
                }
                
                quill.on('text-change', function(delta, oldDelta, source) {
                    if (source === 'user') {
                        debouncedSave();
                    }
                    adjustEditorHeight(); // Adjust height on text change
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
                adjustEditorHeight(); // Initial height adjustment after loading content

            } catch (error) {
                console.error("Failed to initialize Quill:", error);
                answerBox.innerHTML = "Fehler beim Laden des Editors.";
            }
        } else {
            console.log("Element #answerBox not found. Quill not initialized.");
        }

        updateSubIdInfo(); // Display subId and its questions
        const { subId: currentSubId, questions: currentQuestions } = getCurrentSubIdAndQuestions();
        if (currentSubId && Object.keys(currentQuestions).length > 0) {
            saveQuestionsToLocal(assignmentId, currentSubId, currentQuestions);
        }

        const downloadCurrentBtn = document.getElementById('downloadAllBtn'); // This ID is for current answer print
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
                printSingleAnswer(title, content, questions); 
            });
        }

        const buttonContainer = document.querySelector('.button-container');
        if (buttonContainer) {
            let printAllSubIdsBtn = document.getElementById('printAllSubIdsBtn');
            if (!printAllSubIdsBtn) {
                printAllSubIdsBtn = document.createElement('button');
                printAllSubIdsBtn.id = 'printAllSubIdsBtn';
                buttonContainer.appendChild(printAllSubIdsBtn); // Append to the existing container
            }
            printAllSubIdsBtn.textContent = 'Alle Themen dieses Kapitels drucken';
            printAllSubIdsBtn.addEventListener('click', printAllSubIdsForAssignment);
        }
        
        window.addEventListener('resize', debouncedAdjustEditorHeight);
        console.log("Initialization complete (within IIFE)");
    });

})();