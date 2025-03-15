// Constants for storage keys
const STORAGE_PREFIX = 'boxsuk-assignment_';
const SUB_STORAGE_PREFIX = 'boxsuk-sub_';

// Global variable for the Quill editor
let quill;

// Utility functions for URL parameters
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

function getParentPageTitle() {
    return getQueryParam('parentTitle') || '';
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

// Save text to localStorage (removed saved-answer display call)
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
    
    showSaveIndicator();
}

// Clear localStorage - only boxsuk-prefixed keys (removed saved-answer update)
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
    
    console.log("Alle gespeicherten boxsuk-Texte wurden gelöscht");
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

// Print all answers (used in print_page.html)
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

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize the page
document.addEventListener("DOMContentLoaded", function() {
    const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
    const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');
    
    const assignmentInfo = document.getElementById('assignmentInfo');
    if (assignmentInfo) {
        assignmentInfo.textContent = assignmentSuffix ? `Kapitel: ${assignmentSuffix}` : 'Kapitel';
    }
    
    const answerBox = document.getElementById('answerBox');
    if (answerBox) {
        console.log("Initializing Quill editor");
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
        
        const debouncedSave = debounce(saveToLocal, 2000);
        quill.on('text-change', function(delta, oldDelta, source) {
            if (source === 'user') {
                debouncedSave();
            }
        });
    }
    
    updateSubIdInfo();
    
    if (quill) {
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
    }
    
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
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearLocalStorage);
    }
    
    // Append print all subIds button to the button container
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
