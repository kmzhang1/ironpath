import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store';
import { calculateOneRepMax, calculateDOTS, calculateWorkingWeight } from '@/utils/liftingMath';
import { X, Calculator, Award, ArrowRight } from 'lucide-react';

export function UtilitySidebar() {
  const { isSidebarOpen, toggleSidebar } = useAppStore();

  // RPE Calculator State
  const [rpeWeight, setRpeWeight] = useState<number>(100);
  const [rpeReps, setRpeReps] = useState<number>(5);
  const [rpeRPE, setRpeRPE] = useState<number>(8);
  const [estimated1RM, setEstimated1RM] = useState<number | null>(null);

  // DOTS Calculator State
  const [dotsBodyweight, setDotsBodyweight] = useState<number>(75);
  const [dotsTotal, setDotsTotal] = useState<number>(450);
  const [dotsSex, setDotsSex] = useState<'male' | 'female'>('male');
  const [dotsUnit, setDotsUnit] = useState<'kg' | 'lbs'>('kg');
  const [dotsScore, setDotsScore] = useState<number | null>(null);

  // Have/Want RPE Calculator State
  const [haveWeight, setHaveWeight] = useState<number>(100);
  const [haveReps, setHaveReps] = useState<number>(5);
  const [haveRPE, setHaveRPE] = useState<number>(8);
  const [wantReps, setWantReps] = useState<number>(5);
  const [wantRPE, setWantRPE] = useState<number>(9);
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  const handleCalculateRPE = () => {
    const result = calculateOneRepMax(rpeWeight, rpeReps, rpeRPE);
    setEstimated1RM(result);
  };

  const handleCalculateDOTS = () => {
    const result = calculateDOTS(dotsBodyweight, dotsTotal, dotsSex, dotsUnit);
    setDotsScore(result);
  };

  const handleCalculateHaveWant = () => {
    // First, estimate 1RM from what they "have"
    const estimated1RM = calculateOneRepMax(haveWeight, haveReps, haveRPE);
    // Then calculate the weight for what they "want"
    const result = calculateWorkingWeight(estimated1RM, wantReps, wantRPE);
    setCalculatedWeight(result);
  };

  if (!isSidebarOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-50">Utilities</h2>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* RPE Calculator */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-lime-400" />
              <CardTitle className="text-base">RPE Calculator</CardTitle>
            </div>
            <CardDescription className="text-xs">Estimate 1RM from weight + reps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rpe-weight" className="text-xs">
                Weight Lifted
              </Label>
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
              <Label htmlFor="rpe-reps" className="text-xs">
                Reps Performed
              </Label>
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
              <Label htmlFor="rpe-rpe" className="text-xs">
                RPE (6-10)
              </Label>
              <Select
                id="rpe-rpe"
                value={rpeRPE.toString()}
                onChange={(e) => setRpeRPE(parseFloat(e.target.value))}
                className="text-sm h-8"
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
              </Select>
            </div>

            <Button onClick={handleCalculateRPE} className="w-full" size="sm">
              Calculate
            </Button>

            {estimated1RM !== null && (
              <div className="mt-3 p-3 bg-lime-400/10 border border-lime-400/20 rounded-md">
                <div className="text-xs text-zinc-400 mb-1">Estimated 1RM</div>
                <div className="text-xl font-bold text-lime-400 font-mono">{estimated1RM}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Have/Want RPE Calculator */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-lime-400" />
              <CardTitle className="text-base">Have → Want Calculator</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Convert weight from one rep/RPE to another
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Have Section */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
                Have (Current)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="have-weight" className="text-xs">
                    Weight
                  </Label>
                  <Input
                    id="have-weight"
                    type="number"
                    step="0.5"
                    value={haveWeight}
                    onChange={(e) => setHaveWeight(parseFloat(e.target.value) || 0)}
                    className="font-mono text-sm h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="have-reps" className="text-xs">
                    Reps
                  </Label>
                  <Input
                    id="have-reps"
                    type="number"
                    min="1"
                    max="10"
                    value={haveReps}
                    onChange={(e) => setHaveReps(parseInt(e.target.value) || 1)}
                    className="font-mono text-sm h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="have-rpe" className="text-xs">
                    RPE
                  </Label>
                  <Select
                    id="have-rpe"
                    value={haveRPE.toString()}
                    onChange={(e) => setHaveRPE(parseFloat(e.target.value))}
                    className="text-sm h-8"
                  >
                    <option value="10">10</option>
                    <option value="9.5">9.5</option>
                    <option value="9">9</option>
                    <option value="8.5">8.5</option>
                    <option value="8">8</option>
                    <option value="7.5">7.5</option>
                    <option value="7">7</option>
                    <option value="6.5">6.5</option>
                    <option value="6">6</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Want Section */}
            <div className="p-3 bg-lime-500/10 border border-lime-500/30 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-lime-400 uppercase tracking-wide">
                Want (Target)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="want-reps" className="text-xs">
                    Reps
                  </Label>
                  <Input
                    id="want-reps"
                    type="number"
                    min="1"
                    max="10"
                    value={wantReps}
                    onChange={(e) => setWantReps(parseInt(e.target.value) || 1)}
                    className="font-mono text-sm h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="want-rpe" className="text-xs">
                    RPE
                  </Label>
                  <Select
                    id="want-rpe"
                    value={wantRPE.toString()}
                    onChange={(e) => setWantRPE(parseFloat(e.target.value))}
                    className="text-sm h-8"
                  >
                    <option value="10">10</option>
                    <option value="9.5">9.5</option>
                    <option value="9">9</option>
                    <option value="8.5">8.5</option>
                    <option value="8">8</option>
                    <option value="7.5">7.5</option>
                    <option value="7">7</option>
                    <option value="6.5">6.5</option>
                    <option value="6">6</option>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={handleCalculateHaveWant} className="w-full" size="sm">
              Calculate Weight
            </Button>

            {calculatedWeight !== null && (
              <div className="mt-3 p-3 bg-lime-400/10 border border-lime-400/20 rounded-md">
                <div className="text-xs text-zinc-400 mb-1">Target Weight</div>
                <div className="text-xl font-bold text-lime-400 font-mono">
                  {calculatedWeight}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {wantReps} reps @ RPE {wantRPE}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DOTS Calculator */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-lime-400" />
              <CardTitle className="text-base">DOTS Calculator</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Compare lifters across weight classes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="dots-bodyweight" className="text-xs">
                  Bodyweight
                </Label>
                <Input
                  id="dots-bodyweight"
                  type="number"
                  step="0.1"
                  value={dotsBodyweight}
                  onChange={(e) => setDotsBodyweight(parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dots-unit" className="text-xs">
                  Unit
                </Label>
                <Select
                  id="dots-unit"
                  value={dotsUnit}
                  onChange={(e) => setDotsUnit(e.target.value as 'kg' | 'lbs')}
                  className="text-sm h-8"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dots-total" className="text-xs">
                Total (S+B+D)
              </Label>
              <Input
                id="dots-total"
                type="number"
                step="0.5"
                value={dotsTotal}
                onChange={(e) => setDotsTotal(parseFloat(e.target.value) || 0)}
                className="font-mono text-sm h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dots-sex" className="text-xs">
                Sex
              </Label>
              <Select
                id="dots-sex"
                value={dotsSex}
                onChange={(e) => setDotsSex(e.target.value as 'male' | 'female')}
                className="text-sm h-8"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </div>

            <Button onClick={handleCalculateDOTS} className="w-full" size="sm">
              Calculate
            </Button>

            {dotsScore !== null && (
              <div className="mt-3 p-3 bg-lime-400/10 border border-lime-400/20 rounded-md">
                <div className="text-xs text-zinc-400 mb-1">DOTS Score</div>
                <div className="text-xl font-bold text-lime-400 font-mono">{dotsScore}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {dotsScore >= 500
                    ? 'Elite'
                    : dotsScore >= 400
                    ? 'Advanced'
                    : dotsScore >= 300
                    ? 'Intermediate'
                    : 'Novice'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
