# PANDUAN PLAYTEST — SHA-256 TYCOON (v0.1.0-playtest)

Selamat datang di sesi uji coba **SHA-256 Tycoon**!
Tujuan utama playtest ini adalah memvalidasi keseimbangan ekonomi simulasi, pemahaman konsep teknis Bitcoin, serta kenyamanan antarmuka pengguna (UI/UX).

---

## 1. Cara Menjalankan Game

### Mode Web / Browser (Rekomendasi Cepat):
```bash
npm run dev
```
Buka browser di `http://localhost:8080/`.

Untuk mereproduksi kondisi pasar secara deterministik, tambahkan parameter seed:
`http://localhost:8080/?seed=12345`

### Mode Desktop (Electron):
```bash
npm run electron
```

---

## 2. Kontrol Keyboard & Navigasi

| Tombol | Tindakan |
|---|---|
| `1` | Pindah ke Tab **NODE & MEMPOOL** (Inspeksi Header 80-byte & antrean tx) |
| `2` | Pindah ke Tab **SILICON & INFRA** (Rak mining hardware & Breakeven Radar) |
| `3` | Pindah ke Tab **TREASURY & SCRIPT** (Kartu UTXO & Timelock OP_CHECKLOCKTIMEVERIFY) |
| `4` | Pindah ke Tab **CONSENSUS & WARFARE** (Gambler's Ruin Heist & Avalanche Spectacle) |
| `Space` | Pause / Lanjutkan simulasi waktu |
| `+` / `-` | Ubah akselerasi waktu game ($\times 1$, $\times 10$, $\times 60$, $\times 300$) |
| `Ctrl+S` / `Ctrl+L` | Simpan Cepat / Muat Cepat di Slot 1 |

---

## 3. Kuesioner Playtest (10 Pertanyaan)

Harap isi pertanyaan berikut setelah memainkan game minimal 15–30 menit:

1. **Margin Compression:** Apakah Anda merasakan tekanan ekonomi nyata saat difficulty naik pada akhir epoch 2.016 blok? Apakah rig lama Anda menjadi tidak menguntungkan (*rugi listrik*)?
2. **Breakeven Radar:** Seberapa jelas visualisasi batas Break-Even J/TH ($BE = \frac{\text{Harga}}{2530}$) dalam membantu Anda memutuskan kapan harus mematikan rig atau upgrade hardware?
3. **Gambler's Ruin (Heist):** Apakah mekanisme probabilitas penyerangan $P = (q/p)^z$ terasa menegangkan dan memberikan pemahaman mengenai pentingnya konfirmasi transaksi?
4. **Avalanche Barcode:** Apakah perbandingan dua barcode 256-bit membantu memahami sifat difusi kriptografi Double-SHA-256 ($\approx 128$ bit berubah pada 1-bit input)?
5. **Header Inspector (Edukasi):** Apakah penjelasan 6 slot header 80-byte (Version, PrevHash, Merkle Root, Time, nBits, Nonce) mudah dipahami?
6. **Smart Script (CLTV Vault):** Bagaimana pengalaman Anda mengunci saldo menggunakan OP_CHECKLOCKTIMEVERIFY untuk mencegah panic selling?
7. **Keseimbangan Aliran Kas:** Apakah starter capital (\$150) dan 50 BTC Genesis terasa proporsional untuk era awal (garasi rumah)?
8. **Audio & Atmosfer:** Apakah procedural synthesizer audio (suara hum kipas yang naik seiring heat, dentang blok, dan tick epoch) terasa imersif?
9. **Kenyamanan Antarmuka:** Apakah tata letak HUD, indikator desync halving (+336 blok), dan transisi 4 tab terasa responsif?
10. **Komentar Bebas & Glitch:** Apakah Anda menemukan bug, nilai NaN, atau perilaku tidak wajar selama bermain?

---

## 4. Cara Melaporkan Temuan & Mengirimkan Save State

Jika Anda menemukan bug atau kegagalan logika simulasi:
1. Simpan game Anda (`Ctrl+S` atau tombol menu Game -> Simpan Cepat).
2. Ambil data save state dari browser `localStorage` (key: `save_1`) atau console log.
3. Lampirkan tangkapan layar (screenshot) dan seed pasar yang digunakan.
4. Kirimkan log issue ke repositori proyek.

