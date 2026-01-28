/**
 * Progress Sync Utility
 *
 * Handles synchronization of workout progress to database with:
 * - Optimistic UI updates (instant feedback)
 * - Background database persistence
 * - Retry queue for failed syncs
 * - Debouncing for rapid updates
 */

import type { IntensityRating } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SYNC_DEBOUNCE_MS = 2000; // 2 seconds for general updates
const IMMEDIATE_SYNC_MS = 500; // 500ms for critical actions (completions)

// Track pending syncs to enable debouncing
const syncQueue = new Map<string, ReturnType<typeof setTimeout>>();

// Retry queue for failed syncs
interface RetryItem {
  key: string;
  fn: () => Promise<void>;
  attempts: number;
  maxAttempts: number;
}

const retryQueue: RetryItem[] = [];
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 5000, 15000]; // Exponential backoff

/**
 * Generic sync function with retry logic
 */
async function syncWithRetry(
  key: string,
  syncFn: () => Promise<void>,
  debounceMs: number = SYNC_DEBOUNCE_MS
): Promise<void> {
  // Cancel any pending sync for this key
  if (syncQueue.has(key)) {
    clearTimeout(syncQueue.get(key)!);
  }

  // Schedule new sync (debounced)
  const timeoutId = setTimeout(async () => {
    try {
      await syncFn();
      syncQueue.delete(key);
      console.log(`✅ Synced: ${key}`);
    } catch (error) {
      console.error(`❌ Sync failed for ${key}:`, error);

      // Add to retry queue
      addToRetryQueue(key, syncFn);
    }
  }, debounceMs);

  syncQueue.set(key, timeoutId);
}

/**
 * Add failed sync to retry queue with exponential backoff
 */
function addToRetryQueue(key: string, syncFn: () => Promise<void>): void {
  // Check if already in queue
  const existing = retryQueue.find(item => item.key === key);

  if (existing) {
    existing.attempts++;
    if (existing.attempts >= existing.maxAttempts) {
      console.error(`❌ Max retry attempts reached for ${key}`);
      // Remove from queue
      const index = retryQueue.indexOf(existing);
      retryQueue.splice(index, 1);
      return;
    }
  } else {
    retryQueue.push({
      key,
      fn: syncFn,
      attempts: 0,
      maxAttempts: MAX_RETRY_ATTEMPTS
    });
  }

  // Schedule retry with backoff
  const retryItem = retryQueue.find(item => item.key === key)!;
  const backoffMs = RETRY_BACKOFF_MS[Math.min(retryItem.attempts, RETRY_BACKOFF_MS.length - 1)];

  setTimeout(async () => {
    console.log(`🔄 Retrying sync for ${key} (attempt ${retryItem.attempts + 1}/${retryItem.maxAttempts})`);

    try {
      await retryItem.fn();

      // Remove from retry queue on success
      const index = retryQueue.indexOf(retryItem);
      if (index > -1) {
        retryQueue.splice(index, 1);
      }

      console.log(`✅ Retry successful for ${key}`);
    } catch (error) {
      console.error(`❌ Retry failed for ${key}:`, error);
      addToRetryQueue(key, syncFn); // Re-add to queue
    }
  }, backoffMs);
}

/**
 * Sync session completion to database
 */
export async function syncSessionCompletion(
  programId: string,
  weekNumber: number,
  dayNumber: number,
  completedAt?: string,
  intensityRating?: IntensityRating,
  scheduledDate?: string
): Promise<void> {
  const key = `complete-${programId}-${weekNumber}-${dayNumber}`;

  const syncFn = async () => {
    const response = await fetch(`${API_BASE_URL}/api/progress/${programId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        week_number: weekNumber,
        day_number: dayNumber,
        completed_at: completedAt || new Date().toISOString(),
        intensity_rating: intensityRating,
        scheduled_date: scheduledDate
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Failed to sync completion: ${error.detail || response.statusText}`);
    }
  };

  // Use immediate sync for completions (critical action)
  await syncWithRetry(key, syncFn, IMMEDIATE_SYNC_MS);
}

/**
 * Sync session un-completion to database (undo completion)
 */
export async function syncSessionUncomplete(
  programId: string,
  weekNumber: number,
  dayNumber: number
): Promise<void> {
  const key = `uncomplete-${programId}-${weekNumber}-${dayNumber}`;

  const syncFn = async () => {
    const response = await fetch(`${API_BASE_URL}/api/progress/${programId}/uncomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        week_number: weekNumber,
        day_number: dayNumber,
        intensity_rating: '' // Required by schema but not used
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Failed to sync un-completion: ${error.detail || response.statusText}`);
    }
  };

  // Use immediate sync for un-completions (critical action)
  await syncWithRetry(key, syncFn, IMMEDIATE_SYNC_MS);
}

/**
 * Sync intensity rating to database
 */
export async function syncIntensityRating(
  programId: string,
  weekNumber: number,
  dayNumber: number,
  intensityRating: IntensityRating
): Promise<void> {
  const key = `intensity-${programId}-${weekNumber}-${dayNumber}`;

  const syncFn = async () => {
    const response = await fetch(`${API_BASE_URL}/api/progress/${programId}/intensity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        week_number: weekNumber,
        day_number: dayNumber,
        intensity_rating: intensityRating
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Failed to sync intensity: ${error.detail || response.statusText}`);
    }
  };

  // Use immediate sync for intensity ratings (quick action)
  await syncWithRetry(key, syncFn, IMMEDIATE_SYNC_MS);
}

/**
 * Sync scheduled date to database
 */
export async function syncScheduledDate(
  programId: string,
  weekNumber: number,
  dayNumber: number,
  scheduledDate: string
): Promise<void> {
  const key = `schedule-${programId}-${weekNumber}-${dayNumber}`;

  const syncFn = async () => {
    const response = await fetch(`${API_BASE_URL}/api/progress/${programId}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        week_number: weekNumber,
        day_number: dayNumber,
        scheduled_date: scheduledDate
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Failed to sync schedule: ${error.detail || response.statusText}`);
    }
  };

  // Use immediate sync for date changes
  await syncWithRetry(key, syncFn, IMMEDIATE_SYNC_MS);
}

/**
 * Fetch progress from database for a program
 */
export async function fetchProgramProgress(programId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/progress/${programId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Failed to fetch progress: ${error.detail || response.statusText}`);
  }

  return await response.json();
}

/**
 * Bulk sync multiple sessions (for localStorage migration)
 */
export async function bulkSyncSessions(
  programId: string,
  sessions: Array<{
    week_number: number;
    day_number: number;
    completed_at?: string;
    intensity_rating?: IntensityRating;
    scheduled_date?: string;
  }>
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/progress/${programId}/bulk-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sessions)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Failed to bulk sync: ${error.detail || response.statusText}`);
  }

  const result = await response.json();
  console.log(`✅ Bulk synced ${result.synced_count} sessions`);
}

/**
 * Get current retry queue status (for debugging)
 */
export function getRetryQueueStatus(): {
  pending: number;
  items: Array<{ key: string; attempts: number; maxAttempts: number }>;
} {
  return {
    pending: retryQueue.length,
    items: retryQueue.map(item => ({
      key: item.key,
      attempts: item.attempts,
      maxAttempts: item.maxAttempts
    }))
  };
}

/**
 * Clear all pending syncs (for cleanup/logout)
 */
export function clearAllPendingSyncs(): void {
  syncQueue.forEach(timeoutId => clearTimeout(timeoutId));
  syncQueue.clear();
  retryQueue.length = 0; // Clear array
  console.log('🧹 Cleared all pending syncs');
}
