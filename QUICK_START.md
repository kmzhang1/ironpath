# Quick Start Guide - IronPath AI

## Installation & Running

```bash
# Navigate to project
cd frontend

# Install dependencies (first time only)
bun install

# Start development server
bun run dev

# Open browser
# Visit: http://localhost:5173
```

## Testing the Complete Flow

### 1. Login (Mock OAuth)
- Click "Continue with Google"
- Simulates 1.5 second OAuth redirect
- Auto-creates mock user

### 2. Wizard - Step 1: Basic Info
```
Name: John Powerlifter
Bodyweight: 75
Unit: kg
Sex: Male
Age: 25
```

### 3. Wizard - Step 2: 1RMs
```
Squat: 150 kg
Bench: 100 kg
Deadlift: 180 kg
Total: 430 kg (auto-calculated)
```

### 4. Wizard - Step 3: Program Parameters
```
Goal: Strength Development
Weeks: 8
Days per Week: 4
```

### 5. Wizard - Step 4: Additional Details (Optional)
```
Limitations: Low back pain
Focus Areas: Lockout strength
```

### 6. Generate Program
- Click "Generate Program"
- Wait 3 seconds (simulated AI processing)
- Redirected to Dashboard

### 7. Dashboard Features
- **Header**: Shows program title and creation date
- **Stats Grid**: Displays athlete info and 1RMs
- **Week Tabs**: Navigate between training weeks
- **Session Cards**: View exercises in table format

### 8. Utility Sidebar
Click "Utilities" button to access:

#### RPE Calculator
```
Weight: 140 kg
Reps: 5
RPE: 8
→ Estimated 1RM: 173 kg
```

#### DOTS Calculator
```
Bodyweight: 75 kg
Total: 430 kg
Sex: Male
→ DOTS Score: 355.42 (Intermediate)
```

### 9. Excel Export
- Click "Export to Excel"
- Downloads `IronPath_Program_2026-01-14.xlsx`
- Contains:
  - **Summary Sheet**: Profile + 1RMs
  - **Training Log**: All exercises with calculated loads

## Key Features to Test

### Exercise Variation Matching
The system recognizes and calculates loads for variations:
- "Pause Squat" → Uses Squat 1RM
- "Close Grip Bench Press" → Uses Bench 1RM
- "Romanian Deadlift" → Uses Deadlift 1RM

### RPE-Based Load Calculation
In the Excel export, main lifts show calculated weights:
```
Week 1, Day 1: Squat, 5x5 @ RPE 7.5
Calculated Load: 136 kg
(Uses RPE chart: RPE 7.5 for 5 reps = 90.7% of 1RM)
```

### Program Progression
- Early weeks: Higher volume, moderate RPE
- Later weeks (peaking): Lower reps, higher RPE
- Accessories: 3 sets, 8-15 reps, RPE 7-8

## Data Persistence

Your data is saved in localStorage:
- Refresh the page → Data persists
- Close browser and reopen → Still logged in
- Clear localStorage → Returns to login

## Logout & Reset
- Click logout icon (top right)
- Clears all data
- Returns to login page

## Common Issues

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lock
bun install
```

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Type Errors
```bash
# Run type checker
bun run tsc --noEmit
```

## Project Structure Quick Reference

```
src/
├── components/ui/        # Reusable UI components
├── pages/               # Route pages (Login, Wizard, Dashboard)
├── services/            # API calls (mock)
├── store/               # Zustand state management
├── types/               # TypeScript interfaces
├── utils/               # Helper functions (RPE, DOTS, Excel)
└── App.tsx             # Router setup
```

## Customization Points

### Change Theme Colors
Edit [tailwind.config.js](frontend/tailwind.config.js):
```javascript
colors: {
  lime: {
    400: '#a3e635', // Change this for different accent
  },
}
```

### Modify RPE Chart
Edit [src/utils/liftingMath.ts](frontend/src/utils/liftingMath.ts):
```typescript
const RPE_CHART: Record<number, Record<number, number>> = {
  // Modify percentages here
}
```

### Add More Exercises
Edit [src/services/api.ts](frontend/src/services/api.ts):
```typescript
function generateSession() {
  // Add exercises to accessories array
}
```

## Development Commands

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Type check
bun run tsc --noEmit

# Format code (if prettier installed)
bun run prettier --write "src/**/*.{ts,tsx}"
```

## Next Steps

1. **Test the complete flow** using the steps above
2. **Try the calculators** in the utility sidebar
3. **Export a program** and check the Excel file
4. **Experiment with different**:
   - Training goals (peaking vs hypertrophy)
   - Program lengths (4 vs 12 weeks)
   - Training frequencies (3 vs 6 days)

## Support

For issues or questions:
- Check the [README.md](README.md)
- Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- Inspect browser console for errors

---

Enjoy your powerlifting journey with IronPath AI! 💪
