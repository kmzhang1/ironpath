import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAppStore } from '@/store';
import {
  User,
  TrendingUp,
  CheckCircle,
  Calendar,
  Zap,
  Award,
  Target,
  Activity,
  Edit2,
  Save,
  X,
} from 'lucide-react';

export function Profile() {
  const { profile, updateOneRepMax, progressHistory, currentProgram } = useAppStore();

  const [isEditingMaxes, setIsEditingMaxes] = useState(false);
  const [editedMaxes, setEditedMaxes] = useState({
    squat: profile?.oneRepMax.squat || 0,
    bench: profile?.oneRepMax.bench || 0,
    deadlift: profile?.oneRepMax.deadlift || 0,
  });

  useEffect(() => {
    if (profile) {
      setEditedMaxes({
        squat: profile.oneRepMax.squat,
        bench: profile.oneRepMax.bench,
        deadlift: profile.oneRepMax.deadlift,
      });
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-400">No profile data available</p>
      </div>
    );
  }

  const handleSaveMaxes = () => {
    if (editedMaxes.squat !== profile.oneRepMax.squat) {
      updateOneRepMax('squat', editedMaxes.squat);
    }
    if (editedMaxes.bench !== profile.oneRepMax.bench) {
      updateOneRepMax('bench', editedMaxes.bench);
    }
    if (editedMaxes.deadlift !== profile.oneRepMax.deadlift) {
      updateOneRepMax('deadlift', editedMaxes.deadlift);
    }
    setIsEditingMaxes(false);
  };

  const handleCancelEdit = () => {
    setEditedMaxes({
      squat: profile.oneRepMax.squat,
      bench: profile.oneRepMax.bench,
      deadlift: profile.oneRepMax.deadlift,
    });
    setIsEditingMaxes(false);
  };

  // Calculate statistics
  const totalSessions = progressHistory?.sessions.length || 0;
  const completedSessions = progressHistory?.sessions.filter(s => s.completed).length || 0;
  const adherenceRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  const totalCheckIns = progressHistory?.checkIns.length || 0;
  const feedbackCount = progressHistory?.sessions.filter(s => s.feedback).length || 0;

  const total = profile.oneRepMax.squat + profile.oneRepMax.bench + profile.oneRepMax.deadlift;
  const unit = profile.biometrics.unit;

  // Get recent 1RM history
  const rmHistory = progressHistory?.oneRepMaxHistory || [];
  const hasRMHistory = rmHistory.length > 1;

  let previousTotal = 0;
  let totalChange = 0;
  if (hasRMHistory && rmHistory.length >= 2) {
    const previous = rmHistory[rmHistory.length - 2];
    previousTotal = previous.squat + previous.bench + previous.deadlift;
    totalChange = total - previousTotal;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50 flex items-center gap-3">
          <User className="text-lime-400" size={32} />
          Athlete Profile
        </h1>
        <p className="text-zinc-400 mt-1">
          Manage your personal information and track your progress
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={20} className="text-lime-400" />
            Personal Information
          </CardTitle>
          <CardDescription>Your basic athlete details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Name</Label>
              <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg text-zinc-200">
                {profile.name}
              </div>
            </div>
            <div>
              <Label>Age</Label>
              <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg text-zinc-200">
                {profile.biometrics.age} years
              </div>
            </div>
            <div>
              <Label>Bodyweight</Label>
              <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg text-zinc-200">
                {profile.biometrics.bodyweight} {unit}
              </div>
            </div>
            <div>
              <Label>Sex</Label>
              <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg text-zinc-200 capitalize">
                {profile.biometrics.sex}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One Rep Maxes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-lime-400" />
                One Rep Maxes (1RM)
              </CardTitle>
              <CardDescription>Your current strength levels</CardDescription>
            </div>
            {!isEditingMaxes ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMaxes(true)}
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="border-zinc-600 text-zinc-400"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveMaxes}
                  className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                >
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Squat */}
            <div>
              <Label htmlFor="squat">Squat</Label>
              {isEditingMaxes ? (
                <Input
                  id="squat"
                  type="number"
                  value={editedMaxes.squat}
                  onChange={(e) =>
                    setEditedMaxes({ ...editedMaxes, squat: Number(e.target.value) })
                  }
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg">
                  <p className="text-2xl font-mono font-bold text-lime-400">
                    {profile.oneRepMax.squat} {unit}
                  </p>
                </div>
              )}
            </div>

            {/* Bench */}
            <div>
              <Label htmlFor="bench">Bench Press</Label>
              {isEditingMaxes ? (
                <Input
                  id="bench"
                  type="number"
                  value={editedMaxes.bench}
                  onChange={(e) =>
                    setEditedMaxes({ ...editedMaxes, bench: Number(e.target.value) })
                  }
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg">
                  <p className="text-2xl font-mono font-bold text-lime-400">
                    {profile.oneRepMax.bench} {unit}
                  </p>
                </div>
              )}
            </div>

            {/* Deadlift */}
            <div>
              <Label htmlFor="deadlift">Deadlift</Label>
              {isEditingMaxes ? (
                <Input
                  id="deadlift"
                  type="number"
                  value={editedMaxes.deadlift}
                  onChange={(e) =>
                    setEditedMaxes({ ...editedMaxes, deadlift: Number(e.target.value) })
                  }
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 px-4 py-2 bg-zinc-800 rounded-lg">
                  <p className="text-2xl font-mono font-bold text-lime-400">
                    {profile.oneRepMax.deadlift} {unit}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 p-4 bg-lime-500/10 border border-lime-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-lime-400 font-semibold">Total</p>
                <p className="text-3xl font-mono font-bold text-lime-400 mt-1">
                  {isEditingMaxes
                    ? editedMaxes.squat + editedMaxes.bench + editedMaxes.deadlift
                    : total}{' '}
                  {unit}
                </p>
              </div>
              {hasRMHistory && totalChange !== 0 && !isEditingMaxes && (
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Change from last update</p>
                  <p
                    className={`text-xl font-mono font-bold ${
                      totalChange > 0 ? 'text-lime-400' : 'text-red-400'
                    }`}
                  >
                    {totalChange > 0 ? '+' : ''}
                    {totalChange.toFixed(1)} {unit}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} className="text-lime-400" />
            Training Statistics
          </CardTitle>
          <CardDescription>Your progress and activity summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Sessions */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-blue-400" />
                <p className="text-xs text-zinc-500 uppercase">Total Sessions</p>
              </div>
              <p className="text-3xl font-bold font-mono text-zinc-200">{totalSessions}</p>
            </div>

            {/* Completed Sessions */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-lime-400" />
                <p className="text-xs text-zinc-500 uppercase">Completed</p>
              </div>
              <p className="text-3xl font-bold font-mono text-lime-400">
                {completedSessions}
              </p>
            </div>

            {/* Adherence Rate */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-purple-400" />
                <p className="text-xs text-zinc-500 uppercase">Adherence</p>
              </div>
              <p className="text-3xl font-bold font-mono text-purple-400">
                {adherenceRate.toFixed(0)}%
              </p>
            </div>

            {/* Check-ins */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-yellow-400" />
                <p className="text-xs text-zinc-500 uppercase">Check-ins</p>
              </div>
              <p className="text-3xl font-bold font-mono text-yellow-400">
                {totalCheckIns}
              </p>
            </div>

            {/* Feedback Submitted */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-orange-400" />
                <p className="text-xs text-zinc-500 uppercase">Feedback</p>
              </div>
              <p className="text-3xl font-bold font-mono text-orange-400">
                {feedbackCount}
              </p>
            </div>

            {/* Current Program */}
            {currentProgram && (
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 col-span-2 md:col-span-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-lime-400" />
                  <p className="text-xs text-zinc-500 uppercase">Current Program</p>
                </div>
                <p className="text-lg font-semibold text-zinc-200">
                  {currentProgram.title}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  {currentProgram.weeks.length} weeks •{' '}
                  Created {new Date(currentProgram.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 1RM History */}
      {rmHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-lime-400" />
              1RM History
            </CardTitle>
            <CardDescription>Track your strength progression over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rmHistory
                .slice()
                .reverse()
                .map((entry, idx) => {
                  const entryTotal = entry.squat + entry.bench + entry.deadlift;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <div>
                        <p className="text-sm text-zinc-400">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-6 text-sm font-mono">
                        <span className="text-zinc-400">
                          Squat: <span className="text-zinc-200">{entry.squat}</span>
                        </span>
                        <span className="text-zinc-400">
                          Bench: <span className="text-zinc-200">{entry.bench}</span>
                        </span>
                        <span className="text-zinc-400">
                          Deadlift: <span className="text-zinc-200">{entry.deadlift}</span>
                        </span>
                        <span className="text-lime-400 font-bold">
                          Total: {entryTotal} {unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
