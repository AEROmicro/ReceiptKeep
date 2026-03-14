let currentScan = { total: 0, date: "" };
const historyList = JSON.parse(localStorage.getItem('receiptHistory')) || [];

// --- NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if(pageId === 'history-page') renderHistory();
}

// --- CAMERA LOGIC ---
const video = document.getElementById('video');
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
    } catch (e) { document.getElementById('status').innerText = "Camera Error"; }
}

document.getElementById('capture-btn').onclick = async () => {
    const status = document.getElementById('status');
    status.innerText = "Processing... stay still!";
    
    const canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const result = await Tesseract.recognize(canvas, 'eng');
    const total = parseTotal(result.data.text);
    
    currentScan = {
        total: total,
        date: new Date().toLocaleDateString(),
        id: Date.now()
    };

    document.getElementById('detected-total').innerText = `$${total.toFixed(2)}`;
    document.getElementById('result-modal').style.display = 'flex';
    status.innerText = "Ready";
};

// --- DATA LOGIC ---
function parseTotal(text) {
    const regex = /(?:total|amt|amount|[\$£€])\s?([\d,]+\.\d{2})/gi;
    let match, highest = 0;
    while ((match = regex.exec(text)) !== null) {
        const val = parseFloat(match[1].replace(',', ''));
        if (val > highest) highest = val;
    }
    return highest;
}

function saveCurrentScan() {
    historyList.unshift(currentScan);
    localStorage.setItem('receiptHistory', JSON.stringify(historyList));
    closeModal();
    showPage('history-page');
}

function renderHistory() {
    const container = document.getElementById('history-list');
    if (historyList.length === 0) {
        container.innerHTML = "<p>No scans yet.</p>";
        return;
    }
    container.innerHTML = historyList.map((item, index) => `
        <div class="card history-item">
            <div>
                <strong>$${item.total.toFixed(2)}</strong><br>
                <small>${item.date}</small>
            </div>
            <button onclick="deleteItem(${index})" style="color:red; background:none; border:none;">Delete</button>
        </div>
    `).join('');
}

function deleteItem(index) {
    historyList.splice(index, 1);
    localStorage.setItem('receiptHistory', JSON.stringify(historyList));
    renderHistory();
}

function clearAllHistory() {
    if(confirm("Delete everything?")) {
        localStorage.removeItem('receiptHistory');
        historyList.length = 0;
        renderHistory();
    }
}

function closeModal() { document.getElementById('result-modal').style.display = 'none'; }

// Init
initCamera();
