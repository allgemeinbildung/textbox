// popup.js (Updated with debug info)

document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('dataContainer');
    const assignmentFilter = document.getElementById('assignmentFilter');
    const exportBtn = document.getElementById('exportBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    
    let allData = {};

    function renderData(filter = 'all') {
        dataContainer.innerHTML = '';
        const assignments = new Set();
        const filteredKeys = Object.keys(allData).filter(key => {
            const [assignmentId] = key.split('|');
            assignments.add(assignmentId);
            if (filter === 'all') return true;
            return assignmentId === filter;
        });

        // Populate filter dropdown
        assignmentFilter.innerHTML = '<option value="all">Alle Kapitel anzeigen</option>';
        Array.from(assignments).sort().forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            if (id === filter) {
                option.selected = true;
            }
            assignmentFilter.appendChild(option);
        });

        if (filteredKeys.length === 0) {
            // Show debug info when no data is found
            dataContainer.innerHTML = `
                <div class="no-data">
                    <p>Keine gespeicherten Daten gefunden.</p>
                    <p style="font-size: 11px; color: #666; margin-top: 10px;">
                        Debug: ${Object.keys(allData).length} Einträge insgesamt<br>
                        Schlüssel: ${Object.keys(allData).join(', ') || 'keine'}
                    </p>
                </div>
            `;
            return;
        }

        // Add debug info at the top
        const debugDiv = document.createElement('div');
        debugDiv.style.cssText = 'background: #e3f2fd; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 11px; color: #1565c0;';
        debugDiv.innerHTML = `
            <strong>Debug Info:</strong><br>
            Gesamt: ${Object.keys(allData).length} Einträge | 
            Angezeigt: ${filteredKeys.length} Einträge | 
            Filter: ${filter}
        `;
        dataContainer.appendChild(debugDiv);

        filteredKeys.sort().forEach(key => {
            const [assignmentId, subId] = key.split('|');
            const content = allData[key];

            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry';

            // Create a temporary element to strip HTML for the preview
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const textPreview = tempDiv.textContent || tempDiv.innerText || "";

            entryDiv.innerHTML = `
                <div class="entry-header">
                    <h2 class="entry-title">${subId} (${assignmentId})</h2>
                    <button class="delete-btn" data-key="${key}">Löschen</button>
                </div>
                <div class="entry-content">${textPreview.substring(0, 200)}${textPreview.length > 200 ? '...' : ''}</div>
                <div style="font-size: 10px; color: #999; margin-top: 5px;">
                    Schlüssel: ${key} | Länge: ${content.length} Zeichen
                </div>
            `;
            dataContainer.appendChild(entryDiv);
        });
    }
    
    // Load all data from storage initially
    console.log('[Popup] Loading all data...');
    chrome.runtime.sendMessage({ action: "getAllData" }, (items) => {
        if (chrome.runtime.lastError) {
            console.error('[Popup] Error loading data:', chrome.runtime.lastError);
            dataContainer.innerHTML = `
                <div class="no-data">
                    <p>Fehler beim Laden der Daten:</p>
                    <p style="color: red; font-size: 12px;">${chrome.runtime.lastError.message}</p>
                </div>
            `;
            return;
        }
        
        console.log('[Popup] Loaded data:', items);
        allData = items;
        renderData();
    });

    // Also get storage info for debugging
    chrome.runtime.sendMessage({ action: "getStorageInfo" }, (info) => {
        if (!chrome.runtime.lastError && info) {
            console.log('[Popup] Storage info:', info);
        }
    });

    // Event Listeners
    assignmentFilter.addEventListener('change', (e) => {
        renderData(e.target.value);
    });

    dataContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const key = e.target.dataset.key;
            const [assignmentId, subId] = key.split('|');
            if (confirm(`Möchten Sie den Eintrag für "${subId}" (${assignmentId}) wirklich löschen?`)) {
                chrome.runtime.sendMessage({ action: "deleteData", key: key }, (response) => {
                    if (chrome.runtime.lastError) {
                        alert('Fehler beim Löschen: ' + chrome.runtime.lastError.message);
                        return;
                    }
                    if(response.status === 'success') {
                        delete allData[key];
                        renderData(assignmentFilter.value);
                    } else {
                        alert('Fehler beim Löschen: ' + (response.error || 'Unbekannter Fehler'));
                    }
                });
            }
        }
    });

    deleteAllBtn.addEventListener('click', () => {
        if (confirm("Möchten Sie wirklich ALLE gespeicherten Daten unwiderruflich löschen?")) {
            chrome.runtime.sendMessage({ action: "deleteAllData" }, (response) => {
                if (chrome.runtime.lastError) {
                    alert('Fehler beim Löschen aller Daten: ' + chrome.runtime.lastError.message);
                    return;
                }
                if (response.status === 'success') {
                    allData = {};
                    renderData();
                } else {
                    alert('Fehler beim Löschen aller Daten: ' + (response.error || 'Unbekannter Fehler'));
                }
            });
        }
    });

    exportBtn.addEventListener('click', () => {
        if (Object.keys(allData).length === 0) {
            alert("Es gibt keine Daten zum Exportieren.");
            return;
        }
        
        // Create more readable export format
        const exportData = {
            exportDate: new Date().toISOString(),
            dataCount: Object.keys(allData).length,
            data: {}
        };

        // Organize data by assignment
        Object.keys(allData).forEach(key => {
            const [assignmentId, subId] = key.split('|');
            if (!exportData.data[assignmentId]) {
                exportData.data[assignmentId] = {};
            }
            exportData.data[assignmentId][subId] = allData[key];
        });

        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        
        chrome.downloads.download({
            url: url,
            filename: `allgemeinbildung-export-${timestamp}.json`
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                alert('Fehler beim Download: ' + chrome.runtime.lastError.message);
            } else {
                console.log('Export started with download ID:', downloadId);
            }
        });
    });
});