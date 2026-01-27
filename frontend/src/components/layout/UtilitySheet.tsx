import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { calculateOneRepMax, calculateWorkingWeight } from '@/utils/liftingMath';
import { Calculator, ArrowRight } from 'lucide-react';

interface UtilitySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UtilitySheet({ isOpen, onOpenChange }: UtilitySheetProps) {
  const [rpeWeight, setRpeWeight] = useState<number>(100);
  const [rpeReps, setRpeReps] = useState<number>(5);
  const [rpeRPE, setRpeRPE] = useState<string>("8");
  const [estimated1RM, setEstimated1RM] = useState<number | null>(null);

  const [haveWeight, setHaveWeight] = useState<number>(100);
  const [haveReps, setHaveReps] = useState<number>(5);
  const [haveRPE, setHaveRPE] = useState<string>("8");
  const [wantReps] = useState<number>(5);
  const [wantRPE] = useState<number>(9);
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  const handleCalculateRPE = () => {
    const result = calculateOneRepMax(rpeWeight, rpeReps, parseFloat(rpeRPE));
    setEstimated1RM(result);
  };

  const handleCalculateHaveWant = () => {
    const estimated1RM = calculateOneRepMax(haveWeight, haveReps, parseFloat(haveRPE));
    const result = calculateWorkingWeight(estimated1RM, wantReps, wantRPE);
    setCalculatedWeight(result);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[340px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lifting Utilities</SheetTitle>
          <SheetDescription>
            Quick calculators for RPE and weight conversions.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* RPE Calculator */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">RPE Calculator</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rpe-weight" className="text-xs">Weight</Label>
                  <Input
                    id="rpe-weight"
                    type="number"
                    value={rpeWeight}
                    onChange={(e) => setRpeWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rpe-reps" className="text-xs">Reps</Label>
                  <Input
                    id="rpe-reps"
                    type="number"
                    value={rpeReps}
                    onChange={(e) => setRpeReps(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rpe-rpe" className="text-xs">RPE</Label>
                <Select value={rpeRPE} onValueChange={setRpeRPE}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'].map(val => (
                      <SelectItem key={val} value={val}>RPE {val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCalculateRPE} className="w-full" size="sm">
                Calculate 1RM
              </Button>

              {estimated1RM !== null && (
                <div className="p-3 bg-muted rounded-md text-center">
                  <span className="text-xs text-muted-foreground block">Estimated 1RM</span>
                  <span className="text-xl font-mono font-bold text-primary">{estimated1RM}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Have/Want Calculator */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Have → Want</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-3 p-3 border rounded-lg bg-secondary/20">
                <Label className="text-xs text-muted-foreground uppercase">Current Lift</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={haveWeight} 
                    onChange={(e) => setHaveWeight(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                    placeholder="Wgt"
                  />
                  <Input 
                    type="number" 
                    value={haveReps} 
                    onChange={(e) => setHaveReps(parseInt(e.target.value) || 1)}
                    className="h-8 text-xs w-16"
                    placeholder="Reps"
                  />
                  <Select value={haveRPE} onValueChange={setHaveRPE}>
                    <SelectTrigger className="h-8 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       {['6', '7', '8', '9', '10'].map(val => (
                        <SelectItem key={val} value={val}>@{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCalculateHaveWant} className="w-full" size="sm">
                Convert to Target
              </Button>

              {calculatedWeight !== null && (
                <div className="p-3 bg-muted rounded-md text-center">
                   <span className="text-xs text-muted-foreground block">Target Weight</span>
                  <span className="text-xl font-mono font-bold text-primary">{calculatedWeight}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}