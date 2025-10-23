/**
 * Sync Manager
 * Handles online/offline state and data synchronization
 */

import { useState, useEffect } from 'react';

export type NetworkStatus = 'online' | 'offline';

/**
 * Hook to track online/offline status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );

  useEffect(() => {
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Queue for operations to sync when back online
 */
interface QueuedOperation {
  id: string;
  type: 'progress' | 'favorite' | 'delete';
  data: any;
  timestamp: number;
}

class SyncQueue {
  private queue: QueuedOperation[] = [];
  private readonly STORAGE_KEY = 'ridecast_sync_queue';

  constructor() {
    this.loadQueue();
  }

  private loadQueue() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private saveQueue() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  add(type: QueuedOperation['type'], data: any): string {
    const id = `${type}_${Date.now()}_${Math.random()}`;
    this.queue.push({
      id,
      type,
      data,
      timestamp: Date.now(),
    });
    this.saveQueue();
    return id;
  }

  remove(id: string) {
    this.queue = this.queue.filter((op) => op.id !== id);
    this.saveQueue();
  }

  getAll(): QueuedOperation[] {
    return [...this.queue];
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  get size(): number {
    return this.queue.length;
  }
}

export const syncQueue = new SyncQueue();

/**
 * Execute queued operations when back online
 */
export async function processSyncQueue(
  handlers: {
    progress?: (data: any) => Promise<void>;
    favorite?: (data: any) => Promise<void>;
    delete?: (data: any) => Promise<void>;
  }
): Promise<{ success: number; failed: number }> {
  if (!isOnline()) {
    return { success: 0, failed: 0 };
  }

  const operations = syncQueue.getAll();
  let success = 0;
  let failed = 0;

  for (const op of operations) {
    try {
      const handler = handlers[op.type];
      if (handler) {
        await handler(op.data);
        syncQueue.remove(op.id);
        success++;
      } else {
        console.warn(`No handler for operation type: ${op.type}`);
        syncQueue.remove(op.id);
      }
    } catch (error) {
      console.error(`Failed to process sync operation ${op.id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}
