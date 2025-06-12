document.addEventListener('DOMContentLoaded', () => {
    const filter = document.getElementById('assignmentFilter');
    const resultsContainer = document.getElementById('resultsContainer');

    // Load all data from chrome.storage.sync to populate the filter
    chrome.storage.sync.get(null, (allData) => {
        const assignmentIds = Object.keys(allData);
        if (assignmentIds.length === 0) {
            filter.style.display = 'none';
            resultsContainer.innerHTML = '<p class="placeholder">Noch keine Daten gespeichert.</p>';
            return;
        }

        assignmentIds.sort().forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            filter.appendChild(option);
        });
    });

    // Add event listener to the filter
    filter.addEventListener('change', () => {
        const selectedId = filter.value;
        resultsContainer.innerHTML = ''; // Clear previous results

        if (!selectedId) {
            resultsContainer.innerHTML = '<p class="placeholder">Wählen Sie ein Kapitel aus...</p>';
            return;
        }

        // Get the data for the selected assignmentId
        chrome.storage.sync.get([selectedId], (result) => {
            const subAssignments = result[selectedId];
            const sortedSubIds = Object.keys(subAssignments).sort((a, b) => {
                 return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });

            if (sortedSubIds.length === 0) {
                 resultsContainer.innerHTML = '<p>Keine Einträge für dieses Kapitel gefunden.</p>';
                 return;
            }

            sortedSubIds.forEach(subId => {
                const data = subAssignments[subId];
                const div = document.createElement('div');
                div.className = 'sub-assignment';
                div.innerHTML = `<h3>Thema: ${subId}</h3><div class="content">${data.content}</div>`;
                resultsContainer.appendChild(div);
            });
        });
    });
});