/**
 * Server-time offset clock. Server state is authoritative for pickup/hold/no-show
 * deadlines; the device clock is display/animation only (shared spec §6). Every
 * envelope carries `serverTime`; feeding it here keeps an offset so the app can
 * compute "server now" even with a skewed device clock.
 */
export interface ServerClock {
  /** Update the offset from an ISO-8601 server timestamp. */
  syncFromIso(serverIso: string): void;
  /** Current offset in milliseconds (serverNow - deviceNow). */
  readonly offsetMs: number;
  /** Best estimate of the server's current epoch milliseconds. */
  nowMs(): number;
  /** Whether the clock has been synced at least once. */
  readonly isSynced: boolean;
}

export function createServerClock(now: () => number = Date.now): ServerClock {
  let offset = 0;
  let synced = false;

  return {
    syncFromIso(serverIso: string): void {
      const serverMs = Date.parse(serverIso);
      if (Number.isNaN(serverMs)) {
        return;
      }
      offset = serverMs - now();
      synced = true;
    },
    get offsetMs(): number {
      return offset;
    },
    nowMs(): number {
      return now() + offset;
    },
    get isSynced(): boolean {
      return synced;
    },
  };
}
