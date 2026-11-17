/**
 * EventSystem — NPC storylines, random events, and interactive dialogs.
 *
 * Implements the mandatory story events from GDD v3 (§6):
 * - Mama Rina: Noise & heat complaint (threatens to pull plug)
 * - Slush: Early pool invitation (PPS/PPLNS 2% fee)
 * - Uncle Wang: ASIC pre-order pitch (risk of scam vs discount)
 * - Gox-ji: Exchange hack contagion
 * - Mira: Emergency protocol checkpoint
 * - Halv: Rogue 51% cartel antagonist
 */

export interface DialogOption {
  text: string;
  onSelect: () => { message: string; effectDescription: string };
}

export interface StoryEvent {
  id: string;
  npcKey: string;
  npcName: string;
  title: string;
  dialogText: string;
  options: DialogOption[];
  minEra: number;
  triggerCondition?: (state: any) => boolean;
}

export function getStoryEvents(): StoryEvent[] {
  return [
    {
      id: 'mama_rina_noise',
      npcKey: 'npc_02_mama_rina',
      npcName: 'Mama Rina (Ibu Kos)',
      title: 'Kebisingan & Tagihan Listrik',
      minEra: 1,
      dialogText: 'Le, kamar kamu kok bising sekali kayak suara helikopter? Lampu tetangga sampai kedip-kedip! Tagihan listrik kos jebol ini!',
      options: [
        {
          text: 'Bayar kompensasi listrik $20 & pasang peredam suara',
          onSelect: () => ({
            message: 'Mama Rina tersenyum lega. Hubungan membaik.',
            effectDescription: 'Kas berkurang $20. Heat throttling berkurang 10%.',
          }),
        },
        {
          text: 'Janji matikan laptop saat malam hari',
          onSelect: () => ({
            message: 'Mama Rina mengawasi dari jendela.',
            effectDescription: 'Rig dibatasi hanya siang hari selama 1 epoch.',
          }),
        },
      ],
    },
    {
      id: 'slush_pool_offer',
      npcKey: 'npc_03_slush',
      npcName: 'Slush (Pelopor Mining Pool)',
      title: 'Undangan Bergabung ke Pool',
      minEra: 2,
      dialogText: 'Mining sendirian variansnya gila-gilaan kawan. Gabung ke pool kita, share hashrate, dapat payout stabil tiap blok dengan fee 2%. Mau?',
      options: [
        {
          text: 'Terima tawaran Slush Pool (PPLNS 2% fee)',
          onSelect: () => ({
            message: 'Tersambung ke Slush Pool via Stratum.',
            effectDescription: 'Mining beralih ke pool. Varians pendapatan stabil.',
          }),
        },
        {
          text: 'Tolak, saya tetap setia solo mining',
          onSelect: () => ({
            message: 'Slush mengangguk hormat: "Semoga beruntung dengan varians eksponensial!"',
            effectDescription: 'Tetap solo mining (high variance, 100% block reward).',
          }),
        },
      ],
    },
    {
      id: 'uncle_wang_preorder',
      npcKey: 'npc_04_uncle_wang',
      npcName: 'Uncle Wang (Hardware Vendor)',
      title: 'Pre-Order Batch Pertama ASIC H9',
      minEra: 4,
      dialogText: 'Halo bos! Ada batch baru chip 16nm super efisien. Bayar DP sekarang, diskon 40% tapi kirim 3 bulan lagi. Dijamin untung berlipat!',
      options: [
        {
          text: 'Ambil risiko: Bayar DP pre-order ($200)',
          onSelect: () => ({
            message: 'Invoice pre-order diterbitkan oleh Uncle Wang.',
            effectDescription: 'Kas berkurang $200. Peluang 70% pengiriman tepat waktu, 30% tertunda.',
          }),
        },
        {
          text: 'Tolak tawaran, tunggu ready stock',
          onSelect: () => ({
            message: 'Uncle Wang: "Awas kehabisan ya bos!"',
            effectDescription: 'Tidak ada perubahan dana.',
          }),
        },
      ],
    },
    {
      id: 'gox_ji_contagion',
      npcKey: 'npc_05_gox_ji',
      npcName: 'Gox-ji (Trader Bursa)',
      title: 'Bursa Diretas! Penarikan Dibekukan',
      minEra: 4,
      dialogText: 'Gawat darurat! Hot wallet bursa utama terkuras 650.000 BTC! Semua withdrawal dibekukan dan pasar panik hebat!',
      options: [
        {
          text: 'HODL dan alihkan simpanan ke cold storage UTXO lokal',
          onSelect: () => ({
            message: 'Kunci privat aman di node lokal.',
            effectDescription: 'Harga BTC turun 40% sementara, tapi koin pemain aman.',
          }),
        },
        {
          text: 'Jual darurat sisa fiat di bursa lokal',
          onSelect: () => ({
            message: 'Likuidasi darurat dengan potongan slippage besar.',
            effectDescription: 'Konversi darurat ke fiat kas lokal.',
          }),
        },
      ],
    },
    {
      id: 'mira_checkpoint',
      npcKey: 'npc_07_mira',
      npcName: 'Mira (Core Dev)',
      title: 'Proposal Checkpoint Konsensus Darurat',
      minEra: 5,
      dialogText: 'Ada deep reorg 8 blok dari hashpower mencurigakan. Kami menyiapkan client update dengan checkpoint darurat di blok saat ini untuk melindungi rantai.',
      options: [
        {
          text: 'Upgrade node dan dukung checkpoint darurat',
          onSelect: () => ({
            message: 'Node berhasil diverifikasi pada valid tip.',
            effectDescription: 'Rantai terlindungi dari reorg 51%.',
          }),
        },
        {
          text: 'Tolak intervensi manual (Nakamoto Consensus murni)',
          onSelect: () => ({
            message: 'Node tetap memvalidasi bukti kerja paling panjang.',
            effectDescription: 'Risiko orphan block naik selama reorganisasi.',
          }),
        },
      ],
    },
    {
      id: 'halv_cartel',
      npcKey: 'npc_08_halv',
      npcName: 'Halv (Bos Kartel Hashpower)',
      title: 'Ancaman Kartel 51%',
      minEra: 6,
      dialogText: 'Hashrate kami sekarang mengendalikan 48% jaringan. Gabung kartel kami, atau blok-blokmu akan kami orphan terus menerus.',
      options: [
        {
          text: 'Lawan! Galang desentralisasi bersama komunitas miner kecil',
          onSelect: () => ({
            message: 'Miner independen bersatu menolak blok tidak valid.',
            effectDescription: 'Bonus hashrate jaringan +15%. Kartel gagal 51%.',
          }),
        },
        {
          text: 'Bayar upeti fee routing 5% untuk menghindari orphan',
          onSelect: () => ({
            message: 'Kartel menerima upeti share.',
            effectDescription: 'Fee pool bertambah 5%, orphan rate kembali normal.',
          }),
        },
      ],
    },
  ];
}

