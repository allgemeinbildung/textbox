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
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>${printWindowTitle}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h2 { color: #003f5c; margin-top: 1.5em; margin-bottom: 0.5em; }
                    h3 { color: #2f4b7c; margin-top: 1em; margin-bottom: 0.3em; page-break-after: avoid; }
                    hr { border: 0; border-top: 1px solid #ccc; margin: 20px 0; }
                    .questions-print { margin-bottom: 15px; }
                    .questions-print div { margin-bottom: 5px; }
                    .questions-print strong { color: #004085; font-weight: bold; }
                    .questions-print em { color: #004085; font-style: italic; }
                    ul, ol { margin-left: 20px; padding-left: 20px; }
                    li { margin-bottom: 5px; }
                    p { margin-bottom: 10px; line-height: 1.4; }
                    strong { font-weight: bold; }
                    em { font-style: italic; }
                    .sub-assignment-block { page-break-inside: avoid; }
                    .sub-assignment-block.new-page { page-break-before: always; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
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
                allContent += `<div>${content}</div>`;
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

    // Moved debouncedSave definition here to be accessible by adjustEditorHeight if needed (though not directly used by it)
    const debouncedSave = debounce(saveToLocal, 1500);

    // --- Function to adjust editor height ---
    function adjustEditorHeight() {
        if (!quill || !quill.root) return;

        const editorNode = quill.root; // This is the .ql-editor div (content area)

        // Ensure box-sizing is applied before scrollHeight calculation for consistency
        editorNode.style.boxSizing = 'border-box'; 
        editorNode.style.height = 'auto'; // Reset height to allow scrollHeight to be calculated correctly

        let scrollHeight = editorNode.scrollHeight;
        const maxHeight = 300; // Define a maximum height in pixels (e.g., ~10-12 lines)

        if (scrollHeight > maxHeight) {
            editorNode.style.height = maxHeight + 'px';
            editorNode.style.overflowY = 'auto'; // Show scrollbar when content exceeds max-height
        } else {
            // CSS min-height on #answerBox .ql-editor will ensure it doesn't get too small
            editorNode.style.height = scrollHeight + 'px';
            editorNode.style.overflowY = 'hidden'; // Hide scrollbar if content is less than max-height
        }
    }
    const debouncedAdjustEditorHeight = debounce(adjustEditorHeight, 150);


    // --- Initialization Code ---
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

                quill.root.addEventListener('paste', function(e) {
                    e.preventDefault();
                    alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
                });
                
                // Initial style setup for dynamic height
                if (quill.root) {
                    quill.root.style.overflowY = 'hidden'; // Start with hidden scrollbar
                    quill.root.style.boxSizing = 'border-box'; // Ensure correct box model for height calculations
                }


                // Modified text-change listener
                quill.on('text-change', function(delta, oldDelta, source) {
                    if (source === 'user') {
                        debouncedSave(); // Existing call to save content
                    }
                    adjustEditorHeight(); // Adjust height on every text change
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

                // Initial height adjustment after loading content and Quill initialization
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
        
        // Add resize listener for editor height
        window.addEventListener('resize', debouncedAdjustEditorHeight);

        console.log("Initialization complete (within IIFE)");
    }); // End DOMContentLoaded listener

})(); // End IIFE
