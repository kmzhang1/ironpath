import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { useAppStore } from '@/store';
import { generateProgram, saveProgram } from '@/services/api';
import { ChevronLeft, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import type { LifterProfile, ProgramGenerationRequest } from '@/types';

// Validation schemas
const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bodyweight: z.number().positive('Bodyweight must be positive'),
  unit: z.enum(['kg', 'lbs']),
  sex: z.enum(['male', 'female']),
  age: z.number().min(13).max(100),
});

const step2Schema = z.object({
  squat: z.number().positive('Squat 1RM must be positive'),
  bench: z.number().positive('Bench 1RM must be positive'),
  deadlift: z.number().positive('Deadlift 1RM must be positive'),
});

const step3Schema = z.object({
  goal: z.enum(['peaking', 'hypertrophy', 'strength_block']),
  weeks: z.number().min(4).max(16),
  daysPerWeek: z.number().min(2).max(6),
  minutesPerWorkout: z.number().min(30).max(120),
});

const step4Schema = z.object({
  limitations: z.array(z.string()),
  focusAreas: z.array(z.string()),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

export function Wizard() {
  const navigate = useNavigate();
  const { user, programs, setProfile, addProgram } = useAppStore();
  const hasExistingPrograms = programs.length > 0;

  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [step1Data, setStep1Data] = useState<Partial<Step1Data>>({
    unit: 'lbs',
    sex: 'male',
  });
  const [step2Data, setStep2Data] = useState<Partial<Step2Data>>({});
  const [step3Data, setStep3Data] = useState<Partial<Step3Data>>({
    goal: 'strength_block',
    weeks: 8,
    daysPerWeek: 4,
    minutesPerWorkout: 60,
  });
  const [step4Data, setStep4Data] = useState<Step4Data>({
    limitations: [],
    focusAreas: [],
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    setErrors({});

    try {
      if (step === 1) {
        step1Schema.parse(step1Data);
      } else if (step === 2) {
        step2Schema.parse(step2Data);
      } else if (step === 3) {
        step3Schema.parse(step3Data);
      } else if (step === 4) {
        step4Schema.parse(step4Data);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err: any) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    if (!validateStep(4)) return;

    setIsGenerating(true);

    try {
      // Build profile
      const profile: LifterProfile = {
        id: user?.id || 'profile_' + Math.random().toString(36).substr(2, 9),
        name: step1Data.name!,
        biometrics: {
          bodyweight: step1Data.bodyweight!,
          unit: step1Data.unit!,
          sex: step1Data.sex!,
          age: step1Data.age!,
        },
        oneRepMax: {
          squat: step2Data.squat!,
          bench: step2Data.bench!,
          deadlift: step2Data.deadlift!,
        },
      };

      // Build request
      const request: ProgramGenerationRequest = {
        goal: step3Data.goal!,
        weeks: step3Data.weeks!,
        daysPerWeek: step3Data.daysPerWeek!,
        minutesPerWorkout: step3Data.minutesPerWorkout!,
        limitations: step4Data.limitations,
        focusAreas: step4Data.focusAreas,
      };

      // Generate program (3-second delay simulated)
      const program = await generateProgram(request, profile);

      // Save to store
      setProfile(profile);
      addProgram(program);

      // Save to backend (mock)
      await saveProgram(program);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Program generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to generate program: ${errorMessage}\n\nPlease check the console for details.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Exit button - only show if user has existing programs */}
        {hasExistingPrograms && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              disabled={isGenerating}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="mr-2 h-4 w-4" />
              Exit
            </Button>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-400 font-mono">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={step1Data.name || ''}
                  onChange={(e) => setStep1Data({ ...step1Data, name: e.target.value })}
                  placeholder="John Powerlifter"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bodyweight">Bodyweight</Label>
                  <Input
                    id="bodyweight"
                    type="number"
                    step="0.1"
                    value={step1Data.bodyweight || ''}
                    onChange={(e) =>
                      setStep1Data({ ...step1Data, bodyweight: parseFloat(e.target.value) })
                    }
                    placeholder="75"
                  />
                  {errors.bodyweight && <p className="text-xs text-red-500">{errors.bodyweight}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    id="unit"
                    value={step1Data.unit}
                    onChange={(e) =>
                      setStep1Data({ ...step1Data, unit: e.target.value as 'kg' | 'lbs' })
                    }
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="lbs">Pounds (lbs)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sex">Sex</Label>
                  <Select
                    id="sex"
                    value={step1Data.sex}
                    onChange={(e) =>
                      setStep1Data({ ...step1Data, sex: e.target.value as 'male' | 'female' })
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={step1Data.age || ''}
                    onChange={(e) => setStep1Data({ ...step1Data, age: parseInt(e.target.value) })}
                    placeholder="25"
                  />
                  {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>One-Rep Maxes</CardTitle>
              <CardDescription>
                Enter your current or estimated 1RMs in {step1Data.unit}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="squat">Squat 1RM ({step1Data.unit})</Label>
                <Input
                  id="squat"
                  type="number"
                  step="0.5"
                  value={step2Data.squat || ''}
                  onChange={(e) => setStep2Data({ ...step2Data, squat: parseFloat(e.target.value) })}
                  placeholder="150"
                  className="font-mono"
                />
                {errors.squat && <p className="text-xs text-red-500">{errors.squat}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bench">Bench Press 1RM ({step1Data.unit})</Label>
                <Input
                  id="bench"
                  type="number"
                  step="0.5"
                  value={step2Data.bench || ''}
                  onChange={(e) => setStep2Data({ ...step2Data, bench: parseFloat(e.target.value) })}
                  placeholder="100"
                  className="font-mono"
                />
                {errors.bench && <p className="text-xs text-red-500">{errors.bench}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadlift">Deadlift 1RM ({step1Data.unit})</Label>
                <Input
                  id="deadlift"
                  type="number"
                  step="0.5"
                  value={step2Data.deadlift || ''}
                  onChange={(e) =>
                    setStep2Data({ ...step2Data, deadlift: parseFloat(e.target.value) })
                  }
                  placeholder="180"
                  className="font-mono"
                />
                {errors.deadlift && <p className="text-xs text-red-500">{errors.deadlift}</p>}
              </div>

              {step2Data.squat && step2Data.bench && step2Data.deadlift && (
                <div className="mt-4 p-4 bg-zinc-800 rounded-md">
                  <div className="text-sm text-zinc-400 mb-1">Total</div>
                  <div className="text-2xl font-bold text-lime-400 font-mono">
                    {(step2Data.squat + step2Data.bench + step2Data.deadlift).toFixed(1)}{' '}
                    {step1Data.unit}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>Program Parameters</CardTitle>
              <CardDescription>Configure your training cycle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Training Goal</Label>
                <Select
                  id="goal"
                  value={step3Data.goal}
                  onChange={(e) =>
                    setStep3Data({
                      ...step3Data,
                      goal: e.target.value as 'peaking' | 'hypertrophy' | 'strength_block',
                    })
                  }
                >
                  <option value="strength_block">Strength Development</option>
                  <option value="hypertrophy">Hypertrophy (Muscle Growth)</option>
                  <option value="peaking">Competition Peaking</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeks">Program Length (weeks)</Label>
                <Select
                  id="weeks"
                  value={step3Data.weeks?.toString()}
                  onChange={(e) => setStep3Data({ ...step3Data, weeks: parseInt(e.target.value) })}
                >
                  <option value="4">4 weeks</option>
                  <option value="6">6 weeks</option>
                  <option value="8">8 weeks</option>
                  <option value="12">12 weeks</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysPerWeek">Training Days per Week</Label>
                <Select
                  id="daysPerWeek"
                  value={step3Data.daysPerWeek?.toString()}
                  onChange={(e) =>
                    setStep3Data({ ...step3Data, daysPerWeek: parseInt(e.target.value) })
                  }
                >
                  <option value="2">2 days</option>
                  <option value="3">3 days</option>
                  <option value="4">4 days</option>
                  <option value="5">5 days</option>
                  <option value="6">6 days</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minutesPerWorkout">Time per Workout</Label>
                <Select
                  id="minutesPerWorkout"
                  value={step3Data.minutesPerWorkout?.toString()}
                  onChange={(e) =>
                    setStep3Data({ ...step3Data, minutesPerWorkout: parseInt(e.target.value) })
                  }
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="75">75 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </Select>
              </div>

              <div className="mt-4 p-4 bg-zinc-800 rounded-md text-sm space-y-1">
                <div className="text-zinc-400">Summary</div>
                <div className="text-zinc-50">
                  {step3Data.weeks}-week{' '}
                  {step3Data.goal === 'peaking'
                    ? 'competition peak'
                    : step3Data.goal === 'hypertrophy'
                    ? 'hypertrophy block'
                    : 'strength block'}
                </div>
                <div className="text-zinc-400">
                  {step3Data.daysPerWeek} training days per week, {step3Data.minutesPerWorkout} min each
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>Help us customize your program (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="limitations">Injury Limitations or Restrictions</Label>
                <Input
                  id="limitations"
                  value={step4Data.limitations.join(', ')}
                  onChange={(e) =>
                    setStep4Data({
                      ...step4Data,
                      limitations: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  placeholder="e.g., Low back pain, shoulder impingement"
                />
                <p className="text-xs text-zinc-500">Separate multiple items with commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focusAreas">Focus Areas or Weaknesses</Label>
                <Input
                  id="focusAreas"
                  value={step4Data.focusAreas.join(', ')}
                  onChange={(e) =>
                    setStep4Data({
                      ...step4Data,
                      focusAreas: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  placeholder="e.g., Lockout strength, leg drive"
                />
                <p className="text-xs text-zinc-500">Separate multiple items with commas</p>
              </div>

              <div className="mt-4 p-4 bg-lime-400/10 border border-lime-400/20 rounded-md text-sm">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-lime-400 mt-0.5 shrink-0" />
                  <div className="text-zinc-300">
                    Ready to generate your program! Our AI will create a customized {step3Data.weeks}
                    -week program tailored to your profile.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isGenerating}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Program
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
