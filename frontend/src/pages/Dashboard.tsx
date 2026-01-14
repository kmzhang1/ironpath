import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EditableExerciseTable } from '@/components/ui/EditableExerciseTable';
import { UpdateMaxesModal } from '@/components/ui/UpdateMaxesModal';
import { useAppStore } from '@/store';
import { UtilitySidebar } from '@/components/layout/UtilitySidebar';
import { generateExcelLog } from '@/utils/excelExport';
import { Download, Calculator, LogOut, Dumbbell, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { currentProgram, profile, reset, toggleSidebar, completeSession, getSessionProgress } = useAppStore();

  const [activeWeek, setActiveWeek] = useState('1');
  const [showMaxesModal, setShowMaxesModal] = useState(false);

  if (!currentProgram || !profile) {
    navigate('/wizard');
    return null;
  }

  const handleExport = () => {
    generateExcelLog(currentProgram, profile);
  };

  const handleLogout = () => {
    reset();
    navigate('/');
  };

  const total = profile.oneRepMax.squat + profile.oneRepMax.bench + profile.oneRepMax.deadlift;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-400 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-50">
                IronPath <span className="text-lime-400">AI</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowMaxesModal(true)}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Update 1RMs
            </Button>
            <Button variant="outline" size="sm" onClick={toggleSidebar}>
              <Calculator className="mr-2 h-4 w-4" />
              Utilities
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Program Overview */}
        <div className="mb-8 space-y-4">
          <div>
            <h2 className="text-3xl font-bold text-zinc-50">{currentProgram.title}</h2>
            <p className="text-zinc-400 mt-1">
              Created on {new Date(currentProgram.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Athlete</CardDescription>
                <CardTitle className="text-xl">{profile.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-zinc-400">
                  {profile.biometrics.bodyweight} {profile.biometrics.unit} •{' '}
                  {profile.biometrics.age}y
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Squat 1RM</CardDescription>
                <CardTitle className="text-xl font-mono text-lime-400">
                  {profile.oneRepMax.squat} {profile.biometrics.unit}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Bench 1RM</CardDescription>
                <CardTitle className="text-xl font-mono text-lime-400">
                  {profile.oneRepMax.bench} {profile.biometrics.unit}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Deadlift 1RM</CardDescription>
                <CardTitle className="text-xl font-mono text-lime-400">
                  {profile.oneRepMax.deadlift} {profile.biometrics.unit}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-lime-400/5 border-lime-400/20">
            <CardHeader>
              <CardDescription className="text-lime-400">Total</CardDescription>
              <CardTitle className="text-3xl font-mono text-lime-400">
                {total} {profile.biometrics.unit}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Program Tabs */}
        <Tabs value={activeWeek} onValueChange={setActiveWeek}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {currentProgram.weeks.map((week) => (
              <TabsTrigger key={week.weekNumber} value={week.weekNumber.toString()}>
                Week {week.weekNumber}
              </TabsTrigger>
            ))}
          </TabsList>

          {currentProgram.weeks.map((week) => (
            <TabsContent key={week.weekNumber} value={week.weekNumber.toString()}>
              <div className="space-y-4 mt-4">
                {week.sessions.map((session, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Day {session.dayNumber}</CardTitle>
                          <CardDescription>{session.focus}</CardDescription>
                        </div>
                        <div className="text-sm text-zinc-400 font-mono">
                          {session.exercises.length} exercises
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <EditableExerciseTable
                        weekNumber={week.weekNumber}
                        dayNumber={session.dayNumber}
                        exercises={session.exercises}
                        sessionCompleted={getSessionProgress(week.weekNumber, session.dayNumber)?.completed}
                        onCompleteSession={() => completeSession(week.weekNumber, session.dayNumber)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Utility Sidebar */}
      <UtilitySidebar />

      {/* Update Maxes Modal */}
      <UpdateMaxesModal isOpen={showMaxesModal} onClose={() => setShowMaxesModal(false)} />
    </div>
  );
}
