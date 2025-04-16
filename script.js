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

    // Deprecated - parentTitle seems unused based on code examination
    // function getParentPageTitle() {
    //     return getQueryParam('parentTitle') || '';
    // }

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
            // Optionally remove the item from storage if it exists?
            // const storageKey = getStorageKey();
            // localStorage.removeItem(storageKey);
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
             // Handle potential storage full errors if necessary
             alert("Fehler beim Speichern. Möglicherweise ist der Speicherplatz voll.");
        }
    }

    // Clear localStorage - only textbox-prefixed keys (now local to this IIFE)
    // Note: This function isn't called by any button in the provided HTML,
    // but kept here for completeness if it was intended for debugging/future use.
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
            let questionsHtml = '<em>'; // Use em for italic styling via CSS
            Object.values(questions).forEach(question => {
                // Use parseMarkdown here for consistency if questions contain markdown
                questionsHtml += `<div>- ${parseMarkdown(question)}</div>`;
            });
            questionsHtml += '</em>';
            questionsElement.innerHTML = questionsHtml;
            printDiv.appendChild(questionsElement);
        }

        const contentElement = document.createElement('div');
        contentElement.innerHTML = content; // Assumes content is valid HTML from Quill
        printDiv.appendChild(contentElement);

        document.body.appendChild(printDiv);
        document.body.classList.add('print-single'); // Add class to body for print styles

        function handleAfterPrint() {
            document.body.classList.remove('print-single'); // Remove class after printing
            const printDivAfter = document.getElementById('printSingleContent');
            if (printDivAfter) {
                document.body.removeChild(printDivAfter); // Clean up the temporary div
            }
            // Clean up listener to prevent memory leaks
            window.removeEventListener('afterprint', handleAfterPrint);
            window.removeEventListener('beforeprint', handleBeforePrint); // Remove other listener too
        }

        function handleBeforePrint() {
             // Ensure content is visible right before printing
            printDiv.style.visibility = 'visible';
        }

        // Add listeners
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);

        // Trigger print
        window.print();
    }

    // Print all answers (Helper for printing content in a new window - now local)
    // This specific function is slightly different from the implementation
    // in print_page.html, but serves a similar purpose for structured content.
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
                        font-style: italic;
                        color: #333; /* Ensure readability */
                    }
                    .questions-print div {
                        margin-bottom: 5px;
                    }
                    /* Ensure Quill content like lists are printed correctly */
                    ul, ol { margin-left: 20px; padding-left: 20px; }
                    li { margin-bottom: 5px; }
                    p { margin-bottom: 10px; line-height: 1.4; }
                    strong { font-weight: bold; }
                    em { font-style: italic; }
                    /* Add page break handling if needed */
                    h2 { page-break-before: always; } /* Start each main assignment on new page */
                    h3 { page-break-after: avoid; } /* Avoid breaking after sub-heading */
                    .sub-assignment-block { page-break-inside: avoid; } /* Try keep sub-assignment together */

                    @media print {
                      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Try to force background/color printing */
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        // Use timeout to ensure content is loaded before printing in most browsers
        setTimeout(() => {
            printWindow.focus(); // Focus the new window
            printWindow.print();
            // Don't close immediately, user might need to interact with print dialog
            // printWindow.close();
        }, 500); // Adjust delay if needed
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
                return {}; // Return empty object on error
            }
        }
        return {}; // Return empty object if not found
    }

    // Get questions HTML from localStorage (now local)
    function getQuestionsHtmlFromStorage(assignmentId, subId) {
        const questions = getQuestionsFromStorage(assignmentId, subId);

        if (Object.keys(questions).length > 0) {
            let html = '<div class="questions-print"><em>';
            Object.values(questions).forEach(question => {
                // Use parseMarkdown for consistency
                html += `<div>- ${parseMarkdown(question)}</div>`;
            });
            html += '</em></div>';
            return html;
        }
        return ''; // Return empty string if no questions
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

        // Extract suffix for display (assuming format like 'assignment_ChapterName')
        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;
        let allContent = `<h2>Aufgabe: ${assignmentSuffix}</h2>`; // Main title for the whole chapter

        // Sort keys by subId for consistent order
        storageKeys.sort((a, b) => {
            const subIdA = a.replace(assignmentPrefix, '');
            const subIdB = b.replace(assignmentPrefix, '');
            // Add numeric sort if subIds are numbers, otherwise localeCompare
             return subIdA.localeCompare(subIdB, undefined, {numeric: true, sensitivity: 'base'});
        });

        storageKeys.forEach(key => {
             const content = localStorage.getItem(key);
             if (content) {
                 const subId = key.replace(assignmentPrefix, '');
                 const questionsHtml = getQuestionsHtmlFromStorage(assignmentId, subId);

                 // Wrap each sub-assignment in a div for better page break control potentially
                 allContent += `<div class="sub-assignment-block">`;
                 allContent += `<h3>Thema: ${subId}</h3>`; // Sub-heading for the topic
                 if (questionsHtml) {
                     allContent += questionsHtml; // Add questions below sub-heading
                 }
                 allContent += `<div>${content}</div>`; // The actual Quill content
                 allContent += `</div>`; // Close sub-assignment block
                 allContent += `<hr>`; // Separator between topics
             }
        });

        // Remove the last <hr> if it exists
        if (allContent.endsWith('<hr>')) {
            allContent = allContent.slice(0, -4);
        }

        printFormattedContent(allContent, `Alle Themen für Kapitel ${assignmentSuffix}`); // Use the helper print function
    }

    // Update subId info in the UI (now local)
    function updateSubIdInfo() {
        const subIdInfoElement = document.getElementById('subIdInfo');
        if (!subIdInfoElement) return; // Only run if element exists

        const { subId, questions } = getCurrentSubIdAndQuestions();

        if (subId) {
            let html = `<h4>Thema: ${subId}</h4>`; // Use h4 for topic title

            if (Object.keys(questions).length > 0) {
                html += '<div class="questions-container"><em>'; // Use class for styling
                Object.values(questions).forEach(question => {
                    html += `<div>- ${parseMarkdown(question)}</div>`; // Parse potential markdown in questions
                });
                html += '</em></div>';
            }

            subIdInfoElement.innerHTML = html;
            subIdInfoElement.style.display = 'block'; // Show the element
        } else {
            subIdInfoElement.innerHTML = ''; // Clear content if no subId
            subIdInfoElement.style.display = 'none'; // Hide the element
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
    // This runs when the DOM is ready
    document.addEventListener("DOMContentLoaded", function() {

        const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
        // Extract a cleaner name for display if possible (e.g., 'Kapitel 1' from 'assignment_Kapitel1')
        const assignmentSuffix = assignmentId.includes('_') ? assignmentId.substring(assignmentId.indexOf('_') + 1) : assignmentId;

        // Display Assignment Info (if element exists)
        const assignmentInfo = document.getElementById('assignmentInfo');
        if (assignmentInfo) {
             assignmentInfo.textContent = assignmentSuffix ? `Aufgabe: ${assignmentSuffix}` : 'Kapitel';
        }

        // Initialize Quill Editor (if element exists)
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
                            ['clean'] // Remove formatting button
                        ]
                    }
                });

                // Paste prevention
                quill.root.addEventListener('paste', function(e) {
                    e.preventDefault();
                    alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
                });

                // Debounced save on text change
                const debouncedSave = debounce(saveToLocal, 1500); // Save 1.5 seconds after user stops typing
                quill.on('text-change', function(delta, oldDelta, source) {
                    if (source === 'user') {
                        debouncedSave();
                    }
                    // Optionally add monitoring for 'api' source here if desired
                });

                 // Load existing text
                 const { subId } = getCurrentSubIdAndQuestions();
                 const storageKey = subId
                    ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
                    : `${STORAGE_PREFIX}${assignmentId}`;

                 const savedText = localStorage.getItem(storageKey);

                 if (savedText) {
                    quill.root.innerHTML = savedText; // Load HTML content
                    console.log(`Gespeicherten Text für ${storageKey} geladen`);
                 } else {
                    console.log(`Kein gespeicherter Text für ${storageKey} gefunden`);
                 }

            } catch (error) {
                 console.error("Failed to initialize Quill:", error);
                 answerBox.innerHTML = "Fehler beim Laden des Editors."; // Show error to user
            }
        } else {
             console.log("Element #answerBox not found. Quill not initialized.");
        }

        // Update SubId Info display
        updateSubIdInfo();

        // Save current questions to localStorage (if any)
        const { subId: currentSubId, questions: currentQuestions } = getCurrentSubIdAndQuestions();
        if (currentSubId && Object.keys(currentQuestions).length > 0) {
            saveQuestionsToLocal(assignmentId, currentSubId, currentQuestions);
        }


        // --- Button Event Listeners ---
        // Note: Assumes this script is primarily for answers.html layout

        // Button to Print/Save CURRENT editor content as PDF
        const downloadCurrentBtn = document.getElementById('downloadAllBtn'); // ID is confusing, maybe rename to 'printCurrentBtn'?
        if (downloadCurrentBtn) {
            // Rename button text for clarity
            downloadCurrentBtn.textContent = 'Aktuelle Antwort drucken / als PDF speichern';
            downloadCurrentBtn.addEventListener('click', function() {
                if (!quill) {
                     alert("Editor nicht initialisiert.");
                     return;
                }
                const content = quill.root.innerHTML;
                // Prevent printing empty content
                 if (content === '<p><br></p>' || content === '') {
                    alert("Kein Inhalt zum Drucken vorhanden.");
                    return;
                 }

                const { subId, questions } = getCurrentSubIdAndQuestions();
                let title = `Aufgabe: ${assignmentSuffix}`;
                if(subId) {
                    title += ` - Thema: ${subId}`;
                }

                printSingleAnswer(title, content, questions); // Use the local print function
            });
        }

        // Button to Print ALL saved sub-assignments for the CURRENT chapter
        // Check if a button container exists to append to
        const buttonContainer = document.querySelector('.button-container');
        if (buttonContainer) {
            // Check if the button already exists (e.g., defined in HTML)
            let printAllSubIdsBtn = document.getElementById('printAllSubIdsBtn');

            if (!printAllSubIdsBtn) {
                 // Create the button if it doesn't exist
                printAllSubIdsBtn = document.createElement('button');
                printAllSubIdsBtn.id = 'printAllSubIdsBtn';
                buttonContainer.appendChild(printAllSubIdsBtn); // Append to container
            }

            // Set text content and add listener
            printAllSubIdsBtn.textContent = 'Alle Themen dieses Kapitels drucken';
            printAllSubIdsBtn.addEventListener('click', printAllSubIdsForAssignment); // Use the local print function

        }

        console.log("Initialization complete (within IIFE)");

    }); // End DOMContentLoaded listener

})(); // End IIFE
