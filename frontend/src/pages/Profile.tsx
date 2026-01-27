import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { profile, updateOneRepMax, updateBiometrics, updateProfileName, progressHistory, currentProgram } = useAppStore();

  const [isEditingMaxes, setIsEditingMaxes] = useState(false);
  const [editedMaxes, setEditedMaxes] = useState({
    squat: profile?.oneRepMax.squat || 0,
    bench: profile?.oneRepMax.bench || 0,
    deadlift: profile?.oneRepMax.deadlift || 0,
  });

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editedPersonal, setEditedPersonal] = useState({
    name: profile?.name || '',
    age: profile?.biometrics.age || 0,
    bodyweight: profile?.biometrics.bodyweight || 0,
    sex: profile?.biometrics.sex || 'male' as 'male' | 'female',
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
        <p className="text-[#6B7280] font-normal">No profile data available</p>
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

  const handleSavePersonal = () => {
    if (editedPersonal.name !== profile.name) {
      updateProfileName(editedPersonal.name);
    }
    if (editedPersonal.age !== profile.biometrics.age ||
        editedPersonal.bodyweight !== profile.biometrics.bodyweight ||
        editedPersonal.sex !== profile.biometrics.sex) {
      updateBiometrics({
        age: editedPersonal.age,
        bodyweight: editedPersonal.bodyweight,
        sex: editedPersonal.sex,
      });
    }
    setIsEditingPersonal(false);
  };

  const handleCancelPersonalEdit = () => {
    setEditedPersonal({
      name: profile.name,
      age: profile.biometrics.age,
      bodyweight: profile.biometrics.bodyweight,
      sex: profile.biometrics.sex,
    });
    setIsEditingPersonal(false);
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
        <h1 className="text-2xl font-semibold text-[#1A1A1A] flex items-center gap-3 tracking-tight">
          <User className="text-[#1A1A1A]" size={28} />
          Athlete Profile
        </h1>
        <p className="text-[#6B7280] font-normal mt-1 text-sm">
          Manage your personal information and track your progress
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
                <User size={18} className="text-[#1A1A1A]" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-sm font-normal text-[#6B7280]">Your basic athlete details</CardDescription>
            </div>
            {!isEditingPersonal ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingPersonal(true)}
              >
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelPersonalEdit}
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSavePersonal}
                >
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Name</Label>
              {isEditingPersonal ? (
                <Input
                  id="name"
                  value={editedPersonal.name}
                  onChange={(e) => setEditedPersonal({ ...editedPersonal, name: e.target.value })}
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 px-4 py-2.5 bg-white rounded-lg text-[#1A1A1A] text-sm font-normal border border-[#D1D5DB]">
                  {profile.name}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              {isEditingPersonal ? (
                <Input
                  id="age"
                  type="number"
                  value={editedPersonal.age}
                  onChange={(e) => setEditedPersonal({ ...editedPersonal, age: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 px-4 py-2.5 bg-white rounded-lg text-[#1A1A1A] text-sm font-normal border border-[#D1D5DB]">
                  {profile.biometrics.age} years
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="bodyweight">Bodyweight</Label>
              {isEditingPersonal ? (
                <Input
                  id="bodyweight"
                  type="number"
                  step="0.1"
                  value={editedPersonal.bodyweight}
                  onChange={(e) => setEditedPersonal({ ...editedPersonal, bodyweight: parseFloat(e.target.value) || 0 })}
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 px-4 py-2.5 bg-white rounded-lg text-[#1A1A1A] text-sm font-normal border border-[#D1D5DB]">
                  {profile.biometrics.bodyweight} {unit}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="sex">Sex</Label>
              {isEditingPersonal ? (
                <select
                  id="sex"
                  value={editedPersonal.sex}
                  onChange={(e) => setEditedPersonal({ ...editedPersonal, sex: e.target.value as 'male' | 'female' })}
                  className="mt-2"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <div className="mt-2 px-4 py-2.5 bg-white rounded-lg text-[#1A1A1A] text-sm font-normal border border-[#D1D5DB] capitalize">
                  {profile.biometrics.sex}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One Rep Maxes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
                <TrendingUp size={18} className="text-[#1A1A1A]" />
                One Rep Maxes (1RM)
              </CardTitle>
              <CardDescription className="text-sm font-normal text-[#6B7280]">Your current strength levels</CardDescription>
            </div>
            {!isEditingMaxes ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMaxes(true)}
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
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveMaxes}
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
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 px-4 py-3 bg-white rounded-xl border border-[#D1D5DB]">
                  <p className="text-xl font-semibold text-[#1A1A1A]">
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
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 px-4 py-3 bg-white rounded-xl border border-[#D1D5DB]">
                  <p className="text-xl font-semibold text-[#1A1A1A]">
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
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 px-4 py-3 bg-white rounded-xl border border-[#D1D5DB]">
                  <p className="text-xl font-semibold text-[#1A1A1A]">
                    {profile.oneRepMax.deadlift} {unit}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 p-4 bg-white border border-[#D1D5DB] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#059669]">Total</p>
                <p className="text-2xl font-semibold text-[#1A1A1A] mt-1">
                  {isEditingMaxes
                    ? editedMaxes.squat + editedMaxes.bench + editedMaxes.deadlift
                    : total}{' '}
                  {unit}
                </p>
              </div>
              {hasRMHistory && totalChange !== 0 && !isEditingMaxes && (
                <div className="text-right">
                  <p className="text-xs font-normal text-[#6B7280]">Change from last update</p>
                  <p
                    className={`text-lg font-semibold ${
                      totalChange > 0 ? 'text-[#059669]' : 'text-[#DC2626]'
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
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
            <Activity size={18} className="text-[#1A1A1A]" />
            Training Statistics
          </CardTitle>
          <CardDescription className="text-sm font-normal text-[#6B7280]">Your progress and activity summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Sessions */}
            <div className="p-4 bg-white rounded-xl border border-[#D1D5DB]">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-[#2563EB]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Total Sessions</p>
              </div>
              <p className="text-2xl font-semibold text-[#1A1A1A]">{totalSessions}</p>
            </div>

            {/* Completed Sessions */}
            <div className="p-4 bg-white rounded-xl border border-[#D1D5DB]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-[#10B981]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Completed</p>
              </div>
              <p className="text-2xl font-semibold text-[#10B981]">
                {completedSessions}
              </p>
            </div>

            {/* Adherence Rate */}
            <div className="p-4 bg-white rounded-xl border border-[#D1D5DB]">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-[#7C3AED]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Adherence</p>
              </div>
              <p className="text-2xl font-semibold text-[#7C3AED]">
                {adherenceRate.toFixed(0)}%
              </p>
            </div>

            {/* Check-ins */}
            <div className="p-4 bg-white rounded-xl border border-[#D1D5DB]">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-[#CA8A04]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Check-ins</p>
              </div>
              <p className="text-2xl font-semibold text-[#CA8A04]">
                {totalCheckIns}
              </p>
            </div>

            {/* Feedback Submitted */}
            <div className="p-4 bg-white rounded-xl border border-[#D1D5DB]">
              <div className="flex items-center gap-2 mb-2">
                <Award size={16} className="text-[#EA580C]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Feedback</p>
              </div>
              <p className="text-2xl font-semibold text-[#EA580C]">
                {feedbackCount}
              </p>
            </div>

            {/* Current Program */}
            {currentProgram && (
              <div className="p-4 bg-white rounded-xl border border-[#D1D5DB] col-span-2 md:col-span-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-[#1A1A1A]" />
                  <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Current Program</p>
                </div>
                <p className="text-base font-semibold text-[#1A1A1A]">
                  {currentProgram.title}
                </p>
                <p className="text-sm font-normal text-[#6B7280] mt-1">
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
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
              <TrendingUp size={18} className="text-[#1A1A1A]" />
              1RM History
            </CardTitle>
            <CardDescription className="text-sm font-normal text-[#6B7280]">Track your strength progression over time</CardDescription>
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
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#D1D5DB]"
                    >
                      <div>
                        <p className="text-sm font-normal text-[#6B7280]">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <span className="text-[#6B7280] font-normal">
                          Squat: <span className="text-[#1A1A1A] font-medium">{entry.squat}</span>
                        </span>
                        <span className="text-[#6B7280] font-normal">
                          Bench: <span className="text-[#1A1A1A] font-medium">{entry.bench}</span>
                        </span>
                        <span className="text-[#6B7280] font-normal">
                          Deadlift: <span className="text-[#1A1A1A] font-medium">{entry.deadlift}</span>
                        </span>
                        <span className="text-[#1A1A1A] font-semibold">
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
