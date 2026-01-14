import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { useAppStore } from '@/store';
import { X, TrendingUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateMaxesModal({ isOpen, onClose }: Props) {
  const { profile, updateOneRepMax } = useAppStore();
  const [squat, setSquat] = useState(profile?.oneRepMax.squat || 0);
  const [bench, setBench] = useState(profile?.oneRepMax.bench || 0);
  const [deadlift, setDeadlift] = useState(profile?.oneRepMax.deadlift || 0);

  if (!isOpen || !profile) return null;

  const handleSave = () => {
    if (squat !== profile.oneRepMax.squat) {
      updateOneRepMax('squat', squat);
    }
    if (bench !== profile.oneRepMax.bench) {
      updateOneRepMax('bench', bench);
    }
    if (deadlift !== profile.oneRepMax.deadlift) {
      updateOneRepMax('deadlift', deadlift);
    }
    onClose();
  };

  const totalChange =
    (squat + bench + deadlift) -
    (profile.oneRepMax.squat + profile.oneRepMax.bench + profile.oneRepMax.deadlift);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-lime-400" />
              <CardTitle>Update 1RM Maxes</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Update your one-rep maxes to recalculate all working weights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="squat">Squat 1RM ({profile.biometrics.unit})</Label>
            <div className="flex items-center gap-2">
              <Input
                id="squat"
                type="number"
                step="0.5"
                value={squat}
                onChange={(e) => setSquat(parseFloat(e.target.value))}
                className="font-mono"
              />
              {squat !== profile.oneRepMax.squat && (
                <span className="text-xs text-lime-400">
                  {squat > profile.oneRepMax.squat ? '+' : ''}
                  {(squat - profile.oneRepMax.squat).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bench">Bench Press 1RM ({profile.biometrics.unit})</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bench"
                type="number"
                step="0.5"
                value={bench}
                onChange={(e) => setBench(parseFloat(e.target.value))}
                className="font-mono"
              />
              {bench !== profile.oneRepMax.bench && (
                <span className="text-xs text-lime-400">
                  {bench > profile.oneRepMax.bench ? '+' : ''}
                  {(bench - profile.oneRepMax.bench).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadlift">Deadlift 1RM ({profile.biometrics.unit})</Label>
            <div className="flex items-center gap-2">
              <Input
                id="deadlift"
                type="number"
                step="0.5"
                value={deadlift}
                onChange={(e) => setDeadlift(parseFloat(e.target.value))}
                className="font-mono"
              />
              {deadlift !== profile.oneRepMax.deadlift && (
                <span className="text-xs text-lime-400">
                  {deadlift > profile.oneRepMax.deadlift ? '+' : ''}
                  {(deadlift - profile.oneRepMax.deadlift).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {totalChange !== 0 && (
            <div className="p-3 bg-lime-400/10 border border-lime-400/20 rounded-md">
              <div className="text-sm text-zinc-300">
                New Total: {(squat + bench + deadlift).toFixed(1)} {profile.biometrics.unit}
              </div>
              <div className="text-xs text-lime-400 mt-1">
                {totalChange > 0 ? '+' : ''}
                {totalChange.toFixed(1)} {profile.biometrics.unit} change
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
