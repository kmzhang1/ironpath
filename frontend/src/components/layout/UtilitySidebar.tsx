import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { calculateOneRepMax, calculateWorkingWeight } from '@/utils/liftingMath';
import { X, Calculator, ArrowRight } from 'lucide-react';

export function UtilitySidebar() {
  const { isSidebarOpen, toggleSidebar } = useAppStore();

  const [rpeWeight, setRpeWeight] = useState<number>(100);
  const [rpeReps, setRpeReps] = useState<number>(5);
  const [rpeRPE, setRpeRPE] = useState<number>(8);
  const [estimated1RM, setEstimated1RM] = useState<number | null>(null);

  const [haveWeight, setHaveWeight] = useState<number>(100);
  const [haveReps, setHaveReps] = useState<number>(5);
  const [haveRPE, setHaveRPE] = useState<number>(8);
  const [wantReps] = useState<number>(5);
  const [wantRPE] = useState<number>(9);
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  const handleCalculateRPE = () => {
    const result = calculateOneRepMax(rpeWeight, rpeReps, rpeRPE);
    setEstimated1RM(result);
  };

  const handleCalculateHaveWant = () => {
    const estimated1RM = calculateOneRepMax(haveWeight, haveReps, haveRPE);
    const result = calculateWorkingWeight(estimated1RM, wantReps, wantRPE);
    setCalculatedWeight(result);
  };

  if (!isSidebarOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-[var(--card)] border-l border-[var(--border)] shadow-2xl overflow-y-auto z-50 transition-colors">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Utilities</h2>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* RPE Calculator */}
        <Card className="bg-[var(--card)]">
          <CardHeader className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[var(--primary)]" />
              <CardTitle className="text-sm">RPE Calculator</CardTitle>
            </div>
            <CardDescription className="text-xs">Estimate 1RM from weight + reps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="space-y-1.5">
              <Label htmlFor="rpe-weight" className="text-xs">Weight Lifted</Label>
              <Input
                id="rpe-weight"
                type="number"
                step="0.5"
                value={rpeWeight}
                onChange={(e) => setRpeWeight(parseFloat(e.target.value) || 0)}
                className="font-mono text-sm h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rpe-reps" className="text-xs">Reps Performed</Label>
              <Input
                id="rpe-reps"
                type="number"
                min="1"
                max="10"
                value={rpeReps}
                onChange={(e) => setRpeReps(parseInt(e.target.value) || 1)}
                className="font-mono text-sm h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rpe-rpe" className="text-xs">RPE (6-10)</Label>
              <select
                id="rpe-rpe"
                value={rpeRPE.toString()}
                onChange={(e) => setRpeRPE(parseFloat(e.target.value))}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="10">RPE 10</option>
                <option value="9.5">RPE 9.5</option>
                <option value="9">RPE 9</option>
                <option value="8.5">RPE 8.5</option>
                <option value="8">RPE 8</option>
                <option value="7.5">RPE 7.5</option>
                <option value="7">RPE 7</option>
                <option value="6.5">RPE 6.5</option>
                <option value="6">RPE 6</option>
              </select>
            </div>

            <Button onClick={handleCalculateRPE} className="w-full" size="sm">
              Calculate
            </Button>

            {estimated1RM !== null && (
              <div className="mt-3 p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-lg">
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Estimated 1RM</div>
                <div className="text-xl font-bold text-[var(--primary)] font-mono">{estimated1RM}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Have/Want RPE Calculator */}
        <Card className="bg-[var(--card)]">
          <CardHeader className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-[var(--primary)]" />
              <CardTitle className="text-sm">Have → Want</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {/* Have Section */}
            <div className="p-3 bg-[var(--secondary)] border border-[var(--border)] rounded-lg space-y-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                Current
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  value={haveWeight}
                  onChange={(e) => setHaveWeight(parseFloat(e.target.value) || 0)}
                  className="font-mono text-xs h-7 px-1 text-center"
                />
                <Input
                  type="number"
                  value={haveReps}
                  onChange={(e) => setHaveReps(parseInt(e.target.value) || 1)}
                  className="font-mono text-xs h-7 px-1 text-center"
                />
                <select
                  value={haveRPE.toString()}
                  onChange={(e) => setHaveRPE(parseFloat(e.target.value))}
                  className="flex h-7 w-full rounded-md border border-input bg-background px-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="9">@9</option>
                  <option value="8">@8</option>
                  <option value="7">@7</option>
                </select>
              </div>
            </div>

            <Button onClick={handleCalculateHaveWant} className="w-full" size="sm">
              Convert
            </Button>

            {calculatedWeight !== null && (
              <div className="p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-lg text-center">
                <div className="text-xl font-bold text-[var(--primary)] font-mono">
                  {calculatedWeight}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Target Weight
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}