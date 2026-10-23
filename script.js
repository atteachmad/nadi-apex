// --- FUNGSI HELPER GLOBAL ---
const delay = ms => new Promise(res => setTimeout(res, ms));

// ---KONFIGURASI: REGISTRASI, TRACKING & DONASI---
const NADI_API_URL = 'https://script.google.com/macros/s/AKfycbzuc8Y7xCULKv2gH4jSjP2FTVS9RLFGMFl7rgZy0-tbr27DcHmrhmUhZuUVycBrsbwz/exec'; // GANTI dengan URL /exec Anda
const REQUIRE_REGISTRATION = true;   // false = registrasi tidak wajib
const DONATE_COOLDOWN_DAYS = 3;      // jeda jika klik "Nanti saja"
const DONATE_DONE_COOLDOWN_DAYS = 15; // jeda jika klik "Sudah donasi"

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function nadiGetUser() {
    try { return JSON.parse(localStorage.getItem('nadi_user') || 'null'); } catch (e) { return null; }
}

function nadiSend(payload) {
    if (!NADI_API_URL || NADI_API_URL.includes('XXXX')) return;
    try {
        // text/plain + no-cors menghindari preflight CORS; keepalive agar terkirim walau halaman reload
        fetch(NADI_API_URL, {
            method: 'POST', mode: 'no-cors', keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }).catch(() => {});
    } catch (e) {}
}

function trackUsage(feature, fileCount) {
    const u = nadiGetUser();
    if (!u) return;
    nadiSend({ type: 'usage', email: u.email, feature: feature, files: fileCount || 0 });
}

function showRegisterModal() {
    const m = document.getElementById('register-modal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function submitRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim().toLowerCase();
    const consent = document.getElementById('register-consent').checked;
    const err = document.getElementById('register-error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.innerText = 'Format email tidak valid.'; return; }
    if (!consent) { err.innerText = 'Anda perlu menyetujui penggunaan data untuk melanjutkan.'; return; }
    try { localStorage.setItem('nadi_user', JSON.stringify({ name, email, verified: false, consentAt: new Date().toISOString() })); } catch (e) {}
    nadiSend({ type: 'register', name, email, consent: true });
    const m = document.getElementById('register-modal');
    m.classList.add('hidden'); m.classList.remove('flex');
    if (isJneEmail(email)) showVerifyModal(true); else applyAccessControl();
}

function maybeShowDonate(force = false) {
    let next = 0;
    try { next = parseInt(localStorage.getItem('nadi_donate_next') || '0', 10); } catch (e) {}
    if (!force && Date.now() < next) return;
    const m = document.getElementById('donate-modal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function closeDonate(alreadyDonated) {
    const m = document.getElementById('donate-modal');
    m.classList.add('hidden'); m.classList.remove('flex');
    const days = alreadyDonated ? DONATE_DONE_COOLDOWN_DAYS : DONATE_COOLDOWN_DAYS;
    try { localStorage.setItem('nadi_donate_next', String(Date.now() + days * 86400000)); } catch (e) {}
}
// ==========================================================
// AKSES JNE, VERIFIKASI OTP & HELPER BERSAMA
// ==========================================================
const INTERNAL_DOMAINS = ['jne.co.id'];

function isJneEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    return INTERNAL_DOMAINS.some(d => e.endsWith('@' + d));
}
function isJneVerified() {
    const u = nadiGetUser();
    return !!(u && u.verified === true && isJneEmail(u.email));
}
function applyAccessControl() {
    const ok = isJneVerified();
    const btn = document.getElementById('btn-splitter');
    if (btn) btn.style.display = ok ? '' : 'none';
    const about = document.getElementById('about-splitter');
    if (about) about.style.display = ok ? '' : 'none';
    if (!ok && sessionStorage.getItem('nadi_active_tab') === 'splitter') switchTab('parquet');
}

// Panggilan yang butuh balasan (OTP). Berbeda dengan nadiSend yang fire-and-forget.
async function nadiCall(payload) {
    if (!NADI_API_URL || NADI_API_URL.includes('XXXX')) return { ok: false, error: 'config' };
    try {
        const res = await fetch(NADI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (e) { return { ok: false, error: 'network' }; }
}

function showVerifyModal(autoSend) {
    const m = document.getElementById('verify-modal');
    if (!m) return;
    m.classList.remove('hidden'); m.classList.add('flex');
        if (autoSend) sendOtp();
    else { const vm = document.getElementById('verify-msg'); if (vm) vm.innerText = 'Klik "Kirim ulang" untuk meminta kode baru.'; }
}
function hideVerifyModal() {
    const m = document.getElementById('verify-modal');
    m.classList.add('hidden'); m.classList.remove('flex');
}
function skipVerify() {
    try { sessionStorage.setItem('nadi_verify_skipped', '1'); } catch (e) {}
    hideVerifyModal();
}
async function sendOtp() {
    const u = nadiGetUser(); if (!u) return;
    const msg = document.getElementById('verify-msg');
    msg.className = 'text-xs mt-2 min-h-[1rem] text-gray-500';
    msg.innerText = 'Mengirim kode...';
    const r = await nadiCall({ type: 'send_otp', email: u.email });
    if (r.ok) { msg.innerText = 'Kode dikirim ke ' + u.email + '. Cek inbox/spam (berlaku 10 menit).'; return; }
    msg.className = 'text-xs mt-2 min-h-[1rem] text-red-600';
    msg.innerText = r.error === 'wait' ? 'Tunggu 1 menit sebelum meminta kode lagi.'
        : r.error === 'not_internal' ? 'Email ini bukan email JNE.'
        : 'Gagal mengirim kode. Coba lagi nanti.';
}
async function submitVerify() {
    const u = nadiGetUser(); if (!u) return;
    const code = document.getElementById('verify-code').value.trim();
    const msg = document.getElementById('verify-msg');
    msg.className = 'text-xs mt-2 min-h-[1rem] text-red-600';
    if (!/^\d{6}$/.test(code)) { msg.innerText = 'Masukkan 6 digit kode.'; return; }
    const r = await nadiCall({ type: 'verify_otp', email: u.email, code });
    if (r.ok) {
        u.verified = true;
        try { localStorage.setItem('nadi_user', JSON.stringify(u)); } catch (e) {}
        hideVerifyModal();
        applyAccessControl();
        showToast('Verifikasi berhasil. Menu Data Splitter sekarang tersedia.', 'success');
    } else {
        msg.innerText = r.error === 'wrong' ? 'Kode salah.'
            : r.error === 'expired' ? 'Kode kedaluwarsa. Klik "Kirim ulang".'
            : r.error === 'too_many' ? 'Terlalu banyak percobaan. Klik "Kirim ulang".'
            : 'Verifikasi gagal. Coba lagi.';
    }
}
// Ganti akun (untuk pengguna JNE yang sebelumnya mendaftar dengan email lain)
function switchAccount() {
    const u = nadiGetUser();
    const info = u ? 'Saat ini terdaftar sebagai ' + u.email + '. ' : '';
    if (!confirm(info + 'Daftar ulang dengan email JNE (@jne.co.id) untuk membuka menu Data Splitter?')) return;
    try { localStorage.removeItem('nadi_user'); } catch (e) {}
    try { sessionStorage.removeItem('nadi_verify_skipped'); } catch (e) {}
    const em = document.getElementById('register-email'); if (em) em.value = '';
    const cs = document.getElementById('register-consent'); if (cs) cs.checked = false;
    const er = document.getElementById('register-error'); if (er) er.innerText = '';
    applyAccessControl();
    showRegisterModal();
}
// Bersihkan input file setelah proses sukses (pengganti reload halaman)
function resetAfterSuccess() {
    [['parquet-input-files', 'parquet-label'], ['split-files', 'split-label'], ['row-files', 'row-label'],
     ['merge-files', 'merge-label'], ['gmaps-files', 'gmaps-label']].forEach(([i, l]) => {
        const el = document.getElementById(i);
        if (el) { el.value = ''; updateFileLabel(i, l); }
    });
    const mf = document.getElementById('parquet-master-file'); if (mf) mf.value = '';
}

// Peringatan sebelum memproses file besar di memori browser
function confirmLargeInput(files, limitMB = 150) {
    let total = 0; for (const f of files) total += f.size;
    if (total / 1048576 <= limitMB) return true;
    return confirm('Total ukuran file ' + (total / 1048576).toFixed(0) + ' MB. Pemrosesan di browser bisa macet/gagal pada ukuran ini (disarankan di bawah ' + limitMB + ' MB). Lanjutkan?');
}

// Pencocokan kolom berdasarkan NAMA header (bukan posisi)
const normHeader = h => String(h ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

function buildAligner(master, fileHeader, warnings, fileName, extend) {
    const fileNorm = fileHeader.map(normHeader);
    if (extend) {
        fileNorm.forEach((h, i) => {
            if (h !== '' && !master.norm.includes(h)) {
                master.norm.push(h);
                master.names.push(String(fileHeader[i] ?? '').trim());
                warnings.push(fileName + ': kolom baru "' + String(fileHeader[i]).trim() + '" ditambahkan di akhir');
            }
        });
    }
    const idxInFile = master.norm.map(h => h === '' ? -1 : fileNorm.indexOf(h));
    const missing = master.norm.filter((h, i) => h !== '' && idxInFile[i] === -1);
    if (missing.length) warnings.push(fileName + ': kolom tidak ditemukan, dikosongkan: ' + missing.join(', '));
    if (!extend) {
        const extra = fileNorm.filter(h => h !== '' && !master.norm.includes(h));
        if (extra.length) warnings.push(fileName + ': kolom tambahan diabaikan: ' + extra.join(', '));
    }
    const identity = fileNorm.length === master.norm.length && idxInFile.every((v, i) => v === i);
    return identity ? (row => row) : (row => idxInFile.map(i => i === -1 ? '' : (row[i] ?? '')));
}

// --- UX CENTER MODAL NOTIFICATION SYSTEM & AUTO REFRESH ---

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
        <div class="text-sm md:text-base font-semibold w-full break-words leading-relaxed whitespace-pre-line">${escapeHtml(message)}</div>
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
             if (requireRefresh) {
            resetAfterSuccess();
            setTimeout(() => maybeShowDonate(), 400);
            }
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
        if (tabId === 'splitter' && !isJneVerified()) tabId = 'parquet';
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
    applyAccessControl();
    const activeTab = sessionStorage.getItem('nadi_active_tab') || 'parquet';
    switchTab(activeTab);

    const u = nadiGetUser();
    if (REQUIRE_REGISTRATION && !u) {
        showRegisterModal();
    } else if (u && isJneEmail(u.email) && !u.verified && !sessionStorage.getItem('nadi_verify_skipped')) {
        showVerifyModal(false);
    }
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

const XLSX_MAX_ROWS = 1048576;

function buildBlob(dataArr2D, format) {
    if (format === 'xlsx' && dataArr2D.length <= XLSX_MAX_ROWS) {
        const ws = XLSX.utils.aoa_to_sheet(dataArr2D);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return { blob: new Blob([out], { type: 'application/octet-stream' }), ext: 'xlsx', fallback: false };
    }
    const csv = Papa.unparse(dataArr2D);
    return { blob: new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' }), ext: 'csv', fallback: format === 'xlsx' };
}

function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
}

function exportData(dataArr2D, format, filename) {
    const r = buildBlob(dataArr2D, format);
    downloadBlob(r.blob, filename + '.' + r.ext);
    if (r.fallback) showToast('Data melebihi batas baris Excel (1.048.576). ' + filename + ' disimpan sebagai CSV.', 'info');
}

// Banyak file hasil → satu ZIP (menghindari pemblokiran "unduh banyak file" di browser)
async function exportMany(parts, format, zipName) {
    if (parts.length === 0) return;
    if (parts.length === 1) { exportData(parts[0].data, format, parts[0].name); return; }
    if (typeof JSZip === 'undefined') {
        for (const p of parts) { exportData(p.data, format, p.name); await delay(700); }
        return;
    }
    const zip = new JSZip();
    let fallback = false;
    for (const p of parts) {
        const r = buildBlob(p.data, format);
        zip.file(p.name + '.' + r.ext, r.blob);
        if (r.fallback) fallback = true;
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, zipName + '.zip');
    if (fallback) showToast('Sebagian bagian melebihi batas baris Excel, disimpan sebagai CSV di dalam ZIP.', 'info');
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

// ==========================================================
// PARQUET INJECTOR LOGIC
// ==========================================================
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

    let db = null, conn = null;
    const registered = [];

    try {
        progStatus.innerText = "Menghidupkan Parquet Engine di Browser...";
        db = await loadDuckDBEngine();
        conn = await db.connect();
        const duckdbLib = window._duckdbLib;
        await conn.query(`DROP TABLE IF EXISTS master_table`);
        progBar.style.width = '30%';
        let tableReady = false;

        if (mode === 'inject') {
            progStatus.innerText = "Memuat File Master Parquet...";
            await db.registerFileHandle('master.parquet', masterFile, duckdbLib.DuckDBDataProtocol.BROWSER_FILEREADER, true);
            registered.push('master.parquet');
            await conn.query(`CREATE TABLE master_table AS SELECT * FROM read_parquet('master.parquet')`);
            tableReady = true;
        }

        for (let i = 0; i < inputFiles.length; i++) {
            const file = inputFiles[i];
            const fileName = `input_${i}.csv`;
            const lower = file.name.toLowerCase();
            progStatus.innerText = `Memproses File: ${file.name} (${i + 1}/${inputFiles.length})...`;

            if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                const csvStr = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => reject(new Error('Gagal membaca ' + file.name));
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
                            const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false });
                            for (let r = 0; r < matrix.length; r++)
                                for (let c = 0; c < matrix[r].length; c++)
                                    matrix[r][c] = String(matrix[r][c]).replace(/\n/g, ' ').trim();
                            resolve(Papa.unparse(matrix));
                        } catch (err) { reject(err); }
                    };
                    reader.readAsArrayBuffer(file);
                });
                await db.registerFileText(fileName, csvStr);
            } else {
                await db.registerFileHandle(fileName, file, duckdbLib.DuckDBDataProtocol.BROWSER_FILEREADER, true);
            }
            registered.push(fileName);

            const src = `read_csv('${fileName}', header=true, all_varchar=true)`;
            const resHeaders = await conn.query(`DESCRIBE SELECT * FROM ${src}`);
            const actualCols = resHeaders.toArray().map(r => String(r.column_name).toUpperCase());

            let selectQuery = "*";
            if (customCols.length > 0) {
                let validCols = [];
                if (colMode === 'keep') {
                    validCols = customCols.filter(c => actualCols.includes(c));
                    if (validCols.length === 0) throw new Error(`Kolom instruksi Anda (${customCols.join(', ')}) TIDAK DITEMUKAN di file ${file.name}.\nKolom yang tersedia: ${actualCols.join(', ')}`);
                } else {
                    validCols = actualCols.filter(c => !customCols.includes(c));
                    if (validCols.length === 0) throw new Error(`Semua kolom di ${file.name} akan terbuang. Periksa daftar kolom yang dibuang.`);
                }
                selectQuery = validCols.map(c => `"${c}"`).join(", ");
            }

            if (!tableReady) {
                await conn.query(`CREATE TABLE master_table AS SELECT ${selectQuery} FROM ${src}`);
                tableReady = true;
            } else {
                try {
                    await conn.query(`INSERT INTO master_table BY NAME SELECT ${selectQuery} FROM ${src}`);
                } catch (err) {
                    throw new Error(`File "${file.name}" tidak cocok dengan struktur master (nama kolom berbeda / ada kolom baru / tipe tidak cocok).\nDetail: ${err.message}`);
                }
            }
            try { await db.dropFile(fileName); } catch (_) {}
            progBar.style.width = (30 + Math.round(((i + 1) / inputFiles.length) * 45)) + '%';
        }

        progStatus.innerText = "Mengompilasi data ke format asli .parquet...";
        progBar.style.width = '85%';
        const cnt = await conn.query(`SELECT COUNT(*) AS n FROM master_table`);
        const totalRows = Number(cnt.toArray()[0].n);

        await conn.query(`COPY master_table TO 'output.parquet' (FORMAT PARQUET)`);
        const buffer = await db.copyFileToBuffer('output.parquet');
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        downloadBlob(blob, mode === 'create' ? "Nadi_Master_Data.parquet" : "Nadi_Master_Updated.parquet");

        progBar.style.width = '100%';
        progStatus.innerText = "Selesai! File Parquet siap ditarik.";
        trackUsage('parquet', inputFiles.length);
        showToast(`SUKSES! File Parquet berhasil diunduh.\nTotal baris: ${totalRows.toLocaleString('id-ID')}\nSemua kolom disimpan sebagai teks.`, 'success', true);

    } catch (e) {
        showToast("KESALAHAN SISTEM: " + e.message, "error");
        progStatus.innerText = "Proses Dibatalkan.";
    } finally {
        try { if (conn) { await conn.query('DROP TABLE IF EXISTS master_table'); await conn.close(); } } catch (_) {}
        if (db) { for (const n of [...registered, 'output.parquet']) { try { await db.dropFile(n); } catch (_) {} } }
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}

// ==========================================================
// DATA SPLITTER LOGIC
// ==========================================================
let statusMapping = {};
let MAPPING_VERSION = 'belum termuat';
const mappingReady = fetch('mapping.json?v=' + Date.now())
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => { statusMapping = j.mapping || {}; MAPPING_VERSION = j.version || '-'; })
    .catch(e => console.error('Gagal memuat mapping.json', e));

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
    if (!isJneVerified()) return showToast("Menu Data Splitter hanya untuk akun email JNE yang sudah terverifikasi.", "error");
    const files = document.getElementById('split-files').files;
    const format = document.getElementById('split-format').value;
    if (files.length === 0) return showToast("Pilih minimal satu file (CSV / XLSX / XLS)!", "error");

    await mappingReady;
    if (Object.keys(statusMapping).length === 0) return showToast("Tabel mapping status (mapping.json) gagal dimuat. Muat ulang halaman.", "error");
    if (!confirmLargeInput(files)) return;

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

    const buckets = { CLOSED: [], OPEN: [], CLAIM: [], RETURN: [] };
    const unknownCodes = {};
    const warnings = [];
    const skippedFiles = [];
    const perFile = [];
    const SEARCH_LIMIT = 200;
    let master = null, masterCoding = -1, totalRead = 0;

    const findHeaderIndex = (row) => {
        if (!row || !Array.isArray(row)) return -1;
        const exact = row.findIndex(col => String(col || '').replace(/[^A-Z0-9]/ig, '').toUpperCase() === 'CODING');
        if (exact !== -1) return exact;
        return row.findIndex(col => String(col || '').toUpperCase().includes('CODING'));
    };

    const handleRows = (rowsIn, fileName, st) => {
        if (st.noHeader) return;
        let rows = rowsIn;
        if (!st.headerDone) {
            let found = -1;
            for (let r = 0; r < Math.min(rows.length, SEARCH_LIMIT); r++) {
                if (findHeaderIndex(rows[r]) !== -1) { found = r; break; }
            }
            if (found === -1) { st.noHeader = true; return; }
            const fileHeader = rows[found];
            if (!master) {
                master = { names: fileHeader.map(h => String(h ?? '').trim()), norm: fileHeader.map(normHeader) };
                masterCoding = findHeaderIndex(fileHeader);
            }
            st.aligner = buildAligner(master, fileHeader, warnings, fileName, false);
            st.headerDone = true;
            rows = rows.slice(found + 1);
        }
        for (const raw of rows) {
            if (!raw || !Array.isArray(raw) || raw.join('').trim() === '') continue;
            const row = st.aligner(raw);
            let code = String(row[masterCoding] ?? '').trim().toUpperCase();
            if (['', 'NAN', 'NULL', '<NA>'].includes(code)) code = 'BLANK';
            let cat = statusMapping[code] ? String(statusMapping[code]).trim().toUpperCase() : null;
            if (!cat || !(cat in buckets)) {
                unknownCodes[code] = (unknownCodes[code] || 0) + 1;
                cat = 'OPEN';
            }
            buckets[cat].push(row);
            totalRead++;
            st.count++;
        }
    };

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (progStatus) progStatus.innerText = `Membaca ${file.name} (${i + 1}/${files.length})...`;
              const st = { headerDone: false, noHeader: false, aligner: null, count: 0 };
              const lower = file.name.toLowerCase();

            if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                const rows = await readExcelFile(file);
                handleRows(rows || [], file.name, st);
            } else {
                await new Promise((resolve) => {
                    Papa.parse(file, {
                        chunkSize: 1024 * 1024 * 5,
                        chunk: (results) => handleRows(results.data, file.name, st),
                        complete: resolve,
                        error: resolve
                    });
                });
            }
            if (!st.headerDone) skippedFiles.push(file.name);
            perFile.push(file.name + ': ' + st.count.toLocaleString('id-ID') + ' baris');
            const pct = Math.round(((i + 1) / files.length) * 100);
            if (progBar) progBar.style.width = pct + '%';
            if (progPercent) progPercent.innerText = pct + '%';
        }

        if (progStatus) progStatus.innerText = 'Mengekspor data...';
        await delay(200);

        if (!master || totalRead === 0) {
            showToast("Tidak ada data yang berhasil dipisahkan. Pastikan file memiliki kolom CODING.", "error");
            if (progStatus) progStatus.innerText = 'Gagal memisahkan data.';
            return;
        }

        const counts = {};
        for (const k of Object.keys(buckets)) counts[k] = buckets[k].length;
        const sumOut = Object.values(counts).reduce((a, b) => a + b, 0);

        const fileNames = { CLOSED: 'DATA_CLOSED', OPEN: 'DATA_OPEN', CLAIM: 'DATA_CLAIM', RETURN: 'DATA_RETURN' };
        const parts = [];
        for (const k of Object.keys(buckets)) {
            if (buckets[k].length > 0) { buckets[k].unshift(master.names); parts.push({ name: fileNames[k], data: buckets[k] }); }
        }
        await exportMany(parts, format, 'HASIL_SPLIT');

        let msg = `Total ${totalRead.toLocaleString('id-ID')} baris data dari ${files.length - skippedFiles.length} file.\n`
            + `CLOSED: ${counts.CLOSED.toLocaleString('id-ID')} | OPEN: ${counts.OPEN.toLocaleString('id-ID')} | CLAIM: ${counts.CLAIM.toLocaleString('id-ID')} | RETURN: ${counts.RETURN.toLocaleString('id-ID')}\n`
            + `Baris per file (cocokkan dengan Excel): ${perFile.slice(0, 8).join('; ')}${perFile.length > 8 ? '; ...' : ''}  |  Mapping v${MAPPING_VERSION}`;
              const unknownList = Object.entries(unknownCodes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => `${c} (${n})`).join(', ');
        if (unknownList) msg += `\n⚠ Kode tidak dikenal (dimasukkan ke OPEN): ${unknownList}. Tambahkan ke mapping.json bila perlu.`;
        if (skippedFiles.length) msg += `\n⚠ Dilewati (tidak ada kolom CODING): ${skippedFiles.join(', ')}`;
        if (warnings.length) msg += `\n⚠ ` + warnings.slice(0, 5).join('\n⚠ ');

        if (progStatus) progStatus.innerText = 'Pemisahan selesai!';
        trackUsage('splitter', files.length);
        showToast(msg, 'success', true);
    } catch (error) {
        showToast("Terjadi kesalahan: " + error.message, "error");
        if (progStatus) progStatus.innerText = 'Error saat pemrosesan.';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// ==========================================================
// DATA MERGER LOGIC
// ==========================================================
async function startMerge() {
    const files = document.getElementById('merge-files').files;
    const format = document.getElementById('merge-format').value;
    const customNameInput = document.getElementById('merge-filename');
    const outputFilename = (customNameInput && customNameInput.value.trim() !== '') ? customNameInput.value.trim() : `DATA_MERGED_${new Date().getTime()}`;
    const dupColName = document.getElementById('merge-duplicate-col') ? document.getElementById('merge-duplicate-col').value.trim() : '';

    if (files.length === 0) return showToast("Pilih minimal satu file (CSV / XLSX / XLS)!", "error");
    if (!confirmLargeInput(files)) return;

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

    const merged = [];
    const warnings = [];
    const seen = new Set();
    let master = null, dupIdx = -1, dupRemoved = 0, totalRead = 0;

    const handleRows = (rowsIn, fileName, st) => {
        let rows = rowsIn;
        if (!st.headerDone) {
            const h = rows.findIndex(r => Array.isArray(r) && r.join('').trim() !== '');
            if (h === -1) return;
            const fileHeader = rows[h];
            if (!master) master = { names: fileHeader.map(x => String(x ?? '').trim()), norm: fileHeader.map(normHeader) };
            st.aligner = buildAligner(master, fileHeader, warnings, fileName, true);
            st.headerDone = true;
            if (dupColName && dupIdx === -1) dupIdx = master.norm.indexOf(normHeader(dupColName));
            rows = rows.slice(h + 1);
        }
        for (const raw of rows) {
            if (!raw || !Array.isArray(raw) || raw.join('').trim() === '') continue;
            const row = st.aligner(raw);
            totalRead++;
            if (dupIdx !== -1) {
                const v = String(row[dupIdx] ?? '').trim();
                if (v) {
                    if (seen.has(v)) { dupRemoved++; continue; }
                    seen.add(v);
                }
            }
            merged.push(row);
        }
    };

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (progStatus) progStatus.innerText = `Membaca ${file.name} (${i + 1}/${files.length})...`;
            const st = { headerDone: false, aligner: null };
            const lower = file.name.toLowerCase();

            if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                const rows = await readExcelFile(file);
                handleRows(rows || [], file.name, st);
            } else {
                await new Promise((resolve) => {
                    Papa.parse(file, {
                        chunkSize: 1024 * 1024 * 5,
                        chunk: (results) => handleRows(results.data, file.name, st),
                        complete: resolve,
                        error: resolve
                    });
                });
            }
            if (!st.headerDone) warnings.push(`${file.name}: kosong / header tidak ditemukan, dilewati`);

            const pct = Math.round(((i + 1) / files.length) * 100);
            if (progBar) progBar.style.width = pct + '%';
            if (progPercent) progPercent.innerText = pct + '%';
        }

        if (dupColName && dupIdx === -1) warnings.push(`Kolom duplikat "${dupColName}" tidak ditemukan, tidak ada baris yang dihapus`);

        if (progStatus) progStatus.innerText = 'Mengekspor data gabungan...';
        await delay(200);

        if (!master || merged.length === 0) {
            showToast("Tidak ada data yang berhasil digabungkan.", "error");
            if (progStatus) progStatus.innerText = 'Gagal menggabungkan data.';
            return;
        }

        const width = master.names.length;
        for (const r of merged) { while (r.length < width) r.push(''); }
        merged.unshift(master.names);

        exportData(merged, format, outputFilename);

        let msg = `Penggabungan selesai.\n${files.length} file → ${(merged.length - 1).toLocaleString('id-ID')} baris, ${width} kolom.`;
        if (dupRemoved > 0) msg += `\nDuplikat dibuang: ${dupRemoved.toLocaleString('id-ID')} baris`;
        if (warnings.length) msg += `\n⚠ ` + warnings.slice(0, 6).join('\n⚠ ') + (warnings.length > 6 ? `\n⚠ ...dan ${warnings.length - 6} peringatan lain` : '');

        if (progStatus) progStatus.innerText = 'Penggabungan selesai!';
        trackUsage('merger', files.length);
        showToast(msg, 'success', true);
    } catch (error) {
        showToast("Terjadi kesalahan: " + error.message, "error");
        if (progStatus) progStatus.innerText = 'Error saat pemrosesan.';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// ==========================================================
// SPLIT BY ROWS LOGIC
// ==========================================================
async function startRowSplit() {
    const files = document.getElementById('row-files').files;
    if (files.length === 0) return showToast('Silakan pilih/tarik file terlebih dahulu!', 'error');
    const rowLimit = parseInt(document.getElementById('row-limit').value);
    const outFormat = document.getElementById('row-format').value;
    if (isNaN(rowLimit) || rowLimit < 1) return showToast('Batas baris tidak valid!', 'error');
    if (!confirmLargeInput(files)) return;

    const btn = document.getElementById('btn-run-row');
    const progCont = document.getElementById('row-progress-container');
    const progBar = document.getElementById('row-progress-bar');
    const progStatus = document.getElementById('row-status');

    btn.disabled = true; btn.classList.add('opacity-50');
    progCont.classList.remove('hidden');
    let totalParts = 0;

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const baseName = file.name.replace(/\.[^.]+$/, '');
            progStatus.innerText = `Memotong: ${file.name} (${i + 1}/${files.length})`;

            const parts = [];
            let header = null, chunk = [], part = 1;
            const handle = (rows) => {
                for (const r of rows) {
                    if (!Array.isArray(r) || r.join('').trim() === '') continue;
                    if (!header) { header = r; continue; }
                    chunk.push(r);
                    if (chunk.length >= rowLimit) {
                        chunk.unshift(header);
                        parts.push({ name: `${baseName}_Part${part}`, data: chunk });
                        chunk = []; part++;
                    }
                }
            };

            const lower = file.name.toLowerCase();
            if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                handle(await readExcelFile(file) || []);
            } else {
                await new Promise((resolve) => {
                    Papa.parse(file, {
                        chunkSize: 1024 * 1024 * 5,
                        chunk: (results) => handle(results.data),
                        complete: resolve,
                        error: resolve
                    });
                });
            }
            if (header && chunk.length > 0) { chunk.unshift(header); parts.push({ name: `${baseName}_Part${part}`, data: chunk }); }

            await exportMany(parts, outFormat, `${baseName}_Split`);
            totalParts += parts.length;
            await delay(600);

            const pct = Math.round(((i + 1) / files.length) * 100);
            progBar.style.width = `${pct}%`;
            document.getElementById('row-percent').innerText = `${pct}%`;
        }
        progStatus.innerText = "Pemotongan Selesai!";
        trackUsage('rowsplit', files.length);
        showToast(`Split Rows selesai.\n${files.length} file → ${totalParts} bagian (maks. ${rowLimit.toLocaleString('id-ID')} baris per bagian).`, 'success', true);
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}

// ==========================================================
// AUDIO & TEXT LOGIC
// ==========================================================
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

// ==========================================================
// GOOGLE MAPS SCRAPER LOGIC & FALLBACK ENGINE
// ==========================================================
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
       if (!confirm('Alamat akan dikirim ke layanan geocoding publik (ArcGIS & OpenStreetMap). Pastikan data BUKAN data pribadi pelanggan/penerima. Lanjutkan?')) return;
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
        logBox.innerHTML += `<div><span class="text-gray-500">[${time}]</span> <span class="${color} font-bold">[${type}]</span> ${escapeHtml(text)}</div>`;
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
           const MAPS_MAX_ROWS = 500;
   if (totalRows > MAPS_MAX_ROWS) throw new Error(`Maksimal ${MAPS_MAX_ROWS} baris per proses (file Anda ${totalRows} baris). Pecah dulu dengan menu Split by Rows.`);
        printLog(`Ditemukan ${totalRows} baris data. Memulai ekstraksi...`, "INFO");

        let finalData = [];
        let headerRow = ["DATA_INPUT_UTAMA"];
        if(options.name) headerRow.push("NAMA_TEMPAT");
        if(options.latlong) headerRow.push("LATITUDE_LONGITUDE");
        if(options.address) headerRow.push("ALAMAT_LENGKAP"); 
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
        trackUsage('maps', 1); 
        showToast("Ekstraksi Maps Selesai!", "success", true);

    } catch (error) {
        printLog(error.message, "ERROR");
        progStatus.innerText = "Terjadi kesalahan.";
        showToast("Error Maps Scraper: " + error.message, "error");
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}