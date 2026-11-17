# PROMPT — GENERATE GAME ASSETS: "SHA-256 TYCOON"

> Cara pakai: file ini berisi brief visual + kumpulan prompt siap-pakai untuk
> image generator AI (Midjourney / DALL·E / Stable Diffusion / dsb.) dan untuk
> AI yang generate elemen game (sprite, ikon, UI, VFX, audio brief).
> Tiap blok `PROMPT:` tinggal copy-paste. Semua angka konsisten dengan GDD v3.

---

## 0. ATURAN GLOBAL (BACA DULU)

**Game:** SHA-256 Tycoon — crypto mining tycoon, desktop, single-player.
**Kalimat identitas:** pemain bertahan hidup dari kompresi margin; difficulty adalah
antagonis yang respawn tiap 2.016 blok.

**Art direction inti — WAJIB konsisten di semua aset:**

- **Gaya:** isometric-lite / 3/4 view untuk environment & sprite; flat vector untuk UI.
- **Palet:** dark industrial base — charcoal `#1A1D23`, steel gray `#2C3E50`,
  aksen amber/orange `#E8A04C` (energi/heat), teal `#4FA3A5` (data/blockchain),
  merah bata `#B85C5C` (bahaya/debt), hijau mint `#5CA86A` (profit/confirm).
  Tint era berubah: Era 1 hangat-dim (garage lampu kuning), Era 4–5 dingin-biru
  (gudang neon), Era 7 steril-putih-teal (data center), Era 8 senja ungu-emas.
- **Angka = UI nyata:** setiap mockup HUD harus menampilkan angka engine sungguhan
  (contoh tersedia di tiap brief) — bukan lorem ipsum.
- **Rasio & format:** environment 16:9; sprite PNG transparan; ikon 512×512 flat;
  portrait 3:4 untuk NPC.
- **NO:** teks gibberish besar, watermark, logo riil (Bitmain/Antminer dkk →
  gunakan rig fiksi "H SERIES"), wajah fotorealistis untuk NPC (semi-stylized).

---

## 1. ELEMENTS / UI-KIT

### 1.1 Ikon set (flat vector, 512×512, outline 2px, warna dari palet global)

| # | Ikon | Deskripsi | Warna utama |
|---|---|---|---|
| 1 | Tab: NODE & MEMPOOL | kubus blok + antrean kartu transaksi | teal |
| 2 | Tab: SILICON & INFRA | chip + petir | amber |
| 3 | Tab: TREASURY & SCRIPT | koin BTC stylized + terminal `>_` | mint |
| 4 | Tab: CONSENSUS & WARFARE | dua rantai bercabang + palang | merah bata |
| 5 | Resource: BTC | koin heksagonal dengan "₿" stylized | mint |
| 6 | Resource: fiat | tumpukan banknote hijau pudar | hijau tua |
| 7 | Resource: joule | droplet api + petir kecil | amber |
| 8 | Resource: heat | gelombang panas dari heatsink | orange tua |
| 9 | Status rig: online / offline / throttling | LED hijau / abu / termometer merah | — |
| 10 | Epoch clock | jam analog dengan 2.016 tick di rim + jarum | teal+amber |
| 11 | Halving ceremony | kapak membelah koin jadi dua | amber |
| 12 | Orphan block | blok transparan + karangan bunga kecil | abu-abu |
| 13 | Payout PPS / PPLNS / FPPS | tiga kartu dengan grafik stabil / bergelombang / stabil+bonus | — |
| 14 | Difficulty (antagonis) | gunung es dengan angka naik di sisi | biru es |
| 15 | Verify/audit | kaca pembesar + centang hash `#` | teal |
| 16 | Selfish mining | penambang menyembunyikan blok di balik punggung | merah |
| 17 | DDoS | gerbang pool dihujam panah data | merah |
| 18 | Checkpoint darurat | perisai dengan gembok rantai | mint |

`PROMPT (set): flat vector icon set for a dark-industrial crypto mining tycoon game,
16 icons, 512x512, 2px outline, isometric-lite hints, palette: charcoal #1A1D23 base,
teal #4FA3A5, amber #E8A04C, brick red #B85C5C, mint #5CA86A; icons include: cube
block with tx cards, silicon chip with lightning, coin with terminal prompt, forking
chain with X, hexagonal bitcoin-like coin, heat droplet, analog clock with 2016 ticks
on rim, axe splitting a coin, ghost-transparent block with tiny wreath, iceberg with
rising numbers, magnifier over hash symbol, miner hiding block behind back, gate under
arrow barrage, shield with chain lock. consistent stroke weight, transparent-friendly
dark background, no text labels, no watermark --style raw`

### 1.2 Komponen HUD (flat UI mockup, 16:9, dark theme)

**a. Epoch Clock widget** — jam analog besar di pojok HUD:
rim terbagi 2.016 tick (dengan major tick tiap 504); jarum amber berputar 1 tick/blok;
cincin luar progress-bar menuju halving (kini 336-blok-desync ditandai strip merah kecil
setelah batas epoch ke-104); teks bawah: `EPOCH 217 — blok 437.182 / 439.596 · retarget 62%`.

`PROMPT: dark UI widget, analog clock for a mining tycoon game, rim divided into 2016
minute ticks with amber hand, outer ring progress bar toward a "halving" event, small
red desync notch after the 104th segment, charcoal background #1A1D23, teal accents
#4FA3A5, flat vector, crisp, game HUD component, no watermark`

**b. Avalanche Barcode** — spectacle screen saat fork: dua bar 256-bit vertikal
berdampingan (menang vs kalah), bit yang berubah menyala amber; rata-rata ~128 bit
berubah (JANGAN bikin semua bit beda — itu bohong secara math).

`PROMPT: game UI spectacle, two vertical 256-bit barcodes side by side representing
competing blockchain block hashes, scattered amber segments lighting up differences
between them, about half the bits differ, dark charcoal background, teal and amber
palette, flat vector game asset, slot-machine-like drama but minimal, no text`

**c. Gambler's Ruin meter** — HUD heist: bar horizontal merah→teal, jarum menunjukkan
peluang sukses yang anjlok tiap konfirmasi; label contoh: `z = 6/24 · P = (q/p)^z`.

`PROMPT: dark game HUD element, horizontal probability meter labeled with gambler's
ruin formula vibe, needle sliding from teal safe zone to red danger zone, subtle tick
marks like confirmations counting up, flat vector, charcoal + teal + brick red palette,
no readable text, no watermark`

**d. Breakeven radar** — chart polar: sudut = harga BTC, radius = efisiensi J/TH;
titik-titik rig pemain (S9=98, S19 Pro=29,5, S21=17,5 J/TH) vs garis break-even
yang berputar mengikuti harga; rig di luar garis berubah merah (mati).

`PROMPT: dark dashboard polar chart for mining game, radial efficiency zones, small
rig markers plotted inside and outside a rotating break-even boundary line, markers
outside glowing brick red, inside mint green, teal grid, flat vector game UI, no text`

**e. Thermal map per-chip** — grid heatsink; chip menyala dari teal→amber→merah;
hotspot dengan shimmer; pilihan cooling (air/hydro/immersion) sebagai ikon kecil.

`PROMPT: top-down grid of silicon chips glowing in gradient from teal to amber to red
hotspots, slight heat shimmer on hottest chips, dark industrial style, flat vector
game UI component, charcoal background, no text`

### 1.3 Font pairing (brief, bukan generate)
- Angka & data: mono — JetBrains Mono / IBM Plex Mono.
- Naratif & UI label: humanist sans — Inter / Source Sans.
- Era-title & ceremony: slab display — Bogstav / Bitter untuk rasa mesin tua.

---

## 2. SPRITE & OBJEK GAME

### 2.1 Rig penambangan per era (7 sprite, 3/4 view, PNG transparan)

| # | Rig | Era | Visual cue | Skala |
|---|---|---|---|---|
| 1 | CPU laptop "Genesis" | 1 | laptop tua 2009 + kipas meja, kabel seadanya | kecil |
| 2 | GPU rig open-frame | 2 | rak pipa PVC + 4 GPU menyala teal | sedang |
| 3 | FPGA board | 3 | PCB telanjang + heatsink pasif, kabel ribbon | kecil |
| 4 | ASIC box "A-66" | 4 | kotak aluminium 1U, kipas depan, label stensil | sedang |
| 5 | ASIC "H9" (S9-like) | 5 | kotak 2U kaku, kipas ganda, dudukan stackable | sedang |
| 6 | Immersion "H19" | 6–7 | blok radiator + selang coolant teal | besar |
| 7 | Liquid-cooled blade "H21-L" | 7 | blade tipis manis, manifold chrome, glow teal | besar |

`PROMPT (contoh utk #5): game asset sprite, 3/4 isometric view of a boxy industrial
bitcoin-mining ASIC unit, fictional brand "H9" stenciled, dual front fans, stackable
2U rack shape, charcoal metal with amber status LEDs, dark industrial style, clean
silhouette readable at small size, transparent background, stylized semi-realistic,
no real logos --style raw`
(Variasi: ganti deskripsi sesuai tabel; jaga pencahayaan & material konsisten.)

### 2.2 Kartu UTXO (TREASURY board)
Kartu seukuran playing card; depan: nominal satoshi besar (mono), strip warna
(confirmed mint / mempool amber / locked abu + gembok timelock `OP_CHECKLOCKTIMEVERIFY`);
punggung: pola Merkle tree ornament.

`PROMPT: playing-card sized game item, front shows large monospace satoshi denomination
with mint green confirm strip, back shows ornamental merkle tree pattern, dark
charcoal card with teal foil accents, flat vector game asset, crisp edges, no readable text`

### 2.3 Blok (objek 3D-ish untuk blockchain view)
Kubus teal semi-transparan; sisi depan menampilkan 6 field header 80-byte sebagai
slot kosong (placeholder ikon, bukan teks asli); versi orphan: transparan penuh +
aura abu.

`PROMPT: isometric translucent teal cube game asset representing a blockchain block,
front face has six empty labeled slots like a form, soft inner glow, dark background,
flat-shaded low-poly feel, matching ghost version fully transparent with gray aura,
no text, no watermark`

---

## 3. ENVIRONMENT / BACKGROUND (16:9, tanpa karakter)

| # | Scene | Era | Mood & detail wajib |
|---|---|---|---|
| 1 | Kamar kos / garasi | 1 | meja belajar + laptop + kabel, lampu kuning hangat, poster era |
| 2 | Garasi expand (rak dinding) | 1–2 | open-frame GPU rig + kipas jendela, malam |
| 3 | Gudang industrial | 5 | baris rak H9 berulang, kabel tray, lampu neon dingin |
| 4 | Container farm Texas | 6 | kontainer + tiang listrik + langit senja gurun |
| 5 | Data center Iceland | 7 | lorong server putih-steril + pipa coolant teal + cahaya besi |
| 6 | PLTA Sichuan | 6 | dam + kontainer di tepi sungai, kabut hijau |
| 7 | Greenhouse heat-reuse | 5–7 | rumah kaca hangat + rig menyala + tanaman tomat |
| 8 | Terminal/script den | all | ruang kerja gelap multi-monitor, grafik hijau-teal |
| 9 | Orphan graveyard | all | museum redup: blok transparan berjejer seperti batu nisan |
| 10 | Halving ceremony hall | event | panggung dramatis, kapak raksasa + koin terbelah, kerumunan siluet |

`PROMPT (contoh #3): game background environment art, wide shot of an industrial
warehouse interior with rows of boxy bitcoin mining rigs on racks receding into
perspective, cable trays on ceiling, cold blue-white neon lighting with amber status
LEDs, dust in air, dark industrial palette charcoal #1A1D23, teal and amber accents,
no people, no text, no real logos --ar 16:9 --style raw`

`PROMPT (contoh #5): game background, sterile white data center corridor for bitcoin
mining, server racks with teal coolant pipes running overhead, glass floor reflections,
clean futuristic but restrained, mint and teal accents on white, no people, no logos --ar 16:9`

`PROMPT (contoh #10): dramatic game event illustration, underground ceremony hall where
a giant ceremonial axe splits a glowing hexagonal coin in two, crowd silhouettes
raising lanterns, amber and gold spotlight, dark charcoal atmosphere, epic but clean,
no text --ar 16:9 --style raw`

---

## 4. KARAKTER / NPC (portrait 3:4, semi-stylized, BUKAN fotorealistis)

| # | NPC | Peran | Visual |
|---|---|---|---|
| 1 | "Satoshi-san" (mentor misterius) | tutorial era 1 | siluet berhood di chat, wajah tak pernah terlihat |
| 2 | Mama Rina (empunya kos) | event throttling/kebisingan | nenek kepang, tangan di pinggang, lampu kamarnya menyala |
| 3 | "Slush" (NPC pool pertama) | nawarin pool fee 2% | anak muda hoodie + kartu nama biru |
| 4 | Vendor "Uncle Wang" | pre-order scam event | salesman senyum lebar + katalog rig tipis |
| 5 | Trader "Gox-ji" | kontagion bursa | pria jas hujan basah kuyup, koper kosong |
| 6 | Risk Manager "Vera" | confirmation economy | wanita kacamata + tablet z-table |
| 7 | Core Dev "Mira" | pegang tombol checkpoint | programmer lelah + tote bag konferensi |
| 8 | Kartel boss "Halv" | antagonis rogue | sosok berkemea gelap + lapel pin kapak |

`PROMPT (contoh #7): semi-stylized game character portrait, tired but sharp-eyed female
protocol developer in her 30s, conference tote bag over shoulder, laptop stickers,
dark charcoal background with teal rim light, 3:4, painterly game art style, no
photorealism, no text`

---

## 5. VFX / ANIMATION BRIEF (untuk motion designer / generator video)

1. **Nonce sweep**: deretan hex beracak scroll cepat (mono font, teal), melambat,
   berhenti di `0000000a` → flash amber + shake ringan. Loop 2 dtk.
2. **Block found**: blok kubus "mendarat" di ujung rantai, riak cahaya teal
   menyapu rantai ke arah genesis, lonceng kecil.
3. **Fork split**: rantai bercabang Y; dua kubus balapan; yang kalah memudar jadi
   transparan (orphan) dengan partikel abu naik.
4. **Halving ceremony**: seluruh layar gelap; kapak cahaya membelah angka reward
   (50 → 25); angka lama jatuh seperti debu amber.
5. **Heist tension**: vignette merah perlahan menutup; detak jam epoch mengeras;
   Gambler's Ruin meter jatuh per konfirmasi dengan "clack" logam.
6. **Thermal throttling**: layer merah menyapu grid chip dari satu hotspot;
   kipas icon berputar makin cepat + hum naik pitch.
7. **Timejack attack (stealth)**: jam epoch berkedip asimetris, tick rim "loncat"
   2 jam sekali — halus, hampir tak terlihat (clue untuk pemain jeli).
8. **Checkpoint darurat**: perisai raksasa mengunci rantai; semua cabang liar
   terpangkas jadi partikel; silence 1 dtk lalu drone rendah lega.

---

## 6. AUDIO BRIEF (SFX + musik per era)

**SFX inti:** tick epoch (klik jam halus tiap blok; makin besar epoch-makin dalam),
block found (chime teal + sub-bass), dry spell (ambience vacum, jantung pelan),
fan hum loop (pitch naik saat throttling), coin split (untuk halving — metal + reverb),
heist clack (konfirmasi; makin redup makin tegang), verify success (dua nada naik).

**Musik per era:** Era 1 lo-fi warm tape; Era 2–3 synth arpeggio optimis;
Era 4–5 techno industrial dingin; Era 6 ambient gurun/kabut; Era 7 minimal
post-classical steril; Era 8 drone meditatif panjang. Kontras: mode warfare
(tactical HUD aktif) = layer perkusi gelap di atas musik era manapun.

`PROMPT (musik, contoh Era 4): dark industrial techno loop, 120 bpm, distorted
hydraulic percussion, cold saw bass, distant server-room hum texture, tense but
driving, game background music, seamless loop`

---

## 7. CHECKLIST KONSISTENSI SEBELUM PRODUKSI

- [ ] Semua aset pakai palet global (5 warna + tint era) — tidak ada warna liar.
- [ ] Rig fiksi "H Series" — tidak ada logo/brand riil (Bitmain dkk).
- [ ] Avalanche barcode menampilkan ±setengah bit berubah (bukan semua).
- [ ] Epoch clock 2.016 tick; strip merah desync 336 blok setelah epoch ke-104.
- [ ] Angka contoh di mockup HUD = angka riil dari GDD (bukan asal).
- [ ] Sprite PNG transparan; environment 16:9; ikon 512×512; portrait 3:4.
- [ ] NPC semi-stylized, tanpa wajah fotorealistis.
- [ ] Gunakan rumus `#E8A04C` dst. persis (hex konsisten antar generator).
