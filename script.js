// --- Inisialisasi Tailwind CSS Khusus Warna Kustom ---
tailwind.config = {
    theme: {
        extend: { colors: { nadi: { blue: '#004A94', red: '#E31E24', light: '#F0F4F8' } } }
    }
}

// --- FUNGSI HELPER GLOBAL ---
const delay = ms => new Promise(res => setTimeout(res, ms));

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
            tooltip.innerText = sidebar.classList.contains('desktop-collapsed') ? "Buka Sidebar" : "Tutup Sidebar";
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

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    }
}

// Membuka tab Parquet sebagai halaman awal
document.addEventListener("DOMContentLoaded", () => {
    switchTab('parquet');
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

// --- TRUE PARQUET ENGINE (WEBASSEMBLY DUCKDB) ---
async function loadDuckDBEngine() {
    if (window._duckdbInstance) return window._duckdbInstance;
    
    // Impor librari DuckDB WASM dari JSDelivr secara asinkron
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

    if (inputFiles.length === 0) return alert("Silakan unggah File Transaksi (Baru) terlebih dahulu!");
    if (mode === 'inject' && !masterFile) return alert("Mode Suntik aktif: Silakan unggah File Master .parquet lama Anda!");

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
                        const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
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
                    if(validCols.length === 0) {
                        throw new Error(`Kolom instruksi Anda (${customCols.join(', ')}) TIDAK DITEMUKAN di file ${file.name}.\n\nKolom asli yang tersedia: ${actualCols.join(', ')}`);
                    }
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
        progStatus.innerText = "Selesai! File Parquet siap ditarik ke Power BI.";
        setTimeout(() => alert(`SUKSES!\nFile Parquet asli berhasil diunduh.\nSekarang Anda bisa melakukan Get Data -> Parquet di Power BI secara instan tanpa lag!`), 300);

    } catch (e) {
        alert("TERJADI KESALAHAN SISTEM:\n\n" + e.message);
        progStatus.innerText = "Proses Dibatalkan.";
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}

// --- 3. DATA SPLITTER LOGIC ---
const statusMapping = {
    'BY': 'Open', 'CR3': 'Open', 'CR5': 'Open', 'CR6': 'Open', 'NT': 'Open', 'OC': 'Open', 'OS': 'Open', 'DL': 'Open', 'UND': 'Open', 'RD': 'Open', 'OP3': 'Open', 'UN STATUS': 'Open', 'UN RUNSHEET': 'Open', 'UN RECEIVING': 'Open', 'UN INBOUND': 'Open', 'UN MANIFEST': 'Open', 'PROSES TODAY': 'Open', 'UN RUNSHEET 1': 'Open', 'UN RECEIVED': 'Open', 'UN HVI': 'Open', 'UN HVO': 'Open', 'UN DO': 'Open', 'X1': 'Open', 'X2': 'Open', 'X3.1': 'Open', 'X3.2': 'Open', 'X4': 'Open', 'X5': 'Open', 'X6': 'Open', 'X7.1': 'Open', 'X7.2': 'Open', 'X8': 'Open', 'X9': 'Open', 'X10': 'Open', 'U21': 'Open', 'U22': 'Open', 'U23': 'Open', 'U24': 'Open', 'U25': 'Open', 'BLANK': 'Open', 'WH1': 'Open', 'WH2': 'Open', 'WH3': 'Open', 'WH4': 'Open', 'PS2': 'Open', 'PS3': 'Open', 'PS5': 'Open', 'PS6': 'Open', 'PS7': 'Open', 'CL1': 'Open', 'CL2': 'Open', 'CL4': 'Open', 'HD7': 'Open', 'RFD': 'Open', 'HD8': 'Open', 'HD9': 'Open', 'CL3': 'Open', 'CR2': 'Open', 'U01': 'Open', 'U02': 'Open', 'U03': 'Open', 'U04': 'Open', 'U05': 'Open', 'U06': 'Open', 'U07': 'Open', 'U08': 'Open', 'U09': 'Open', 'U10': 'Open', 'U11': 'Open', 'U12': 'Open', 'U13': 'Open', 'UB2': 'Open', 'AL8': 'Open', 'A02': 'Open', 'A08': 'Open', 'A11': 'Open', 'AL3': 'Open', 'A03': 'Open', 'A07': 'Open', 'AL4': 'Open', 'KRK': 'Open', 'MR': 'Open', 'A04': 'Open', 'A10': 'Open', 'CW': 'Open', 'CA': 'Open', 'A06': 'Open', 'T10': 'Open', 'IP3': 'Open', 'HL5': 'Open', 'HL3': 'Open', 'HL1': 'Open', 'WH5': 'Open', 'HL4': 'Open', 'HL2': 'Open', 'T02': 'Open', 'X72': 'Open', 'X71': 'Open', 'X31': 'Open', 'BI2': 'Open', 'BI3': 'Open', 'WM': 'Open', 'DP3': 'Open', 'DP4': 'Open', 'CR7': 'Open', 'CR8': 'Open',
    'D01': 'Closed', 'D02': 'Closed', 'D03': 'Closed', 'D04': 'Closed', 'D05': 'Closed', 'D06': 'Closed', 'D07': 'Closed', 'D08': 'Closed', 'D09': 'Closed', 'D10': 'Closed', 'D11': 'Closed', 'D12': 'Closed', 'D15': 'Closed', 'D16': 'Closed', 'DB1': 'Closed', 'DB2': 'Closed', 'R01': 'Closed', 'R02': 'Closed', 'R03': 'Closed', 'R04': 'Closed', 'R05': 'Closed', 'R06': 'Closed', 'R07': 'Closed', 'R08': 'Closed', 'R09': 'Closed', 'R10': 'Closed', 'R11': 'Closed', 'R12': 'Closed', 'R13': 'Closed', 'DP5': 'Closed','D1': 'Closed', 'DP1': 'Closed', 'D18': 'Closed', 'D17': 'Closed', 'UF': 'Closed',
    'CR1': 'Return',
    'U14': 'Claim', 'C05': 'Claim', 'D24': 'Claim', 'D25': 'Claim', 'D37': 'Claim', 'C01': 'Claim', 'U37': 'Claim', 'R37': 'Claim', 'R26': 'Claim', 'R24': 'Claim', 'R25': 'Claim', 'D32': 'Claim', 'D31': 'Claim', 'D30': 'Claim', 'D29': 'Claim', 'D28': 'Claim', 'D27': 'Claim', 'C02': 'Claim', 'C01': 'Claim', 'C04': 'Claim', 'C06': 'Claim', 'D26': 'Claim', 'CR4': 'Claim', 'PS8': 'Claim', 'PS4': 'Claim', 'PS1': 'Claim',
};

// ==========================================================
// 0. HELPER UNTUK BACA FILE EXCEL (.XLSX / .XLS) - VERSI REVISI SCAN SEMUA SHEET
// ==========================================================
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    return resolve([]);
                }
                
                let bestRows = [];
                // Cerdas: Scan semua sheet (Bukan cuma sheet pertama), untuk menangkal sheet kosong/hidden dari APEX
                for (let sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                    
                    let hasCoding = false;
                    for(let i = 0; i < Math.min(rows.length, 200); i++) {
                        let row = rows[i];
                        if(!row || !Array.isArray(row)) continue;
                        
                        // Deteksi ekstrem: Bersihkan segala spasi atau metadata aneh
                        if(row.some(col => String(col || '').toUpperCase().replace(/[^A-Z0-9]/g, '').includes('CODING'))) {
                            hasCoding = true;
                            break;
                        }
                    }
                    
                    if (hasCoding) {
                        return resolve(rows); // Langsung kembalikan sheet valid yang ditemukan
                    }
                    
                    // Fallback jika tidak menemukan CODING sama sekali
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

// ==========================================================
// 1. DATA SPLITTER LOGIC (MEMPROSES CSV & XLSX/XLS)
// ==========================================================
async function startSplit() {
    const files = document.getElementById('split-files').files;
    const format = document.getElementById('split-format').value;
    
    if (files.length === 0) return alert("Pilih minimal satu file (CSV / XLSX / XLS)!");

    const btn = document.getElementById('btn-run-split');
    const progCont = document.getElementById('split-progress-container');
    const progBar = document.getElementById('split-progress-bar');
    const progPercent = document.getElementById('split-percent');
    const progStatus = document.getElementById('split-status');

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    if (progCont) progCont.classList.remove('hidden');
    if (progBar) progBar.style.width = '0%';
    if (progPercent) progPercent.innerText = '0%';
    if (progStatus) progStatus.innerText = 'Memulai pemisahan data...';

    let closedData = [], openData = [], claimData = [], returnData = [];
    let header = null;
    let codingIndex = -1;

    let totalFiles = files.length;
    let processedFiles = 0;

    // FUNGSI HELPER: Mencari posisi kolom secara super ketat tanpa memperdulikan jebakan karakter Excel
    const findHeaderIndex = (row) => {
        if (!row || !Array.isArray(row)) return -1;
        // 1. Prioritaskan kecocokan persis (Exact Match) bebas karakter siluman
        let exact = row.findIndex(col => String(col || '').replace(/[^A-Z0-9]/ig, '').toUpperCase() === 'CODING');
        if (exact !== -1) return exact;
        // 2. Jika tetap tidak ada, ambil sel yang "mengandung" kata CODING
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
                    if (!header) {
                        for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                            let foundIdx = findHeaderIndex(rows[r]);
                            if (foundIdx !== -1) {
                                header = rows[r];
                                codingIndex = foundIdx;
                                closedData.push(header);
                                openData.push(header);
                                claimData.push(header);
                                returnData.push(header);
                                rows = rows.slice(r + 1);
                                break;
                            }
                        }
                    } else {
                        for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                            let foundIdx = findHeaderIndex(rows[r]);
                            if (foundIdx !== -1) {
                                rows = rows.slice(r + 1);
                                break;
                            }
                        }
                    }

                    if (codingIndex !== -1) {
                        for (let row of rows) {
                            // Revisi: Tidak lagi mengecek batas array yang terpotong untuk Excel
                            if (!row || !Array.isArray(row)) continue;
                            
                            let codeVal = row[codingIndex];
                            let code = String(codeVal === undefined ? '' : codeVal).trim().toUpperCase();
                            
                            if (!code) continue; 

                            let cat = (typeof statusMapping !== 'undefined' && statusMapping[code]) ? statusMapping[code].trim().toUpperCase() : 'OPEN';
                            if (cat === 'CLOSED') closedData.push(row);
                            else if (cat === 'CLAIM') claimData.push(row);
                            else if (cat === 'RETURN') returnData.push(row);
                            else openData.push(row);
                        }
                    }
                }

                processedFiles++;
                let pct = Math.round((processedFiles / totalFiles) * 100);
                if (progBar) progBar.style.width = pct + '%';
                if (progPercent) progPercent.innerText = pct + '%';

            } else {
                // LOGIKA PROSES FILE CSV
                await new Promise((resolve) => {
                    let isFirstRow = true;
                    Papa.parse(file, {
                        chunkSize: 1024 * 1024 * 5,
                        chunk: function(results) {
                            let rows = results.data;
                            if (rows.length === 0) return;

                            if (!header) {
                                for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                                    let foundIdx = findHeaderIndex(rows[r]);
                                    if (foundIdx !== -1) {
                                        header = rows[r];
                                        codingIndex = foundIdx;
                                        closedData.push(header);
                                        openData.push(header);
                                        claimData.push(header);
                                        returnData.push(header);
                                        rows = rows.slice(r + 1);
                                        break;
                                    }
                                }
                            } else if (isFirstRow) {
                                for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                                    let foundIdx = findHeaderIndex(rows[r]);
                                    if (foundIdx !== -1) {
                                        rows = rows.slice(r + 1);
                                        break;
                                    }
                                }
                            }
                            isFirstRow = false;

                            if (codingIndex === -1) return;

                            for (let row of rows) {
                                if (!row || !Array.isArray(row)) continue;
                                let codeVal = row[codingIndex];
                                let code = String(codeVal === undefined ? '' : codeVal).trim().toUpperCase();
                                
                                if (!code) continue;

                                let cat = (typeof statusMapping !== 'undefined' && statusMapping[code]) ? statusMapping[code].trim().toUpperCase() : 'OPEN';
                                if (cat === 'CLOSED') closedData.push(row);
                                else if (cat === 'CLAIM') claimData.push(row);
                                else if (cat === 'RETURN') returnData.push(row);
                                else openData.push(row);
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

        if (progStatus) progStatus.innerText = 'Mengekspor data...';
        await delay(300);

        let exported = false;
        if (closedData.length > 1) { exportData(closedData, format, 'DATA_CLOSED'); exported = true; }
        if (openData.length > 1) { exportData(openData, format, 'DATA_OPEN'); exported = true; }
        if (claimData.length > 1) { exportData(claimData, format, 'DATA_CLAIM'); exported = true; }
        if (returnData.length > 1) { exportData(returnData, format, 'DATA_RETURN'); exported = true; }

        if (!exported) {
            alert("Tidak ada data yang berhasil dipisahkan. Pastikan file memiliki kolom CODING.");
            if (progStatus) progStatus.innerText = 'Gagal memisahkan data.';
        } else {
            if (progStatus) progStatus.innerText = 'Pemisahan selesai!';
        }
    } catch (error) {
        alert("Terjadi kesalahan: " + error.message);
        if (progStatus) progStatus.innerText = 'Error saat pemrosesan.';
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}


// ==========================================================
// 2. DATA MERGER LOGIC (MEMPROSES CSV & XLSX/XLS)
// ==========================================================
async function startMerge() {
    const files = document.getElementById('merge-files').files;
    const format = document.getElementById('merge-format').value;
    const dupColName = document.getElementById('merge-dup-col') ? document.getElementById('merge-dup-col').value.trim() : '';

    if (files.length === 0) return alert("Pilih minimal satu file (CSV / XLSX / XLS)!");

    const btn = document.getElementById('btn-run-merge');
    const progCont = document.getElementById('merge-progress-container');
    const progBar = document.getElementById('merge-progress-bar');
    const progPercent = document.getElementById('merge-percent');
    const progStatus = document.getElementById('merge-status');

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
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

                        if (dupColName) {
                            dupColIndex = header.findIndex(col => String(col || '').trim().toUpperCase() === dupColName.toUpperCase());
                        }
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

                                if (dupColName) {
                                    dupColIndex = header.findIndex(col => String(col || '').trim().toUpperCase() === dupColName.toUpperCase());
                                }
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
            exportData(mergedData, format, `DATA_MERGED_${new Date().getTime()}`);
            if (progStatus) progStatus.innerText = 'Penggabungan selesai!';
        } else {
            alert("Tidak ada data yang berhasil digabungkan.");
            if (progStatus) progStatus.innerText = 'Gagal menggabungkan data.';
        }
    } catch (error) {
        alert("Terjadi kesalahan: " + error.message);
        if (progStatus) progStatus.innerText = 'Error saat pemrosesan.';
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
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
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            }
        }
        if (finalTranscript && sttTextarea) {
            sttTextarea.value += finalTranscript;
            localStorage.setItem('nadi_stt_text', sttTextarea.value);
            sttTextarea.scrollTop = sttTextarea.scrollHeight;
        }
    };

    recognition.onerror = (event) => {
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
        if(!recognition) return alert('Fitur ini tidak didukung di browser Anda. Gunakan Google Chrome versi terbaru.');
        
        if(isRecording) {
            isRecording = false;
            recognition.stop();
            stopRecordingUI();
        } else {
            try { recognition.start(); } catch(e) {}
        }
    });
}

function saveAudioText(type) {
    if(!sttTextarea) return;
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

// 6C. Text to Audio
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

// --- 7. GOOGLE MAPS SCRAPER LOGIC ---
function downloadCustomGmapsTemplate() {
    try {
        const templateData = [
            ["DATA_INPUT_UTAMA"],
            ["JNE Express Tomang Raya Jakarta"],
            ["-6.175392, 106.827153"],
            ["Jl. Soekarno-Hatta No.829 Mekar Mulya Bandung"]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        ws['!cols'] = [{ wch: 45 }]; 
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Input_Data");
        XLSX.writeFile(wb, "Nadi_Template_Maps_Scraper.xlsx");
    } catch (err) {
        alert("Terjadi kesalahan sistem saat membuat template. Pastikan memori browser Anda tidak penuh.");
    }
}

async function startCustomMapsScraper() {
    const fileInput = document.getElementById('gmaps-files');
    if (!fileInput || fileInput.files.length === 0) {
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
                try {
                    let fetchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputQuery)}&format=json&limit=1`;
                    const res = await fetch(fetchUrl);
                    const geoJson = await res.json();

                    if (geoJson && geoJson.length > 0) {
                        geoData.address = geoJson[0].display_name;
                        geoData.latlon = `${geoJson[0].lat}, ${geoJson[0].lon}`;
                        geoData.name = geoJson[0].display_name.split(',')[0];
                    } else {
                        let arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(inputQuery)}&maxLocations=1`;
                        const resArc = await fetch(arcgisUrl);
                        const arcJson = await resArc.json();

                        if (arcJson && arcJson.candidates && arcJson.candidates.length > 0) {
                            let candidate = arcJson.candidates[0];
                            geoData.address = candidate.address;
                            geoData.latlon = `${candidate.location.y}, ${candidate.location.x}`;
                            geoData.name = candidate.address.split(',')[0];
                        }
                    }
                } catch(e) {}
                await delay(1200);
            } else if (!needGeocoding && i % 1000 === 0) {
                await delay(10); 
            }

            if(options.name) newRow.push(geoData.name);
            if(options.latlong) newRow.push(geoData.latlon);
            if(options.address) newRow.push(geoData.address);

            newRow.push("N/A", "N/A", "N/A");

            if(options.url) {
                let mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inputQuery)}`;
                newRow.push(mapsUrl);
            }

            finalData.push(newRow);

            let pct = Math.round((i / totalRows) * 100);
            progBar.style.width = pct + '%';
            document.getElementById('gmaps-percent').innerText = pct + '%';
            progStatus.innerText = `Menarik Data (${i}/${totalRows})...`;
        }
        
        exportData(finalData, 'xlsx', `Nadi_Maps_Scraper_${new Date().getTime()}`);
        progStatus.innerText = "Selesai! File berhasil diunduh.";
        printLog("Proses selesai tanpa bantuan server!", "SUCCESS");

    } catch (error) {
        printLog(error.message, "ERROR");
        progStatus.innerText = "Terjadi kesalahan.";
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
    }
}
