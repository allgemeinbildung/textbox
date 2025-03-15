// Constants for storage keys
const STORAGE_PREFIX = 'boxsuk-assignment_';
const SUB_STORAGE_PREFIX = 'boxsuk-sub_';

// Global variables
let quill;

// Utility function to get URL parameters
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

// Get a specific query parameter
function getQueryParam(param) {
    return getQueryParams()[param];
}

// Get parent page title from URL
function getParentPageTitle() {
    return getQueryParam('parentTitle') || '';
}

// Get current subId and questions from URL
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

// Show save indicator
function showSaveIndicator() {
    const saveIndicator = document.getElementById('saveIndicator');
    if (!saveIndicator) return;
    
    saveIndicator.style.opacity = '1';
    setTimeout(() => {
        saveIndicator.style.opacity = '0';
    }, 2000);
}

// Toggle bulk delete button based on selection
function toggleBulkDeleteButton() {
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (!bulkDeleteBtn) return;
    
    const selectedCheckboxes = document.querySelectorAll(".select-answer:checked");
    bulkDeleteBtn.disabled = selectedCheckboxes.length === 0;
}

// Display saved answer in the UI
function displaySavedAnswer(content) {
    const savedAnswerContainer = document.getElementById('savedAnswerContainer');
    const savedAssignmentTitle = document.getElementById('savedAssignmentTitle');
    const savedAnswer = document.getElementById('savedAnswer');
    
    if (!savedAssignmentTitle || !savedAnswer || !savedAnswerContainer) return;
    
    const { subId, questions } = getCurrentSubIdAndQuestions();
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');
    const parentTitle = getParentPageTitle();
    
    let titleText = parentTitle
        ? `${parentTitle}\nKapitel: ${assignmentSuffix}`
        : `Kapitel: ${assignmentSuffix}`;
    if (subId) {
        titleText += `\nThema: ${subId}`;
    }
    savedAssignmentTitle.textContent = titleText;

    let questionsHtml = '';
    if (Object.keys(questions).length > 0) {
        questionsHtml += '<div class="questions-container"><em>';
        Object.values(questions).forEach(question => {
            questionsHtml += `<div>- ${question}</div>`;
        });
        questionsHtml += '</em></div>';
    }
    savedAnswer.innerHTML = questionsHtml + content;
    savedAnswerContainer.style.display = 'block';
}

// Save text to localStorage
function saveToLocal() {
    if (!quill) return;
    
    const htmlContent = quill.root.innerHTML;
    const textContent = quill.getText().trim();
    if (textContent === "") {
        console.log("Versuch, mit leerem Textfeld zu speichern");
        return;
    }
    
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const { subId } = getCurrentSubIdAndQuestions();
    const storageKey = subId 
        ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
        : `${STORAGE_PREFIX}${assignmentId}`;
    
    localStorage.setItem(storageKey, htmlContent);
    console.log(`Text für ${storageKey} gespeichert`);
    
    displaySavedAnswer(htmlContent);
    showSaveIndicator();
    loadAllAnswers();
}

// Clear localStorage - only boxsuk-prefixed keys
function clearLocalStorage() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (quill) quill.setText('');
    
    const savedAnswerContainer = document.getElementById('savedAnswerContainer');
    if (savedAnswerContainer) savedAnswerContainer.style.display = 'none';
    
    console.log("Alle gespeicherten boxsuk-Texte wurden gelöscht");
    loadAllAnswers();
}

// Delete selected answers in bulk
function bulkDeleteAnswers() {
    const selectedCheckboxes = document.querySelectorAll(".select-answer:checked");
    if(selectedCheckboxes.length === 0) {
        alert("Bitte wählen Sie mindestens eine Antwort zum Löschen aus.");
        return;
    }
    
    if(!confirm(`Sind Sie sicher, dass Sie ${selectedCheckboxes.length} ausgewählte Antwort(en) löschen möchten?`)) {
        return;
    }
    
    selectedCheckboxes.forEach(cb => {
        const assignmentId = cb.value;
        localStorage.removeItem(assignmentId);
        console.log(`Antwort für ${assignmentId} gelöscht.`);
    });
    
    alert(`${selectedCheckboxes.length} Antwort(en) wurden gelöscht.`);
    loadAllAnswers();
}

// Print a single answer
function printSingleAnswer(title, content, questions = {}) {
    const existingPrintDiv = document.getElementById('printSingleContent');
    if (existingPrintDiv) {
        document.body.removeChild(existingPrintDiv);
    }
    
    const printDiv = document.createElement('div');
    printDiv.id = 'printSingleContent';

    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    printDiv.appendChild(titleElement);

    // Add questions if provided
    if (Object.keys(questions).length > 0) {
        const questionsElement = document.createElement('div');
        questionsElement.className = 'questions-print';
        questionsElement.innerHTML = '<em>';
        Object.values(questions).forEach(question => {
            questionsElement.innerHTML += `<div>- ${question}</div>`;
        });
        questionsElement.innerHTML += '</em>';
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
    }
    
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
}

// Print all answers
function printAllAnswers(content) {
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Alle Antworten</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { color: #003f5c; }
                h3 { color: #2f4b7c; }
                hr { border: 0; border-top: 1px solid #ccc; margin: 20px 0; }
                .questions-print { 
                    margin-bottom: 15px;
                    font-style: italic;
                }
                .questions-print div {
                    margin-bottom: 5px;
                }
            </style>
        </head>
        <body>${content}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
}

// Print all subIds for the current assignment
function printAllSubIdsForAssignment() {
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const assignmentPrefix = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}`;
    const storageKeys = Object.keys(localStorage).filter(key => key.startsWith(assignmentPrefix));
    
    if (storageKeys.length === 0) {
        alert("Keine gespeicherten Antworten für diese Aufgabe gefunden.");
        return;
    }
    
    const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');
    let allContent = `<h2>Kapitel: ${assignmentSuffix}</h2>`;
    
    storageKeys.sort((a, b) => {
        const subIdA = a.replace(assignmentPrefix, '');
        const subIdB = b.replace(assignmentPrefix, '');
        return subIdA.localeCompare(subIdB);
    });
    
    storageKeys.forEach(key => {
        const content = localStorage.getItem(key);
        if (content) {
            const subId = key.replace(assignmentPrefix, '');
            const questionsHtml = getQuestionsForSubId(subId);
            allContent += `<h3>Thema: ${subId}</h3>`;
            if (questionsHtml) {
                allContent += questionsHtml;
            }
            allContent += `<div>${content}</div>`;
            allContent += `<hr>`;
        }
    });
    
    printAllAnswers(allContent);
}

// Get questions HTML for a specific subId
function getQuestionsForSubId(subId) {
    const params = getQueryParams();
    if (params.subIds && params.subIds.includes(subId)) {
        const index = params.subIds.indexOf(subId);
        const questions = {};
        Object.keys(params).forEach(key => {
            if (key.startsWith('question') && params[key] && params[key][index]) {
                questions[key] = params[key][index];
            }
        });
        
        if (Object.keys(questions).length > 0) {
            let html = '<div class="questions-print"><em>';
            Object.values(questions).forEach(question => {
                html += `<div>- ${question}</div>`;
            });
            html += '</em></div>';
            return html;
        }
    }
    return '';
}

// Load and display all saved answers
function loadAllAnswers() {
    const draftContainer = document.getElementById("draftContainer");
    if (!draftContainer) return;
    
    draftContainer.innerHTML = "";
    
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const currentStorageKey = STORAGE_PREFIX + assignmentId;
    
    const storageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(STORAGE_PREFIX) && key !== currentStorageKey
    );
    
    console.log(`Gefundene ${storageKeys.length} gespeicherte boxsuk-Assignments`);
    
    if(storageKeys.length === 0) {
        draftContainer.innerHTML = "<p>Keine gespeicherten Antworten gefunden.</p>";
        return;
    }
    
    storageKeys.sort((a, b) => {
        const suffixA = a.replace(STORAGE_PREFIX, '');
        const suffixB = b.replace(STORAGE_PREFIX, '');
        return suffixB.localeCompare(suffixA, undefined, {numeric: true, sensitivity: 'base'});
    });
    
    storageKeys.forEach(assignmentIdKey => {
        const text = localStorage.getItem(assignmentIdKey);
        if(text) {
            const draftDiv = document.createElement("div");
            draftDiv.className = "draft";
            
            const checkboxDiv = document.createElement("div");
            checkboxDiv.style.position = "absolute";
            checkboxDiv.style.top = "10px";
            checkboxDiv.style.left = "10px";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "select-answer";
            checkbox.value = assignmentIdKey;
            checkbox.addEventListener('change', toggleBulkDeleteButton);
            
            const checkboxLabel = document.createElement("label");
            checkboxLabel.textContent = " Auswählen";
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(checkboxLabel);
            draftDiv.appendChild(checkboxDiv);
            
            const assignmentIdMatch = assignmentIdKey.match(/^boxsuk-assignment[_-]?(.+)$/);
            const assignmentIdClean = assignmentIdMatch ? assignmentIdMatch[1] : assignmentIdKey;
            
            const title = document.createElement("h3");
            title.textContent = `Kapitel ${assignmentIdClean}`;
            draftDiv.appendChild(title);
            
            const answerDiv = document.createElement("div");
            answerDiv.className = "answerText";
            answerDiv.innerHTML = text;
            answerDiv.style.marginLeft = "30px";
            draftDiv.appendChild(answerDiv);
            
            const buttonGroup = document.createElement("div");
            buttonGroup.className = "button-group";
            
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Antwort löschen";
            deleteBtn.className = "deleteAnswerBtn";
            deleteBtn.addEventListener('click', function() {
                deleteAnswer(assignmentIdKey);
            });
            buttonGroup.appendChild(deleteBtn);
            
            const printBtn = document.createElement("button");
            printBtn.textContent = "Diese Antwort drucken / Als PDF speichern";
            printBtn.className = "printAnswerBtn";
            printBtn.addEventListener('click', function() {
                const tempDivPrint = document.createElement('div');
                tempDivPrint.innerHTML = text;
                const plainTextPrint = tempDivPrint.innerText;
                printSingleAnswer(`Kapitel ${assignmentIdClean}`, plainTextPrint);
            });
            buttonGroup.appendChild(printBtn);
            
            draftDiv.appendChild(buttonGroup);
            draftContainer.appendChild(draftDiv);
        }
    });
    
    toggleBulkDeleteButton();
}

// Delete a single answer
function deleteAnswer(assignmentId) {
    if(confirm("Sind Sie sicher, dass Sie diese Antwort löschen möchten?")) {
        localStorage.removeItem(assignmentId);
        alert("Antwort wurde gelöscht.");
        console.log(`Antwort für ${assignmentId} gelöscht.`);
        loadAllAnswers();
    }
}

// Update subId info in the UI
function updateSubIdInfo() {
    const subIdInfoElement = document.getElementById('subIdInfo');
    if (!subIdInfoElement) return;
    
    const { subId, questions } = getCurrentSubIdAndQuestions();
    
    if (subId) {
        let html = `<h4>Thema: ${subId}</h4>`;
        
        if (Object.keys(questions).length > 0) {
            html += '<div class="questions-container"><em>';
            Object.values(questions).forEach(question => {
                html += `<div>- ${question}</div>`;
            });
            html += '</em></div>';
        }
        
        subIdInfoElement.innerHTML = html;
        subIdInfoElement.style.display = 'block';
    } else {
        subIdInfoElement.style.display = 'none';
    }
}

// Debounce function for delayed execution
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Export answer as TXT
function exportAnswerAsTxt() {
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');
    const { subId } = getCurrentSubIdAndQuestions();
    
    const storageKey = subId 
        ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
        : `${STORAGE_PREFIX}${assignmentId}`;
    
    const savedHtml = localStorage.getItem(storageKey);
    
    if (!savedHtml) {
        alert("Keine gespeicherte Antwort zum Exportieren vorhanden.");
        console.log("Versuch, die Antwort zu exportieren, aber keine ist gespeichert");
        return;
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = savedHtml;
    
    let plainText = tempDiv.innerHTML
        .replace(/<\/div>/gi, "\n")
        .replace(/<br>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "");
    
    plainText = plainText.replace(/\n\s*\n/g, '\n\n').trim();
    plainText += `\n\nURL: ${window.location.href}\nAssignment ID: ${assignmentId}`;
    
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    if ('download' in link) {
        link.download = `${assignmentSuffix || 'antwort'}.txt`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
        window.open(url);
    }
}

// Initialize the page
document.addEventListener("DOMContentLoaded", function() {
    // Get assignment ID from URL
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');
    
    // Update assignment info in the UI
    const assignmentInfo = document.getElementById('assignmentInfo');
    if (assignmentInfo) {
        assignmentInfo.textContent = assignmentSuffix ? `Kapitel: ${assignmentSuffix}` : 'Kapitel';
    }
    
    // Initialize Quill editor
    const answerBox = document.getElementById('answerBox');
    if (answerBox) {
        console.log("Initializing Quill editor");
        quill = new Quill('#answerBox', {
            theme: 'snow',
            placeholder: 'Gib hier deinen Text ein...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });
        
        // Disable paste
        quill.root.addEventListener('paste', function(e) {
            e.preventDefault();
            alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
        });
        
        // Set up auto-save
        const debouncedSave = debounce(saveToLocal, 2000);
        quill.on('text-change', function(delta, oldDelta, source) {
            if (source === 'user') {
                debouncedSave();
            }
        });
    }
    
    // Update subId info
    updateSubIdInfo();
    
    // Load saved content
    if (quill) {
        const { subId } = getCurrentSubIdAndQuestions();
        const storageKey = subId 
            ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
            : `${STORAGE_PREFIX}${assignmentId}`;
        
        const savedText = localStorage.getItem(storageKey);
        
        if (savedText) {
            quill.root.innerHTML = savedText;
            console.log(`Gespeicherten Text für ${storageKey} geladen`);
            displaySavedAnswer(savedText);
        } else {
            console.log(`Kein gespeicherter Text für ${storageKey} gefunden`);
        }
    }
    
    // Load all saved answers
    loadAllAnswers();
    
    // Set up button event handlers
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', function() {
            const { subId, questions } = getCurrentSubIdAndQuestions();
            const storageKey = subId 
                ? `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}${subId}`
                : `${STORAGE_PREFIX}${assignmentId}`;
            
            const savedText = localStorage.getItem(storageKey);
            
            if (savedText) {
                printSingleAnswer(`Kapitel: ${assignmentSuffix}`, savedText, questions);
            } else {
                alert("Keine gespeicherte Antwort zum Drucken vorhanden.");
            }
        });
    }
    
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', exportAnswerAsTxt);
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearLocalStorage);
    }
    
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteAnswers);
    }
    
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll(".select-answer");
            checkboxes.forEach(cb => cb.checked = this.checked);
            toggleBulkDeleteButton();
        });
    }
    
    const printAllBtn = document.getElementById('printAllBtn');
    if (printAllBtn) {
        printAllBtn.addEventListener('click', function() {
            const allStorageKeys = Object.keys(localStorage).filter(key => 
                key.startsWith(STORAGE_PREFIX)
            );
            
            if (allStorageKeys.length === 0) {
                alert("Keine gespeicherten Antworten zum Drucken vorhanden.");
                return;
            }
            
            let allContent = '';
            allStorageKeys.forEach(key => {
                const content = localStorage.getItem(key);
                if (content) {
                    const keySuffix = key.replace(STORAGE_PREFIX, '');
                    allContent += `<h2>Kapitel ${keySuffix}</h2>`;
                    allContent += `<div>${content}</div>`;
                    allContent += `<hr>`;
                }
            });
            
            printAllAnswers(allContent);
        });
    }
    
    // Append print all subIds button
    const buttonContainer = document.querySelector('.button-container');
    if (buttonContainer) {
        const printAllSubIdsBtn = document.createElement('button');
        printAllSubIdsBtn.id = 'printAllSubIdsBtn';
        printAllSubIdsBtn.textContent = 'Alle Themen dieser Aufgabe drucken';
        printAllSubIdsBtn.addEventListener('click', printAllSubIdsForAssignment);
        buttonContainer.appendChild(printAllSubIdsBtn);
    }
    
    console.log("Initialization complete");
});