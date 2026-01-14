# Progress Tracking & Editable Workouts - New Features

## ✨ Features Added

### 1. **Fully Editable Exercise Table**
**Location**: Dashboard → Each session card

**What You Can Edit:**
- ✏️ **Exercise Name** - Click to change (e.g., "Squat" → "Pause Squat")
- ✏️ **Sets** - Adjust set count (e.g., 5 → 4)
- ✏️ **Reps** - Change rep scheme (e.g., "5" → "8-10")
- ✏️ **RPE Target** - Modify intensity (e.g., 8 → 7.5)
- ✏️ **Rest Time** - Edit rest periods
- ✏️ **Notes** - Add/edit exercise notes

**How to Use:**
1. Click on any cell in the table
2. Edit the value directly
3. Press Enter or click Save ✓
4. Press Escape or click X to cancel

**Auto-Calculated Weights:**
- New "Weight" column shows calculated working weight
- Based on your 1RM + RPE chart + reps
- Updates automatically when you edit RPE or reps
- Example: Squat, 5 reps @ RPE 8 → Shows "136 kg"

### 2. **Update 1RM Maxes**
**Location**: Dashboard header → "Update 1RMs" button

**Features:**
- Update Squat, Bench, Deadlift 1RMs
- Shows change indicators (+/- from previous)
- Displays new total
- Automatically recalculates ALL working weights in program
- Logs changes to history

**How to Use:**
1. Click "Update 1RMs" button
2. Edit any of the three lifts
3. See real-time total change
4. Click "Save Changes"
5. All calculated weights update instantly

### 3. **Session Completion Tracking**
**Location**: Bottom of each session card

**Features:**
- "Mark Session Complete" button
- Tracks which sessions you've finished
- Button shows checkmark when completed
- Persists across page refreshes

**How It Works:**
1. Complete your workout
2. Click "Mark Session Complete"
3. Session marked with ✓ permanently
4. Data saved to localStorage

### 4. **Smart Weight Calculations**

**RPE-Based Formula:**
```
Working Weight = 1RM × RPE_Percentage[RPE][Reps]

Example:
150kg Squat 1RM
5 reps @ RPE 8
= 150 × 0.811 (81.1%)
= 122 kg
```

**Exercise Variation Matching:**
- "Pause Squat" → Uses Squat 1RM
- "Close Grip Bench" → Uses Bench 1RM
- "Romanian Deadlift" → Uses Deadlift 1RM
- "Front Squat" → Uses Squat 1RM
- Works for ALL variations automatically

### 5. **Progress History** (Backend)
**Data Stored in Zustand + localStorage:**

```typescript
{
  programId: "prog_abc123",
  sessions: [
    {
      weekNumber: 1,
      dayNumber: 1,
      completed: true,
      completedAt: "2026-01-14T10:30:00Z",
      exerciseLogs: []
    }
  ],
  oneRepMaxHistory: [
    {
      date: "2026-01-14",
      squat: 150,
      bench: 100,
      deadlift: 180
    }
  ]
}
```

---

## 🎯 How to Test the New Features

### Test 1: Edit an Exercise
1. Open Dashboard
2. Go to Week 1, Day 1
3. Click on "Squat" in the exercise name
4. Change to "Pause Squat"
5. Press Enter
6. Notice the calculated weight stays the same (uses Squat 1RM)

### Test 2: Change RPE and See Weight Update
1. Find "Squat 5x5 @ RPE 7.5"
2. Note the current weight (e.g., "136 kg")
3. Click on RPE, change to 8.5
4. Save
5. Weight updates to higher value (e.g., "143 kg")

### Test 3: Update 1RMs
1. Click "Update 1RMs" button (top right)
2. Change Squat from 150 → 160
3. See "+10.0" indicator
4. See new total
5. Click "Save Changes"
6. Go back to program
7. Notice ALL squat weights increased by ~6.7%

### Test 4: Complete a Session
1. Scroll to bottom of any session
2. Click "Mark Session Complete"
3. Button changes to "✓ Session Completed" (disabled)
4. Refresh page
5. Session still shows as completed

### Test 5: Manual Workout Adjustments
1. Edit a session to match what you actually did:
   - Change sets from 5 → 4
   - Change reps from "5" → "6"
   - Change RPE from 8 → 8.5
   - Add note: "Felt strong today"
2. All changes persist
3. Export to Excel
4. Excel reflects your custom changes

---

## 📊 Updated Dashboard Layout

```
Header:
[Logo] IronPath AI   [Update 1RMs] [Utilities] [Export] [Logout]

Stats:
[Athlete Info] [Squat 1RM] [Bench 1RM] [Deadlift 1RM]
[Total - highlighted in lime]

Week Tabs:
[Week 1] [Week 2] [Week 3] ...

Session Card (Editable):
Day 1 - Squat Volume
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exercise    Sets  Reps  RPE  Weight      Rest  Notes
Squat (📝)   5     5     8    136 kg      4:00  [edit]
Pause S...   3    8-10   7    108 kg      3:00  [edit]
...

[Mark Session Complete ✓]
```

---

## 🔧 Technical Implementation

### New Components Created:
1. **EditableExerciseTable** ([src/components/ui/EditableExerciseTable.tsx](frontend/src/components/ui/EditableExerciseTable.tsx))
   - Inline editing with click-to-edit cells
   - Auto-save on Enter, cancel on Escape
   - Real-time weight calculations

2. **UpdateMaxesModal** ([src/components/ui/UpdateMaxesModal.tsx](frontend/src/components/ui/UpdateMaxesModal.tsx))
   - Modal dialog for updating 1RMs
   - Shows change indicators
   - Updates all program weights on save

### Store Updates:
- `updateOneRepMax()` - Update single lift, log to history
- `updateExercise()` - Edit any exercise property
- `completeSession()` - Mark session as done
- `getSessionProgress()` - Check if session completed

### New Types:
- `ExerciseLog` - Tracks actual performance per exercise
- `SessionProgress` - Tracks session completion
- `ProgressHistory` - Full progress tracking data

---

## 💾 Data Persistence

All changes are saved to **localStorage** automatically:
- ✅ Exercise edits
- ✅ 1RM updates
- ✅ Session completions
- ✅ Progress history

**Survives:**
- Page refreshes
- Browser restarts
- Navigation between pages

**Reset with:**
- Logout button (clears all data)

---

## 🎨 UX Improvements

### Visual Feedback:
- **Edit icon** appears on hover
- **Green checkmark** for save
- **Red X** for cancel
- **Lime indicators** for changes
- **Disabled button** when session complete
- **Monospace font** for weights/numbers

### Keyboard Shortcuts:
- **Enter** → Save edit
- **Escape** → Cancel edit
- **Click outside** → Auto-cancel

### Real-Time Updates:
- Weight recalculates instantly on RPE/rep change
- Total updates when 1RMs change
- UI responds immediately to all edits

---

## 📈 Use Cases

### Scenario 1: Missed Reps
You planned 5x5 @ RPE 8 but only hit 4x5 @ RPE 9
1. Edit sets: 5 → 4
2. Edit RPE: 8 → 9
3. Add note: "Fatigued from previous session"
4. Mark complete

### Scenario 2: PR on Squat
Hit a new 1RM during training:
1. Click "Update 1RMs"
2. Change Squat: 150 → 155
3. Save
4. All future squat sessions now calculated from 155kg

### Scenario 3: Injury Modification
Need to avoid regular deadlifts:
1. Find "Deadlift" exercises
2. Change to "Romanian Deadlift"
3. Reduce RPE if needed
4. Add note: "Low back precaution"

### Scenario 4: Custom Periodization
Want to adjust week 4 for deload:
1. Go to Week 4
2. Reduce all RPEs by 1-2 points
3. Change some sets from 5 → 3
4. Program auto-adjusts all weights

---

## 🚀 Next Steps

**Future Enhancements:**
- Track actual weight used (vs calculated)
- Log actual RPE achieved
- Graph progress over time
- Compare planned vs actual
- Auto-suggest 1RM updates based on performance

---

**All features are live at:** http://localhost:5173

Test the new functionality and enjoy full control over your training! 💪
