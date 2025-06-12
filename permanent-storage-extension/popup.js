// popup.js

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
            dataContainer.innerHTML = '<p class="no-data">Keine gespeicherten Daten gefunden.</p>';
            return;
        }

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
                <div class="entry-content">${textPreview.substring(0, 200)}...</div>
            `;
            dataContainer.appendChild(entryDiv);
        });
    }
    
    // Load all data from storage initially
    chrome.runtime.sendMessage({ action: "getAllData" }, (items) => {
        allData = items;
        renderData();
    });

    // Event Listeners
    assignmentFilter.addEventListener('change', (e) => {
        renderData(e.target.value);
    });

    dataContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const key = e.target.dataset.key;
            if (confirm(`Möchten Sie den Eintrag für "${key.split('|')[1]}" wirklich löschen?`)) {
                chrome.runtime.sendMessage({ action: "deleteData", key: key }, (response) => {
                    if(response.status === 'success') {
                        delete allData[key];
                        renderData(assignmentFilter.value);
                    }
                });
            }
        }
    });

    deleteAllBtn.addEventListener('click', () => {
        if (confirm("Möchten Sie wirklich ALLE gespeicherten Daten unwiderruflich löschen?")) {
            chrome.runtime.sendMessage({ action: "deleteAllData" }, (response) => {
                if (response.status === 'success') {
                    allData = {};
                    renderData();
                }
            });
        }
    });

    exportBtn.addEventListener('click', () => {
        if (Object.keys(allData).length === 0) {
            alert("Es gibt keine Daten zum Exportieren.");
            return;
        }
        const jsonData = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: url,
            filename: 'allgemeinbildung-export.json'
        });
    });
});