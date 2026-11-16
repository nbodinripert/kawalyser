import type { PersonalCorpus } from "./state";

/**
 * Keeps the imported corpus in the browser, so that it survives a reload (question 30 of the specs).
 * IndexedDB, since localStorage holds about 5 MB and a corpus may weigh 10. Storage can be blocked
 * (private browsing, some settings): every call then fails quietly, and the corpus lasts as long as the page.
 */

export type StoredCorpus = PersonalCorpus & { text: string };

const DATABASE = "kawalyser";
const STORE = "corpus";
const KEY = "personal";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** True once the corpus is stored. */
export async function saveCorpus(corpus: StoredCorpus): Promise<boolean> {
  try {
    await run("readwrite", (store) => store.put(corpus, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function loadCorpus(): Promise<StoredCorpus | null> {
  try {
    const stored = (await run("readonly", (store) => store.get(KEY))) as Partial<StoredCorpus> | undefined;
    const valid =
      typeof stored?.text === "string" && typeof stored.name === "string" && typeof stored.characters === "number" && typeof stored.savedAt === "number";
    return valid ? (stored as StoredCorpus) : null;
  } catch {
    return null;
  }
}

export async function deleteCorpus(): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing stored, or storage blocked: nothing to delete.
  }
}
