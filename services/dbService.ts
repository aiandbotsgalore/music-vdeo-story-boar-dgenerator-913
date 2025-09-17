
import type { Project } from '../types';

const DB_NAME = 'StoryboardDB';
const DB_VERSION = 2; // Bump version to add new object store
const STORE_NAME = 'images';
const PROJECTS_STORE_NAME = 'projects';

let db: IDBDatabase | null = null;
let openingPromise: Promise<IDBDatabase> | null = null;

function getDbConnection(): Promise<IDBDatabase> {
  if (db) {
    return Promise.resolve(db);
  }

  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      openingPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn("IndexedDB connection is blocked. Please close other tabs with this app open.");
    };

    request.onupgradeneeded = () => {
      const tempDb = request.result;
      if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
        tempDb.createObjectStore(STORE_NAME);
      }
      if (!tempDb.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
        tempDb.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const connection = request.result;
      
      connection.onclose = () => {
        console.warn("IndexedDB connection closed by browser.");
        db = null; // Clear the cached connection
      };

      db = connection;
      openingPromise = null;
      resolve(db);
    };
  });

  return openingPromise;
}

/**
 * A robust wrapper to perform a transaction.
 * This function moves the transaction creation into a try/catch block
 * to handle cases where the DB connection has been closed by the browser.
 * If it fails, it invalidates the connection and retries once.
 * 
 * @param storeName The name of the object store for the transaction.
 * @param mode The transaction mode ('readonly' or 'readwrite').
 * @param callback A function that receives the object store and performs an operation.
 * @param retryCount The number of times to retry if the connection fails.
 */
async function performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode, 
    callback: (store: IDBObjectStore) => IDBRequest,
    retryCount = 1
): Promise<T> {
    try {
        const connection = await getDbConnection();
        const transaction = connection.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = callback(store);
        
        return new Promise<T>((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                console.error("IDBRequest error:", request.error);
                reject(request.error);
            };
            transaction.onerror = () => {
                console.error("Transaction error:", transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        // If the transaction fails because the connection is closing and we can still retry...
        if (retryCount > 0 && error instanceof DOMException && error.name === 'InvalidStateError') {
            console.warn('DB transaction failed due to a closed connection. Invalidating connection and retrying.');
            db = null; // Force reconnection by nullifying the cached connection
            openingPromise = null; // Also clear any pending opening promise
            return performTransaction(storeName, mode, callback, retryCount - 1);
        }
        console.error("Failed to create transaction (unretriable):", error);
        throw error; // Re-throw the error if it's not the one we can retry on.
    }
}


const saveImage = async (blob: Blob): Promise<string> => {
  const id = self.crypto.randomUUID();
  await performTransaction(STORE_NAME, 'readwrite', store => store.put(blob, id));
  return id;
};

const getImage = async (id: string): Promise<Blob | null> => {
  const result = await performTransaction<Blob | undefined>(STORE_NAME, 'readonly', store => store.get(id));
  return result ? result : null;
};

const deleteImage = async (id: string): Promise<void> => {
  await performTransaction(STORE_NAME, 'readwrite', store => store.delete(id));
};

const saveProjects = async (projects: Project[]): Promise<void> => {
    const payload = { key: 'allProjects', data: projects };
    await performTransaction(PROJECTS_STORE_NAME, 'readwrite', store => store.put(payload));
};

const getProjects = async (): Promise<Project[]> => {
    const result = await performTransaction<{ key: string, data: Project[] } | undefined>(PROJECTS_STORE_NAME, 'readonly', store => store.get('allProjects'));
    return result?.data || [];
};

const initDB = () => {
    getDbConnection().catch(err => console.error("Initial DB connection failed", err));
};

export const dbService = { initDB, saveImage, getImage, deleteImage, saveProjects, getProjects };
