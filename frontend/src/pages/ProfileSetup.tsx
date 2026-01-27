import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAppStore } from '@/store';
import { Dumbbell, Loader2 } from 'lucide-react';
import type { LifterProfile } from '@/types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  bodyweight: z.number().positive('Bodyweight must be positive'),
  unit: z.enum(['kg', 'lbs']),
  sex: z.enum(['male', 'female']),
  age: z.number().min(13, 'Age must be at least 13').max(120, 'Age must be valid'),
  squat: z.number().min(0, 'Squat 1RM must be non-negative'),
  bench: z.number().min(0, 'Bench 1RM must be non-negative'),
  deadlift: z.number().min(0, 'Deadlift 1RM must be non-negative'),
  trainingAge: z.enum(['novice', 'intermediate', 'advanced']),
  equipmentAccess: z.enum(['garage', 'commercial', 'hardcore']),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSetup() {
  const navigate = useNavigate();
  const { user, setProfile } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bodyweight: 0,
      unit: 'lbs',
      sex: 'male',
      age: 25,
      squat: 0,
      bench: 0,
      deadlift: 0,
      trainingAge: 'intermediate',
      equipmentAccess: 'commercial',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const profile: LifterProfile = {
        id: user?.id || 'profile_' + Date.now(),
        name: data.name,
        biometrics: {
          bodyweight: data.bodyweight,
          unit: data.unit,
          sex: data.sex,
          age: data.age,
        },
        oneRepMax: {
          squat: data.squat,
          bench: data.bench,
          deadlift: data.deadlift,
        },
        trainingAge: data.trainingAge,
        equipmentAccess: data.equipmentAccess,
      };

      // Save profile to store
      setProfile(profile);

      // Save to backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/profiles/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          profile,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile setup error:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to IronPath</h1>
          <p className="text-sm text-muted-foreground">Let's set up your profile to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Setup</CardTitle>
            <CardDescription>Tell us about yourself and your training</CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Basic Information</h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bodyweight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bodyweight</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              placeholder="185"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="lbs">Lbs</SelectItem>
                              <SelectItem value="kg">Kg</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value))}
                              placeholder="25"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sex</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* One Rep Maxes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Current 1 Rep Maxes</h3>

                  <FormField
                    control={form.control}
                    name="squat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Squat 1RM</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            placeholder="315"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bench"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bench Press 1RM</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            placeholder="225"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadlift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadlift 1RM</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            placeholder="405"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Training Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Training Information</h3>

                  <FormField
                    control={form.control}
                    name="trainingAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Training Experience</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="novice">Novice (&lt;1 year)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                            <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="equipmentAccess"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Access</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="garage">Home/Garage Gym</SelectItem>
                            <SelectItem value="commercial">Commercial Gym</SelectItem>
                            <SelectItem value="hardcore">Hardcore/Powerlifting Gym</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Profile Setup
                </Button>
              </CardContent>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
