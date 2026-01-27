import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/store';
import { TrendingUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateMaxesModal({ isOpen, onClose }: Props) {
  const { profile, updateOneRepMax } = useAppStore();
  const [squat, setSquat] = useState(profile?.oneRepMax.squat || 0);
  const [bench, setBench] = useState(profile?.oneRepMax.bench || 0);
  const [deadlift, setDeadlift] = useState(profile?.oneRepMax.deadlift || 0);

  if (!profile) return null;

  const handleSave = () => {
    if (squat !== profile.oneRepMax.squat) updateOneRepMax('squat', squat);
    if (bench !== profile.oneRepMax.bench) updateOneRepMax('bench', bench);
    if (deadlift !== profile.oneRepMax.deadlift) updateOneRepMax('deadlift', deadlift);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Update 1RMs
          </DialogTitle>
          <DialogDescription>
            Update your one-rep maxes to recalculate all working weights.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="squat" className="text-right">Squat</Label>
            <Input id="squat" type="number" value={squat} onChange={(e) => setSquat(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bench" className="text-right">Bench</Label>
            <Input id="bench" type="number" value={bench} onChange={(e) => setBench(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deadlift" className="text-right">Deadlift</Label>
            <Input id="deadlift" type="number" value={deadlift} onChange={(e) => setDeadlift(parseFloat(e.target.value))} className="col-span-3" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}