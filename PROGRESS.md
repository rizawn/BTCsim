# PROGRESS — SHA-256 Tycoon Build Log

## FASE 0 — Scaffold & kontrak proyek ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| Scaffold dari template Phaser+Vite+TS | ✅ | Manual scaffold mengikuti pola template resmi |
| Struktur folder `src/sim`, `src/game`, `src/ui`, `src/format`, `src/test`, `e2e`, `assets`, `docs` | ✅ | Semua folder ada |
| `tsconfig.json` strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes | ✅ | Verified |
| CI script: `npm run lint && npm test && npm run build` → `npm run ci` | ✅ | Semua hijau |
| `npm run dev` tampilkan scene Phaser "SHA-256 Tycoon dev build" | ✅ | Vite serve di :8080 |
| Font JetBrains Mono bundled via @fontsource | ✅ | + Source Sans 3 + Bitter |
| `npm run build` → `dist/` | ✅ | Build 739ms, output 1.2 MB |
| Aset v3 diekstrak ke `assets/` dan dicopy ke `public/` | ✅ | 6 atlas, semua PNG |
| Electron main/preload siap | ✅ | contextIsolation ON |

### Perintah Verifikasi

```
npx tsc --noEmit          → exit 0 (no errors)
npx vitest run            → 2 files, 6 tests passed
npx vite build            → dist/ generated successfully
npx vite --host           → http://localhost:8080/ serves Phaser scene
```

### Catatan

- Dokumen GDD dan Paper ada dalam format PDF — tidak dapat dibaca langsung oleh agent.
  Semua angka sim diambil dari spec §2 di super prompt (yang bersumber dari GDD v3).
- Aset v3 lengkap: 6 atlas (icons, sprites, hud, npc, ui, vfx), semua PNG + SVG.
- STYLE.md berhasil dibaca — palet dan ukuran konsisten.

---

## FASE 1 — Sim core: waktu, epoch, retarget ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| `sim/Clock.ts`: game-time, 1 blok = 600s, multiplier ×1–×300, pause/resume, event block-ticked & epoch-ended | ✅ | Teruji dengan vitest |
| `sim/Difficulty.ts`: retarget §2.1 rumus `target_baru = target_lama × clamp(waktu_aktual/20160, 1/4, 4)`, difficulty float, clamp max 4× naik / 4× turun | ✅ | Teruji edge cases (cepat/lambat) |
| `sim/EpochClockState.ts`: 2.016 tick, major tick tiap 504, desync halving 336 blok sejak epoch 104, hitungan ke halving berikutnya | ✅ | Teruji genesis, epoch 103→104, boundary 437.472 |
| Unit test edge: genesis (epoch 0), epoch 103→104, boundary blok 437.472 | ✅ | 18 unit tests di `src/test/sim-phase1.test.ts` |
| Vitest coverage ≥ 90% di `src/sim/` | ✅ | **100% Statements, Branches, Functions, Lines** |
| CLI debug script `npm run sim:demo` | ✅ | Mencetak tabel 5 epoch pertama dan preview HUD blok 437.182 |

### Perintah Verifikasi

```bash
npm run typecheck         → exit 0 (clean)
npm test                  → 3 files, 24 passed
npm run test:coverage     → 100% coverage di src/sim/
npm run sim:demo          → output tabel 5 epoch pertama sukses
```

---

## FASE 2 — Sim ekonomi: rig, listrik, revenue ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| `sim/Rig.ts`: 8 spesifikasi rig (§2.3), J/TH, watt, era, status, heat 0–1, throttling penalty +25% J/TH | ✅ | Teruji di `sim-phase2.test.ts` |
| `sim/Energy.ts`: 5 lokasi ($/kWh), formula konsumsi $\text{TH/s} \times \text{J/TH} / 1000 / 3600 \times \$/\text{kWh}$ | ✅ | Teruji akurat per detik & blok |
| `sim/Revenue.ts`: $p = \text{hash}_{\text{pemain}} / \text{hash}_{\text{jaringan}}$, solo variance, PPS/PPLNS/FPPS, orphan rate (solo 1.5%, pool 0.5%) | ✅ | Teruji statistik |
| `sim/Market.ts`: Seeded PRNG Mulberry32, random-walk Geometric Brownian Motion per era, floor $0.01 | ✅ | Deterministik & save/restore identical |
| Break-even util: $\text{BE} = \text{price} / 2530$, 4 titik validasi ($30\text{k}\to 11.9$, $60\text{k}\to 23.7$, $100\text{k}\to 39.5$, $180\text{k}\to 71.1$) | ✅ | Teruji presisi |

---

## FASE 3 — Sim lanjutan: pool payout, warfare, heist ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| `sim/Pool.ts`: PPS/PPLNS/FPPS, fee 2%–4%, Monte Carlo simulation (100k sample) | ✅ | Rata-rata payout berada dalam rentang toleransi $\pm 5\%$ dari nilai teoretis |
| `sim/Heist.ts`: Gambler's Ruin (§2.4) $P = (q/p)^z$; HUD meter membaca $P$ | ✅ | Uji $q=0.3, z=24 \to P = 1.474 \times 10^{-9}$ terverifikasi |
| `sim/Warfare.ts`: Selfish mining, timejack (offset jam), DDoS pool, kontagion bursa (harga drop + withdrawal freeze) | ✅ | State machine & durasi teruji |

---

## FASE 4 — Save/load & balancing data ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| `sim/GameState.ts`: Serialisasi penuh seluruh modul sim, schemaVersion, migrasi v1→v2 stub | ✅ | Teruji |
| Idempotensi Save/Load: `save → load → save` menghasilkan byte-identical JSON | ✅ | Teruji deterministik dengan recursive key-sorting |
| Save slots: 3 manual slots (1..3) + 1 autosave slot, metadata slot info | ✅ | Teruji di `sim-phase4.test.ts` |
| `sim/data/constants.ts`: Seluruh konstanta spec §2 menjadi single source of truth | ✅ | Diekspor juga sebagai format JSON |
| Balancing CLI `npm run sim:balance`: Headless run 100 tahun game (5.250.000 blok) | ✅ | Pertumbuhan profit terkendali (melandai/margin compression, tidak infinite explosion) |
| Vitest coverage folder `src/sim/` | ✅ | **Statements 97.98%, Branches 91.45%, Functions 98.9%, Lines 97.76%** (semua $\ge 90\%$) |

### Perintah Verifikasi

```bash
npm run typecheck         → exit 0 (clean)
npm test                  → 6 files, 79 passed
npm run test:coverage     → semua threshold >= 90% (Statements 98%, Branches 91%, Lines 98%)
npm run sim:balance       → 100-year headless simulation output CSV valid
npm run ci                → exit 0 (lint, test, build dist/ sukses)
```

---

## FASE 5 — Scene Phaser: papan utama & HUD ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| Scene BootScene → PreloadScene → BoardScene | ✅ | Transisi mulus, load 6 atlas + 10 environment |
| Papan utama 4 tab (NODE & MEMPOOL, SILICON & INFRA, TREASURY & SCRIPT, CONSENSUS & WARFARE) | ✅ | Hotkey 1–4, tab button, icon atlas |
| HUD Permanen: Epoch Clock (2.016 tick, desync notch 336), Resource Bar, Speed controls | ✅ | Angka §2.6 tampil persis (`EPOCH 216 · blok 437.182 / 437.472 · retarget 86% · desync halving: +336 blok`) |
| Interactive HUD: Breakeven Radar ($BE = \text{price}/2530$), Thermal map, Avalanche barcode, Gambler's Ruin meter | ✅ | Semua widget interaktif terintegrasi |
| Zero 404 network request saat load atlas | ✅ | Terverifikasi via Playwright E2E |

---

## FASE 5b — Onboarding & tutorial ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| Intro dialog Satoshi-san (portrait v3): *"Kamar kos, laptop tua 2009, satu kabel..."* | ✅ | Modal overlay skippable |
| Tooltip & panduan operasional hardware awal | ✅ | Panduan awal laptop Genesis |

---

## FASE 6 — Konten: event, NPC, era progression ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| 6 Event wajib (Mama Rina noise complaint, Slush pool offer, Uncle Wang scam, Gox-ji contagion, Mira checkpoint, Halv cartel) | ✅ | Diimplementasikan di `EventSystem.ts` |
| Dialog NPC portrait 3:4 dengan pilihan respons (min. 2 opsi) | ✅ | Modal dialog interaktif dengan efek sim |

---

## FASE 7 — UI polish: mempool, header inspector, treasury ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| Tab NODE: Antrean kartu mempool fee rate sat/vB, greedy block packing | ✅ | Teruji di `sim-mempool.test.ts` |
| Header Inspector: 6 slot 80-byte (Version, PrevHash, MerkleRoot, Time, nBits, Nonce) | ✅ | Decode nBits compact format teruji 3 test vector |
| Tab TREASURY: Kartu UTXO, Split & Merge, Timelock `OP_CHECKLOCKTIMEVERIFY` | ✅ | Otomatis unlock saat blockHeight $\ge$ lockTime |
| Tab WARFARE: Gambler's Ruin meter ($P = (q/p)^z$), Avalanche spectacle (~128 bit diff) | ✅ | Double-SHA-256 asli terverifikasi |

---

## FASE 8 — Audio & juice ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| Procedural Web Audio API sound synthesizer | ✅ | Zero external file dependencies |
| SFX: tick epoch (pitch naik), block found, heist clack, coin split halving | ✅ | Terintegrasi |
| Continuous fan hum: pitch & volume berskala linear dengan heat rata-rata rig | ✅ | Menggunakan oscillator gain |
| Kontrol volume & Mute toggle | ✅ | Tersedia |

---

## FASE 9 — Electron, performa, aksesibilitas ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD

| Kriteria | Status | Catatan |
|----------|--------|---------|
| Electron desktop wrapper (`electron/main.js`, `preload.js`) | ✅ | `contextIsolation: true`, `nodeIntegration: false` |
| Native Application Menu (Game Baru, Simpan Cepat, Muat Cepat, Layar Penuh) | ✅ | Shortcut CmdOrCtrl+S/L/N |
| Hotkeys (1–4 tab, Space pause, +/- kecepatan) | ✅ | Teruji di BoardScene |

---

## FASE 10 — Testing, balancing, rilis playtest ✅

**Status:** SELESAI  
**Tanggal:** 2026-11-17

### Verifikasi DoD Global (§3)

| Kriteria §3 | Status | Catatan |
|---|---|---|
| `npm run dev` jalan tanpa error; `npm run build` menghasilkan `dist/` | ✅ | dist/ ter-generate bersih |
| `npx vitest run` hijau $\ge 90\%$ coverage folder `src/sim/` | ✅ | **Statements 98.3%, Branches 91.3%, Functions 98.4%, Lines 98.4%** |
| `npx playwright test` hijau (smoke test boot, canvas render, dialog, tab switch) | ✅ | **1 passed (9.6s), zero console errors** |
| Save/load round-trip idempotent (`save → load → save` byte-identical) | ✅ | Terverifikasi di `sim-phase4.test.ts` |
| Semua aset v3 termuat dari atlas (zero 404 console) | ✅ | 6 atlas + 10 environment images termuat tanpa gagal |
| Epoch clock 2.016 tick, retarget tepat blok 437.472, desync +336 blok | ✅ | Terverifikasi |
| Electron script siap dijalankan (`npm run electron`) | ✅ | Main + preload + native menu siap |
| `README.md` & `docs/PLAYTEST.md` (kuesioner 10 pertanyaan, cara lapor log) | ✅ | Lengkap |

---

## Ringkasan Akhir Pembangunan (Fase 0 – 10)

- **Fase aktif:** Seluruh Fase 0 s/d 10 SELESAI (Playtest-Ready).
- **Done:** Seluruh mesin simulasi, atlas asset integration, Phaser scenes (Boot, Preload, Board), 4 tab UI, interactive widgets (Radar, Thermal, Barcode, Ruin Meter), audio synthesizer, E2E testing Playwright, Electron desktop, dokumen panduan playtest.
- **Blocked:** Tidak ada.
- **Next:** Distribusi build playtest dan pengumpulan feedback kuesioner `docs/PLAYTEST.md`.
- **Catatan angka:** Semua konstanta engine §2 terverifikasi dan bekerja sebagai *single source of truth*.




