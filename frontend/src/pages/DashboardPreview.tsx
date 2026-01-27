import { useState } from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UtilitySheet } from "@/components/layout/UtilitySheet"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Label } from '@/components/ui/label';
import { EditableExerciseTable } from '@/components/features/workouts/EditableExerciseTable';
import { DatePickerButton } from '@/components/features/dashboard/DatePickerButton';
import { MessageSquare, Zap, Target, Flame } from 'lucide-react';
import type { LifterProfile, FullProgram } from '@/types';

// Mock profile data for preview
const mockProfile: LifterProfile = {
  id: 'preview-profile',
  name: 'Demo Athlete',
  biometrics: {
    bodyweight: 185,
    unit: 'lbs',
    sex: 'male',
    age: 28,
  },
  oneRepMax: {
    squat: 405,
    bench: 285,
    deadlift: 495,
  },
  trainingAge: 'intermediate',
  equipmentAccess: 'commercial',
  preferredSessionLength: 90,
};

// Mock program data for preview
const mockProgram: FullProgram = {
  id: 'preview-program',
  createdAt: new Date().toISOString(),
  title: '12-Week Strength Block',
  weeks: [
    {
      weekNumber: 1,
      sessions: [
        {
          dayNumber: 1,
          focus: 'Squat Volume',
          exercises: [
            { name: 'Competition Squat', sets: 4, reps: '6', rpeTarget: 7, restSeconds: 180, notes: 'Focus on depth' },
            { name: 'Pause Squat', sets: 3, reps: '4', rpeTarget: 7, restSeconds: 180 },
            { name: 'Leg Press', sets: 3, reps: '10-12', rpeTarget: 8, restSeconds: 120 },
            { name: 'Walking Lunges', sets: 3, reps: '12 each', rpeTarget: 7, restSeconds: 90 },
            { name: 'Leg Curl', sets: 3, reps: '12-15', rpeTarget: 8, restSeconds: 60 },
          ],
        },
        {
          dayNumber: 2,
          focus: 'Bench Volume',
          exercises: [
            { name: 'Competition Bench', sets: 4, reps: '6', rpeTarget: 7, restSeconds: 180 },
            { name: 'Close Grip Bench', sets: 3, reps: '8', rpeTarget: 7, restSeconds: 150 },
            { name: 'Incline DB Press', sets: 3, reps: '10-12', rpeTarget: 8, restSeconds: 120 },
            { name: 'Cable Fly', sets: 3, reps: '12-15', rpeTarget: 8, restSeconds: 60 },
            { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rpeTarget: 8, restSeconds: 60 },
          ],
        },
        {
          dayNumber: 3,
          focus: 'Deadlift Volume',
          exercises: [
            { name: 'Competition Deadlift', sets: 4, reps: '5', rpeTarget: 7, restSeconds: 240, notes: 'Belt up for working sets' },
            { name: 'Romanian Deadlift', sets: 3, reps: '8', rpeTarget: 7, restSeconds: 150 },
            { name: 'Barbell Row', sets: 4, reps: '8', rpeTarget: 8, restSeconds: 120 },
            { name: 'Lat Pulldown', sets: 3, reps: '10-12', rpeTarget: 8, restSeconds: 90 },
            { name: 'Face Pulls', sets: 3, reps: '15-20', rpeTarget: 7, restSeconds: 60 },
          ],
        },
      ],
    },
  ],
};

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');
  const [activeWeek, setActiveWeek] = useState('1');
  const [scheduledDates, setScheduledDates] = useState<Record<string, string>>({});
  const [showUtilities, setShowUtilities] = useState(false);

  const handleNavigate = (tab: any) => {
    if (tab === 'dashboard' || tab === 'profile') {
      setActiveTab(tab);
    } else {
      alert('This feature is available after logging in!');
    }
  };

  const handleSidebarAction = (action: string) => {
    switch(action) {
      case 'checkin-daily':
      case 'checkin-weekly':
        alert('Check-in feature is available after logging in!');
        break;
      case 'update-maxes':
        alert('Update maxes feature is available after logging in!');
        break;
      case 'utilities':
        setShowUtilities(true);
        break;
      case 'export':
        alert('Export feature is available after logging in!');
        break;
      case 'switch-program':
        alert('Program switching is available after logging in!');
        break;
      case 'logout':
        window.location.href = '/';
        break;
    }
  };

  const scheduleWorkout = (weekNum: number, dayNum: number, date: string) => {
    setScheduledDates(prev => ({
      ...prev,
      [`${weekNum}-${dayNum}`]: date,
    }));
  };

  const getScheduledDate = (weekNum: number, dayNum: number) => {
    return scheduledDates[`${weekNum}-${dayNum}`];
  };

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: mockProfile.name, email: 'demo@example.com' }}
        onNavigate={handleNavigate}
        onAction={handleSidebarAction}
        activeTab={activeTab}
      />

      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
             <div className="flex items-baseline gap-3">
                <h1 className="text-sm font-bold tracking-tight">
                  {activeTab === 'profile' ? 'Profile' : mockProgram.title}
                </h1>
                {activeTab === 'dashboard' && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Week {activeWeek}
                  </Badge>
                )}
             </div>
             {activeTab === 'dashboard' && (
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Athlete:</span>
                      <span className="font-medium">{mockProfile.name}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Squat:</span>
                      <span className="font-medium">{mockProfile.oneRepMax.squat} {mockProfile.biometrics.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Bench:</span>
                      <span className="font-medium">{mockProfile.oneRepMax.bench} {mockProfile.biometrics.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Deadlift:</span>
                      <span className="font-medium">{mockProfile.oneRepMax.deadlift} {mockProfile.biometrics.unit}</span>
                    </div>
                  </div>
                </div>
             )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 max-w-6xl mx-auto w-full">
           {activeTab === 'profile' ? (
             <PreviewProfile profile={mockProfile} />
           ) : (
             <div className="space-y-4">
                {/* Program Tabs */}
                <Tabs value={activeWeek} onValueChange={setActiveWeek} className="space-y-4">
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="h-auto w-auto justify-start p-1">
                      {mockProgram.weeks.map((week) => (
                        <TabsTrigger key={week.weekNumber} value={week.weekNumber.toString()}>
                          Week {week.weekNumber}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {mockProgram.weeks.map((week) => (
                    <TabsContent key={week.weekNumber} value={week.weekNumber.toString()}>
                      <div className="space-y-4">
                        {week.sessions.map((session, idx) => {
                          const scheduledDate = getScheduledDate(week.weekNumber, session.dayNumber);

                          return (
                            <Card key={idx}>
                              <CardHeader className="bg-muted/30 py-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border text-xs font-bold">
                                      {session.dayNumber}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <CardTitle className="text-sm font-bold">{session.focus}</CardTitle>
                                        <CardDescription>{session.exercises.length} exercises</CardDescription>
                                      </div>
                                      <DatePickerButton
                                        value={scheduledDate}
                                        onChange={(date) => scheduleWorkout(week.weekNumber, session.dayNumber, date)}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => alert('Session completion is available after logging in!')}
                                      size="sm"
                                      className="gap-2 h-8"
                                    >
                                      Mark Complete
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => alert('Feedback feature is available after logging in!')}>
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                <EditableExerciseTable
                                  weekNumber={week.weekNumber}
                                  dayNumber={session.dayNumber}
                                  exercises={session.exercises}
                                  sessionCompleted={false}
                                />

                                <div className="p-4 bg-muted/10 border-t flex justify-between items-center">
                                   <span className="text-xs font-medium text-muted-foreground">Intensity Check</span>
                                   <div className="flex gap-2">
                                     <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => alert('Too Easy')}>
                                       <Zap className="mr-1 h-3 w-3 text-blue-500"/> Too Easy
                                     </Button>
                                     <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => alert('Perfect')}>
                                       <Target className="mr-1 h-3 w-3 text-sky-400"/> Perfect
                                     </Button>
                                     <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => alert('Too Hard')}>
                                       <Flame className="mr-1 h-3 w-3 text-orange-500"/> Too Hard
                                     </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
             </div>
           )}
        </div>
      </SidebarInset>

      {/* Utilities Sheet */}
      <UtilitySheet isOpen={showUtilities} onOpenChange={setShowUtilities} />

      {/* Floating Chat Button */}
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50"
        onClick={() => alert('AI Coach chat is available after logging in!')}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

    </SidebarProvider>
  );
}

// Simple profile preview component
function PreviewProfile({ profile }: { profile: LifterProfile }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Demo athlete profile data</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="text-sm font-medium mt-1">{profile.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Age</Label>
              <p className="text-sm font-medium mt-1">{profile.biometrics.age} years</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Sex</Label>
              <p className="text-sm font-medium mt-1 capitalize">{profile.biometrics.sex}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bodyweight</Label>
              <p className="text-sm font-medium mt-1">
                {profile.biometrics.bodyweight} {profile.biometrics.unit}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current 1RMs</CardTitle>
          <CardDescription>One-rep maximums for main lifts</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Squat</Label>
              <p className="text-2xl font-bold mt-1">
                {profile.oneRepMax.squat}
              </p>
              <p className="text-xs text-muted-foreground">{profile.biometrics.unit}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bench</Label>
              <p className="text-2xl font-bold mt-1">
                {profile.oneRepMax.bench}
              </p>
              <p className="text-xs text-muted-foreground">{profile.biometrics.unit}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Deadlift</Label>
              <p className="text-2xl font-bold mt-1">
                {profile.oneRepMax.deadlift}
              </p>
              <p className="text-xs text-muted-foreground">{profile.biometrics.unit}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Training Age</Label>
              <p className="text-sm font-medium mt-1 capitalize">{profile.trainingAge}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Equipment Access</Label>
              <p className="text-sm font-medium mt-1 capitalize">{profile.equipmentAccess}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Preferred Session Length</Label>
            <p className="text-sm font-medium mt-1">{profile.preferredSessionLength} minutes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}