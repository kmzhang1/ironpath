import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Progress } from "@/components/ui/progress"

// Domain components from features
import { EditableExerciseTable } from '@/components/features/workouts/EditableExerciseTable';
import { UpdateMaxesModal } from '@/components/features/dashboard/UpdateMaxesModal';
import { WorkoutFeedbackModal } from '@/components/features/workouts/WorkoutFeedbackModal';
import { CheckInModal } from '@/components/features/dashboard/CheckInModal';
import { DatePickerButton } from '@/components/features/dashboard/DatePickerButton';
import { Profile } from './Profile';
import { useAppStore } from '@/store';
import { generateExcelLog } from '@/utils/excelExport';
import { submitWorkoutFeedback, performCheckIn } from '@/services/api';
import { MessageSquare, Zap, Target, Flame, CheckCircle, Sparkles } from 'lucide-react';
import type { FeedbackCategory } from '@/types';
import { ProgramSelectorModal } from '@/components/features/dashboard/ProgramSelectorModal';
import { AgentChatModal } from '@/components/features/chat/AgentChatModal';

// Tab transition animations - slide from right with fade
const tabVariants = {
  initial: {
    opacity: 0,
    x: 10,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -10,
  },
};

const tabTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.2,
};

// Staggered list animations for session cards
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween' as const,
      ease: 'easeOut' as const,
      duration: 0.3,
    },
  },
};

export function Dashboard() {
  const navigate = useNavigate();
  const {
    currentProgram,
    profile,
    reset,
    completeSession,
    getSessionProgress,
    submitWorkoutFeedback: storeFeedback,
    scheduleWorkout,
    getScheduledDate,
    addCheckIn,
    progressHistory,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');
  const [activeWeek, setActiveWeek] = useState('1');
  const [showMaxesModal, setShowMaxesModal] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);

  // ... Keep existing modal states ...
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean; weekNumber: number; dayNumber: number; sessionFocus: string;
  }>({ isOpen: false, weekNumber: 0, dayNumber: 0, sessionFocus: '' });

  const [checkInModal, setCheckInModal] = useState<{
    isOpen: boolean; type: 'daily' | 'weekly';
  }>({ isOpen: false, type: 'daily' });

  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const [showAgentChat, setShowAgentChat] = useState(false);

  // Debug logging
  console.log('Dashboard render - currentProgram:', currentProgram?.id, 'profile:', profile?.name);

  // Early return if no profile - redirect to profile setup
  if (!profile) {
    console.log('Dashboard: No profile found, redirecting to profile setup');
    navigate('/profile-setup');
    return null;
  }

  // Action Handlers - Define before any early returns
  const handleNavigate = (tab: any) => setActiveTab(tab);

  const handleSidebarAction = (action: string) => {
    switch(action) {
      case 'checkin-daily': setCheckInModal({ isOpen: true, type: 'daily' }); break;
      case 'checkin-weekly': setCheckInModal({ isOpen: true, type: 'weekly' }); break;
      case 'update-maxes': setShowMaxesModal(true); break;
      case 'utilities': setShowUtilities(true); break;
      case 'export': if (currentProgram) generateExcelLog(currentProgram, profile); break;
      case 'switch-program': setShowProgramSelector(true); break;
      case 'logout': reset(); navigate('/'); break;
    }
  };

  const handleOpenFeedback = (weekNumber: number, dayNumber: number, sessionFocus: string) => {
    setFeedbackModal({ isOpen: true, weekNumber, dayNumber, sessionFocus });
  };

  const handleSubmitFeedback = async (categories: FeedbackCategory[], feedbackText: string) => {
    const feedback = await submitWorkoutFeedback(
      feedbackModal.weekNumber,
      feedbackModal.dayNumber,
      categories,
      feedbackText,
      currentProgram!
    );
    storeFeedback(feedback);
    alert(`Workout adjusted! ${feedback.suggestedAdjustment}`);
  };

  const handleCheckIn = async (type: 'daily' | 'weekly') => {
    const analysis = await performCheckIn(type, progressHistory, currentProgram!);
    addCheckIn(analysis);
    return analysis;
  };

  // Show normal dashboard layout with centered "Create your first program" button if no program exists
  if (!currentProgram) {
    console.log('Dashboard: No program found, showing create program prompt');
    return (
      <SidebarProvider>
        <AppSidebar
          user={{ name: profile.name, email: 'user@example.com' }}
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
              <h1 className="text-sm font-bold tracking-tight">
                {activeTab === 'profile' ? 'Profile' : 'Dashboard'}
              </h1>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 items-center justify-center p-4">
            {activeTab === 'profile' ? (
              <div className="w-full max-w-6xl mx-auto">
                <Profile />
              </div>
            ) : (
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-xl">
                      <Target className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Welcome, {profile.name}!</CardTitle>
                  <CardDescription className="text-base">
                    You don't have any programs yet. Let's create your first one.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => navigate('/program-setup')}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Your First Program
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>

        {/* Utilities Sheet */}
        <UtilitySheet isOpen={showUtilities} onOpenChange={setShowUtilities} />

        {/* Modals */}
        <UpdateMaxesModal isOpen={showMaxesModal} onClose={() => setShowMaxesModal(false)} />
        <CheckInModal
          type={checkInModal.type}
          isOpen={checkInModal.isOpen}
          onClose={() => setCheckInModal({ ...checkInModal, isOpen: false })}
          onPerformCheckIn={handleCheckIn}
        />
        <ProgramSelectorModal
          isOpen={showProgramSelector}
          onClose={() => setShowProgramSelector(false)}
        />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar 
        user={{ name: profile.name, email: 'user@example.com' }} 
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
                  {activeTab === 'profile' ? 'Profile' : currentProgram.title}
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
                      <span className="font-medium">{profile.name}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Squat:</span>
                      <span className="font-medium">{profile.oneRepMax.squat} {profile.biometrics.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Bench:</span>
                      <span className="font-medium">{profile.oneRepMax.bench} {profile.biometrics.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Deadlift:</span>
                      <span className="font-medium">{profile.oneRepMax.deadlift} {profile.biometrics.unit}</span>
                    </div>
                  </div>
                </div>
             )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 max-w-6xl mx-auto w-full">
           {activeTab === 'profile' ? (
             <Profile />
           ) : (
             <div className="space-y-4">
                {/* Week Progress Bar */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Program Progress</span>
                        <span className="text-muted-foreground">
                          Week {activeWeek} of {currentProgram.weeks.length}
                        </span>
                      </div>
                      <Progress
                        value={(parseInt(activeWeek) / currentProgram.weeks.length) * 100}
                        className="h-3"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Program Tabs */}
                <Tabs value={activeWeek} onValueChange={setActiveWeek} className="space-y-4">
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="h-auto w-auto justify-start p-1">
                      {currentProgram.weeks.map((week) => (
                        <TabsTrigger key={week.weekNumber} value={week.weekNumber.toString()}>
                          Week {week.weekNumber}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {currentProgram.weeks.map((week) => (
                    <TabsContent key={week.weekNumber} value={week.weekNumber.toString()}>
                      <motion.div
                        key={week.weekNumber}
                        variants={tabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={tabTransition}
                        className="space-y-4"
                      >
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="show"
                          className="space-y-4"
                        >
                          {week.sessions.map((session, idx) => {
                          const sessionProgress = getSessionProgress(week.weekNumber, session.dayNumber);
                          const scheduledDate = getScheduledDate(week.weekNumber, session.dayNumber);

                          return (
                            <motion.div key={idx} variants={itemVariants}>
                              <Card>
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
                                    {!sessionProgress?.completed && (
                                      <Button
                                        onClick={() => completeSession(week.weekNumber, session.dayNumber)}
                                        size="sm"
                                        className="gap-2 h-8"
                                      >
                                        Mark Complete
                                      </Button>
                                    )}
                                    {sessionProgress?.completed && (
                                      <Button
                                        disabled
                                        size="sm"
                                        className="gap-2 h-8"
                                      >
                                        <CheckCircle className="h-4 w-4" /> Completed
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenFeedback(week.weekNumber, session.dayNumber, session.focus)}>
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
                                  sessionCompleted={sessionProgress?.completed}
                                />
                                
                                {!sessionProgress?.completed && (
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
                                )}
                              </CardContent>
                            </Card>
                            </motion.div>
                          )
                        })}
                        </motion.div>
                      </motion.div>
                    </TabsContent>
                  ))}
                </Tabs>
             </div>
           )}
        </div>
      </SidebarInset>
      
      {/* Utilities Sheet */}
      <UtilitySheet isOpen={showUtilities} onOpenChange={setShowUtilities} />
      
      {/* Existing Modals ... */}
      <UpdateMaxesModal isOpen={showMaxesModal} onClose={() => setShowMaxesModal(false)} />
      <WorkoutFeedbackModal
        weekNumber={feedbackModal.weekNumber}
        dayNumber={feedbackModal.dayNumber}
        sessionFocus={feedbackModal.sessionFocus}
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        onSubmit={handleSubmitFeedback}
      />
      <CheckInModal
        type={checkInModal.type}
        isOpen={checkInModal.isOpen}
        onClose={() => setCheckInModal({ ...checkInModal, isOpen: false })}
        onPerformCheckIn={handleCheckIn}
      />
      <ProgramSelectorModal
        isOpen={showProgramSelector}
        onClose={() => setShowProgramSelector(false)}
      />
      <AgentChatModal
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        profile={profile}
        currentProgramId={currentProgram.id}
      />
      
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50"
        onClick={() => setShowAgentChat(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

    </SidebarProvider>
  );
}