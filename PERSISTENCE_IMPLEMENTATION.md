# Database Persistence Implementation

## Overview

This document describes the implementation of database persistence for workout completions, intensity ratings, and scheduled dates. Previously, all progress data was stored only in localStorage (Zustand), creating data loss risks.

**Status:** ✅ Implemented (Ready for Testing)

---

## Architecture: Optimistic UI with Background Sync

### Design Pattern: Write-Through Cache

1. **User Action** → Update localStorage (Zustand) **immediately** for instant UI feedback
2. **Background Sync** → Write to database (500ms debounce for critical actions)
3. **Retry Queue** → Failed syncs retry with exponential backoff (1s, 5s, 15s)
4. **On Load** → Database becomes source of truth (future enhancement)

### Why This Pattern?

- ✅ **Best UX**: Users see instant feedback (no loading spinners)
- ✅ **Reliability**: Data persists even if sync fails temporarily
- ✅ **Cross-Device**: Data eventually syncs to all devices
- ✅ **Offline Support**: LocalStorage keeps working offline, syncs when online

---

## Backend Changes

### New File: `backend/src/routes/progress.py`

**Endpoints Created:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/progress/{program_id}/complete` | POST | Mark session as complete + optional intensity rating |
| `/api/progress/{program_id}/intensity` | POST | Record intensity rating (easy/perfect/hard) |
| `/api/progress/{program_id}/schedule` | POST | Schedule workout date |
| `/api/progress/{program_id}` | GET | Get all progress for a program |
| `/api/progress/{program_id}/week/{week_number}` | GET | Get progress for specific week |
| `/api/progress/{program_id}/bulk-sync` | POST | Bulk sync sessions (for localStorage migration) |

**Key Features:**
- Uses existing `ProgressLog` table (no migration needed!)
- Stores intensity rating and scheduled date in `feedback` JSON column
- Auto-creates progress log entries if they don't exist
- Returns structured responses with validation

**Example Request:**
```bash
POST /api/progress/{program_id}/complete
{
  "week_number": 1,
  "day_number": 3,
  "completed_at": "2026-01-28T15:30:00Z",
  "intensity_rating": "perfect",
  "scheduled_date": "2026-01-28"
}
```

---

## Frontend Changes

### New File: `frontend/src/services/progressSync.ts`

**Sync Functions:**

```typescript
// Mark session complete
syncSessionCompletion(programId, week, day, completedAt, intensityRating, scheduledDate)

// Record intensity rating
syncIntensityRating(programId, week, day, rating)

// Schedule workout date
syncScheduledDate(programId, week, day, date)

// Fetch progress from DB
fetchProgramProgress(programId)

// Bulk migration
bulkSyncSessions(programId, sessions[])
```

**Features:**
- Debouncing (500ms for critical actions, 2s for edits)
- Retry queue with exponential backoff
- Non-blocking (doesn't freeze UI)
- Detailed logging for debugging

### Updated: `frontend/src/store/index.ts`

**Modified Methods:**

1. **`completeSession(weekNum, dayNum)`**
   - ✅ Now calls `syncSessionCompletion()` after updating Zustand
   - Sends completed timestamp, intensity rating, scheduled date to DB

2. **`setIntensityRating(weekNum, dayNum, rating)`**
   - ✅ Now calls `syncIntensityRating()` after updating Zustand
   - Independent of completion status

3. **`scheduleWorkout(weekNum, dayNum, date)`**
   - ✅ Now calls `syncScheduledDate()` after updating Zustand
   - Also syncs cascade updates when multiple dates change

**Code Example:**
```typescript
completeSession: (weekNum, dayNum) => {
  // 1. Update Zustand (instant UI feedback)
  session.completed = true;
  session.completedAt = new Date().toISOString();
  set({ progressHistory: { ...history } });

  // 2. Sync to database (background)
  syncSessionCompletion(programId, weekNum, dayNum, ...)
    .catch(error => {
      console.error('Sync failed:', error);
      // Retry queue handles retries
    });
}
```

---

## Data Flow

### Before (localStorage Only):
```
User Action → Zustand → localStorage
                          ↓
                  [LOST ON CLEAR] ❌
```

### After (Database Persistence):
```
User Action → Zustand → localStorage (instant)
                ↓
            Sync Queue (500ms debounce)
                ↓
            Database Write
                ↓
            Retry if Failed (3 attempts)
```

---

## Testing Guide

### Manual Testing Steps:

1. **Test Session Completion:**
   ```
   1. Open Dashboard
   2. Click "Mark Complete" on a workout
   3. Check browser console for: "✅ Synced: complete-{programId}-{week}-{day}"
   4. Open browser DevTools → Network tab → Filter "complete"
   5. Verify POST request to /api/progress/{programId}/complete
   ```

2. **Test Intensity Rating:**
   ```
   1. Click "Perfect" on intensity buttons
   2. Check console for: "✅ Synced: intensity-{programId}-{week}-{day}"
   3. Verify POST request to /api/progress/{programId}/intensity
   ```

3. **Test Scheduled Date:**
   ```
   1. Click calendar icon, select a date
   2. Check console for: "✅ Synced: schedule-{programId}-{week}-{day}"
   3. Verify POST request to /api/progress/{programId}/schedule
   ```

4. **Test Retry Logic:**
   ```
   1. Stop backend server
   2. Mark a workout complete
   3. Check console for: "❌ Sync failed" then "🔄 Retrying sync"
   4. Restart backend
   5. Wait for retry → should succeed
   ```

5. **Test Data Persistence:**
   ```
   1. Complete several workouts
   2. Clear localStorage (DevTools → Application → Clear)
   3. Refresh page
   4. TODO: Implement load from DB (Phase 5)
   ```

### API Testing (cURL):

```bash
# Mark session complete
curl -X POST http://localhost:8000/api/progress/{PROGRAM_ID}/complete \
  -H "Content-Type: application/json" \
  -d '{
    "week_number": 1,
    "day_number": 1,
    "completed_at": "2026-01-28T15:00:00Z",
    "intensity_rating": "perfect"
  }'

# Get progress
curl http://localhost:8000/api/progress/{PROGRAM_ID}
```

### Database Verification:

```sql
-- Check progress logs
SELECT * FROM progress_logs
WHERE program_id = 'YOUR_PROGRAM_ID'
ORDER BY week_number, day_number;

-- Check feedback data
SELECT week_number, day_number, completed, feedback
FROM progress_logs
WHERE program_id = 'YOUR_PROGRAM_ID';
```

---

## Retry Queue Status

### Check Retry Queue:
```typescript
import { getRetryQueueStatus } from '@/services/progressSync';

console.log(getRetryQueueStatus());
// Output: { pending: 2, items: [{ key: '...', attempts: 1, maxAttempts: 3 }] }
```

### Clear Pending Syncs (on logout):
```typescript
import { clearAllPendingSyncs } from '@/services/progressSync';

clearAllPendingSyncs(); // Cancels all pending syncs
```

---

## Migration Path (Existing Users)

### Option 1: Background Migration (Recommended)

Add this to `Dashboard.tsx` on mount:

```typescript
useEffect(() => {
  async function migrateToDatabase() {
    const { progressHistory, currentProgram } = useAppStore.getState();
    if (!progressHistory || !currentProgram) return;

    const migratedKey = `migrated-${currentProgram.id}`;
    if (localStorage.getItem(migratedKey)) return; // Already migrated

    try {
      const sessions = progressHistory.sessions
        .filter(s => s.completed)
        .map(s => ({
          week_number: s.weekNumber,
          day_number: s.dayNumber,
          completed_at: s.completedAt,
          intensity_rating: s.intensityRating,
          scheduled_date: s.scheduledDate
        }));

      await bulkSyncSessions(currentProgram.id, sessions);
      localStorage.setItem(migratedKey, 'true');
      console.log(`✅ Migrated ${sessions.length} sessions to database`);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  migrateToDatabase();
}, []);
```

### Option 2: Manual Migration Button

Add a button in settings:
```typescript
<Button onClick={async () => {
  await migrateToDatabase();
  alert('Progress migrated to database!');
}}>
  Sync Progress to Database
</Button>
```

---

## Future Enhancements (Phase 5)

### Load from Database on App Start

```typescript
// In store.ts or Dashboard.tsx
async function loadProgressFromDatabase(programId: string) {
  try {
    const data = await fetchProgramProgress(programId);

    // Convert DB format to Zustand format
    const sessions: SessionProgress[] = data.logs.map(log => ({
      sessionId: `${log.week_number}-${log.day_number}`,
      weekNumber: log.week_number,
      dayNumber: log.day_number,
      completed: log.completed,
      completedAt: log.completed_at,
      scheduledDate: log.feedback?.scheduledDate,
      intensityRating: log.feedback?.intensityRating,
      exerciseLogs: []
    }));

    set({ progressHistory: { programId, sessions, ... } });
  } catch (error) {
    console.error('Failed to load from DB:', error);
    // Fall back to localStorage
  }
}
```

---

## Performance Considerations

### Debounce Timings:

- **Completions:** 500ms (critical - persist quickly)
- **Intensity Ratings:** 500ms (quick action - no need to debounce further)
- **Date Changes:** 500ms (user expects immediate save)
- **Exercise Edits:** 2000ms (user may type multiple times)

### Network Optimization:

- **Batching:** Cascade date updates could batch multiple writes
- **Compression:** Could enable gzip for large payloads
- **CDN:** Could cache static program data

### Database Indexes:

Recommended indexes in `ProgressLog` table:
```sql
CREATE INDEX idx_progress_user_program ON progress_logs(user_id, program_id);
CREATE INDEX idx_progress_week_day ON progress_logs(week_number, day_number);
CREATE INDEX idx_progress_completed ON progress_logs(completed, completed_at);
```

---

## Error Handling

### Sync Failures:

1. **Network Error** → Retry with backoff (3 attempts)
2. **Server Error (5xx)** → Retry with backoff
3. **Client Error (4xx)** → Log error, don't retry (bad data)
4. **Max Retries Reached** → Log to console, alert user (optional)

### Offline Support:

- All data stays in localStorage
- Syncs resume when online
- Retry queue persists across page refreshes (future)

---

## Security Considerations

### Authentication (TODO - Phase 4):

Currently uses `program_id` to infer `user_id` from program ownership.

**Needed:**
```python
# In progress.py endpoints
current_user: CurrentUser = Depends(get_current_user)
user_id = current_user.id
```

**Frontend:**
```typescript
// Add auth header
headers: {
  'Authorization': `Bearer ${getAuthToken()}`
}
```

---

## Monitoring & Debugging

### Console Logs:

- `✅ Synced: {key}` - Successful sync
- `❌ Sync failed for {key}` - Initial failure
- `🔄 Retrying sync for {key}` - Retry attempt
- `✅ Retry successful for {key}` - Retry succeeded

### Check Retry Queue:

```typescript
// In browser console
import { getRetryQueueStatus } from '/src/services/progressSync.ts';
console.log(getRetryQueueStatus());
```

---

## Summary

### What's Implemented:

✅ Backend endpoints for session completion, intensity ratings, scheduled dates
✅ Frontend sync utility with debouncing and retry logic
✅ Zustand store integration (optimistic UI updates)
✅ Exponential backoff retry queue (max 3 attempts)
✅ Bulk sync endpoint for localStorage migration

### What's NOT Yet Implemented:

❌ Load from database on app start (still uses localStorage on load)
❌ JWT authentication (uses program ownership for now)
❌ Offline queue persistence across refreshes
❌ Real-time sync across devices (WebSocket)

### Next Steps:

1. **Test Manually:** Follow testing guide above
2. **Run Backend:** `cd backend && uv run uvicorn src.main:app --reload`
3. **Run Frontend:** `cd frontend && npm run dev`
4. **Verify DB Writes:** Check `progress_logs` table after completing workouts
5. **Implement Load:** Add database fetch on program load (Phase 5)

---

*Last Updated: 2026-01-28*
*Implementation Status: Ready for Testing*
