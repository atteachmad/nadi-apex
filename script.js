// --- Inisialisasi Tailwind CSS Khusus Warna Kustom ---
tailwind.config = {
    theme: {
        extend: { colors: { nadi: { blue: '#004A94', red: '#E31E24', light: '#F0F4F8' } } }
    }
}

// --- FUNGSI HELPER GLOBAL ---
const delay = ms => new Promise(res => setTimeout(res, ms));

// ==========================================================
// UX CENTER MODAL NOTIFICATION SYSTEM & AUTO REFRESH
// ==========================================================
function showToast(message, type = 'success', requireRefresh = false) {
    const container = document.getElementById('toast-container');
    const overlay = document.getElementById('toast-overlay');
    if (!container || !overlay) return;
    
    // Tampilkan Backdrop Hitam
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    
    const toast = document.createElement('div');
    let bgColor = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-blue-600');
    let icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    
    toast.className = `flex flex-col items-center p-6 text-white rounded-2xl shadow-2xl transform transition-all duration-300 scale-90 opacity-0 pointer-events-auto border border-white/20 ${bgColor} w-full max-w-sm text-center gap-4`;
    
    toast.innerHTML = `
        <i class="fas ${icon} text-5xl drop-shadow-md"></i>
        <div class="text-sm md:text-base font-semibold w-full break-words leading-relaxed">${message}</div>
        <button class="toast-close-btn mt-2 px-6 py-2.5 bg-black/20 hover:bg-black/40 rounded-lg text-white font-bold transition w-full focus:outline-none tracking-wider">
            TUTUP
        </button>
    `;
    
    container.appendChild(toast);
    
    // Animasi Muncul ke Tengah
    setTimeout(() => {
        toast.classList.remove('scale-90', 'opacity-0');
        toast.classList.add('scale-100', 'opacity-100');
    }, 50);
    
    // Logika Klik Tutup
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.onclick = () => {
        toast.classList.remove('scale-100', 'opacity-100');
        toast.classList.add('scale-90', 'opacity-0');
        overlay.classList.add('opacity-0');
        
        setTimeout(() => {
            toast.remove();
            // Cegah hilangnya overlay jika ada 2 error bersamaan
            if(container.children.length === 0) overlay.classList.add('hidden');
            
            // JIKA SUCCESS & MEMBUTUHKAN REFRESH, JALANKAN REFRESH SAAT DI TUTUP
            if (requireRefresh) window.location.reload();
        }, 300);
    };

    // Auto-Close hanya untuk info/error (Tanpa reload)
    if (type !== 'success') {
        setTimeout(() => {
            if (toast.parentElement) closeBtn.click();
        }, 6000);
    }
}

// --- 1. SIDEBAR TOGGLE & STATE MANAGEMENT ---
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
        if(tooltip) tooltip.innerText = sidebar.classList.contains('desktop-collapsed') ? "Buka Sidebar" : "Tutup Sidebar";
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
        'parquet': 'Parquet Converter & Injector',
        'splitter': 'Data Splitter (Auto Kategorisasi)',
        'rowsplitter': 'Split by Rows (Potong Baris)',
        'merger': 'Data Merger (Penggabung Cepat)',
        'audiotext': 'Audio & Text Converter',
        'gmaps': 'Custom Maps Mass Scraper', 
        'about': 'Panduan Penggunaan',
        'profile': 'Profil Kreator'
    };
    document.getElementById('header-title').innerText = titles[tabId];

    // Simpan Tab yang sedang dibuka sehingga Refresh Otomatis tidak akan mereset Tab UI
    sessionStorage.setItem('nadi_active_tab', tabId);

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    }
}

// Saat browser memuat, ambil tab yang terakhir disimpan di memori
document.addEventListener("DOMContentLoaded", () => {
    const activeTab = sessionStorage.getItem('nadi_active_tab') || 'parquet';
    switchTab(activeTab);
});

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
        if(e.target !== input && e.target.tagName !== 'LABEL') input.click();
    });
}

setupDropzone('dropzone-parquet', 'parquet-input-files', 'parquet-label');
setupDropzone('dropzone-split', 'split-files', 'split-label');
setupDropzone('dropzone-row', 'row-files', 'row-label');
setupDropzone('dropzone-merge', 'merge-files', 'merge-label');
setupDropzone('dropzone-gmaps', 'gmaps-files', 'gmaps-label'); 

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

// --- TRUE PARQUET ENGINE (WEBASSEMBLY DUCKDB) ---
async function loadDuckDBEngine() {
    if (window._duckdbInstance) return window._duckdbInstance;
    
    const duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/+esm');
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    
    const worker_url = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], {type: 'text/javascript'}));
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);
    
    window._duckdbInstance = db;
    window._duckdbLib = duckdb;
    return db;
}

function toggleParquetMode() {
    const isInject = document.querySelector('input[name="parquet-mode"]:checked').value === 'inject';
    const masterSection = document.getElementById('parquet-master-section');
    if (isInject) masterSection.classList.remove('hidden');
    else masterSection.classList.add('hidden');
}

async function startParquetProcess() {
    const mode = document.querySelector('input[name="parquet-mode"]:checked').value;
    const colMode = document.querySelector('input[name="parquet-col-mode"]:checked').value;
    const customColsRaw = document.getElementById('parquet-custom-columns').value;
    
    const customCols = customColsRaw.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    const inputFiles = document.getElementById('parquet-input-files').files;
    const masterFile = document.getElementById('parquet-master-file').files[0];

    if (inputFiles.length === 0) return showToast("Silakan unggah File Transaksi (Baru) terlebih dahulu!", "error");
    if (mode === 'inject' && !masterFile) return showToast("Mode Suntik aktif: Silakan unggah File Master .parquet lama Anda!", "error");

    const btn = document.getElementById('btn-run-parquet');
    const progCont = document.getElementById('parquet-progress-container');
    const progBar = document.getElementById('parquet-progress-bar');
    const progStatus = document.getElementById('parquet-status');

    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');
    progBar.style.width = '10%';

    try {
        progStatus.innerText = "Menghidupkan Parquet Engine di Browser...";
        const db = await loadDuckDBEngine();
        const conn = await db.connect();
        const duckdbLib = window._duckdbLib;

        progBar.style.width = '30%';

        if (mode === 'inject') {
            progStatus.innerText = "Memuat File Master Parquet...";
            await db.registerFileHandle('master.parquet', masterFile, duckdbLib.DuckDBDataProtocol.BROWSER_FILEREADER, true);
            await conn.query(`CREATE TABLE master_table AS SELECT * FROM 'master.parquet'`);
        }

        for (let i = 0; i < inputFiles.length; i++) {
            const file = inputFiles[i];
            let fileName = `input_${i}.csv`;
            progStatus.innerText = `Memproses File: ${file.name} ...`;

            if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                const csvStr = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // FORCE RAW: FALSE agar tanggal tidak hancur saat format conversion
                        const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array', cellDates: false, raw: false});
                        resolve(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));
                    };
                    reader.readAsArrayBuffer(file);
                });
                await db.registerFileText(fileName, csvStr);
            } else {
                await db.registerFileHandle(fileName, file, duckdbLib.DuckDBDataProtocol.BROWSER_FILEREADER, true);
            }

            const resHeaders = await conn.query(`DESCRIBE SELECT * FROM '${fileName}'`);
            const actualCols = resHeaders.toArray().map(r => r.column_name.toUpperCase());

            let selectQuery = "*";
            if (customCols.length > 0) {
                let validCols = [];
                if (colMode === 'keep') {
                    validCols = customCols.filter(c => actualCols.includes(c));
                    if(validCols.length === 0) throw new Error(`Kolom instruksi Anda (${customCols.join(', ')}) TIDAK DITEMUKAN di file ${file.name}.\nKolom asli yang tersedia: ${actualCols.join(', ')}`);
                } else if (colMode === 'drop') {
                    validCols = actualCols.filter(c => !customCols.includes(c));
                }
                selectQuery = validCols.map(c => `"${c}"`).join(", ");
            }

            if (mode === 'create' && i === 0) {
                await conn.query(`CREATE TABLE master_table AS SELECT ${selectQuery} FROM '${fileName}'`);
            } else {
                await conn.query(`INSERT INTO master_table SELECT ${selectQuery} FROM '${fileName}'`);
            }
        }

        progStatus.innerText = "Mengompilasi data ke format asli .parquet...";
        progBar.style.width = '80%';
        
        await conn.query(`COPY master_table TO 'output.parquet' (FORMAT PARQUET)`);
        const buffer = await db.copyFileToBuffer('output.parquet');
        
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const outName = mode === 'create' ? "Nadi_Master_Data.parquet" : "Nadi_Master_Updated.parquet";

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = outName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await conn.query(`DROP TABLE master_table`);
        await conn.close();

        progBar.style.width = '100%';
        progStatus.innerText = "Selesai! File Parquet siap ditarik.";
        // Memberikan true parameter untuk Reload pada Klik 'Tutup'
        showToast(`SUKSES! File Parquet berhasil diunduh. Silahkan klik Tutup untuk menyegarkan sistem.`, 'success', true);

    } catch (e) {
        showToast("KESALAHAN SISTEM: " + e.message, "error");
        progStatus.innerText = "Proses Dibatalkan.";
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}

// --- 3. DATA SPLITTER LOGIC (Diperbarui dengan Logika dari Lampiran 1) ---
const statusMapping = {
    'BY': 'Open', 'CR3': 'Open', 'CR5': 'Open', 'CR6': 'Open', 'NT': 'Open', 'OC': 'Open', 'OS': 'Open', 'DL': 'Open', 'UND': 'Open', 'RD': 'Open', 'OP3': 'Open', 'UN STATUS': 'Open', 'UN RUNSHEET': 'Open', 'UN RECEIVING': 'Open', 'UN INBOUND': 'Open', 'UN MANIFEST': 'Open', 'PROSES TODAY': 'Open', 'UN RUNSHEET 1': 'Open', 'UN RECEIVED': 'Open', 'UN HVI': 'Open', 'UN HVO': 'Open', 'UN DO': 'Open', 'X1': 'Open', 'X2': 'Open', 'X3.1': 'Open', 'X3.2': 'Open', 'X4': 'Open', 'X5': 'Open', 'X6': 'Open', 'X7.1': 'Open', 'X7.2': 'Open', 'X8': 'Open', 'X9': 'Open', 'X10': 'Open', 'U21': 'Open', 'U22': 'Open', 'U23': 'Open', 'U24': 'Open', 'U25': 'Open', 'BLANK': 'Open', 'WH1': 'Open', 'WH2': 'Open', 'WH3': 'Open', 'WH4': 'Open', 'PS2': 'Open', 'PS3': 'Open', 'PS5': 'Open', 'PS6': 'Open', 'PS7': 'Open', 'CL1': 'Open', 'CL2': 'Open', 'CL4': 'Open', 'HD7': 'Open', 'RFD': 'Open', 'HD8': 'Open', 'HD9': 'Open', 'CL3': 'Open', 'CR2': 'Open', 'U01': 'Open', 'U02': 'Open', 'U03': 'Open', 'U04': 'Open', 'U05': 'Open', 'U06': 'Open', 'U07': 'Open', 'U08': 'Open', 'U09': 'Open', 'U10': 'Open', 'U11': 'Open', 'U12': 'Open', 'U13': 'Open', 'UB2': 'Open', 'AL8': 'Open', 'A02': 'Open', 'A08': 'Open', 'A11': 'Open', 'AL3': 'Open', 'A03': 'Open', 'A07': 'Open', 'AL4': 'Open', 'KRK': 'Open', 'MR': 'Open', 'A04': 'Open', 'A10': 'Open', 'CW': 'Open', 'CA': 'Open', 'A06': 'Open', 'T10': 'Open', 'IP3': 'Open', 'HL5': 'Open', 'HL3': 'Open', 'HL1': 'Open', 'WH5': 'Open', 'HL4': 'Open', 'HL2': 'Open', 'T02': 'Open', 'X72': 'Open', 'X71': 'Open', 'X31': 'Open', 'BI2': 'Open', 'BI3': 'Open', 'WM': 'Open', 'DP3': 'Open', 'DP4': 'Open', 'CR7': 'Open', 'CR8': ' Open ',
    'D01': 'Closed', 'D02': 'Closed', 'D03': 'Closed', 'D04': 'Closed', 'D05': 'Closed', 'D06': 'Closed', 'D07': 'Closed', 'D08': 'Closed', 'D09': 'Closed', 'D10': 'Closed', 'D11': 'Closed', 'D12': 'Closed', 'D15': 'Closed', 'D16': 'Closed', 'DB1': 'Closed', 'DB2': 'Closed', 'R01': 'Closed', 'R02': 'Closed', 'R03': 'Closed', 'R04': 'Closed', 'R05': 'Closed', 'R06': 'Closed', 'R07': 'Closed', 'R08': 'Closed', 'R09': 'Closed', 'R10': 'Closed', 'R11': 'Closed', 'R12': 'Closed', 'R13': 'Closed', 'DP5': 'Closed','D1': 'Closed', 'DP1': 'Closed', 'D18': 'Closed', 'D17': 'Closed', 'UF': 'Closed',
    'CR1': 'Return',
    'U14': 'Claim', 'C05': 'Claim', 'D24': 'Claim', 'D25': 'Claim', 'D37': 'Claim', 'C01': 'Claim', 'U37': 'Claim', 'R37': 'Claim', 'R26': 'Claim', 'R24': 'Claim', 'R25': 'Claim', 'D32': 'Claim', 'D31': 'Claim', 'D30': 'Claim', 'D29': 'Claim', 'D28': 'Claim', 'D27': 'Claim', 'C02': 'Claim', 'C01': 'Claim', 'C04': 'Claim', 'C06': 'Claim', 'D26': 'Claim', 'CR4': 'Claim', 'PS8': 'Claim', 'PS4': 'Claim', 'PS1': 'Claim',
};

// ==========================================================
// KUNCI: raw & cellDates false menjamin tipe data Tanggal tidak korup!
// ==========================================================
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // raw: false, cellDates: false wajib untuk integrasi Format Tanggal sempurna (CSV <-> XLSX)
                const workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    return resolve([]);
                }
                
                let bestRows = [];
                for (let sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
                    
                    let hasCoding = false;
                    for(let i = 0; i < Math.min(rows.length, 200); i++) {
                        let row = rows[i];
                        if(!row || !Array.isArray(row)) continue;
                        if(row.some(col => String(col || '').toUpperCase().replace(/[^A-Z0-9]/g, '').includes('CODING'))) {
                            hasCoding = true;
                            break;
                        }
                    }
                    if (hasCoding) return resolve(rows);
                    if (rows.length > bestRows.length) bestRows = rows; 
                }
                resolve(bestRows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const splitInput = document.getElementById('split-files');
    const mergeInput = document.getElementById('merge-files');
    if (splitInput) splitInput.setAttribute('accept', '.csv, .xlsx, .xls');
    if (mergeInput) mergeInput.setAttribute('accept', '.csv, .xlsx, .xls');
});

async function startSplit() {
    const files = document.getElementById('split-files').files;
    const format = document.getElementById('split-format').value;
    
    if (files.length === 0) return showToast("Pilih minimal satu file (CSV / XLSX / XLS)!", "error");

    const btn = document.getElementById('btn-run-split');
    const progCont = document.getElementById('split-progress-container');
    const progBar = document.getElementById('split-progress-bar');
    const progPercent = document.getElementById('split-percent');
    const progStatus = document.getElementById('split-status');

    btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed');
    if (progCont) progCont.classList.remove('hidden');
    if (progBar) progBar.style.width = '0%';
    if (progPercent) progPercent.innerText = '0%';
    if (progStatus) progStatus.innerText = 'Memulai pemisahan data...';

    // Inisialisasi memory structure yang digunakan di Lampiran 1
    let memory = {
        'Open': { data: [], bytes: 0, part: 1 },
        'Closed': { data: [], bytes: 0, part: 1 },
        'Return': { data: [], bytes: 0, part: 1 },
        'Claim': { data: [], bytes: 0, part: 1 }
    };
    let headerRow = [];
    let codingIndex = -1;
    let totalFiles = files.length;
    let processedFiles = 0;

    const findHeaderIndex = (row) => {
        if (!row || !Array.isArray(row)) return -1;
        let exact = row.findIndex(col => String(col || '').replace(/[^A-Z0-9]/ig, '').toUpperCase() === 'CODING');
        if (exact !== -1) return exact;
        return row.findIndex(col => String(col || '').toUpperCase().includes('CODING'));
    };
    const SEARCH_LIMIT = 200; 

    try {
        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            if (progStatus) progStatus.innerText = `Membaca ${file.name}...`;

            const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

            if (isExcel) {
                let rows = await readExcelFile(file);
                if (rows && rows.length > 0) {
                    if (headerRow.length === 0) {
                        for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                            let foundIdx = findHeaderIndex(rows[r]);
                            if (foundIdx !== -1) {
                                headerRow = rows[r];
                                codingIndex = foundIdx;
                                ['Open', 'Closed', 'Return', 'Claim'].forEach(cat => {
                                    if(memory[cat].data.length === 0) memory[cat].data.push(headerRow);
                                });
                                rows = rows.slice(r + 1);
                                break;
                            }
                        }
                    } else {
                        for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                            let foundIdx = findHeaderIndex(rows[r]);
                            if (foundIdx !== -1) {
                                rows = rows.slice(r + 1); break;
                            }
                        }
                    }

                    if (codingIndex !== -1) {
                        // Logika inti seperti Lampiran 1 (tidak mengubah baris fisik, murni pemetaan kategori)
                        rows.forEach(row => {
                            if (!row || !Array.isArray(row)) return;

                            let code = row[codingIndex];
                            if(!code) code = 'BLANK';
                            code = String(code).trim().toUpperCase();
                            if(['NAN', 'NULL', '<NA>', ''].includes(code)) code = 'BLANK';

                            const status = statusMapping[code];
                            if(status && memory[status]) {
                                memory[status].data.push(row);
                                memory[status].bytes += row.join(",").length;
                                
                                let isLimitReached = format === 'csv' ? 
                                    (memory[status].bytes >= MAX_BYTES) : 
                                    (memory[status].data.length >= MAX_EXCEL_ROWS);
                                    
                                if(isLimitReached) {
                                    exportData(memory[status].data, format, `${status}_Part${memory[status].part}`);
                                    memory[status].part++;
                                    memory[status].data = [headerRow];
                                    memory[status].bytes = 0;
                                }
                            }
                        });
                    }
                }
                processedFiles++;
                let pct = Math.round((processedFiles / totalFiles) * 100);
                if (progBar) progBar.style.width = pct + '%';
                if (progPercent) progPercent.innerText = pct + '%';

            } else {
                await new Promise((resolve) => {
                    let isFirstRow = true;
                    Papa.parse(file, {
                        header: false, skipEmptyLines: true, chunkSize: 1024 * 1024 * 5,
                        chunk: function(results, parser) {
                            let rows = results.data;
                            if (isFirstRow && rows.length > 0 && headerRow.length === 0) {
                                for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                                    let foundIdx = findHeaderIndex(rows[r]);
                                    if (foundIdx !== -1) {
                                        headerRow = rows[r];
                                        codingIndex = foundIdx;
                                        ['Open', 'Closed', 'Return', 'Claim'].forEach(cat => {
                                            if(memory[cat].data.length === 0) memory[cat].data.push(headerRow);
                                        });
                                        rows = rows.slice(r + 1);
                                        break;
                                    }
                                }
                                if (codingIndex === -1) {
                                    showToast(`Kolom 'CODING' tidak ditemukan di file ${file.name}`, "error");
                                    parser.abort(); return;
                                }
                                isFirstRow = false;
                            } else if (isFirstRow) {
                                for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                                    let foundIdx = findHeaderIndex(rows[r]);
                                    if (foundIdx !== -1) { rows = rows.slice(r + 1); break; }
                                }
                                isFirstRow = false;
                            }

                            if (codingIndex === -1) return;

                            // Logika inti seperti Lampiran 1 (tidak mengubah baris fisik, murni pemetaan kategori)
                            rows.forEach(row => {
                                if (!row || !Array.isArray(row)) return;

                                let code = row[codingIndex];
                                if(!code) code = 'BLANK';
                                code = String(code).trim().toUpperCase();
                                if(['NAN', 'NULL', '<NA>', ''].includes(code)) code = 'BLANK';

                                const status = statusMapping[code];
                                if(status && memory[status]) {
                                    memory[status].data.push(row);
                                    memory[status].bytes += row.join(",").length;
                                    
                                    let isLimitReached = format === 'csv' ? 
                                        (memory[status].bytes >= MAX_BYTES) : 
                                        (memory[status].data.length >= MAX_EXCEL_ROWS);
                                        
                                    if(isLimitReached) {
                                        exportData(memory[status].data, format, `${status}_Part${memory[status].part}`);
                                        memory[status].part++;
                                        memory[status].data = [headerRow];
                                        memory[status].bytes = 0;
                                    }
                                }
                            });
                        },
                        complete: function() {
                            processedFiles++;
                            let pct = Math.round((processedFiles / totalFiles) * 100);
                            if (progBar) progBar.style.width = pct + '%';
                            if (progPercent) progPercent.innerText = pct + '%';
                            resolve();
                        }
                    });
                });
            }
        }

        if (progStatus) progStatus.innerText = 'Mengekspor data...';
        await delay(300);

        let exported = false;
        ['Open', 'Closed', 'Return', 'Claim'].forEach(cat => {
            if(memory[cat].data.length > 1) { 
                let fname = memory[cat].part > 1 ? `DATA_${cat.toUpperCase()}_Part${memory[cat].part}` : `DATA_${cat.toUpperCase()}`;
                exportData(memory[cat].data, format, fname);
                exported = true;
            }
        });

        if (!exported) {
            showToast("Tidak ada data yang berhasil dipisahkan. Pastikan file memiliki kolom CODING.", "error");
            if (progStatus) progStatus.innerText = 'Gagal memisahkan data.';
        } else {
            if (progStatus) progStatus.innerText = 'Pemisahan selesai!';
            showToast('Pemisahan Selesai! Klik tutup untuk segarkan aplikasi.', 'success', true);
        }
    } catch (error) {
        showToast("Terjadi kesalahan: " + error.message, "error");
        if (progStatus) progStatus.innerText = 'Error saat pemrosesan.';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// --- 4. SPLIT BY ROWS LOGIC ---
async function startRowSplit() {
    const files = document.getElementById('row-files').files;
    if (files.length === 0) return showToast('Silakan pilih/tarik file terlebih dahulu!', 'error');
    const rowLimit = parseInt(document.getElementById('row-limit').value);
    const outFormat = document.getElementById('row-format').value;
    
    if(isNaN(rowLimit) || rowLimit < 1) return showToast('Batas baris tidak valid!', 'error');

    const btn = document.getElementById('btn-run-row');
    const progCont = document.getElementById('row-progress-container');
    const progBar = document.getElementById('row-progress-bar');
    const progStatus = document.getElementById('row-status');
    
    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');

    try {
        for(let i = 0; i < files.length; i++) {
            const file = files[i];
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            progStatus.innerText = `Memotong: ${file.name} (${i+1}/${files.length})`;
            
            await new Promise(async (resolve) => {
                if(file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const data = new Uint8Array(e.target.result);
                        // Perlindungan Tipe Data Raw untuk Tanggal & Number
                        const workbook = XLSX.read(data, {type: 'array', cellDates: false, raw: false});
                        const sheetName = workbook.SheetNames[0];
                        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1, defval: '', raw: false});
                        
                        if(json.length <= 1) return resolve();
                        const header = json[0];
                        let part = 1;
                        let chunkData = [header];
                        
                        for(let j = 1; j < json.length; j++) {
                            chunkData.push(json[j]);
                            if(chunkData.length - 1 >= rowLimit) {
                                exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                                chunkData = [header]; part++;
                            }
                        }
                        if(chunkData.length > 1) exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                        resolve();
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    let headerRow = null;
                    let part = 1;
                    let chunkData = [];
                    Papa.parse(file, {
                        header: false, skipEmptyLines: true, chunkSize: 1024 * 1024 * 5,
                        chunk: function(results) {
                            let rows = results.data;
                            if(!headerRow && rows.length > 0) {
                                headerRow = rows.shift(); chunkData.push(headerRow);
                            }
                            for(let j = 0; j < rows.length; j++) {
                                chunkData.push(rows[j]);
                                if(chunkData.length - 1 >= rowLimit) {
                                    exportData(chunkData, outFormat, `${baseName}_Part${part}`);
                                    chunkData = [headerRow]; part++;
                                }
                            }
                        },
                        complete: function() {
                            if(chunkData.length > 1) exportData(chunkData, outFormat, `${baseName}_Part${part}`);
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
        showToast('Proses Split Rows Sukses! Klik tutup untuk segarkan aplikasi.', 'success', true);
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}

// --- 5. DATA MERGER LOGIC ---
async function startMerge() {
    const files = document.getElementById('merge-files').files;
    const format = document.getElementById('merge-format').value;
    const customNameInput = document.getElementById('merge-filename');
    const outputFilename = (customNameInput && customNameInput.value.trim() !== '') ? customNameInput.value.trim() : `DATA_MERGED_${new Date().getTime()}`;
    const dupColName = document.getElementById('merge-duplicate-col') ? document.getElementById('merge-duplicate-col').value.trim() : '';

    if (files.length === 0) return showToast("Pilih minimal satu file (CSV / XLSX / XLS)!", "error");

    const btn = document.getElementById('btn-run-merge');
    const progCont = document.getElementById('merge-progress-container');
    const progBar = document.getElementById('merge-progress-bar');
    const progPercent = document.getElementById('merge-percent');
    const progStatus = document.getElementById('merge-status');

    btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed');
    if (progCont) progCont.classList.remove('hidden');
    if (progBar) progBar.style.width = '0%';
    if (progPercent) progPercent.innerText = '0%';
    if (progStatus) progStatus.innerText = 'Memulai penggabungan data...';

    let mergedData = [];
    let header = null;
    let dupColIndex = -1;
    let seenValues = new Set();
    let totalFiles = files.length;
    let processedFiles = 0;

    try {
        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            if (progStatus) progStatus.innerText = `Membaca ${file.name}...`;
            const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

            if (isExcel) {
                let rows = await readExcelFile(file);
                if (rows && rows.length > 0) {
                    if (!header) {
                        header = rows[0];
                        mergedData.push(header);
                        rows = rows.slice(1);
                        if (dupColName) dupColIndex = header.findIndex(col => String(col || '').trim().toUpperCase() === dupColName.toUpperCase());
                    } else {
                        rows = rows.slice(1);
                    }
                    for (let row of rows) {
                        if (!row || row.length === 0) continue;
                        if (dupColIndex !== -1 && row[dupColIndex] !== undefined) {
                            let val = String(row[dupColIndex]).trim();
                            if (val) {
                                if (seenValues.has(val)) continue; 
                                seenValues.add(val);
                            }
                        }
                        mergedData.push(row);
                    }
                }
                processedFiles++;
                let pct = Math.round((processedFiles / totalFiles) * 100);
                if (progBar) progBar.style.width = pct + '%';
                if (progPercent) progPercent.innerText = pct + '%';
            } else {
                await new Promise((resolve) => {
                    let isFirstChunk = true;
                    Papa.parse(file, {
                        chunkSize: 1024 * 1024 * 5,
                        chunk: function(results) {
                            let rows = results.data;
                            if (rows.length === 0) return;
                            if (!header) {
                                header = rows[0];
                                mergedData.push(header);
                                rows = rows.slice(1);
                                if (dupColName) dupColIndex = header.findIndex(col => String(col || '').trim().toUpperCase() === dupColName.toUpperCase());
                            } else if (isFirstChunk) {
                                rows = rows.slice(1);
                            }
                            isFirstChunk = false;
                            for (let row of rows) {
                                if (!row || row.length === 0) continue;
                                if (dupColIndex !== -1 && row[dupColIndex] !== undefined) {
                                    let val = String(row[dupColIndex]).trim();
                                    if (val) {
                                        if (seenValues.has(val)) continue;
                                        seenValues.add(val);
                                    }
                                }
                                mergedData.push(row);
                            }
                        },
                        complete: function() {
                            processedFiles++;
                            let pct = Math.round((processedFiles / totalFiles) * 100);
                            if (progBar) progBar.style.width = pct + '%';
                            if (progPercent) progPercent.innerText = pct + '%';
                            resolve();
                        }
                    });
                });
            }
        }

        if (progStatus) progStatus.innerText = 'Mengekspor data gabungan...';
        await delay(300);

        if (mergedData.length > 1) {
            exportData(mergedData, format, outputFilename); 
            if (progStatus) progStatus.innerText = 'Penggabungan selesai!';
            showToast('Penggabungan File Selesai! Klik tutup untuk segarkan aplikasi.', 'success', true);
        } else {
            showToast("Tidak ada data yang berhasil digabungkan.", "error");
            if (progStatus) progStatus.innerText = 'Gagal menggabungkan data.';
        }
    } catch (error) {
        showToast("Terjadi kesalahan: " + error.message, "error");
        if (progStatus) progStatus.innerText = 'Error saat pemrosesan.';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// --- 6. AUDIO & TEXT LOGIC ---
const sttTextarea = document.getElementById('stt-result');
const sttBtnToggle = document.getElementById('btn-stt-toggle');
const sttBtnText = document.getElementById('stt-btn-text');
const sttIcon = sttBtnToggle ? sttBtnToggle.querySelector('i') : null;

window.addEventListener('DOMContentLoaded', () => {
    const savedText = localStorage.getItem('nadi_stt_text');
    if(savedText && sttTextarea) sttTextarea.value = savedText;
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
        if(sttBtnText) sttBtnText.innerText = window.innerWidth < 768 ? "Merekam.." : "Sedang Merekam (Stop)";
        if(sttBtnToggle) sttBtnToggle.classList.add('recording-active');
        if(sttIcon) sttIcon.classList.replace('fa-microphone', 'fa-stop-circle');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript && sttTextarea) {
            sttTextarea.value += finalTranscript;
            localStorage.setItem('nadi_stt_text', sttTextarea.value);
            sttTextarea.scrollTop = sttTextarea.scrollHeight;
        }
    };
    recognition.onerror = (event) => {
        if(event.error === 'not-allowed') {
            showToast('Izin penggunaan mikrofon ditolak oleh browser.', 'error');
            stopRecordingUI();
        }
    };
    recognition.onend = () => {
        if (isRecording) { try { recognition.start(); } catch(e) {} } else { stopRecordingUI(); }
    };
} else {
    if(sttBtnToggle) {
        sttBtnToggle.disabled = true;
        sttBtnToggle.classList.replace('bg-nadi-blue', 'bg-gray-400');
        if(sttBtnText) sttBtnText.innerText = "Browser Tidak Support Mic";
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
        if(!recognition) return showToast('Fitur ini tidak didukung di browser Anda.', 'error');
        if(isRecording) {
            isRecording = false; recognition.stop(); stopRecordingUI();
        } else {
            try { recognition.start(); } catch(e) {}
        }
    });
}

function saveAudioText(type) {
    if(!sttTextarea) return;
    const text = sttTextarea.value.trim();
    if(!text) return showToast('Tidak ada teks untuk disimpan.', 'error');

    let blob, filename;
    if(type === 'txt') {
        blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        filename = 'Nadi_AudioToText.txt';
    } else if(type === 'doc') {
        const htmlFormat = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${text.replace(/\n/g, '<br>')}</body></html>`;
        blob = new Blob([htmlFormat], { type: 'application/msword;charset=utf-8' });
        filename = 'Nadi_AudioToText.doc';
    }
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Teks berhasil disimpan!', 'success');
}

const ttsInput = document.getElementById('tts-input');
const btnTtsPlay = document.getElementById('btn-tts-play');
const btnTtsStop = document.getElementById('btn-tts-stop');
const ttsLang = document.getElementById('tts-lang');

if(btnTtsPlay) {
    btnTtsPlay.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const text = ttsInput.value.trim();
            if(!text) return showToast('Ketikkan teks terlebih dahulu!', 'error');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = ttsLang.value; utterance.rate = 0.95; utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        } else {
            showToast("Browser Anda tidak mendukung fitur Text to Audio.", "error");
        }
    });
}

if(btnTtsStop) {
    btnTtsStop.addEventListener('click', () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    });
}

// --- 7. GOOGLE MAPS SCRAPER LOGIC & FALLBACK ENGINE ---
function downloadCustomGmapsTemplate() {
    try {
        const templateData = [
            ["DATA_INPUT_UTAMA"], ["JNE Express Tomang Raya Jakarta"], ["-6.175392, 106.827153"], ["Jl. Soekarno-Hatta No.829 Mekar Mulya Bandung"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        ws['!cols'] = [{ wch: 45 }]; 
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Input_Data");
        XLSX.writeFile(wb, "Nadi_Template_Maps_Scraper.xlsx");
        showToast("Template berhasil diunduh", "success");
    } catch (err) {
        showToast("Terjadi kesalahan sistem saat membuat template.", "error");
    }
}

// ENGINE API FETCH
async function fetchGeocode(query) {
    try {
        let arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=1`;
        const resArc = await fetch(arcgisUrl);
        const arcJson = await resArc.json();
        
        if (arcJson && arcJson.candidates && arcJson.candidates.length > 0 && arcJson.candidates[0].score >= 70) {
            let candidate = arcJson.candidates[0];
            return { address: candidate.address, latlon: `${candidate.location.y}, ${candidate.location.x}`, name: candidate.address.split(',')[0], source: 'ArcGIS' };
        }

        let fetchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=id`;
        const res = await fetch(fetchUrl);
        const geoJson = await res.json();
        if (geoJson && geoJson.length > 0) {
            return { address: geoJson[0].display_name, latlon: `${geoJson[0].lat}, ${geoJson[0].lon}`, name: geoJson[0].display_name.split(',')[0], source: 'OSM' };
        }
    } catch(e) {
        console.warn("Fetch Error Geocode:", e);
    }
    return null;
}

// FALLBACK REGEX & ITERATIVE TRUNCATION ENGINE
async function progressiveGeocode(originalQuery) {
    let result = await fetchGeocode(originalQuery);
    if (result) return result; 

    const kwRegex = /(jalan|jl\.?|perumahan|perum|desa|kampung|kp\.?|kelurahan|kel\.?|kecamatan|kec\.?)\s+[a-zA-Z0-9]+/ig;
    let keywordsMatch = originalQuery.match(kwRegex);
    
    if (keywordsMatch && keywordsMatch.length > 0) {
        let fallbackQuery = keywordsMatch.join(', ');
        await delay(600); 
        result = await fetchGeocode(fallbackQuery);
        if (result) return result; 
    }
    
    let parts = originalQuery.split(/[,\s]+/).filter(p => p.length > 2);
    while(parts.length > 2) {
        parts.shift(); 
        let fallbackQuery = parts.join(' ');
        await delay(600);
        result = await fetchGeocode(fallbackQuery);
        if(result) return result;
    }
    
    return null; 
}

async function startCustomMapsScraper() {
    const fileInput = document.getElementById('gmaps-files');
    if (!fileInput || fileInput.files.length === 0) return showToast('Silakan unggah file Excel/CSV terlebih dahulu!', 'error');

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

    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');
    progBar.style.width = '0%';
    
    const printLog = (text, type = "INFO") => {
        let color = type === "ERROR" ? "text-red-500" : (type === "WARN" ? "text-yellow-400" : (type === "SYSTEM" ? "text-blue-400" : (type === "SUCCESS" ? "text-green-500" : "text-gray-300")));
        let time = new Date().toLocaleTimeString('id-ID', {hour12:false});
        logBox.innerHTML += `<div><span class="text-gray-500">[${time}]</span> <span class="${color} font-bold">[${type}]</span> ${text}</div>`;
        logBox.scrollTop = logBox.scrollHeight;
    };

    logBox.innerHTML = '';
    printLog(`Mempersiapkan engine serverless lokal untuk: ${file.name}...`, "SYSTEM");

    try {
        const dataArr = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    // Perlindungan Tipe Data Raw
                    const workbook = XLSX.read(data, {type: 'array', cellDates: false, raw: false});
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: '', raw: false});
                    resolve(json);
                } catch (err) { reject(err); }
            };
            reader.readAsArrayBuffer(file);
        });

        if(dataArr.length <= 1) throw new Error("Data kosong atau hanya berisi header.");
        const totalRows = dataArr.length - 1;
        printLog(`Ditemukan ${totalRows} baris data. Memulai ekstraksi...`, "INFO");

        let finalData = [];
        let headerRow = ["DATA_INPUT_UTAMA"];
        if(options.name) headerRow.push("NAMA_TEMPAT");
        if(options.latlong) headerRow.push("LATITUDE_LONGITUDE");
        if(options.address) headerRow.push("ALAMAT_LENGKAP");
        headerRow.push("RATING", "JUMLAH_ULASAN", "NO_TELEPON"); 
        if(options.url) headerRow.push("URL_MAPS");
        finalData.push(headerRow);

        let needGeocoding = options.name || options.latlong || options.address;

        for(let i = 1; i <= totalRows; i++) {
            let row = dataArr[i];
            if(!row || row.length === 0 || !row[0]) continue;

            let inputQuery = String(row[0]).trim();
            let newRow = [inputQuery];
            let geoData = { name: "Tidak Ditemukan", latlon: "Tidak Ditemukan", address: "Tidak Ditemukan" };

            if (needGeocoding && inputQuery !== "") {
                let geoResult = await progressiveGeocode(inputQuery);
                if (geoResult) {
                    geoData = geoResult;
                    printLog(`Sukses ekspor via ${geoResult.source}: ${inputQuery.substring(0,25)}...`, "SUCCESS");
                } else {
                    printLog(`Seluruh Fallback gagal (Not Found): ${inputQuery.substring(0,25)}...`, "WARN");
                }
                await delay(1200); 
            }

            if(options.name) newRow.push(geoData.name);
            if(options.latlong) newRow.push(geoData.latlon);
            if(options.address) newRow.push(geoData.address);
            newRow.push("N/A", "N/A", "N/A");
            if(options.url) newRow.push(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inputQuery)}`);

            finalData.push(newRow);

            let pct = Math.round((i / totalRows) * 100);
            progBar.style.width = pct + '%';
            document.getElementById('gmaps-percent').innerText = pct + '%';
            progStatus.innerText = `Menarik Data (${i}/${totalRows})...`;
        }
        
        exportData(finalData, 'xlsx', `Nadi_Maps_Scraper_${new Date().getTime()}`);
        progStatus.innerText = "Selesai! File berhasil diunduh.";
        printLog("Proses selesai tanpa bantuan backend server!", "SYSTEM");
        
        showToast("Ekstraksi Maps Selesai! Klik tutup untuk segarkan aplikasi.", "success", true);

    } catch (error) {
        printLog(error.message, "ERROR");
        progStatus.innerText = "Terjadi kesalahan.";
        showToast("Error Maps Scraper: " + error.message, "error");
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}
