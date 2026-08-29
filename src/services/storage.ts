import { CallRecord, SystemConfig } from '../types';

const DB_NAME = 'VoipHotlineCallCenterDB';
const DB_VERSION = 1;
const STORE_CALL_RECORDS = 'callRecords';
const STORE_CONFIG = 'systemConfig';

export const DEFAULT_COMPANIES = [
  {
    id: '1',
    name: 'شركة سوفت روز للمنتجات الورقية',
    hotline: '19001',
    whatsapp: '201000000001',
    agents: [
      { id: 'a1', username: 'ahmed', password: '123' },
      { id: 'a2', username: 'sara', password: '123' }
    ]
  },
  {
    id: '2',
    name: 'شركة الأمل للتوزيع والتوريدات',
    hotline: '19002',
    whatsapp: '201000000002',
    agents: [
      { id: 'a3', username: 'mohamed', password: '123' }
    ]
  },
  {
    id: '3',
    name: 'خدمة عملاء الدعم الفني الموحد',
    hotline: '19011',
    whatsapp: '201000000000',
    agents: [
      { id: 'a4', username: 'agent', password: '123' }
    ]
  }
];

export const DEFAULT_CONFIG: SystemConfig = {
  companyName: 'CloudTech Hotline & VoIP Solutions',
  hotlineName: 'Customer Support & Sales Hotline',
  hotlineDisplayNumber: '19011',
  whatsappNumber: '201000000000',
  whatsappDefaultMsg: 'Hello! I am contacting you regarding your Cloud Hotline services.',
  agentPassword: 'agent',
  masterPassword: '0000',
  workingHours: '24/7 Available (Real-time WebRTC)',
  supportEmail: 'support@cloudtech-hotline.com',
};

// IndexedDB Helper
class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CALL_RECORDS)) {
          const recordStore = db.createObjectStore(STORE_CALL_RECORDS, { keyPath: 'id' });
          recordStore.createIndex('timestamp', 'timestamp', { unique: false });
          recordStore.createIndex('hotlineNumber', 'hotlineNumber', { unique: false });
          recordStore.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Save or update a call record
  async saveCallRecord(record: CallRecord): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CALL_RECORDS, 'readwrite');
        const store = tx.objectStore(STORE_CALL_RECORDS);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB write failed, falling back to LocalStorage', err);
      this.saveCallRecordFallback(record);
    }

    // Also synchronize with customer_notes in localStorage for easy interoperability
    try {
      const existingNotes = JSON.parse(localStorage.getItem('customer_notes') || '[]');
      const newNoteObj = {
        id: record.id || Date.now(),
        text: record.notes + (record.customerName ? ` (Customer: ${record.customerName})` : '') + (record.customerPhone ? ` (Phone: ${record.customerPhone})` : ''),
        date: record.dateFormatted || new Date().toLocaleString(),
        category: record.category,
        priority: record.priority,
        status: record.status,
      };
      localStorage.setItem('customer_notes', JSON.stringify([...existingNotes, newNoteObj]));
    } catch (e) {
      console.warn('Could not sync customer_notes:', e);
    }
  }

  // Get all call records
  async getAllCallRecords(): Promise<CallRecord[]> {
    try {
      const db = await this.getDB();
      return await new Promise<CallRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_CALL_RECORDS, 'readonly');
        const store = tx.objectStore(STORE_CALL_RECORDS);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Most recent first
        const results: CallRecord[] = [];

        request.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('IndexedDB read failed, falling back to LocalStorage', err);
      return this.getAllCallRecordsFallback();
    }
  }

  // Delete call record
  async deleteCallRecord(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CALL_RECORDS, 'readwrite');
        const store = tx.objectStore(STORE_CALL_RECORDS);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.deleteCallRecordFallback(id);
    }
  }

  // System Configuration get & save
  async getConfig(): Promise<SystemConfig> {
    try {
      const db = await this.getDB();
      const stored = await new Promise<{ key: string; value: SystemConfig } | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_CONFIG, 'readonly');
        const store = tx.objectStore(STORE_CONFIG);
        const request = store.get('main');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (stored?.value) {
        return { ...DEFAULT_CONFIG, ...stored.value };
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('voip_system_config');
    if (local) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(local) };
      } catch {}
    }

    return DEFAULT_CONFIG;
  }

  async saveConfig(config: SystemConfig): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CONFIG, 'readwrite');
        const store = tx.objectStore(STORE_CONFIG);
        store.put({ key: 'main', value: config });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}

    localStorage.setItem('voip_system_config', JSON.stringify(config));
  }

  // LocalStorage Fallbacks
  private saveCallRecordFallback(record: CallRecord) {
    const list = this.getAllCallRecordsFallback();
    const existingIndex = list.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem('voip_call_records', JSON.stringify(list));
  }

  private getAllCallRecordsFallback(): CallRecord[] {
    try {
      const data = localStorage.getItem('voip_call_records');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private deleteCallRecordFallback(id: string) {
    const list = this.getAllCallRecordsFallback().filter((r) => r.id !== id);
    localStorage.setItem('voip_call_records', JSON.stringify(list));
  }
}

export const storageService = new StorageService();
