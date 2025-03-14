// File: allgemeinbildung-textbox/script.js

// Modify getQueryParam to also get subIDs
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (param === 'subIds') {
        const subIdsParam = urlParams.get('subIds');
        return subIdsParam ? subIdsParam.split(',') : [];
    }
    
    return urlParams.get(param);
}

// Get the subIds from the URL
const subIds = getQueryParam('subIds');
console.log("SubIDs:", subIds);

// Function to extract the parent page title from the referrer URL
function getParentPageTitle() {
    const referrer = document.referrer;
    if (!referrer) {
        console.warn('Kein Referrer gefunden. Der übergeordnete Seitentitel kann nicht abgerufen werden.');
        return '';
    }

    try {
        const url = new URL(referrer);
        const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);

        // Search for the segment 'allgemeinbildung'
        const targetSegment = 'allgemeinbildung';
        const targetIndex = pathSegments.indexOf(targetSegment);

        if (targetIndex === -1) {
            console.warn(`Segment '${targetSegment}' wurde im Pfad der Referrer-URL nicht gefunden.`);
            return '';
        }

        // Extract all segments after 'allgemeinbildung'
        const relevantSegments = pathSegments.slice(targetIndex + 1);

        if (relevantSegments.length === 0) {
            console.warn('Keine Pfadsegmente nach dem Zielsegment gefunden.');
            return '';
        }

        // Replace '+', '-', '_' with spaces and decode URI components; capitalize each word
        const formattedSegments = relevantSegments.map(segment => {
            return decodeURIComponent(segment.replace(/[-_+]/g, ' ')).replace(/\b\w/g, char => char.toUpperCase());
        });

        // Join the segments with ' - ' as separator
        const formattedTitle = formattedSegments.join(' - ');

        return formattedTitle;
    } catch (e) {
        console.error('Fehler beim Parsen der Referrer-URL:', e);
        return '';
    }
}

const STORAGE_PREFIX = 'boxsuk-assignment_';
const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
const parentTitle = getParentPageTitle();
const assignmentInfo = document.getElementById('assignmentInfo');

// Remove the 'assignment' prefix (case-insensitive) to obtain the suffix
const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');

// Set the text content for assignmentInfo if it exists
if (assignmentInfo) {
    const subText = subIds && subIds.length ? `, ${subIds.join(", ")}` : "";
    assignmentInfo.textContent = assignmentSuffix ? `Aufgabe: ${assignmentSuffix}${subText}` : 'Aufgabe';
}

// Initialize the Quill editor if the element exists
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

    // Import Delta correctly
    const Delta = Quill.import('delta');
    quill.clipboard.addMatcher(Node.ELEMENT_NODE, function(node, delta) {
        return new Delta(); // Return an empty Delta so no changes are inserted
    });

    // Alternative method: Block paste events
    quill.root.addEventListener('paste', function(e) {
        e.preventDefault();
        alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
    });
}

// Display elements
const savedAnswerContainer = document.getElementById('savedAnswerContainer');
const savedAssignmentTitle = document.getElementById('savedAssignmentTitle');
const savedAnswer = document.getElementById('savedAnswer');
const saveIndicator = document.getElementById('saveIndicator');

// Function to load and display content for a specific subId
function loadSubIdContent(subId) {
    const storageKey = STORAGE_PREFIX + assignmentId + "_sub_" + subId;
    const savedText = localStorage.getItem(storageKey);
    
    if (savedText) {
        // Create a container for this subId content
        const subIdContainer = document.createElement('div');
        subIdContainer.className = 'subid-container';
        
        // Add a subheader with the subId
        const subHeader = document.createElement('h4');
        subHeader.textContent = `Teil: ${subId}`;
        subIdContainer.appendChild(subHeader);
        
        // Add the content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'subid-content';
        contentDiv.innerHTML = savedText;
        subIdContainer.appendChild(contentDiv);
        
        // Append to the saved answer container
        if (savedAnswer) {
            savedAnswer.appendChild(subIdContainer);
        }
        
        return {
            id: subId,
            content: savedText
        };
    }
    
    return null;
}

// Modified function to display saved answers including subIds
function displaySavedAnswer(content) {
    if (!savedAssignmentTitle || !savedAnswer || !savedAnswerContainer) return;
    
    // Clear previous content
    savedAnswer.innerHTML = '';
    
    // Combine parentTitle and assignmentSuffix, if available
    const titleText = parentTitle
        ? `${parentTitle}\nAufgabe: ${assignmentSuffix}`
        : `Aufgabe: ${assignmentSuffix}`;
    savedAssignmentTitle.textContent = titleText;
    
    // If subIds are provided, display main content and then each sub-content
    if (subIds && subIds.length > 0) {
        const loadedContents = [];
        
        // Display the main content if it exists
        if (content) {
            const mainContentDiv = document.createElement('div');
            mainContentDiv.className = 'main-content';
            mainContentDiv.innerHTML = content;
            savedAnswer.appendChild(mainContentDiv);
            
            loadedContents.push({
                id: assignmentId,
                content: content
            });
        }
        
        // Then display each subId content
        subIds.forEach(subId => {
            const subContent = loadSubIdContent(subId);
            if (subContent) {
                loadedContents.push(subContent);
            }
        });
        
        // Store loaded contents for later printing/exporting
        window.loadedContents = loadedContents;
    } else {
        // Just display the main content
        savedAnswer.innerHTML = content;
    }
    
    savedAnswerContainer.style.display = 'block';
}

// Function to copy text to the clipboard
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

// Fallback function to copy text using execCommand
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

// Function to save the text in localStorage
function saveToLocal() {
    if (!quill) return;
    const htmlContent = quill.root.innerHTML;
    const textContent = quill.getText().trim();
    if (textContent === "") {
        console.log("Versuch, mit leerem Textfeld zu speichern");
        return;
    }
    const subKeyPart = subIds && subIds.length > 0 ? '_sub_' + subIds.join('_') : '';
    const storageKey = STORAGE_PREFIX + assignmentId + subKeyPart;
    localStorage.setItem(storageKey, htmlContent);
    console.log(`Text für ${storageKey} gespeichert`);
    displaySavedAnswer(htmlContent);
    showSaveIndicator();
    loadAllAnswers();
}

// Function to clear all saved texts from localStorage (only keys with the specific prefix)
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

// Function to bulk delete selected answers
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

// Modified print function to include subIds
function printSingleAnswer(title, content) {
    // Remove any existing print container
    const existingPrintDiv = document.getElementById('printSingleContent');
    if (existingPrintDiv) {
        document.body.removeChild(existingPrintDiv);
    }

    // Create a temporary container for printing
    const printDiv = document.createElement('div');
    printDiv.id = 'printSingleContent';

    // Add the title
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    printDiv.appendChild(titleElement);

    // If subIds exist and loadedContents is available, print all items
    if (subIds && subIds.length > 0 && window.loadedContents) {
        window.loadedContents.forEach(item => {
            if (item.id !== assignmentId) {
                const subHeader = document.createElement('h4');
                subHeader.textContent = `Teil: ${item.id}`;
                printDiv.appendChild(subHeader);
            }
            
            const contentElement = document.createElement('div');
            contentElement.innerHTML = item.content;
            printDiv.appendChild(contentElement);
            
            if (item !== window.loadedContents[window.loadedContents.length - 1]) {
                const separator = document.createElement('hr');
                printDiv.appendChild(separator);
            }
        });
    } else {
        // Otherwise, print the main content only
        const contentElement = document.createElement('div');
        contentElement.innerHTML = content;
        printDiv.appendChild(contentElement);
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

// Function to print all saved answers
function printAllAnswers(allContent) {
    const existingPrintDiv = document.getElementById('printAllContent');
    if (existingPrintDiv) {
        document.body.removeChild(existingPrintDiv);
    }

    const printDiv = document.createElement('div');
    printDiv.id = 'printAllContent';
    printDiv.innerHTML = allContent;
    document.body.appendChild(printDiv);
    document.body.classList.add('print-all');

    function handleAfterPrint() {
        document.body.classList.remove('print-all');
        const printDivAfter = document.getElementById('printAllContent');
        if (printDivAfter) {
            document.body.removeChild(printDivAfter);
        }
        window.removeEventListener('afterprint', handleAfterPrint);
    }

    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
}

// Function to show the "saved" indicator
function showSaveIndicator() {
    if (!saveIndicator) return;
    saveIndicator.style.display = 'block';
    saveIndicator.style.backgroundColor = 'green';
    saveIndicator.style.color = 'white';
    setTimeout(() => {
        saveIndicator.style.display = 'none';
    }, 2000);
}

// Debounce function to limit execution rate
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Debounced version of saveToLocal (e.g. save 2 seconds after user stops typing)
const debouncedSave = debounce(saveToLocal, 2000);

// Event listener for text changes to automatically save content
if (quill) {
    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            debouncedSave();
        }
    });
}

// Load saved content and set it in the Quill editor
if (quill) {
    const subKeyPart = subIds && subIds.length > 0 ? '_sub_' + subIds.join('_') : '';
    const savedText = localStorage.getItem(STORAGE_PREFIX + assignmentId + subKeyPart);

    if (savedText) {
        quill.root.innerHTML = savedText;
        console.log(`Gespeicherten Text für ${STORAGE_PREFIX + assignmentId} geladen`);
        displaySavedAnswer(savedText);
    } else {
        console.log(`Kein gespeicherter Text für ${STORAGE_PREFIX + assignmentId} gefunden`);
    }
}

// Function to load and display all saved answers
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

    // Sort keys based on their suffix (newest first)
    storageKeys.sort((a, b) => {
        const suffixA = a.replace(STORAGE_PREFIX, '');
        const suffixB = b.replace(STORAGE_PREFIX, '');
        return suffixB.localeCompare(suffixA, undefined, {numeric: true, sensitivity: 'base'});
    });

    console.log("Sortierte Assignment-IDs:", storageKeys);

    storageKeys.forEach(assignmentIdKey => {
        const text = localStorage.getItem(assignmentIdKey);
        if(text) {
            console.log(`Lade Assignment: ${assignmentIdKey}`);
            const draftDiv = document.createElement("div");
            draftDiv.className = "draft";

            // Create a checkbox for selection
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

            // Create a button group for deleting and printing
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
                printSingleAnswer(`Aufgabe ${assignmentIdClean}`, plainTextPrint);
            });
            buttonGroup.appendChild(printBtn);

            draftDiv.appendChild(buttonGroup);
            draftContainer.appendChild(draftDiv);
        }
    });

    toggleBulkDeleteButton();
}

// Event listener for "Text drucken / Als PDF speichern" for the current answer
if (document.getElementById("downloadAllBtn")) {
    document.getElementById("downloadAllBtn").addEventListener('click', function() {
        const currentStorageKey = STORAGE_PREFIX + assignmentId;
        const savedText = localStorage.getItem(currentStorageKey);

        if (!savedText) {
            alert("Keine gespeicherte Antwort zum Drucken oder Speichern als PDF vorhanden.");
            console.log("Versuch, die aktuelle Antwort zu drucken, aber keine ist gespeichert");
            return;
        }

        console.log("Drucken der aktuellen Antwort wird initiiert");

        const titleText = parentTitle
            ? `${parentTitle} - Aufgabe: ${assignmentSuffix}`
            : `Aufgabe: ${assignmentSuffix}`;

        printSingleAnswer(titleText, savedText);
    });
}

// Event listener for "Alle Antworten drucken / Als PDF speichern"
if (document.getElementById("printAllBtn")) {
    document.getElementById("printAllBtn").addEventListener('click', function() {
        const storageKeys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));

        if(storageKeys.length === 0) {
            alert("Keine gespeicherten Antworten zum Drucken oder Speichern als PDF vorhanden.");
            console.log("Versuch, alle Antworten zu drucken, aber keine sind gespeichert");
            return;
        }

        console.log("Drucken aller gespeicherten Antworten wird initiiert");

        let allContent = '';
        storageKeys.sort((a, b) => {
            const suffixA = a.replace(STORAGE_PREFIX, '');
            const suffixB = b.replace(STORAGE_PREFIX, '');
            return suffixB.localeCompare(suffixA, undefined, {numeric: true, sensitivity: 'base'});
        });

        storageKeys.forEach(assignmentIdKey => {
            const text = localStorage.getItem(assignmentIdKey);
            if(text) {
                const assignmentIdMatch = assignmentIdKey.match(/^boxsuk-assignment[_-]?(.+)$/);
                const assignmentIdClean = assignmentIdMatch ? assignmentIdMatch[1] : assignmentIdKey;
                const title = `Aufgabe ${assignmentIdClean}`;
                allContent += `<h3>${title}</h3>`;
                allContent += `<div>${text}</div>`;
                allContent += `<hr>`;
            }
        });

        printAllAnswers(allContent);
    });
}

// Event listener for the "Alle auswählen" checkbox
const selectAllCheckbox = document.getElementById("selectAll");
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll(".select-answer");
        checkboxes.forEach(cb => cb.checked = this.checked);
        toggleBulkDeleteButton();
    });
}

// Event listener for the "Ausgewählte löschen" button
if (document.getElementById("bulkDeleteBtn")) {
    document.getElementById("bulkDeleteBtn").addEventListener('click', bulkDeleteAnswers);
}

// Function to delete a single answer
function deleteAnswer(assignmentId) {
    if(confirm("Sind Sie sicher, dass Sie diese Antwort löschen möchten?")) {
        localStorage.removeItem(assignmentId);
        alert("Antwort wurde gelöscht.");
        console.log(`Antwort für ${assignmentId} gelöscht.`);
        loadAllAnswers();
    }
}

// Function to copy a single answer (for potential reuse)
function copyAnswer(assignmentId) {
    const content = localStorage.getItem(assignmentId);
    if (content) {
        copyTextToClipboard(content);
    }
}

// Load all saved answers on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
    loadAllAnswers();
});

// Log the initial state of localStorage for debugging
console.log("Initialer Zustand von localStorage:");
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`${key}: ${localStorage.getItem(key)}`);
}

// Modified "Export als TXT" functionality to include subIds
const exportTxtBtn = document.getElementById("exportTxtBtn");
if (exportTxtBtn) {
    exportTxtBtn.addEventListener('click', function() {
        let allText = '';
        
        if (subIds && subIds.length > 0 && window.loadedContents) {
            window.loadedContents.forEach(item => {
                if (item.id === assignmentId) {
                    allText += `Aufgabe: ${assignmentSuffix}\n\n`;
                } else {
                    allText += `Teil: ${item.id}\n\n`;
                }
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.content;
                
                let plainText = tempDiv.innerHTML
                    .replace(/<\/div>/gi, "\n")
                    .replace(/<br>/gi, "\n")
                    .replace(/<\/p>/gi, "\n\n")
                    .replace(/<[^>]+>/g, "");
                    
                plainText = plainText.replace(/\n\s*\n/g, '\n\n').trim();
                
                allText += plainText + '\n\n';
            });
        } else {
            const currentStorageKey = STORAGE_PREFIX + assignmentId;
            const savedHtml = localStorage.getItem(currentStorageKey);

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
            
            allText = plainText;
        }
        
        allText += `\n\nURL: ${window.location.href}\nAssignment ID: ${assignmentId}`;
        if (subIds && subIds.length > 0) {
            allText += `\nSub IDs: ${subIds.join(', ')}`;
        }

        const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
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

// Helper: Toggle visibility of bulk delete button based on selections
function toggleBulkDeleteButton() {
    const selectedCheckboxes = document.querySelectorAll(".select-answer:checked");
    const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
    if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = selectedCheckboxes.length > 0 ? 'block' : 'none';
    }
}
