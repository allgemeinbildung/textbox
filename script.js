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
        // Bold: **text** or __text__
        text = text.replace(/(\*\*|__)(?=\S)(.*?)(?<=\S)\1/g, '<strong>$2</strong>');
        // Italic: *text* or _text_
        text = text.replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/g, '<em>$2</em>');
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
        // Collect questions in order
        const questionKeys = Object.keys(params)
            .filter(key => key.startsWith('question') && params[key])
            .sort((a, b) => {
                const numA = parseInt(a.replace('question', ''), 10);
                const numB = parseInt(b.replace('question', ''), 10);
                return numA - numB;
            });

        questionKeys.forEach(key => {
            questions[key] = params[key][0];
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
            let questionsHtml = '<ol>'; // Start ordered list
            // Ensure questions are ordered if they come from params like question1, question2
            const sortedQuestionKeys = Object.keys(questions).sort((a, b) => {
                const numA = parseInt(a.replace('question', ''), 10);
                const numB = parseInt(b.replace('question', ''), 10);
                return numA - numB;
            });
            sortedQuestionKeys.forEach(key => {
                questionsHtml += `<li>${parseMarkdown(questions[key])}</li>`;
            });
            questionsHtml += '</ol>'; // End ordered list
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
        const lineHeight = '1.5em';
        const lineColor = '#d2d2d2';
        const numberOfLines = 22; // Fixed number of lines to display

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>${printWindowTitle}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif; 
                        color: #333; 
                        line-height: ${lineHeight};
                        padding: ${lineHeight}; 
                        margin: 0;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    .lined-content {
                        background-color: #fdfdfa;
                        position: relative;
                        /* Set exactly 15 lines height */
                        height: calc(${numberOfLines} * ${lineHeight});
                        padding: 0;
                        overflow: hidden; /* Changed from visible to hidden to prevent content overflow */
                        background-image: repeating-linear-gradient(
                            to bottom,
                            transparent 0px,
                            transparent calc(${lineHeight} - 1px),
                            ${lineColor} calc(${lineHeight} - 1px),
                            ${lineColor} ${lineHeight}
                        );
                        background-size: 100% ${lineHeight};
                        background-position: 0 0;
                        background-repeat: repeat-y;
                        /* Ensure no extra lines by limiting the background */
                        background-repeat: repeat-y;
                        background-image: repeating-linear-gradient(
                            to bottom,
                            transparent 0px,
                            transparent calc(${lineHeight} - 1px),
                            ${lineColor} calc(${lineHeight} - 1px),
                            ${lineColor} ${lineHeight}
                        ), linear-gradient(
                            to bottom,
                            transparent 0,
                            transparent calc(${numberOfLines} * ${lineHeight}),
                            #fdfdfa calc(${numberOfLines} * ${lineHeight}),
                            #fdfdfa 100%
                        );
                    }
                    /* If the content is empty, add a placeholder message */
                    .lined-content:empty::after {
                        content: "Antworten:";
                        font-style: italic;
                        position: absolute;
                        top: 0;
                        left: 0;
                        padding: 0 5px;
                    }
                    h1, h2, h3, h4, h5, h6, p, li, div, blockquote, pre,
                    .questions-print, .questions-print ol, .questions-print li,
                    .sub-assignment-block, .sub-assignment-block > div,
                    .ql-editor, .ql-editor p, .ql-editor ol, .ql-editor ul, .ql-editor li {
                        line-height: inherit; 
                        background-color: transparent !important;
                        margin-top: 0; 
                        margin-bottom: 0;
                    }
                    h2 { color: #003f5c; margin-bottom: ${lineHeight}; }
                    h3 { color: #2f4b7c; margin-top: ${lineHeight}; margin-bottom: ${lineHeight}; page-break-after: avoid; }
                    p, .ql-editor p, .ql-editor li { margin-top: 0 !important; margin-bottom: 0 !important; }
                    ul, ol, .ql-editor ul, .ql-editor ol {
                        margin-top: 0; margin-bottom: ${lineHeight}; padding-left: 2em; /* Default padding for ol/ul */
                    }
                    /* Specifically target ol within questions-print for tighter spacing if needed, but default is usually fine */
                    .questions-print ol {
                        margin-bottom: ${lineHeight}; /* Space after the entire list of questions */
                        padding-left: 1.5em; /* Adjust if needed, might be closer to browser default for <ol> */
                    }
                    .questions-print li {
                        margin-bottom: 0.25em; /* Optional: small space between questions if desired */
                    }
                    li { margin-bottom: 0; } /* General list items */
                    hr { border: 0; height: 1px; background-color: #999; margin: ${lineHeight} 0; }
                    .questions-print { margin-top: 0; margin-bottom: ${lineHeight}; }
                    .sub-assignment-block { 
                        page-break-inside: avoid; 
                        margin-bottom: ${lineHeight}; 
                        padding-top: 0.1px; 
                    }
                    .sub-assignment-block.new-page { page-break-before: always; margin-top: 0; }
                    strong { font-weight: bold; } em { font-style: italic; }
                    
                    /* For print, ensure each assignment starts on a new page */
                    @media print {
                        .sub-assignment-block {
                            page-break-after: always;
                        }
                        /* The last block doesn't need a page break after it */
                        .sub-assignment-block:last-child {
                            page-break-after: auto;
                        }
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        
        // After the document is loaded, ensure each lined-content area is properly filled
        printWindow.onload = function() {
            // Find all content blocks
            const blocks = printWindow.document.querySelectorAll('.sub-assignment-block');
            
            blocks.forEach((block, index) => {
                // Find the lined-content in this block
                const lined = block.querySelector('.lined-content');
                
                if (lined) {
                    // Ensure empty content blocks still show lines
                    if (lined.innerHTML.trim() === '' || lined.innerHTML === '<p><br></p>') {
                        lined.innerHTML = '<p><em>Antworten:</em></p>';
                    }
                    
                    // Make sure content is properly positioned
                    const contentElements = lined.querySelectorAll('p, div');
                    contentElements.forEach(el => {
                        el.style.position = 'relative';
                        el.style.zIndex = '1';
                    });

                    // Ensure the content doesn't exceed the 20 lines
                    // If the content is too large, it will be clipped due to overflow:hidden
                    lined.style.height = `calc(${numberOfLines} * ${lineHeight})`;
                    lined.style.maxHeight = `calc(${numberOfLines} * ${lineHeight})`;
                }
            });
            
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        };
    }

    function getQuestionsFromStorage(assignmentId, subId) {
        const storageKey = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
        const storedQuestions = localStorage.getItem(storageKey);
        if (storedQuestions) {
            try {
                return JSON.parse(storedQuestions); // This should be an object like {question1: "...", question2: "..."}
            } catch (e) {
                console.error(`Error parsing questions for ${subId}:`, e);
                return {};
            }
        }
        return {};
    }

    function getQuestionsHtmlFromStorage(assignmentId, subId) {
        const questionsObject = getQuestionsFromStorage(assignmentId, subId); // Expecting an object
        if (Object.keys(questionsObject).length > 0) {
            let html = '<div class="questions-print">';
            html += '<ol>'; // Start ordered list
            // Sort keys like "question1", "question2" to maintain order
            const sortedQuestionKeys = Object.keys(questionsObject).sort((a, b) => {
                const numA = parseInt(a.replace('question', ''), 10);
                const numB = parseInt(b.replace('question', ''), 10);
                return numA - numB;
            });
            sortedQuestionKeys.forEach(key => {
                html += `<li>${parseMarkdown(questionsObject[key])}</li>`;
            });
            html += '</ol>'; // End ordered list
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
        const subIdAnswerMap = new Map();

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
        // Add the main assignment title. This will be on the first page.
        let allContent = `<h2>Aufgabe: ${assignmentSuffix}</h2>`;
        let contentAdded = false;

        sortedSubIds.forEach((subId, index) => {
            const answerContent = subIdAnswerMap.get(subId);
            const questionsHtml = getQuestionsHtmlFromStorage(assignmentId, subId); // This now returns an <ol>

            if (questionsHtml || answerContent) {
                contentAdded = true;
                // The first block (index 0) does not get 'new-page' and will appear on the first page with the H2.
                // Subsequent blocks (index > 0) get 'new-page' to trigger 'page-break-before: always'.
                const blockClass = 'sub-assignment-block' + (index > 0 ? ' new-page' : '');
                allContent += `<div class="${blockClass}">`;
                allContent += `<h3>${subId}</h3>`;

                if (questionsHtml) {
                    allContent += questionsHtml;
                }

                // Ensure lined-content is always present for each block
                if (answerContent) {
                    allContent += `<div class="lined-content">${answerContent}</div>`;
                } else { // If no answer content, provide the placeholder within the lined area
                    allContent += `<div class="lined-content"><p><em>Antworten:</em></p></div>`;
                }
                allContent += `</div>`;
                // HORIZONTAL RULE LOGIC REMOVED
                // if (index < sortedSubIds.length - 1) {
                //      allContent += `<hr>`;
                // }
            }
        });
        
        // REMOVED THE LOGIC THAT SLICES THE LAST HR, AS HR IS NO LONGER ADDED
        // if (allContent.endsWith('<hr>')) {
        //     allContent = allContent.slice(0, -4);
        // }

        if (!contentAdded) {
            alert("Obwohl Themen-IDs gefunden wurden, gab es keinen Inhalt (weder Fragen noch Antworten) zum Drucken.");
            return;
        }
        printFormattedContent(allContent, `${assignmentSuffix}`);
    }



    function updateSubIdInfo() {
        const subIdInfoElement = document.getElementById('subIdInfo');
        if (!subIdInfoElement) return;

        const { subId, questions } = getCurrentSubIdAndQuestions(); // questions is an object {question1: "...", ...}
        if (subId) {
            let html = `<h4>Thema: ${subId}</h4>`;
            if (Object.keys(questions).length > 0) {
                html += '<div class="questions-container">';
                html += '<ol>'; // Start ordered list
                // Iterate based on sorted keys if questions come from params like question1, question2
                const sortedQuestionKeys = Object.keys(questions).sort((a, b) => {
                    const numA = parseInt(a.replace('question', ''), 10);
                    const numB = parseInt(b.replace('question', ''), 10);
                    return numA - numB;
                });
                sortedQuestionKeys.forEach(key => {
                    html += `<li>${parseMarkdown(questions[key])}</li>`;
                });
                html += '</ol>'; // End ordered list
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
                    quill.root.addEventListener('paste', function(e) {
                        e.preventDefault();
                        alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
                    });
                }
                
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
                if (!quill) { alert("Editor nicht initialisiert."); return; }
                const content = quill.root.innerHTML;
                if (content === '<p><br></p>' || content === '') { alert("Kein Inhalt zum Drucken vorhanden."); return; }
                const { subId, questions } = getCurrentSubIdAndQuestions();
                let title = `Aufgabe: ${assignmentSuffix}`;
                if(subId) { title += ` - Thema: ${subId}`; }
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