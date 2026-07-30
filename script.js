// --- Inisialisasi Tailwind CSS Khusus Warna Kustom ---
tailwind.config = {
    theme: {
        extend: { colors: { nadi: { blue: '#004A94', red: '#E31E24', light: '#F0F4F8' } } }
    }
}

// --- 1. SIDEBAR TOGGLE & NAVIGATION LOGIC ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const tooltip = document.getElementById('desktop-tooltip');
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        sidebar.classList.toggle('-translate-x-full');
        
        if (sidebar.classList.contains('-translate-x-full')) {
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        } else {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        }
    } else {
        sidebar.classList.toggle('desktop-collapsed');
        if(tooltip) {
            if (sidebar.classList.contains('desktop-collapsed')) {
                tooltip.innerText = "Buka Sidebar";
            } else {
                tooltip.innerText = "Tutup Sidebar";
            }
        }
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('aside nav button').forEach(el => {
        el.classList.remove('bg-blue-800', 'text-white');
        el.classList.add('text-blue-100');
    });
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('btn-' + tabId).classList.remove('text-blue-100');
    document.getElementById('btn-' + tabId).classList.add('bg-blue-800', 'text-white');
    
    const titles = {
        'splitter': 'Data Splitter (Auto Kategorisasi)',
        'rowsplitter': 'Split by Rows (Potong Baris)',
        'merger': 'Data Merger (Penggabung Cepat)',
        'audiotext': 'Audio & Text Converter',
        'gmaps': 'Custom Maps Mass Scraper', 
        'about': 'Panduan Penggunaan',
        'profile': 'Profil Kreator'
    };
    document.getElementById('header-title').innerText = titles[tabId];

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('-translate-x-full')) {
            toggleSidebar();
        }
    }
}

// --- 2. LOGIC DRAG & DROP & FILES ---
function updateFileLabel(inputId, labelId) {
    const files = document.getElementById(inputId).files;
    const label = document.getElementById(labelId);
    if (files.length === 0) label.innerText = "Belum ada file yang dipilih";
    else if (files.length === 1) label.innerText = files[0].name;
    else label.innerText = `${files.length} file dipilih`;
}

function setupDropzone(zoneId, inputId, labelId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    
    if(!zone || !input) return;

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            updateFileLabel(inputId, labelId);
        }
    });
    zone.addEventListener('click', (e) => {
        if(e.target !== input && e.target.tagName !== 'LABEL') {
            input.click();
        }
    });
}

setupDropzone('dropzone-split', 'split-files', 'split-label');
setupDropzone('dropzone-row', 'row-files', 'row-label');
setupDropzone('dropzone-merge', 'merge-files', 'merge-label');
setupDropzone('dropzone-gmaps', 'gmaps-files', 'gmaps-label'); 

const MAX_MB = 500;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_EXCEL_ROWS = 900000;

function exportData(dataArr2D, format, filename) {
    if (format === 'csv') {
        const csv = Papa.unparse(dataArr2D);
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename + ".csv";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else {
        const ws = XLSX.utils.aoa_to_sheet(dataArr2D);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, filename + ".xlsx");
    }
}

// --- 3. DATA SPLITTER LOGIC ---
const statusMapping = {
    'BY': 'Open', 'CR3': 'Open', 'CR5': 'Open', 'CR6': 'Open', 'NT': 'Open', 'OC': 'Open', 'OS': 'Open', 'DL': 'Open', 'UND': 'Open', 'RD': 'Open', 'OP3': 'Open', 'UN STATUS': 'Open', 'UN RUNSHEET': 'Open', 'UN RECEIVING': 'Open', 'UN INBOUND': 'Open', 'UN MANIFEST': 'Open', 'PROSES TODAY': 'Open', 'UN RUNSHEET 1': 'Open', 'UN RECEIVED': 'Open', 'UN HVI': 'Open', 'UN HVO': 'Open', 'UN DO': 'Open', 'X1': 'Open', 'X2': 'Open', 'X3.1': 'Open', 'X3.2': 'Open', 'X4': 'Open', 'X5': 'Open', 'X6': 'Open', 'X7.1': 'Open', 'X7.2': 'Open', 'X8': 'Open', 'X9': 'Open', 'X10': 'Open', 'U21': 'Open', 'U22': 'Open', 'U23': 'Open', 'U24': 'Open', 'U25': 'Open', 'BLANK': 'Open', 'WH1': 'Open', 'WH2': 'Open', 'WH3': 'Open', 'WH4': 'Open', 'PS2': 'Open', 'PS3': 'Open', 'PS5': 'Open', 'PS6': 'Open', 'PS7': 'Open', 'CL1': 'Open', 'CL2': 'Open', 'CL4': 'Open', 'HD7': 'Open', 'RFD': 'Open', 'HD8': 'Open', 'HD9': 'Open', 'CL3': 'Open', 'CR2': 'Open', 'U01': 'Open', 'U02': 'Open', 'U03': 'Open', 'U04': 'Open', 'U05': 'Open', 'U06': 'Open', 'U07': 'Open', 'U08': 'Open', 'U09': 'Open', 'U10': 'Open', 'U11': 'Open', 'U12': 'Open', 'U13': 'Open', 'UB2': 'Open', 'AL8': 'Open', 'A02': 'Open', 'A08': 'Open', 'A11': 'Open', 'AL3': 'Open', 'A03': 'Open', 'A07': 'Open', 'AL4': 'Open', 'KRK': 'Open', 'MR': 'Open', 'A04': 'Open', 'A10': 'Open', 'CW': 'Open', 'CA': 'Open', 'A06': 'Open', 'T10': 'Open', 'IP3': 'Open', 'HL5': 'Open', 'HL3': 'Open', 'HL1': 'Open', 'WH5': 'Open', 'HL4': 'Open', 'HL2': 'Open', 'T02': 'Open', 'X72': 'Open', 'X71': 'Open', 'X31': 'Open', 'BI2': 'Open', 'BI3': 'Open', 'WM': 'Open', 'DP3': 'Open', 'DP4': 'Open', 'CR7': 'Open', 'CR8': ' Open ',
    'D01': 'Closed', 'D02': 'Closed', 'D03': 'Closed', 'D04': 'Closed', 'D05': 'Closed', 'D06': 'Closed', 'D07': 'Closed', 'D08': 'Closed', 'D09': 'Closed', 'D10': 'Closed', 'D11': 'Closed', 'D12': 'Closed', 'D15': 'Closed', 'D16': 'Closed', 'DB1': 'Closed', 'DB2': 'Closed', 'R01': 'Closed', 'R02': 'Closed', 'R03': 'Closed', 'R04': 'Closed', 'R05': 'Closed', 'R06': 'Closed', 'R07': 'Closed', 'R08': 'Closed', 'R09': 'Closed', 'R10': 'Closed', 'R11': 'Closed', 'R12': 'Closed', 'R13': 'Closed', 'DP5': 'Closed','D1': 'Closed', 'DP1': 'Closed', 'D18': 'Closed', 'D17': 'Closed', 'UF': 'Closed',
    'CR1': 'Return',
    'U14': 'Claim', 'C05': 'Claim', 'D24': 'Claim', 'D25': 'Claim', 'D37': 'Claim', 'C01': 'Claim', 'U37': 'Claim', 'R37': 'Claim', 'R26': 'Claim', 'R24': 'Claim', 'R25': 'Claim', 'D32': 'Claim', 'D31': 'Claim', 'D30': 'Claim', 'D29': 'Claim', 'D28': 'Claim', 'D27': 'Claim', 'C02': 'Claim', 'C01': 'Claim', 'C04': 'Claim', 'C06': 'Claim', 'D26': 'Claim', 'CR4': 'Claim', 'PS8': 'Claim', 'PS4': 'Claim', 'PS1': 'Claim',
};

async function startSplit() {
    const files = document.getElementById('split-files').files;
    if (files.length === 0) return alert('Silakan pilih/tarik file terlebih dahulu!');
    const outFormat = document.getElementById('split-format').value;
    
    const btn = document.getElementById('btn-run-split');
    const progCont = document.getElementById('split-progress-container');
    const progBar = document.getElementById('split-progress-bar');
    const progStatus = document.getElementById('split-status');
    
    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');
    
    let memory = {
        'Open': { data: [], bytes: 0, part: 1 },
        'Closed': { data: [], bytes: 0, part: 1 },
        'Return': { data: [], bytes: 0, part: 1 },
        'Claim': { data: [], bytes: 0, part: 1 }
    };
    let headerRow = [];

    for(let i = 0; i < files.length; i++) {
        const file = files[i];
        progStatus.innerText = `Memproses: ${file.name} (${i+1}/${files.length})`;
        
        await new Promise((resolve) => {
            let isFirstRow = true;
            let codingIndex = -1;

            Papa.parse(file, {
                header: false, skipEmptyLines: true, chunkSize: 1024 * 1024 * 5,
                chunk: function(results, parser) {
                    let rows = results.data;
                    if (isFirstRow && rows.length > 0) {
                        headerRow = rows[0];
                        const headersStr = headerRow.map(h => String(h).trim().toUpperCase());
                        codingIndex = headersStr.indexOf('CODING');
                        if (codingIndex === -1) {
                            alert(`Kolom 'CODING' tidak ditemukan di file ${file.name}`);
                            parser.abort(); return;
                        }
                        ['Open', 'Closed', 'Return', 'Claim'].forEach(cat => {
                            if(memory[cat].data.length === 0) memory[cat].data.push(headerRow);
                        });
                        rows.shift();
                        isFirstRow = false;
                    }

                    rows.forEach(row => {
                        let code = row[codingIndex];
                        if(!code) code = 'BLANK';
                        code = String(code).trim().toUpperCase();
                        if(['NAN', 'NULL', '<NA>', ''].includes(code)) code = 'BLANK';

                        const status = statusMapping[code];
                        if(status && memory[status]) {
                            memory[status].data.push(row);
                            memory[status].bytes += row.join(",").length;
                            
                            let isLimitReached = outFormat === 'csv' ? 
                                (memory[status].bytes >= MAX_BYTES) : 
                                (memory[status].data.length >= MAX_EXCEL_ROWS);
                                
                            if(isLimitReached) {
                                exportData(memory[status].data, outFormat, `${status}_Part${memory[status].part}`);
                                memory[status].part++;
                                memory[status].data = [headerRow];
                                memory[status].bytes = 0;
                            }
                        }
                    });
                },
                complete: function() { resolve(); }
            });
        });
        
        let pct = Math.round(((i + 1) / files.length) * 100);
        progBar.style.width = `${pct}%`;
        document.getElementById('split-percent').innerText = `${pct}%`;
    }

    ['Open', 'Closed', 'Return', 'Claim'].forEach(cat => {
        if(memory[cat].data.length > 1) { 
            let fname = memory[cat].part > 1 ? `${cat}_Part${memory[cat].part}` : cat;
            exportData(memory[cat].data, outFormat, fname);
        }
    });

    progStatus.innerText = "Selesai!";
    btn.disabled = false; btn.classList.remove('opacity-50');
    alert('Pemotongan selesai!');
}

// --- 4. SPLIT BY ROWS LOGIC ---
async function startRowSplit() {
    const files = document.getElementById('row-files').files;
    if (files.length === 0) return alert('Silakan pilih/tarik file terlebih dahulu!');
    const rowLimit = parseInt(document.getElementById('row-limit').value);
    const outFormat = document.getElementById('row-format').value;
    
    if(isNaN(rowLimit) || rowLimit < 1) return alert('Batas baris tidak valid!');

    const btn = document.getElementById('btn-run-row');
    const progCont = document.getElementById('row-progress-container');
    const progBar = document.getElementById('row-progress-bar');
    const progStatus = document.getElementById('row-status');
    
    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');

    for(let i = 0; i < files.length; i++) {
        const file = files[i];
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
        progStatus.innerText = `Memotong: ${file.name} (${i+1}/${files.length})`;
        
        await new Promise(async (resolve) => {
            if(file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const sheetName = workbook.SheetNames[0];
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
                    
                    if(json.length <= 1) return resolve();
                    const header = json[0];
                    let part = 1;
                    let chunkData = [header];
                    
                    for(let j = 1; j < json.length; j++) {
                        chunkData.push(json[j]);
                        if(chunkData.length - 1 >= rowLimit) {
                            exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                            chunkData = [header];
                            part++;
                        }
                    }
                    if(chunkData.length > 1) {
                        exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                    }
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            } 
            else {
                let headerRow = null;
                let part = 1;
                let chunkData = [];
                
                Papa.parse(file, {
                    header: false, skipEmptyLines: true, chunkSize: 1024 * 1024 * 5,
                    chunk: function(results) {
                        let rows = results.data;
                        if(!headerRow && rows.length > 0) {
                            headerRow = rows.shift();
                            chunkData.push(headerRow);
                        }
                        for(let j = 0; j < rows.length; j++) {
                            chunkData.push(rows[j]);
                            if(chunkData.length - 1 >= rowLimit) {
                                exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                                chunkData = [headerRow];
                                part++;
                            }
                        }
                    },
                    complete: function() {
                        if(chunkData.length > 1) {
                            exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                        }
                        resolve();
                    }
                });
            }
        });
        
        let pct = Math.round(((i + 1) / files.length) * 100);
        progBar.style.width = `${pct}%`;
        document.getElementById('row-percent').innerText = `${pct}%`;
    }

    progStatus.innerText = "Pemotongan Selesai!";
    btn.disabled = false; btn.classList.remove('opacity-50');
}

// --- 5. DATA MERGER LOGIC ---
async function startMerge() {
    const files = document.getElementById('merge-files').files;
    if (files.length === 0) return alert('Pilih/tarik file untuk digabung!');
    const outFormat = document.getElementById('merge-format').value;
    const baseName = document.getElementById('merge-filename').value || 'Gabungan';
    const dupColInput = document.getElementById('merge-duplicate-col').value.trim().toUpperCase();

    const btn = document.getElementById('btn-run-merge');
    const progCont = document.getElementById('merge-progress-container');
    const progBar = document.getElementById('merge-progress-bar');
    const progStatus = document.getElementById('merge-status');
    
    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');

    let masterData = [];
    let headerWritten = false;
    let partCounter = 1;
    let currentBytes = 0;
    let seenValues = new Set();
    let dupColIndex = -1;
    let globalHeader = [];

    for(let i = 0; i < files.length; i++) {
        const file = files[i];
        progStatus.innerText = `Menumpuk: ${file.name} (${i+1}/${files.length})`;
        
        await new Promise((resolve) => {
            let isFirstRow = true;
            Papa.parse(file, {
                header: false, skipEmptyLines: true, chunkSize: 1024 * 1024 * 5,
                chunk: function(results) {
                    let rows = results.data;
                    if(rows.length === 0) return;
                    
                    if (isFirstRow) {
                        if (!headerWritten) {
                            globalHeader = rows.shift();
                            masterData.push(globalHeader);
                            currentBytes += globalHeader.join(",").length;
                            
                            if (dupColInput) {
                                const upperHeaders = globalHeader.map(h => String(h).trim().toUpperCase());
                                dupColIndex = upperHeaders.indexOf(dupColInput);
                                if (dupColIndex === -1) {
                                    alert(`Peringatan: Kolom '${document.getElementById('merge-duplicate-col').value}' tidak ditemukan di file pertama. Penggabungan dilanjutkan tanpa filter duplikat.`);
                                }
                            }
                            headerWritten = true;
                        } else {
                            rows.shift();
                        }
                        isFirstRow = false;
                    }

                    rows.forEach(r => {
                        if (dupColIndex !== -1) {
                            const cellVal = String(r[dupColIndex] || '').trim().toUpperCase();
                            if (cellVal !== '') {
                                if (seenValues.has(cellVal)) return;
                                seenValues.add(cellVal);
                            }
                        }
                        
                        masterData.push(r);
                        currentBytes += r.join(",").length;
                    });

                    let isLimitReached = outFormat === 'csv' ? 
                        (currentBytes >= MAX_BYTES) : 
                        (masterData.length >= MAX_EXCEL_ROWS);

                    if(isLimitReached) {
                        exportData(masterData, outFormat, `${baseName}_Part${partCounter}`);
                        partCounter++;
                        masterData = [globalHeader];
                        currentBytes = globalHeader.join(",").length;
                    }
                },
                complete: function() { resolve(); }
            });
        });

        let pct = Math.round(((i + 1) / files.length) * 100);
        progBar.style.width = `${pct}%`;
        document.getElementById('merge-percent').innerText = `${pct}%`;
    }

    if (masterData.length > 1) {
        let fname = partCounter > 1 ? `${baseName}_Part${partCounter}` : baseName;
        exportData(masterData, outFormat, fname);
    }

    progStatus.innerText = "Selesai digabung!";
    btn.disabled = false; btn.classList.remove('opacity-50');
}

// --- 6. AUDIO & TEXT LOGIC ---
const sttTextarea = document.getElementById('stt-result');
const sttBtnToggle = document.getElementById('btn-stt-toggle');
const sttBtnText = document.getElementById('stt-btn-text');
const sttIcon = sttBtnToggle.querySelector('i');

window.addEventListener('DOMContentLoaded', () => {
    const savedText = localStorage.getItem('nadi_stt_text');
    if(savedText) sttTextarea.value = savedText;
});

if(sttTextarea) {
    sttTextarea.addEventListener('input', () => {
        localStorage.setItem('nadi_stt_text', sttTextarea.value);
    });
}

const btnClearSTT = document.getElementById('btn-stt-clear');
if(btnClearSTT) {
    btnClearSTT.addEventListener('click', () => {
        if(confirm('Yakin ingin menghapus semua teks?')) {
            sttTextarea.value = '';
            localStorage.removeItem('nadi_stt_text');
        }
    });
}

let recognition;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onstart = () => {
        isRecording = true;
        sttBtnText.innerText = window.innerWidth < 768 ? "Merekam.." : "Sedang Merekam (Stop)";
        sttBtnToggle.classList.add('recording-active');
        sttIcon.classList.replace('fa-microphone', 'fa-stop-circle');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            }
        }
        if (finalTranscript) {
            sttTextarea.value += finalTranscript;
            localStorage.setItem('nadi_stt_text', sttTextarea.value);
            sttTextarea.scrollTop = sttTextarea.scrollHeight;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if(event.error === 'not-allowed') {
            alert('Izin penggunaan mikrofon ditolak oleh browser.');
            stopRecordingUI();
        }
    };

    recognition.onend = () => {
        if (isRecording) {
            try { recognition.start(); } catch(e) {}
        } else {
            stopRecordingUI();
        }
    };
} else {
    if(sttBtnToggle) {
        sttBtnToggle.disabled = true;
        sttBtnToggle.classList.replace('bg-nadi-blue', 'bg-gray-400');
        sttBtnText.innerText = "Browser Tidak Support Mic";
    }
}

function stopRecordingUI() {
    isRecording = false;
    if(sttBtnText) sttBtnText.innerText = "Mulai Merekam";
    if(sttBtnToggle) sttBtnToggle.classList.remove('recording-active');
    if(sttIcon) sttIcon.classList.replace('fa-stop-circle', 'fa-microphone');
}

if(sttBtnToggle) {
    sttBtnToggle.addEventListener('click', () => {
        if(!recognition) return alert('Fitur ini tidak didukung di browser Anda. Gunakan Google Chrome versi terbaru.');
        
        if(isRecording) {
            isRecording = false;
            recognition.stop();
            stopRecordingUI();
        } else {
            try { recognition.start(); } catch(e) { console.log(e); }
        }
    });
}

function saveAudioText(type) {
    const text = sttTextarea.value.trim();
    if(!text) return alert('Tidak ada teks untuk disimpan.');

    let blob, filename;
    if(type === 'txt') {
        blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        filename = 'Nadi_AudioToText.txt';
    } else if(type === 'doc') {
        const htmlFormat = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${text.replace(/\n/g, '<br>')}</body></html>`;
        blob = new Blob([htmlFormat], { type: 'application/msword;charset=utf-8' });
        filename = 'Nadi_AudioToText.doc';
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 6C. Text to Audio (Speech Synthesis)
const ttsInput = document.getElementById('tts-input');
const btnTtsPlay = document.getElementById('btn-tts-play');
const btnTtsStop = document.getElementById('btn-tts-stop');
const ttsLang = document.getElementById('tts-lang');

if(btnTtsPlay) {
    btnTtsPlay.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const text = ttsInput.value.trim();
            if(!text) return alert('Ketikkan teks terlebih dahulu!');

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = ttsLang.value;
            utterance.rate = 0.95; 
            utterance.pitch = 1;

            window.speechSynthesis.speak(utterance);
        } else {
            alert("Browser Anda tidak mendukung fitur Text to Audio.");
        }
    });
}

if(btnTtsStop) {
    btnTtsStop.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    });
}

// --- 7. GOOGLE MAPS SCRAPER LOGIC (CLIENT-SIDE SERVERLESS) ---

// Fungsi Download Template Kustom
function downloadCustomGmapsTemplate() {
    const templateData = [
        ["DATA_INPUT_UTAMA"],
        ["JNE Express Tomang Raya Jakarta"],
        ["-6.175392, 106.827153"],
        ["Jl. Asia Afrika Bandung"]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ width: 45 }]; 
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Input_Data");
    XLSX.writeFile(wb, "Nadi_Template_Maps_Scraper.xlsx");
}

// Helper Jeda Asinkronus agar browser tidak crash dan tidak diblokir API
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fungsi Utama Proses
async function startCustomMapsScraper() {
    const fileInput = document.getElementById('gmaps-files');
    if (fileInput.files.length === 0) {
        return alert('Silakan unggah file Excel/CSV terlebih dahulu!');
    }

    const options = {
        name: document.getElementById('opt-name').checked,
        latlong: document.getElementById('opt-latlong').checked,
        address: document.getElementById('opt-address').checked,
        url: document.getElementById('opt-url').checked,
    };

    const file = fileInput.files[0];
    const btn = document.getElementById('btn-run-custom-gmaps');
    const progCont = document.getElementById('gmaps-progress-container');
    const progBar = document.getElementById('gmaps-progress-bar');
    const progStatus = document.getElementById('gmaps-status');
    const logBox = document.getElementById('gmaps-log');

    // Reset UI State
    btn.disabled = true;
    btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');
    progBar.style.width = '0%';
    
    const printLog = (text, type = "INFO") => {
        let color = type === "ERROR" ? "text-red-400" : (type === "WARN" ? "text-yellow-400" : (type === "SYSTEM" ? "text-blue-400" : "text-green-400"));
        logBox.innerHTML += `<span class="${color}">[${type}] ${text}</span><br>`;
        logBox.scrollTop = logBox.scrollHeight;
    };

    logBox.innerHTML = '';
    printLog(`Mempersiapkan engine serverless lokal untuk: ${file.name}...`, "SYSTEM");

    try {
        // 1. Membaca File via SheetJS di RAM Browser
        const dataArr = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.SheetNames[0];
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {header: 1});
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });

        if(dataArr.length <= 1) throw new Error("Data kosong atau hanya berisi header.");

        const totalRows = dataArr.length - 1;
        printLog(`Ditemukan ${totalRows} baris data. Memulai ekstraksi...`);

        // 2. Persiapan Header Tabel Baru
        let finalData = [];
        let headerRow = ["DATA_INPUT_UTAMA"];
        if(options.name) headerRow.push("NAMA_TEMPAT");
        if(options.latlong) headerRow.push("LATITUDE_LONGITUDE");
        if(options.address) headerRow.push("ALAMAT_LENGKAP");
        
        // Kolom statis (Protected) untuk menjaga format user
        headerRow.push("RATING", "JUMLAH_ULASAN", "NO_TELEPON"); 
        
        if(options.url) headerRow.push("URL_MAPS");
        finalData.push(headerRow);

        let needGeocoding = options.name || options.latlong || options.address;

        if (needGeocoding) {
             printLog(`Mengaktifkan Public OpenStreetMap Geocoder (Bebas Biaya).`, "SYSTEM");
             printLog(`Kecepatan dibatasi 1 detik per API untuk menghindari IP Block...`, "WARN");
        } else {
             printLog(`Mode URL Only aktif. Pemrosesan berjalan kecepatan Super Cepat!`, "SYSTEM");
        }

        // 3. Looping Proses Data dengan Chunking
        for(let i = 1; i <= totalRows; i++) {
            let row = dataArr[i];
            if(!row || row.length === 0 || !row[0]) continue;

            let inputQuery = String(row[0]).trim();
            let newRow = [inputQuery];

            let geoData = { name: "Tidak Ditemukan", latlon: "Tidak Ditemukan", address: "Tidak Ditemukan" };

            // Ambil data Lat/Long dan alamat secara real-time via API Publik
            if (needGeocoding && inputQuery !== "") {
                try {
                    let fetchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputQuery)}&format=json&limit=1`;
                    const res = await fetch(fetchUrl);
                    const geoJson = await res.json();

                    if (geoJson && geoJson.length > 0) {
                        geoData.address = geoJson[0].display_name;
                        geoData.latlon = `${geoJson[0].lat}, ${geoJson[0].lon}`;
                        geoData.name = geoJson[0].display_name.split(',')[0];
                    }
                } catch(e) {
                    geoData.address = "Error fetching data";
                }
                
                // Wajib Jeda 1 detik agar browser tidak dianggap DDoS oleh API Publik
                await delay(1100);
            } else if (!needGeocoding && i % 1000 === 0) {
                // Jeda mikro setiap 1000 baris agar browser tidak macet jika data jutaan
                await delay(10); 
            }

            // Memasukkan hasil tarikan
            if(options.name) newRow.push(geoData.name);
            if(options.latlong) newRow.push(geoData.latlon);
            if(options.address) newRow.push(geoData.address);

            // Pengisian Default N/A untuk yang butuh proxy
            newRow.push("N/A (CORS Protected)", "N/A (CORS Protected)", "N/A (CORS Protected)");

            // Merakit URL Pintar Google Maps
            if(options.url) {
                let mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inputQuery)}`;
                newRow.push(mapsUrl);
            }

            finalData.push(newRow);

            // Kalkulasi dan Animasi Progress
            let pct = Math.round((i / totalRows) * 100);
            progBar.style.width = pct + '%';
            document.getElementById('gmaps-percent').innerText = pct + '%';
            progStatus.innerText = `Menarik Data (${i}/${totalRows})...`;

            if(needGeocoding || i % 1000 === 0 || i === totalRows) {
                printLog(`Sukses: ${inputQuery.substring(0, 30)}...`);
            }
        }

        printLog("Menyusun file Excel...", "SYSTEM");
        
        // 4. Proses Auto Download
        exportData(finalData, 'xlsx', `Nadi_Maps_Scraper_${new Date().getTime()}`);

        progStatus.innerText = "Selesai! File berhasil diunduh.";
        printLog("Proses selesai tanpa bantuan server!", "SUCCESS");

    } catch (error) {
        console.error(error);
        printLog(error.message, "ERROR");
        progStatus.innerText = "Terjadi kesalahan.";
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
    }
}