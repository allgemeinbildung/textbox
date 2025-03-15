// Funktion zum Abrufen von URL-Parametern (unterstützt Arrays)
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

// Aktualisierte Funktion zur Abfrage eines Parameters
function getQueryParam(param) {
    return getQueryParams()[param];
}

// Funktion, um die aktuelle subId und zugehörige Fragen zu erhalten
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

const STORAGE_PREFIX = 'boxsuk-assignment_';
const SUB_STORAGE_PREFIX = 'boxsuk-sub_';

// Setze den assignmentId und extrahiere das Suffix
const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
const parentTitle = getParentPageTitle();
const assignmentInfo = document.getElementById('assignmentInfo');

const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');
if (assignmentInfo) {
    assignmentInfo.textContent = assignmentSuffix ? `Aufgabe: ${assignmentSuffix}` : 'Aufgabe';
}

// Initialisiere den Quill-Editor
let quill;
if (document.getElementById('answerBox')) {
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

    // Importiere Delta korrekt
    const Delta = Quill.import('delta');
    quill.clipboard.addMatcher(Node.ELEMENT_NODE, function(node, delta) {
        return new Delta();
    });

    quill.root.addEventListener('paste', function(e) {
        e.preventDefault();
        alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
    });
}

const savedAnswerContainer = document.getElementById('savedAnswerContainer');
const savedAssignmentTitle = document.getElementById('savedAssignmentTitle');
const savedAnswer = document.getElementById('savedAnswer');
const saveIndicator = document.getElementById('saveIndicator');

// Funktion zum Anzeigen des gespeicherten Textes inkl. subId und Fragen
function displaySavedAnswer(content) {
    if (!savedAssignmentTitle || !savedAnswer || !savedAnswerContainer) return;
    const { subId, questions } = getCurrentSubIdAndQuestions();
    let titleText = parentTitle
        ? `${parentTitle}\nAufgabe: ${assignmentSuffix}`
        : `Aufgabe: ${assignmentSuffix}`;
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

// Funktion zum Kopieren von Text in die Zwischenablage
function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            console.log("Text erfolgreich kopiert");
        }, function(err) {
            console.error('Fehler beim Kopieren des Textes: ', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log("Text erfolgreich kopiert (Fallback)");
        } else {
            throw new Error("Fallback-Kopieren nicht erfolgreich");
        }
    } catch (err) {
        console.error('Fehler beim Kopieren des Textes (Fallback): ', err);
    }
    document.body.removeChild(textarea);
}

// Funktion zum Speichern des Textes in localStorage (mit subId)
function saveToLocal() {
    if (!quill) return;
    const htmlContent = quill.root.innerHTML;
    const textContent = quill.getText().trim();
    if (textContent === "") {
        console.log("Versuch, mit leerem Textfeld zu speichern");
        return;
    }
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

// Funktion zum Löschen aller gespeicherten Texte (nur boxsuk-Texte)
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
    if (savedAnswerContainer) savedAnswerContainer.style.display = 'none';
    console.log("Alle gespeicherten boxsuk-Texte wurden gelöscht");
    loadAllAnswers();
}

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

// Aktualisierte Funktion zum Drucken einer einzelnen Antwort (inkl. Fragen)
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

    const contentElement = document.createElement('div');
    contentElement.innerHTML = content;
    printDiv.appendChild(contentElement);

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

// Funktion zum Drucken aller subIds für eine Aufgabe
function printAllSubIdsForAssignment() {
    const assignmentPrefix = `${STORAGE_PREFIX}${assignmentId}_${SUB_STORAGE_PREFIX}`;
    const storageKeys = Object.keys(localStorage).filter(key => key.startsWith(assignmentPrefix));
    
    if (storageKeys.length === 0) {
        alert("Keine gespeicherten Antworten für diese Aufgabe gefunden.");
        return;
    }
    
    let allContent = `<h2>Aufgabe: ${assignmentSuffix}</h2>`;
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

// Helper-Funktion, um Fragen-HTML für eine subId zu erstellen
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

// Event Listener für "Alle auswählen" Checkbox und Bulk-Buttons
const selectAllCheckbox = document.getElementById("selectAll");
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll(".select-answer");
        checkboxes.forEach(cb => cb.checked = this.checked);
        toggleBulkDeleteButton();
    });
}
if (document.getElementById("bulkDeleteBtn")) {
    document.getElementById("bulkDeleteBtn").addEventListener('click', bulkDeleteAnswers);
}

// Funktion, um die Liste der gespeicherten Antworten zu laden und anzuzeigen
function loadAllAnswers() {
    const draftContainer = document.getElementById("draftContainer");
    if (!draftContainer) return;
    draftContainer.innerHTML = "";
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
            title.textContent = `Aufgabe ${assignmentIdClean}`;
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
                // Optional: You can pass associated questions if needed
                printSingleAnswer(`Aufgabe ${assignmentIdClean}`, plainTextPrint);
            });
            buttonGroup.appendChild(printBtn);
            draftDiv.appendChild(buttonGroup);
            draftContainer.appendChild(draftDiv);
        }
    });
    toggleBulkDeleteButton();
}

// Funktion zum Löschen einer einzelnen Antwort
function deleteAnswer(assignmentId) {
    if(confirm("Sind Sie sicher, dass Sie diese Antwort löschen möchten?")) {
        localStorage.removeItem(assignmentId);
        alert("Antwort wurde gelöscht.");
        console.log(`Antwort für ${assignmentId} gelöscht.`);
        loadAllAnswers();
    }
}

// Funktion zum Kopieren einer einzelnen Antwort
function copyAnswer(assignmentId) {
    const content = localStorage.getItem(assignmentId);
    if (content) {
        copyTextToClipboard(content);
    }
}

// Aktualisiere die UI mit subId-Informationen
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

// Event Listener beim Laden der Seite
document.addEventListener("DOMContentLoaded", function() {
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
            displaySavedAnswer(savedText);
        } else {
            console.log(`Kein gespeicherter Text für ${storageKey} gefunden`);
        }
    }
    loadAllAnswers();

    // Append new button for printing all subIds to the existing button container
    const buttonContainer = document.querySelector('.button-container');
    if (buttonContainer) {
        const printAllSubIdsBtn = document.createElement('button');
        printAllSubIdsBtn.id = 'printAllSubIdsBtn';
        printAllSubIdsBtn.textContent = 'Alle Themen dieser Aufgabe drucken';
        printAllSubIdsBtn.addEventListener('click', printAllSubIdsForAssignment);
        buttonContainer.appendChild(printAllSubIdsBtn);
    }
});

// Debounce-Funktion
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
const debouncedSave = debounce(saveToLocal, 2000);
if (quill) {
    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            debouncedSave();
        }
    });
}

// Debug initialer Zustand von localStorage
console.log("Initialer Zustand von localStorage:");
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`${key}: ${localStorage.getItem(key)}`);
}

// Event Listener für den Export als TXT Button
const exportTxtBtn = document.getElementById("exportTxtBtn");
if (exportTxtBtn) {
    exportTxtBtn.addEventListener('click', function() {
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
    });
}
