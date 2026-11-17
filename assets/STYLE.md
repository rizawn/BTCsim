# SHA-256 Tycoon — Style Bible (aset v2)

**Gaya:** isometric-lite (dimetrik 2:1, sudut 30°) untuk sprite; flat vector untuk ikon, HUD, UI. Tanpa teks di dalam gambar (teks dirender engine agar bisa dilokalisasi), tanpa filter/blend mode.

## Palet
| Nama | Hex | Pakai untuk |
|---|---|---|
| charcoal | #1A1D23 | dasar panel, kartu |
| steel | #2C3E50 | bingkai, bodi mesin |
| amber | #E8A04C | energi/heat, aksen utama |
| teal | #4FA3A5 | data/blockchain |
| brick | #B85C5C | bahaya/debt |
| mint | #5CA86A | profit/confirm |
| ink | #0D0F13 | outline semua objek |
| paper | #E6E3DA | highlight/detail terang |
| gray #8E95A1, alloy #B6BCC6, forest #3E7D57, ice #8FB8D8, ember #C8742A | netral & aksen khusus ikon |

## Aturan
- **Cahaya dari kiri-atas:** top = base +24% putih, sisi kiri = base, sisi kanan = base −36% ink. Rim light tipis di tepi atas-kiri.
- **Outline:** ink 1.3 px (sprite 256×224), 2.6 px (ikon 64×64), join & cap bulat.
- **Anchor sprite:** tengah-bawah, titik tanah di y=204 dari 224; bayangan lantai hitam 30%.
- **Ikon:** 64×64, 1 warna utama (isi 14% + outline) + aksen paper/amber; ekspor 64/128/512.
- **Rig fiksi "H Series"** — tidak ada logo/merek nyata.
- **Contoh angka HUD:** Epoch 216, blok 437.182 / 437.472 (86%); desync halving 336 blok; avalanche memakai hash double-SHA-256 sungguhan (jumlah bit berbeda ≈ 128); Gambler's Ruin q=0,3 z=24 → P=1,47×10⁻⁹.

## Ukuran
| Kategori | Ukuran dasar | Ekspor |
|---|---|---|
| ikon | 64×64 | 64, 128, 512 |
| rig / blok | 256×224 | 1x, 2x |
| kartu UTXO | 128×180 | 1x, 2x |
| HUD | 320×320 (jam, radar), 220×448 (barcode), 360×120 (meter), 320×300 (termal) | 1x, 2x |
| panel 9-slice | 96×96, slice 16 px di tiap sisi | 1x, 2x |
| tombol | 160×44 (normal/hover/pressed/disabled) | 1x, 2x |

## Memuat di Phaser
```js
this.load.atlas('icons','atlas/atlas_icons.png','atlas/atlas_icons.json');
this.add.image(100,100,'icons','icon_res_btc');
// panel 9-slice
this.load.image('panel','png/ui_panel_9slice.png');
this.add.nineslice(300,200,'panel',null,320,200,16,16,16,16);
```
