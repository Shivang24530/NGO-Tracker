'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { formatISO, addMonths, getYear } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { MapPin, Camera, Trash2, PlusCircle, Loader2, Users, Home, Phone, ArrowRight } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { FollowUpVisit } from '@/lib/types';

const childSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  age: z.coerce.number().min(0, 'Age cannot be negative').max(25),
  gender: z.enum(['Male', 'Female', 'Other']),
  studyingStatus: z.enum(['Studying', 'Not Studying', 'Migrated']).default('Not Studying'),
  currentClass: z.string().optional(),
  schoolName: z.string().optional(),
});

const formSchema = z.object({
  // Step 1
  familyName: z.string().min(3, 'Family name is required.'),
  fullAddress: z.string().min(10, 'Full address is required.'),
  locationArea: z.string().min(3, 'Location area is required.'),
  primaryContact: z
    .string()
    .min(10, 'A valid contact number is required.')
    .regex(/^[+]?[0-9]+$/, 'Contact number can only contain digits and an optional leading "+".'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // Step 2
  children: z.array(childSchema),

  // Step 3
  familyPhotoUrl: z.string().optional(),
  housePhotoUrl: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: 'Household Info', fields: ['familyName', 'fullAddress', 'locationArea', 'primaryContact'] as const },
  { id: 2, title: 'Children Details', fields: ['children'] as const },
  { id: 3, title: 'Photos', fields: [] as const },
];

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center w-full max-w-md mx-auto mb-12">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors',
                currentStep >= step.id ? 'bg-primary' : 'bg-gray-300'
              )}
            >
              {step.id}
            </div>
            <p className={cn('mt-2 text-sm', currentStep >= step.id ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              {step.title}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-4', currentStep > step.id ? 'bg-primary' : 'bg-gray-300')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}


export function RegisterHouseholdForm() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [isLocating, setIsLocating] = useState(false);
  const [isCapturing, setIsCapturing] = useState<'family' | 'house' | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      familyName: '',
      fullAddress: '',
      locationArea: '',
      primaryContact: '',
      children: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'children',
  });
  
  const { watch, setValue } = form;
  const familyPhotoUrl = watch('familyPhotoUrl');
  const housePhotoUrl = watch('housePhotoUrl');


  const handleNext = async () => {
    const currentStepFields = steps[step - 1].fields;
    const isValid = await form.trigger(currentStepFields);
    if (isValid) {
      if (step < steps.length) {
        setStep((s) => s + 1);
      } else {
        // Final step, trigger submission
        await form.handleSubmit(onSubmit)();
      }
    }
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleGetLocation = () => {
    setIsLocating(true);
    // Simulate Capacitor Geolocation API call
    setTimeout(() => {
      setValue('latitude', 28.7041, { shouldValidate: true });
      setValue('longitude', 77.1025, { shouldValidate: true });
      setIsLocating(false);
      toast({
        title: 'Location Captured',
        description: 'GPS coordinates have been successfully fetched.',
      });
    }, 1500);
  };
  
  const handleCapturePhoto = (type: 'family' | 'house') => {
    setIsCapturing(type);
    // Simulate Capacitor Camera API call
    setTimeout(() => {
        const photoUrl = type === 'family' ? placeholderImages.placeholderImages.find(p => p.id === "family-photo-1")?.imageUrl : placeholderImages.placeholderImages.find(p => p.id === "house-photo-1")?.imageUrl
        if (photoUrl) {
            setValue(type === 'family' ? 'familyPhotoUrl' : 'housePhotoUrl', photoUrl, { shouldValidate: true });
        }
        setIsCapturing(null);
        toast({
            title: 'Photo Captured',
            description: `The ${type} photo has been saved.`,
        });
    }, 2000);
  };


  async function onSubmit(values: FormData) {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to register a family.",
        });
        return;
    }

    try {
        const batch = writeBatch(firestore);
        
        // Use user's UID for the household ID to enforce ownership
        const householdRef = doc(firestore, 'households', user.uid);

        const newHouseholdData = {
          id: user.uid, // Household ID is the user's UID
          familyName: values.familyName,
          fullAddress: values.fullAddress,
          locationArea: values.locationArea,
          primaryContact: values.primaryContact,
          status: 'Active' as const,
          nextFollowupDue: formatISO(addMonths(new Date(), 3)),
          latitude: values.latitude || 28.7041,
          longitude: values.longitude || 77.1025,
          familyPhotoUrl: values.familyPhotoUrl || 'https://picsum.photos/seed/h-new/600/400',
          housePhotoUrl: values.housePhotoUrl || 'https://picsum.photos/seed/h-new-house/600/400',
          toiletAvailable: false,
          waterSupply: 'Other' as const,
          electricity: false,
          annualIncome: 0,
        };

        batch.set(householdRef, newHouseholdData);

        values.children.forEach(child => {
            const childRef = doc(collection(householdRef, 'children'));
            batch.set(childRef, {
                id: childRef.id,
                householdId: user.uid,
                name: child.name,
                age: child.age,
                gender: child.gender,
                isStudying: child.studyingStatus === 'Studying',
                currentClass: child.currentClass || 'N/A',
                schoolName: child.schoolName || 'N/A',
            });
        });
        
        // Create the 4 quarterly visits for the current year
        const visitsColRef = collection(householdRef, 'followUpVisits');
        const year = getYear(new Date());

        for (let qNum = 1; qNum <= 4; qNum++) {
            const quarterDate = new Date(year, (qNum - 1) * 3 + 1, 15); // Mid of the second month of the quarter
            const newVisitRef = doc(visitsColRef);
            const newVisitData: Omit<FollowUpVisit, 'childProgressUpdates'> = {
                id: newVisitRef.id,
                householdId: user.uid,
                visitDate: formatISO(quarterDate),
                visitType: qNum === 4 ? 'Annual' : 'Quarterly',
                status: 'Pending',
                visitedBy: '',
                notes: '',
            };
            batch.set(newVisitRef, newVisitData);
        }


        await batch.commit();

        toast({
            title: 'Registration Complete!',
            description: `The ${values.familyName} has been added to the system.`,
        });
        router.push('/dashboard');
    } catch (error) {
        console.error("Error registering family:", error);
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "An error occurred while saving the data. Please try again.",
        });
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <FormField name="familyName" control={form.control} render={({ field }) => <FormItem><FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" />Family Name *</FormLabel><FormControl><Input placeholder="e.g., Kumar Family" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField name="fullAddress" control={form.control} render={({ field }) => <FormItem><FormLabel className="flex items-center"><Home className="mr-2 h-4 w-4 text-primary" />Full Address *</FormLabel><FormControl><Input placeholder="Complete address with landmarks" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField name="locationArea" control={form.control} render={({ field }) => <FormItem><FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Location/Area *</FormLabel><FormControl><Input placeholder="e.g., Sector 15, Dharavi" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormItem>
              <FormLabel className="flex items-center">GPS Location</FormLabel>
              <div className="flex items-center gap-4">
                 <Input readOnly value={form.watch('latitude') ? `${form.watch('latitude')}, ${form.watch('longitude')}`: ''} placeholder="GPS coordinates will appear here" />
                 <Button type="button" variant="outline" onClick={handleGetLocation} disabled={isLocating}>
                  {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  {isLocating ? 'Fetching...' : 'Get Current Location'}
                </Button>
              </div>
            </FormItem>
            <FormField name="primaryContact" control={form.control} render={({ field }) => <FormItem><FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-primary" />Primary Contact Number *</FormLabel><FormControl><Input placeholder="10-digit mobile number" {...field} /></FormControl><FormMessage /></FormItem>} />
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-lg space-y-4 relative bg-secondary/30">
                 <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`children.${index}.name`} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`children.${index}.age`} render={({ field }) => <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`children.${index}.gender`} render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                 </div>
                 <FormField
                  control={form.control}
                  name={`children.${index}.studyingStatus`}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Child Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Studying" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Studying
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Not Studying" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Not Studying
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Migrated" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Migrated
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {watch(`children.${index}.studyingStatus`) === 'Studying' && (
                     <div className="grid md:grid-cols-2 gap-4">
                         <FormField control={form.control} name={`children.${index}.currentClass`} render={({ field }) => <FormItem><FormLabel>Current Class</FormLabel><FormControl><Input placeholder="e.g., 2nd Class" {...field} /></FormControl><FormMessage /></FormItem>} />
                         <FormField control={form.control} name={`children.${index}.schoolName`} render={({ field }) => <FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="e.g., Local Public School" {...field} /></FormControl><FormMessage /></FormItem>} />
                     </div>
                 )}
                 <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({ name: '', age: 0, gender: 'Male', studyingStatus: 'Not Studying', currentClass: '', schoolName: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Child</Button>
          </div>
        );
      case 3:
        return (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <FormLabel>Family Photo</FormLabel>
                {familyPhotoUrl ? <Image src={familyPhotoUrl} alt="Family" width={600} height={400} className="rounded-lg border aspect-video object-cover" data-ai-hint="family portrait"/> : <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center text-muted-foreground bg-secondary/30">No photo</div>}
                <Button type="button" variant="outline" className="w-full" onClick={() => handleCapturePhoto('family')} disabled={isCapturing === 'family'}>
                    {isCapturing === 'family' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isCapturing === 'family' ? 'Capturing...' : familyPhotoUrl ? 'Retake Family Photo' : 'Capture Family Photo'}
                </Button>
              </div>
              <div className="space-y-2">
                <FormLabel>House Photo</FormLabel>
                {housePhotoUrl ? <Image src={housePhotoUrl} alt="House" width={600} height={400} className="rounded-lg border aspect-video object-cover" data-ai-hint="modest house" /> : <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center text-muted-foreground bg-secondary/30">No photo</div>}
                <Button type="button" variant="outline" className="w-full" onClick={() => handleCapturePhoto('house')} disabled={isCapturing === 'house'}>
                    {isCapturing === 'house' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isCapturing === 'house' ? 'Capturing...' : housePhotoUrl ? 'Retake House Photo' : 'Capture House Photo'}
                </Button>
              </div>
            </div>
        );
      default:
        return null;
    }
  }

  const stepTitles = ["Household Information", "Children Details", "Photos"];
  const stepDescriptions = [
      "Enter the basic details of the family", 
      "Add details for each child in the household", 
      "Upload photos of the family and their house"
    ];
  const nextButtonLabels = ["Next: Add Children", "Next: Add Photos", "Complete Registration"];

  return (
    <Form {...form}>
       <Stepper currentStep={step} />
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Home className="h-6 w-6 text-primary"/>
                    <CardTitle className="font-headline text-xl">{stepTitles[step-1]}</CardTitle>
                </div>
                <CardDescription>{stepDescriptions[step-1]}</CardDescription>
            </CardHeader>
            <CardContent>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {renderStepContent()}

                    <div className="flex justify-between mt-12">
                        {step > 1 ? (
                            <Button type="button" variant="secondary" onClick={handleBack}>Back</Button>
                        ) : <div></div>}
                        
                        <Button type="button" onClick={handleNext} className="ml-auto">
                            {step < steps.length ? (
                                <>
                                {nextButtonLabels[step - 1]} <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            ) : (
                                nextButtonLabels[step - 1]
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </Form>
  );
}
