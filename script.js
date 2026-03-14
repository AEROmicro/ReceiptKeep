// --- APP STATE ---
let currentScan = { total: 0, date: "" };
let historyList = JSON.parse(localStorage.getItem('receiptHistory')) || [];

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const status = document.getElementById('status');

// --- PAGE NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if(pageId === 'history-page') renderHistory();
}

// --- CAMERA INITIALIZATION ---
async function startApp() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = stream;
    } catch (err) {
        status.innerText = "Camera Error: Please allow access.";
    }
}

// --- CORE SCANNING LOGIC ---
document.getElementById('capture-btn').onclick = async () => {
    status.innerText = "Processing Image...";
    
    // 1. Prepare Canvas
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 2. Apply Pre-processing Filter (makes OCR much more accurate)
    ctx.filter = 'grayscale(1) contrast(2) brightness(1.1)';
    ctx.drawImage(video, 0, 0);
    
    status.innerText = "Reading Text (takes ~5s)...";

    try {
        // 3. Run OCR
        const result = await Tesseract.recognize(canvas, 'eng');
        const total = parseTotal(result.data.text);
        
        currentScan = {
            total: total,
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            id: Date.now()
        };

        // 4. Update UI
        document.getElementById('detected-total').innerText = `$${total.toFixed(2)}`;
        document.getElementById('result-modal').style.display = 'flex';
        status.innerText = "Ready";
    } catch (err) {
        console.error(err);
        status.innerText = "Scan Failed. Try again.";
    }
};

// --- THE BRAIN (Parsing Logic) ---
function parseTotal(text) {
    // Remove commas from prices (e.g., 1,200.00 -> 1200.00)
    const cleanText = text.replace(/,(?=\d{2})/g, '');
    
    // Regex to find things that look like money (e.g. 10.99)
    const priceRegex = /\d+\.\d{2}/g;
    const matches = cleanText.match(priceRegex);

    if (!matches) return 0.00;

    const prices = matches.map(p => parseFloat(p));

    // Strategy A: Look for keywords like "Total" and the number on the same line
    const lines = cleanText.split('\n');
    let foundTotal = 0;

    lines.forEach(line => {
        if (/total|amount|due|balance|pay|sum/i.test(line)) {
            const linePrices = line.match(/\d+\.\d{2}/);
            if (linePrices) {
                const val = parseFloat(linePrices[0]);
                if (val > foundTotal) foundTotal = val;
            }
        }
    });

    // Strategy B: If no keyword found, assume the largest number on the page is the total
    return foundTotal > 0 ? foundTotal : Math.max(...prices);
}

// --- DATA PERSISTENCE ---
function saveCurrentScan() {
    historyList.unshift(currentScan); // Add to start of array
    localStorage.setItem('receiptHistory', JSON.stringify(historyList));
    closeModal();
    showPage('history-page');
}

function renderHistory() {
    const container = document.getElementById('history-list');
    if (historyList.length === 0) {
        container.innerHTML = `<div class="card"><p>No scans found yet.</p></div>`;
        return;
    }

    container.innerHTML = historyList.map((item, index) => `
        <div class="card history-item">
            <div>
                <strong>$${item.total.toFixed(2)}</strong><br>
                <small style="color: #64748b">${item.date}</small>
            </div>
            <button onclick="deleteItem(${index})" style="color:var(--danger); border:none; background:none; font-weight:bold;">Remove</button>
        </div>
    `).join('');
}

function deleteItem(index) {
    historyList.splice(index, 1);
    localStorage.setItem('receiptHistory', JSON.stringify(historyList));
    renderHistory();
}

function clearAllHistory() {
    if(confirm("Are you sure? This will delete all saved scans permanently.")) {
        historyList = [];
        localStorage.removeItem('receiptHistory');
        renderHistory();
    }
}

// --- EXPORT ---
function exportToCSV() {
    if (historyList.length === 0) return alert("Nothing to export!");
    let csv = "Date,Amount\n";
    historyList.forEach(i => csv += `${i.date},${i.total}\n`);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${new Date().toLocaleDateString()}.csv`;
    a.click();
}

function closeModal() { document.getElementById('result-modal').style.display = 'none'; }

// Start
startApp();
