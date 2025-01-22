// File: allgemeinbildung-textbox/script.js

// Funktion zum Abrufen eines Abfrageparameters nach Name
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Funktion zum Extrahieren des Seitentitels aus der Referrer-URL
function getParentPageTitle() {
    const referrer = document.referrer;
    if (!referrer) {
        console.warn('Kein Referrer gefunden. Der übergeordnete Seitentitel kann nicht abgerufen werden.');
        return '';
    }

    try {
        const url = new URL(referrer);
        const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);

        // Suche nach dem Segment 'allgemeinbildung'
        const targetSegment = 'allgemeinbildung';
        const targetIndex = pathSegments.indexOf(targetSegment);

        if (targetIndex === -1) {
            console.warn(`Segment '${targetSegment}' wurde im Pfad der Referrer-URL nicht gefunden.`);
            return '';
        }

        // Extrahiere alle Segmente nach 'allgemeinbildung'
        const relevantSegments = pathSegments.slice(targetIndex + 1);

        if (relevantSegments.length === 0) {
            console.warn('Keine Pfadsegmente nach dem Zielsegment gefunden.');
            return '';
        }

        // Ersetze '+', '-', '_' durch Leerzeichen und dekodiere URI-Komponenten
        const formattedSegments = relevantSegments.map(segment => {
            return decodeURIComponent(segment.replace(/[-_+]/g, ' ')).replace(/\b\w/g, char => char.toUpperCase());
        });

        // Verbinde die Segmente mit ' - ' als Trenner
        const formattedTitle = formattedSegments.join(' - ');

        return formattedTitle;
    } catch (e) {
        console.error('Fehler beim Parsen der Referrer-URL:', e);
        return '';
    }
}

const STORAGE_PREFIX = 'boxsuk-assignment_'; // Eindeutiger Präfix für boxsuk
const assignmentId = getQueryParam('assignmentId') || 'defaultAssignment';
const parentTitle = getParentPageTitle();
const assignmentInfo = document.getElementById('assignmentInfo');

// Entferne das Präfix 'assignment', um das Suffix zu erhalten
// Anpassung: Verwende einen case-insensitive regulären Ausdruck
const assignmentSuffix = assignmentId.replace(/^assignment[_-]?/i, '');

// Setze den Text auf 'Aufgabe: {Suffix}', falls assignmentInfo existiert
if (assignmentInfo) {
    assignmentInfo.textContent = assignmentSuffix ? `Aufgabe: ${assignmentSuffix}` : 'Aufgabe';
}

// Initialisiere den Quill-Editor, falls das Element existiert
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
        return new Delta(); // Leerer Delta, keine Änderungen werden eingefügt
    });

    // Alternative Methode: Event Listener zum Blockieren des Paste-Events
    quill.root.addEventListener('paste', function(e) {
        e.preventDefault();
        alert("Einfügen von Inhalten ist in diesem Editor deaktiviert.");
    });
}

// Anzeigeelemente
const savedAnswerContainer = document.getElementById('savedAnswerContainer');
const savedAssignmentTitle = document.getElementById('savedAssignmentTitle');
const savedAnswer = document.getElementById('savedAnswer');
const saveIndicator = document.getElementById('saveIndicator'); // Save Indicator Element

// Funktion zur Anzeige des gespeicherten Textes
function displaySavedAnswer(content) {
    if (!savedAssignmentTitle || !savedAnswer || !savedAnswerContainer) return;
    // Kombiniere parentTitle und assignmentSuffix, falls verfügbar
    const titleText = parentTitle
        ? `${parentTitle}\nAufgabe: ${assignmentSuffix}`
        : `Aufgabe: ${assignmentSuffix}`;
    savedAssignmentTitle.textContent = titleText;
    // Verwenden Sie innerHTML, um die Formatierung beizubehalten
    savedAnswer.innerHTML = content;
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
        // Fallback zu execCommand
        fallbackCopyTextToClipboard(text);
    }
}

// Funktion zum Kopieren von Text in die Zwischenablage (Fallback)
function fallbackCopyTextToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Verstecke das Textarea-Element
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

// Funktion zum Speichern des Textes in localStorage
function saveToLocal() {
    if (!quill) return;
    const htmlContent = quill.root.innerHTML;
    const textContent = quill.getText().trim();
    if (textContent === "") {
        console.log("Versuch, mit leerem Textfeld zu speichern");
        return;
    }
    const storageKey = STORAGE_PREFIX + assignmentId;
    localStorage.setItem(storageKey, htmlContent);
    console.log(`Text für ${storageKey} gespeichert`);
    displaySavedAnswer(htmlContent); // Aktualisiere die Anzeige des gespeicherten Textes
    showSaveIndicator(); // Zeige den "Gespeichert"-Hinweis
    loadAllAnswers(); // Aktualisiere die Liste aller gespeicherten Antworten
}

// Funktion zum Löschen aller gespeicherten Texte aus localStorage
function clearLocalStorage() {
    // Entferne nur Schlüssel mit dem boxsuk-Präfix
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (quill) quill.setText(''); // Leere den Quill-Editor
    if (savedAnswerContainer) savedAnswerContainer.style.display = 'none';
    console.log("Alle gespeicherten boxsuk-Texte wurden gelöscht");
    loadAllAnswers(); // Aktualisiere die Liste aller gespeicherten Antworten
}

// Funktion zum Löschen aller Antworten (Bulk)
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
    loadAllAnswers(); // Aktualisiere die Liste der gespeicherten Antworten
}

// Funktion zum Drucken einer einzelnen Antwort
function printSingleAnswer(title, content) {
    // Entferne vorhandenes printSingleContent, falls vorhanden
    const existingPrintDiv = document.getElementById('printSingleContent');
    if (existingPrintDiv) {
        document.body.removeChild(existingPrintDiv);
    }

    // Erstelle ein temporäres Div
    const printDiv = document.createElement('div');
    printDiv.id = 'printSingleContent';

    // Füge den Titel hinzu
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    printDiv.appendChild(titleElement);

    // Füge den Inhalt hinzu
    const contentElement = document.createElement('div');
    contentElement.innerHTML = content; // Verwenden Sie innerHTML für formatierte Inhalte
    printDiv.appendChild(contentElement);

    // Füge das Div zum Body hinzu
    document.body.appendChild(printDiv);

    // Füge die Klasse 'print-single' zum Body hinzu
    document.body.classList.add('print-single');

    // Definiere die Handler-Funktion
    function handleAfterPrint() {
        document.body.classList.remove('print-single');
        const printDivAfter = document.getElementById('printSingleContent');
        if (printDivAfter) {
            document.body.removeChild(printDivAfter);
        }
        // Entferne den Event Listener
        window.removeEventListener('afterprint', handleAfterPrint);
    }

    // Füge den Event Listener hinzu
    window.addEventListener('afterprint', handleAfterPrint);

    // Trigger den Druck
    window.print();
}

// Funktion zum Drucken aller Antworten
function printAllAnswers(allContent) {
    // Entferne vorhandenes printAllContent, falls vorhanden
    const existingPrintDiv = document.getElementById('printAllContent');
    if (existingPrintDiv) {
        document.body.removeChild(existingPrintDiv);
    }

    // Erstelle ein temporäres Div
    const printDiv = document.createElement('div');
    printDiv.id = 'printAllContent';

    // Füge den kombinierten Inhalt hinzu
    printDiv.innerHTML = allContent;

    // Füge das Div zum Body hinzu
    document.body.appendChild(printDiv);

    // Füge die Klasse 'print-all' zum Body hinzu
    document.body.classList.add('print-all');

    // Definiere die Handler-Funktion
    function handleAfterPrint() {
        document.body.classList.remove('print-all');
        const printDivAfter = document.getElementById('printAllContent');
        if (printDivAfter) {
            document.body.removeChild(printDivAfter);
        }
        // Entferne den Event Listener
        window.removeEventListener('afterprint', handleAfterPrint);
    }

    // Füge den Event Listener hinzu
    window.addEventListener('afterprint', handleAfterPrint);

    // Trigger den Druck
    window.print();
}

// Funktion zum Anzeigen des "Gespeichert"-Hinweises
function showSaveIndicator() {
    if (!saveIndicator) return;
    saveIndicator.style.display = 'block';
    saveIndicator.style.backgroundColor = 'green'; // Set background color to green
    saveIndicator.style.color = 'white'; // Set text color to white for better contrast
    setTimeout(() => {
        saveIndicator.style.display = 'none';
    }, 2000); // Verstecken nach 2 Sekunden
}

// Debounce-Funktion zur Begrenzung der Ausführungsrate
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Debounced-Version von saveToLocal (z.B. speichert 2 Sekunden nachdem der Benutzer aufgehört hat zu tippen)
const debouncedSave = debounce(saveToLocal, 2000);

// Event Listener für Textänderungen zur automatischen Speicherung
if (quill) {
    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') { // Stelle sicher, dass die Änderung vom Benutzer stammt
            debouncedSave();
        }
    });
}

// Lade gespeicherten Inhalt und setze ihn im Quill-Editor
if (quill) {
    const savedText = localStorage.getItem(STORAGE_PREFIX + assignmentId);
    if (savedText) {
        quill.root.innerHTML = savedText;
        console.log(`Gespeicherten Text für ${STORAGE_PREFIX + assignmentId} geladen`);
        displaySavedAnswer(savedText);
    } else {
        console.log(`Kein gespeicherter Text für ${STORAGE_PREFIX + assignmentId} gefunden`);
    }
}

// Funktion zum Laden und Anzeigen aller gespeicherten Antworten
function loadAllAnswers() {
    const draftContainer = document.getElementById("draftContainer");
    if (!draftContainer) return;
    draftContainer.innerHTML = ""; // Container leeren

    const currentStorageKey = STORAGE_PREFIX + assignmentId;
    const storageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(STORAGE_PREFIX) && key !== currentStorageKey
    );

    console.log(`Gefundene ${storageKeys.length} gespeicherte boxsuk-Assignments`);

    if(storageKeys.length === 0) {
        draftContainer.innerHTML = "<p>Keine gespeicherten Antworten gefunden.</p>";
        return;
    }

    // Sortieren der storageKeys basierend auf dem Suffix in absteigender Reihenfolge (neueste zuerst)
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

            // Erstellen einer Checkbox
            const checkboxDiv = document.createElement("div");
            checkboxDiv.style.position = "absolute";
            checkboxDiv.style.top = "10px";
            checkboxDiv.style.left = "10px";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "select-answer";
            checkbox.value = assignmentIdKey; // assignmentId als Wert verwenden
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
            // Verwenden Sie innerHTML, um die Formatierung beizubehalten
            answerDiv.innerHTML = text;
            answerDiv.style.marginLeft = "30px"; // Platz für die Checkbox schaffen
            draftDiv.appendChild(answerDiv);

            // Erstellen der Button-Gruppe
            const buttonGroup = document.createElement("div");
            buttonGroup.className = "button-group";

            // Löschen-Schaltfläche
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Antwort löschen";
            deleteBtn.className = "deleteAnswerBtn";
            deleteBtn.addEventListener('click', function() {
                deleteAnswer(assignmentIdKey);
            });
            buttonGroup.appendChild(deleteBtn);
            
            // Neuer Druck-Button
            const printBtn = document.createElement("button");
            printBtn.textContent = "Diese Antwort drucken / Als PDF speichern";
            printBtn.className = "printAnswerBtn";
            printBtn.addEventListener('click', function() {
                // Extrahiere reinen Text für den Druck
                const tempDivPrint = document.createElement('div');
                tempDivPrint.innerHTML = text;
                const plainTextPrint = tempDivPrint.innerText; // Verwenden Sie innerText für reinen Text
                printSingleAnswer(`Aufgabe ${assignmentIdClean}`, plainTextPrint);
            });
            buttonGroup.appendChild(printBtn);
            // Ende Druck-Button

            draftDiv.appendChild(buttonGroup);

            draftContainer.appendChild(draftDiv);
        }
    });

    // Nach dem Laden der Antworten:
    toggleBulkDeleteButton();
}

// Event Listener für den Button "Text drucken / Als PDF speichern" (nun nur aktuelle Antwort)
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

        // Kombiniere parentTitle und assignmentSuffix für den Titel
        const titleText = parentTitle
            ? `${parentTitle} - Aufgabe: ${assignmentSuffix}`
            : `Aufgabe: ${assignmentSuffix}`;

        // Nutze die vorhandene Funktion zum Drucken einer einzelnen Antwort
        printSingleAnswer(titleText, savedText);
    });
}

// Event Listener für die "Alle Antworten drucken / Als PDF speichern" Schaltfläche
if (document.getElementById("printAllBtn")) {
    document.getElementById("printAllBtn").addEventListener('click', function() {
        const storageKeys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));

        if(storageKeys.length === 0) {
            alert("Keine gespeicherten Antworten zum Drucken oder Speichern als PDF vorhanden.");
            console.log("Versuch, alle Antworten zu drucken, aber keine sind gespeichert");
            return;
        }

        console.log("Drucken aller gespeicherten Antworten wird initiiert");

        // Kombiniere alle gespeicherten Antworten
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

        // Drucken aller Antworten
        printAllAnswers(allContent);
    });
}

// Event Listener für die "Alle auswählen" Checkbox
const selectAllCheckbox = document.getElementById("selectAll");
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll(".select-answer");
        checkboxes.forEach(cb => cb.checked = this.checked);
        toggleBulkDeleteButton();
    });
}

// Event Listener für die "Ausgewählte löschen" Schaltfläche
if (document.getElementById("bulkDeleteBtn")) {
    document.getElementById("bulkDeleteBtn").addEventListener('click', bulkDeleteAnswers);
}

// Funktion zum Kopieren als Fallback
function fallbackCopyTextToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Verstecke das textarea Element
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
            throw new Error("Fallback copy unsuccessful");
        }
    } catch (err) {
        console.error('Fehler beim Kopieren der Antwort (Fallback): ', err);
    }

    document.body.removeChild(textarea);
}

// Funktion zum Löschen einer einzelnen Antwort
function deleteAnswer(assignmentId) {
    if(confirm("Sind Sie sicher, dass Sie diese Antwort löschen möchten?")) {
        localStorage.removeItem(assignmentId);
        alert("Antwort wurde gelöscht.");
        console.log(`Antwort für ${assignmentId} gelöscht.`);
        loadAllAnswers(); // Aktualisiere die Liste der gespeicherten Antworten
    }
}

// Funktion zum Kopieren einer einzelnen Antwort (falls benötigt in anderen Seiten)
function copyAnswer(assignmentId) {
    const content = localStorage.getItem(assignmentId);
    if (content) {
        copyTextToClipboard(content);
    }
}

// Funktion zum Laden und Anzeigen aller gespeicherten Antworten beim Laden der Seite
document.addEventListener("DOMContentLoaded", function() {
    loadAllAnswers();
});

// Optional: Log the initial state of localStorage for debugging
console.log("Initialer Zustand von localStorage:");
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`${key}: ${localStorage.getItem(key)}`);
}

// Event Listener für den neuen "Export als TXT" Button
const exportTxtBtn = document.getElementById("exportTxtBtn");
if (exportTxtBtn) {
    exportTxtBtn.addEventListener('click', function() {
        const currentStorageKey = STORAGE_PREFIX + assignmentId;
        const savedHtml = localStorage.getItem(currentStorageKey);

        if (!savedHtml) {
            alert("Keine gespeicherte Antwort zum Exportieren vorhanden.");
            console.log("Versuch, die Antwort zu exportieren, aber keine ist gespeichert");
            return;
        }

        // Erstelle ein temporäres DOM-Element, um den Text zu extrahieren
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = savedHtml;
        const plainText = tempDiv.innerText;

        // Erstelle eine Blob mit dem Textinhalt
        const blob = new Blob([plainText], { type: 'text/plain' });

        // Erstelle einen Link zum Herunterladen
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${assignmentSuffix || 'antwort'}.txt`;

        // Füge den Link zum Dokument hinzu und klicke ihn programmgesteuert
        document.body.appendChild(link);
        link.click();

        // Entferne den Link wieder
        document.body.removeChild(link);

        console.log(`Antwort als TXT exportiert: ${assignmentSuffix || 'antwort'}.txt`);
    });
}