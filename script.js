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

        // Parse bold (** or __)
        text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

        // Parse italic (* or _)
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
                questions[key] = params[key][0]; // Take the first question if multiple provided for same key
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

    // Save questions to localStorage - new function (now local to this IIFE)
    function saveQuestionsToLocal(assignmentId, subId, questions) {
        if (!subId || Object.keys(questions).length === 0) return;

        const storageKey = `${QUESTIONS_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(questions));
            console.log(`Questions for ${storageKey} saved`);
        } catch (e) {
            console.error("Error saving questions to localStorage:", e);
            // Handle potential storage full errors if necessary
        }
    }

    // Save text to localStorage (now local to this IIFE)
    function saveToLocal() {
        if (!quill) return; // Make sure Quill is initialized

        const htmlContent = quill.root.innerHTML;
        // Basic check for empty content (e.g., "<p><br></p>")
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

    // Clear localStorage - only textbox-prefixed keys (now local to this IIFE)
    function clearLocalStorage() {
        const keysToRemove = [];
        const prefix = 'textbox-'; // Clear all related keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        if (quill) quill.setText(''); // Clear the current editor instance

        console.log("All textbox-* prefixed keys cleared from localStorage");
        alert("Alle gespeicherten Texte wurden gelöscht."); // Give user feedback
    }

    // Print a single answer (now local to this IIFE)
    function printSingleAnswer(title, content, questions = {}) {
        const existingPrintDiv = document.getElementById('printSingleContent');
        if (existingPrintDiv) {
            document.body.removeChild(existingPrintDiv);
        }

        const printDiv = document.createElement('div');
        printDiv.id = 'printSingleContent';
        printDiv.style.visibility = 'hidden'; // Hide initially

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        printDiv.appendChild(titleElement);

        // Add questions if they exist
        if (Object.keys(questions).length > 0) {
            const questionsElement = document.createElement('div');
            questionsElement.className = 'questions-print'; // Use class for styling
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

    // Print all answers (Helper for printing content in a new window - now local)
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
                    h3 { color: #2f4b7c; margin-top: 1em; margin-bottom: 0.3em;}
                    hr { border: 0; border-top: 1px solid #ccc; margin: 20px 0; }
                    .questions-print {
                        margin-bottom: 15px;
                    }
                    .questions-print div {
                        margin-bottom: 5px;
                    }
                    .questions-print strong { 
                        color: #004085; /* MODIFIED: Blue color */
                        font-weight: bold;
                    }
                    .questions-print em { 
                        color: #004085; /* MODIFIED: Blue color */
                        font-style: italic;
                    }
                    ul, ol { margin-left: 20px; padding-left: 20px; }
                    li { margin-bottom: 5px; }
                    p { margin-bottom: 10px; line-height: 1.4; }
                    strong { font-weight: bold; } 
                    em { font-style: italic; }   
                    h2 { page-break-before: always; }
                    h3 { page-break-after: avoid; }
                    .sub-assignment-block { page-break-inside: avoid; }

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


    // Get questions from localStorage for a specific subId (now local)
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

    // Get questions HTML from localStorage (now local)
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

    // Print all subIds for the current assignment (now local)
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

        storageKeys.forEach(key => {
            const content = localStorage.getItem(key);
            if (content) {
                const subId = key.replace(assignmentPrefix, '');
                const questionsHtml = getQuestionsHtmlFromStorage(assignmentId, subId); 

                allContent += `<div class="sub-assignment-block">`;
                allContent += `<h3>Thema: ${subId}</h3>`;
                if (questionsHtml) {
                    allContent += questionsHtml; 
                }
                allContent += `<div>${content}</div>`;
                allContent += `</div>`;
                allContent += `<hr>`;
            }
        });

        if (allContent.endsWith('<hr>')) {
            allContent = allContent.slice(0, -4);
        }

        printFormattedContent(allContent, `Alle Themen für Kapitel ${assignmentSuffix}`);
    }

    // Update subId info in the UI (now local)
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

    // Debounce function (now local)
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

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

                const debouncedSave = debounce(saveToLocal, 1500);
                quill.on('text-change', function(delta, oldDelta, source) {
                    if (source === 'user') {
                        debouncedSave();
                    }
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

        console.log("Initialization complete (within IIFE)");

    }); // End DOMContentLoaded listener

})(); // End IIFE
