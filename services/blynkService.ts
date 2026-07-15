import { SwitchStateMap } from '../types';

const BLYNK_BASE = 'https://blynk.cloud/external/api';

/**
 * Turns a single virtual pin ON (1) or OFF (0)
 */
export async function togglePin(
  authToken: string,
  virtualPin: string,
  value: 0 | 1
): Promise<boolean> {
  try {
    const url = `${BLYNK_BASE}/update?token=${authToken}&${virtualPin}=${value}`;
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch (err) {
    console.error('[Blynk] togglePin error:', err);
    return false;
  }
}

/**
 * Reads the current value of a single virtual pin
 * Returns 0 (off) or 1 (on)
 */
export async function readPin(
  authToken: string,
  virtualPin: string
): Promise<0 | 1> {
  try {
    const url = `${BLYNK_BASE}/get?token=${authToken}&${virtualPin}`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    // Blynk returns an array: ["1"] or ["0"]
    return parseInt(data[0], 10) === 1 ? 1 : 0;
  } catch (err) {
    console.error('[Blynk] readPin error:', err);
    return 0;
  }
}

/**
 * Batch-reads state of multiple virtual pins in parallel.
 * Returns a map: { V1: 1, V2: 0, V3: 1 }
 */
export async function readAllPins(
  authToken: string,
  virtualPins: string[]
): Promise<SwitchStateMap> {
  const entries = await Promise.all(
    virtualPins.map(async (pin) => {
      const val = await readPin(authToken, pin);
      return [pin, val] as [string, 0 | 1];
    })
  );
  return Object.fromEntries(entries) as SwitchStateMap;
}
