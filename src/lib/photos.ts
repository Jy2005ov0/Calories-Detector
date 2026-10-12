// Progress photos stay on the phone, in the app's own storage (IndexedDB), never in backups or online.

const DB = "w-photos";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const savePhoto = (id: string, dataUrl: string) => run("readwrite", (s) => s.put(dataUrl, id));
export const loadPhoto = (id: string) => run<string | undefined>("readonly", (s) => s.get(id) as IDBRequest<string | undefined>);
export const deletePhoto = (id: string) => run("readwrite", (s) => s.delete(id));

/** Shrink a picture to at most `max` px on its longest side, as a JPEG data URL. */
export async function shrinkPhoto(file: Blob, max = 1080): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}
