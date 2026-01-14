# IronPath AI - Powerlifting Coaching Application

A production-ready powerlifting coaching web application that generates AI-powered training programs with RPE-based auto-regulation and Excel export functionality.

## Tech Stack

- **Runtime**: Bun
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom UI Components
- **State Management**: Zustand (with localStorage persistence)
- **Data Fetching**: TanStack Query
- **Validation**: Zod
- **Routing**: React Router DOM
- **Export**: xlsx (SheetJS)
- **Icons**: Lucide React

## Features

### Core Functionality
- **Multi-Step Wizard**: Collect lifter profile with Zod validation
- **AI Program Generation**: Simulated 3-second AI processing with realistic programs
- **Program Customization**:
  - Training goals (Peaking, Hypertrophy, Strength Block)
  - Program length (4-12 weeks)
  - Training frequency (2-6 days/week)
  - Injury limitations and focus areas
- **Dashboard View**: Tabbed interface for viewing weekly training sessions
- **Excel Export**: Automated load calculations based on 1RM and RPE charts

### Utility Tools
- **RPE Calculator**: Estimate 1RM from weight, reps, and RPE
- **DOTS Calculator**: Compare lifters across weight classes using IPF formula
- **Collapsible Sidebar**: Accessible from dashboard

### Design System
- **Theme**: Industrial Gym aesthetic
- **Colors**:
  - Background: Matte black (`bg-zinc-950`)
  - Cards: Dark grey (`bg-zinc-900`)
  - Accent: Neon lime (`#a3e635`)
- **Typography**:
  - Sans-serif for UI text
  - Monospace for data (weights, reps, RPE)

## Getting Started

### Prerequisites
- Bun 1.3.3 or higher

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

4. Open http://localhost:5173 in your browser

### Building for Production

```bash
bun run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
bun run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn-style UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Label.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Progress.tsx
│   │   └── layout/          # Layout components
│   │       └── UtilitySidebar.tsx
│   ├── lib/
│   │   └── utils.ts         # Utility functions (cn, etc.)
│   ├── pages/
│   │   ├── Login.tsx        # Mock OAuth login page
│   │   ├── Wizard.tsx       # Multi-step profile wizard
│   │   └── Dashboard.tsx    # Program view & management
│   ├── services/
│   │   └── api.ts           # Mock API layer
│   ├── store/
│   │   └── index.ts         # Zustand global store
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── utils/
│   │   ├── excelExport.ts   # Excel generation logic
│   │   └── liftingMath.ts   # RPE, DOTS, 1RM calculations
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind styles
├── public/
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## User Flow

1. **Login**: Mock Google OAuth authentication
2. **Wizard** (4 steps):
   - Step 1: Basic information (name, bodyweight, age, sex)
   - Step 2: One-rep maxes (squat, bench, deadlift)
   - Step 3: Program parameters (goal, weeks, days per week)
   - Step 4: Limitations and focus areas
3. **Generation**: 3-second simulated AI processing
4. **Dashboard**: View and navigate program by week
5. **Export**: Download Excel file with calculated loads

## Key Features

### RPE-Based Programming
- Uses Tuscherer's RPE chart for load calculations
- Maps RPE 6-10 to percentages based on rep ranges
- Automatic weight suggestions in Excel export

### Exercise Variation Matching
The system intelligently matches exercise variations to main lifts:
- **Squat**: Pause Squat, Front Squat, Box Squat, Tempo Squat, etc.
- **Bench**: Close Grip Bench, Pause Bench, Spoto Press, Floor Press, etc.
- **Deadlift**: Deficit Deadlift, Romanian Deadlift, Block Pulls, Rack Pulls, etc.

### DOTS Score Calculation
Uses the official IPF formula to normalize strength across bodyweight classes for fair comparisons.

## Mock Data

The application includes realistic mock data:
- **Program Generation**: Creates 4-12 week programs with progression
- **Exercise Selection**: Varies based on training goal and week
- **RPE Progression**: Increases intensity over training cycles
- **Accessory Work**: Includes complementary exercises

## State Persistence

User data persists across sessions via localStorage:
- User authentication status
- Lifter profile
- Current program

## Development Notes

### Validation
All form inputs use Zod schemas with real-time error display on submit.

### Type Safety
Strict TypeScript configuration ensures type safety across the application.

### Performance
- TanStack Query for efficient data fetching
- React 19 for optimal rendering
- Lazy loading for route-based code splitting

## Future Enhancements

- Real backend integration
- Multiple program storage
- Progress tracking and analytics
- Mobile app (React Native)
- Video form checks
- Social features and coach marketplace

## License

MIT

---

**Built with Claude Code** 🤖
