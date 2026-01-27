import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useAppStore } from '@/store';
import { generateProgram, saveProgram } from '@/services/api';
import { Sparkles, Loader2, Target } from 'lucide-react';
import type { ProgramGenerationRequest, LifterProfile } from '@/types';

const programSchema = z.object({
  goal: z.enum(['peaking', 'hypertrophy', 'strength_block'], {
    required_error: 'Please select a training goal',
  }),
  weeks: z.number().min(4).max(16),
  daysPerWeek: z.number().min(3).max(6),
  minutesPerWorkout: z.number().min(30).max(120),
  methodologyId: z.string().optional(),
  limitations: z.string().optional(),
  focusAreas: z.string().optional(),
  // 1RM Goals (optional)
  squatGoal: z.number().optional(),
  benchGoal: z.number().optional(),
  deadliftGoal: z.number().optional(),
});

type ProgramFormValues = z.infer<typeof programSchema>;

const METHODOLOGY_DESCRIPTIONS = {
  linear: 'Progressive overload with consistent rep ranges. Best for beginners building foundational strength.',
  conjugate: 'Westside Barbell method with max effort and dynamic effort days. For advanced lifters.',
  dupe: 'Daily Undulating Periodization - vary intensity and volume each session for optimal adaptation.',
  block: 'Block Periodization - separate phases for accumulation, intensification, and peaking.',
};

export function ProgramSetup() {
  const navigate = useNavigate();
  const { profile, addProgram } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      goal: 'strength_block',
      weeks: 8,
      daysPerWeek: 4,
      minutesPerWorkout: 60,
      methodologyId: '',
      limitations: '',
      focusAreas: '',
      squatGoal: profile?.oneRepMax.squat,
      benchGoal: profile?.oneRepMax.bench,
      deadliftGoal: profile?.oneRepMax.deadlift,
    },
  });

  if (!profile) {
    navigate('/profile-setup');
    return null;
  }

  const onSubmit = async (data: ProgramFormValues) => {
    setIsGenerating(true);
    try {
      // Update profile with methodology if provided
      const updatedProfile: LifterProfile = {
        ...profile,
        methodologyId: data.methodologyId || profile.methodologyId,
      };

      const request: ProgramGenerationRequest = {
        goal: data.goal,
        weeks: data.weeks,
        daysPerWeek: data.daysPerWeek,
        minutesPerWorkout: data.minutesPerWorkout,
        limitations: data.limitations ? data.limitations.split(',').map(s => s.trim()) : [],
        focusAreas: data.focusAreas ? data.focusAreas.split(',').map(s => s.trim()) : [],
      };

      const program = await generateProgram(request, updatedProfile);
      addProgram(program);
      await saveProgram(program);
      navigate('/dashboard');
    } catch (error) {
      console.error('Program generation error:', error);
      alert('Failed to generate program. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Your Program</h1>
          <p className="text-sm text-muted-foreground">
            Customize your training program to match your goals
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Program Configuration</CardTitle>
            <CardDescription>
              Configure your training parameters for optimal results
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                {/* 1RM Goals */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">1RM Goals (Optional)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Set target 1 rep maxes to aim for by the end of this program
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="squatGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Squat Goal</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              placeholder={`Current: ${profile.oneRepMax.squat}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="benchGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bench Goal</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              placeholder={`Current: ${profile.oneRepMax.bench}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deadliftGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadlift Goal</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              placeholder={`Current: ${profile.oneRepMax.deadlift}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Main Lifting Goal */}
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Lifting Goal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your main goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="strength_block">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Strength</span>
                              <span className="text-xs text-muted-foreground">
                                Build maximal strength with lower reps
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="hypertrophy">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Hypertrophy</span>
                              <span className="text-xs text-muted-foreground">
                                Build muscle mass with moderate reps
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="peaking">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Peaking</span>
                              <span className="text-xs text-muted-foreground">
                                Peak for competition with heavy singles
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Program Duration and Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weeks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Duration</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="4">4 Weeks</SelectItem>
                            <SelectItem value="6">6 Weeks</SelectItem>
                            <SelectItem value="8">8 Weeks</SelectItem>
                            <SelectItem value="12">12 Weeks</SelectItem>
                            <SelectItem value="16">16 Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="daysPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days Per Week</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="4">4 Days</SelectItem>
                            <SelectItem value="5">5 Days</SelectItem>
                            <SelectItem value="6">6 Days</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Minutes Per Workout */}
                <FormField
                  control={form.control}
                  name="minutesPerWorkout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutes Per Workout</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="75">75 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                          <SelectItem value="120">120 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Training Methodology */}
                <FormField
                  control={form.control}
                  name="methodologyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Methodology (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Let AI decide based on your profile" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="linear">
                            <div className="flex flex-col items-start py-1">
                              <span className="font-medium">Linear Progression</span>
                              <span className="text-xs text-muted-foreground max-w-[300px]">
                                {METHODOLOGY_DESCRIPTIONS.linear}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="conjugate">
                            <div className="flex flex-col items-start py-1">
                              <span className="font-medium">Conjugate Method</span>
                              <span className="text-xs text-muted-foreground max-w-[300px]">
                                {METHODOLOGY_DESCRIPTIONS.conjugate}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="dupe">
                            <div className="flex flex-col items-start py-1">
                              <span className="font-medium">Daily Undulating Periodization</span>
                              <span className="text-xs text-muted-foreground max-w-[300px]">
                                {METHODOLOGY_DESCRIPTIONS.dupe}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="block">
                            <div className="flex flex-col items-start py-1">
                              <span className="font-medium">Block Periodization</span>
                              <span className="text-xs text-muted-foreground max-w-[300px]">
                                {METHODOLOGY_DESCRIPTIONS.block}
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        If not specified, AI will select the best methodology for your experience level
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Limitations */}
                <FormField
                  control={form.control}
                  name="limitations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limitations (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., shoulder injury, no squats below parallel"
                        />
                      </FormControl>
                      <FormDescription>
                        Separate multiple limitations with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Focus Areas */}
                <FormField
                  control={form.control}
                  name="focusAreas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Areas (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., lockout strength, leg drive, speed off chest"
                        />
                      </FormControl>
                      <FormDescription>
                        Separate multiple focus areas with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <div className="text-center">
                      <h3 className="text-sm font-semibold">Ready to Generate</h3>
                      <p className="text-xs text-muted-foreground">
                        Your personalized program will be created using AI
                      </p>
                    </div>
                  </div>

                  <Button type="submit" disabled={isGenerating} className="w-full" size="lg">
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Your Program...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Program
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
