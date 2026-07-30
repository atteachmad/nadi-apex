from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import shutil

app = FastAPI(title="Nadi X-Bot Scraper Engine")

# Mengizinkan akses dari semua frontend (GitHub Pages Anda)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"status": "Nadi X-Bot Scraper Engine is running online!"}

@app.post("/api/scrape")
async def scrape_maps(file: UploadFile = File(...)):
    # Simpan file yang di-upload user
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Baca file Excel / CSV menggunakan Pandas
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # --- LOGIKA SCRAPING / PROCESSING ---
        # (Nanti Anda bisa menyisipkan skrip Playwright/BeautifulSoup di sini)
        # Untuk tahap awal, kita buat simulasi pengayaan kolom otomatis:
        df['HASIL_NAMA_TEMPAT'] = "Contoh Lokasi: " + df.iloc[:, 0].astype(str)
        df['HASIL_LATLONG'] = "-6.175392, 106.827153"
        df['HASIL_RATING'] = "4.8"
        df['HASIL_ULASAN'] = "1,250 ulasan"
        df['HASIL_URL_MAPS'] = "https://maps.google.com/?q=sample"
        
        # Simpan hasil ke file baru
        output_filename = f"Hasil_Scrape_{file.filename}"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        if file.filename.endswith('.csv'):
            df.to_csv(output_path, index=False)
        else:
            df.to_excel(output_path, index=False)
            
        return FileResponse(output_path, media_type='application/octet-stream', filename=output_filename)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))