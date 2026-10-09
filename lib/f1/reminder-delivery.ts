export interface DeliveryStore {
  claim(key: string): Promise<boolean>;
  finish(key: string, status: 'sent' | 'uncertain'): Promise<void>;
  release(key: string): Promise<void>;
  readStatus?(key: string): Promise<string | null>;
}

export function reminderDue(start: string, now: number): boolean {
  const remaining = Date.parse(start) - now;
  return Number.isFinite(remaining) && remaining > 0 && remaining <= 30 * 60000;
}

// A timeout cannot prove whether the receiver accepted the message.
export async function deliverReminder(
  key: string, store: DeliveryStore, send: () => Promise<'sent' | 'rejected' | 'uncertain'>
): Promise<string> {
  if (!await store.claim(key)) {
    const previous = await store.readStatus?.(key);
    return previous === 'uncertain' || previous === 'pending' ? previous : 'suppressed';
  }
  let status: 'sent' | 'rejected' | 'uncertain';
  try { status = await send(); } catch { status = 'uncertain'; }
  if (status === 'rejected') {
    await store.release(key);
    return 'failed';
  }
  await store.finish(key, status);
  return status;
}
