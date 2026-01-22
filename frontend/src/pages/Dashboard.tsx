import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EditableExerciseTable } from '@/components/ui/EditableExerciseTable';
import { UpdateMaxesModal } from '@/components/ui/UpdateMaxesModal';
import { WorkoutFeedbackModal } from '@/components/ui/WorkoutFeedbackModal';
import { CheckInModal } from '@/components/ui/CheckInModal';
import { DatePicker } from '@/components/ui/DatePicker';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { Profile } from './Profile';
import { useAppStore } from '@/store';
import { UtilitySidebar } from '@/components/layout/UtilitySidebar';
import { generateExcelLog } from '@/utils/excelExport';
import { submitWorkoutFeedback, performCheckIn } from '@/services/api';
import { Dumbbell, MessageSquare, BookOpen } from 'lucide-react';
import type { FeedbackCategory } from '@/types';
import { ProgramSelectorModal } from '@/components/ui/ProgramSelectorModal';
import { AgentChatModal } from '@/components/ui/AgentChatModal';

export function Dashboard() {
  const navigate = useNavigate();
  const {
    currentProgram,
    profile,
    reset,
    toggleSidebar,
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
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    weekNumber: number;
    dayNumber: number;
    sessionFocus: string;
  }>({ isOpen: false, weekNumber: 0, dayNumber: 0, sessionFocus: '' });
  const [checkInModal, setCheckInModal] = useState<{
    isOpen: boolean;
    type: 'daily' | 'weekly';
  }>({ isOpen: false, type: 'daily' });
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const [showAgentChat, setShowAgentChat] = useState(false);

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

  const handleNavigate = (tab: 'dashboard' | 'profile' | 'checkin-daily' | 'checkin-weekly') => {
    if (tab === 'checkin-daily') {
      setCheckInModal({ isOpen: true, type: 'daily' });
    } else if (tab === 'checkin-weekly') {
      setCheckInModal({ isOpen: true, type: 'weekly' });
    } else {
      setActiveTab(tab);
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
      currentProgram
    );
    storeFeedback(feedback);
    alert(`Workout adjusted! ${feedback.suggestedAdjustment}`);
  };

  const handleCheckIn = async (type: 'daily' | 'weekly') => {
    const analysis = await performCheckIn(type, progressHistory, currentProgram);
    addCheckIn(analysis);
    return analysis;
  };

  const total = profile.oneRepMax.squat + profile.oneRepMax.bench + profile.oneRepMax.deadlift;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left Sidebar */}
      <LeftSidebar
        onNavigate={handleNavigate}
        onExport={handleExport}
        onUpdateMaxes={() => setShowMaxesModal(true)}
        onUtilities={toggleSidebar}
        onLogout={handleLogout}
        currentTab={activeTab}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        {/* Simple Header */}
        <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-400 rounded-lg flex items-center justify-center lg:hidden">
                <Dumbbell className="w-6 h-6 text-zinc-950" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-50">
                  {activeTab === 'profile' ? 'Profile' : currentProgram.title}
                </h1>
              </div>
            </div>
            {activeTab === 'dashboard' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProgramSelector(true)}
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Switch Program
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="px-6 py-8">
          {activeTab === 'profile' ? (
            <Profile />
          ) : (
            <>
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
            <Card className="card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
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

            <Card className="card-hover animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-3">
                <CardDescription>Squat 1RM</CardDescription>
                <CardTitle className="text-xl font-mono text-lime-400">
                  {profile.oneRepMax.squat} {profile.biometrics.unit}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-hover animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="pb-3">
                <CardDescription>Bench 1RM</CardDescription>
                <CardTitle className="text-xl font-mono text-lime-400">
                  {profile.oneRepMax.bench} {profile.biometrics.unit}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-hover animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <CardHeader className="pb-3">
                <CardDescription>Deadlift 1RM</CardDescription>
                <CardTitle className="text-xl font-mono text-lime-400">
                  {profile.oneRepMax.deadlift} {profile.biometrics.unit}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-lime-400/5 border-lime-400/20 card-hover animate-slide-up" style={{ animationDelay: '0.5s' }}>
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
                {week.sessions.map((session, idx) => {
                  const sessionProgress = getSessionProgress(week.weekNumber, session.dayNumber);
                  const scheduledDate = getScheduledDate(week.weekNumber, session.dayNumber);

                  return (
                    <Card key={idx} className="card-hover animate-fade-in">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle>Day {session.dayNumber}</CardTitle>
                            <CardDescription>{session.focus}</CardDescription>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-zinc-400 font-mono">
                              {session.exercises.length} exercises
                            </div>
                          </div>
                        </div>

                        {/* Date Picker and Feedback Button */}
                        <div className="flex gap-3 mt-4">
                          <DatePicker
                            value={scheduledDate}
                            onChange={(date) => scheduleWorkout(week.weekNumber, session.dayNumber, date)}
                            label="Schedule Date"
                            className="flex-1"
                          />
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenFeedback(week.weekNumber, session.dayNumber, session.focus)}
                              className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Provide Feedback
                            </Button>
                          </div>
                        </div>

                        {/* Show feedback if exists */}
                        {sessionProgress?.feedback && (
                          <div className="mt-4 p-3 bg-lime-500/10 border border-lime-500/30 rounded-lg">
                            <p className="text-xs text-lime-400 font-semibold mb-1">
                              Feedback Received:
                            </p>
                            <p className="text-sm text-zinc-300">
                              {sessionProgress.feedback.suggestedAdjustment}
                            </p>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <EditableExerciseTable
                          weekNumber={week.weekNumber}
                          dayNumber={session.dayNumber}
                          exercises={session.exercises}
                          sessionCompleted={sessionProgress?.completed}
                          onCompleteSession={() => completeSession(week.weekNumber, session.dayNumber)}
                        />

                        {/* Quick Emoji Feedback */}
                        {!sessionProgress?.completed && (
                          <div className="pt-4 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-zinc-400">How's this session feeling?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    alert('Session marked as "Too Easy". Future adjustments will increase intensity.');
                                  }}
                                  className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm flex items-center gap-2"
                                  title="Too Easy - Increase intensity next time"
                                >
                                  <span className="text-xl">🔥</span>
                                  <span>Too Easy</span>
                                </button>
                                <button
                                  onClick={() => {
                                    alert('Session marked as "Just Right". Keep it up!');
                                  }}
                                  className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm flex items-center gap-2"
                                  title="Just Right - Perfect intensity"
                                >
                                  <span className="text-xl">👍</span>
                                  <span>Just Right</span>
                                </button>
                                <button
                                  onClick={() => {
                                    alert('Session marked as "Too Hard". Future adjustments will reduce intensity.');
                                  }}
                                  className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm flex items-center gap-2"
                                  title="Too Hard - Reduce intensity next time"
                                >
                                  <span className="text-xl">💩</span>
                                  <span>Too Hard</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                              Quick feedback helps adjust future workouts. For detailed feedback, use "Provide Feedback" above.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
            </>
          )}
        </div>
      </main>

      {/* Utility Sidebar */}
      <UtilitySidebar />

      {/* Update Maxes Modal */}
      <UpdateMaxesModal isOpen={showMaxesModal} onClose={() => setShowMaxesModal(false)} />

      {/* Workout Feedback Modal */}
      <WorkoutFeedbackModal
        weekNumber={feedbackModal.weekNumber}
        dayNumber={feedbackModal.dayNumber}
        sessionFocus={feedbackModal.sessionFocus}
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        onSubmit={handleSubmitFeedback}
      />

      {/* Check-In Modal */}
      <CheckInModal
        type={checkInModal.type}
        isOpen={checkInModal.isOpen}
        onClose={() => setCheckInModal({ ...checkInModal, isOpen: false })}
        onPerformCheckIn={handleCheckIn}
      />

      {/* Program Selector Modal */}
      <ProgramSelectorModal
        isOpen={showProgramSelector}
        onClose={() => setShowProgramSelector(false)}
      />

      {/* Agent Chat Modal */}
      <AgentChatModal
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        profile={profile}
        currentProgramId={currentProgram.id}
      />

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowAgentChat(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-lime-400 hover:bg-lime-500 text-zinc-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
        aria-label="Open coach chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
}
