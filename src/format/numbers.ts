/**
 * Number & time formatting utilities for id-ID locale.
 * All display formatting lives here — sim uses raw numbers.
 */

const ID_LOCALE = 'id-ID';

/** Format number with Indonesian thousands separator (titik). */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(ID_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format large numbers in engineering notation (K, M, G, T, P, E). */
export function formatEngineering(n: number, decimals = 2): string {
  const suffixes = ['', 'K', 'M', 'G', 'T', 'P', 'E'];
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), suffixes.length - 1);
  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = abs / scale;
  return `${sign}${scaled.toLocaleString(ID_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix ? ` ${suffix}` : ''}`;
}

/** Format BTC from satoshis. */
export function formatBTC(satoshis: number): string {
  const btc = satoshis / 1e8;
  return `₿ ${btc.toLocaleString(ID_LOCALE, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  })}`;
}

/** Format game time (seconds) as human-readable. */
export function formatGameTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${formatNumber(days)} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${mins} menit`;
  return `${mins} menit`;
}

