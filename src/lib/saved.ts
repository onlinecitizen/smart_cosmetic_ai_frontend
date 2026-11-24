/**
 * Saved products ("hearts"). Stored on this device only, as a list of product
 * ids in localStorage: no account, no server call, nothing personal. Clearing
 * the browser's site data removes them. (Auth tokens are never stored here;
 * see CLAUDE.md.)
 */
import { useCallback, useSyncExternalStore } from "react";

const KEY = "sca.saved.v1";
const MAX = 100;
const ID = /^[A-Za-z0-9-]{1,64}$/;
const EVENT = "sca-saved-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && ID.test(v)).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore needs a stable snapshot: cache the parsed list by its raw string.
let cacheRaw: string | null = null;
let cacheList: string[] = [];
const EMPTY: string[] = [];

function snapshot(): string[] {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheList = read();
  }
  return cacheList;
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch {
    // Storage full or blocked (private mode): saving silently does nothing.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSaved() {
  const ids = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const toggle = useCallback((id: string) => {
    if (!ID.test(id)) return;
    const current = read();
    write(current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]);
  }, []);
  const remove = useCallback((id: string) => write(read().filter((x) => x !== id)), []);
  return { ids, isSaved: (id: string) => ids.includes(id), toggle, remove };
}
