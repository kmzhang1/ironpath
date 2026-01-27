import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store';
import { generateProgram, saveProgram } from '@/services/api';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import type { LifterProfile, ProgramGenerationRequest } from '@/types';

// Combined Schema
const wizardSchema = z.object({
  // Step 1
  name: z.string().min(2, 'Name required'),
  bodyweight: z.number().positive(),
  unit: z.enum(['kg', 'lbs']),
  sex: z.enum(['male', 'female']),
  age: z.number().min(13),
  // Step 2
  squat: z.number().min(0),
  bench: z.number().min(0),
  deadlift: z.number().min(0),
  // Step 3
  goal: z.enum(['peaking', 'hypertrophy', 'strength_block']),
  weeks: z.number(),
  daysPerWeek: z.number(),
  minutesPerWorkout: z.number(),
  // Step 3.5
  trainingAge: z.enum(['novice', 'intermediate', 'advanced']),
  methodologyId: z.string(),
  equipmentAccess: z.enum(['garage', 'commercial', 'hardcore']),
  weakPoints: z.array(z.string()).default([]),
  // Step 4
  limitations: z.string().optional(), // simplified input
  focusAreas: z.string().optional(),
});

type WizardFormValues = z.infer<typeof wizardSchema>;

export function Wizard() {
  const navigate = useNavigate();
  const { user, setProfile, addProgram } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      name: '',
      bodyweight: 0,
      unit: 'lbs',
      sex: 'male',
      age: 0,
      squat: 0,
      bench: 0,
      deadlift: 0,
      goal: 'strength_block',
      weeks: 8,
      daysPerWeek: 4,
      minutesPerWorkout: 60,
      trainingAge: 'intermediate',
      methodologyId: '',
      equipmentAccess: 'commercial',
      weakPoints: [],
    },
    mode: "onChange"
  });

  const { trigger } = form;

  const handleNext = async () => {
    if (currentStep === 1) await trigger(['name', 'bodyweight', 'age']);
    if (currentStep === 2) await trigger(['squat', 'bench', 'deadlift']);
    if (currentStep === 3) await trigger(['goal']);
    if (currentStep === 4) await trigger(['methodologyId']); // etc

    // Simplified validation check for this example
    if (currentStep < 5) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const onSubmit = async (data: WizardFormValues) => {
    setIsGenerating(true);
    try {
      const profile: LifterProfile = {
        id: user?.id || 'new_profile',
        name: data.name,
        biometrics: {
          bodyweight: data.bodyweight,
          unit: data.unit,
          sex: data.sex,
          age: data.age,
        },
        oneRepMax: { squat: data.squat, bench: data.bench, deadlift: data.deadlift },
        trainingAge: data.trainingAge,
        weakPoints: data.weakPoints,
        equipmentAccess: data.equipmentAccess,
        methodologyId: data.methodologyId
      };

      const request: ProgramGenerationRequest = {
        goal: data.goal,
        weeks: data.weeks,
        daysPerWeek: data.daysPerWeek,
        minutesPerWorkout: data.minutesPerWorkout,
        limitations: data.limitations ? data.limitations.split(',') : [],
        focusAreas: data.focusAreas ? data.focusAreas.split(',') : [],
      };

      const program = await generateProgram(request, profile);
      setProfile(profile);
      addProgram(program);
      await saveProgram(program);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>Program Setup</CardTitle>
            <span className="text-sm text-muted-foreground">Step {currentStep} of 5</span>
          </div>
          <Progress value={(currentStep / 5) * 100} className="h-2" />
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 py-6">
              {/* Step 1: Basics */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="bodyweight" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bodyweight</FormLabel>
                        <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="unit" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="lbs">Lbs</SelectItem>
                            <SelectItem value="kg">Kg</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="age" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sex" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Step 2: Strength */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <FormField control={form.control} name="squat" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Squat 1RM</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="bench" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bench 1RM</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="deadlift" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadlift 1RM</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Step 3: Parameters */}
              {currentStep === 3 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <FormField control={form.control} name="goal" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="strength_block">Strength</SelectItem>
                            <SelectItem value="peaking">Peaking</SelectItem>
                            <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="weeks" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Weeks)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="4">4 Weeks</SelectItem>
                              <SelectItem value="8">8 Weeks</SelectItem>
                              <SelectItem value="12">12 Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="daysPerWeek" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days Per Week</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="3">3 Days</SelectItem>
                              <SelectItem value="4">4 Days</SelectItem>
                              <SelectItem value="5">5 Days</SelectItem>
                              <SelectItem value="6">6 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="minutesPerWorkout" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minutes Per Workout</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="75">75 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                 </div>
              )}

              {/* Step 4: Experience & Equipment */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <FormField control={form.control} name="trainingAge" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Experience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="novice">Novice (&lt;1 year)</SelectItem>
                          <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                          <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="equipmentAccess" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Access</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="garage">Home/Garage Gym</SelectItem>
                          <SelectItem value="commercial">Commercial Gym</SelectItem>
                          <SelectItem value="hardcore">Hardcore/Powerlifting Gym</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="methodologyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Methodology</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a methodology" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="linear">Linear Progression</SelectItem>
                          <SelectItem value="conjugate">Conjugate Method</SelectItem>
                          <SelectItem value="dupe">DUP (Daily Undulating Periodization)</SelectItem>
                          <SelectItem value="block">Block Periodization</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Step 5: Customization */}
              {currentStep === 5 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <FormField control={form.control} name="limitations" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limitations (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., shoulder injury, no deadlifts"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Separate multiple limitations with commas</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="focusAreas" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Focus Areas (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., lockout strength, leg drive"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Separate multiple focus areas with commas</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="text-center py-4 border-t mt-6">
                      <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-medium">Ready to Generate</h3>
                      <p className="text-muted-foreground">Review your inputs and create your program.</p>
                    </div>
                 </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 1}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              {currentStep < 5 ? (
                <Button type="button" onClick={handleNext}>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Program
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}