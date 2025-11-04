'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
import { MapPin, Camera, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { Progress } from './ui/progress';

const childSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  age: z.coerce.number().min(0).max(25),
  gender: z.enum(['Male', 'Female', 'Other']),
  isStudying: z.boolean().default(false),
  currentClass: z.string().optional(),
  schoolName: z.string().optional(),
});

const formSchema = z.object({
  // Step 1
  familyName: z.string().min(3, 'Family name is required.'),
  fullAddress: z.string().min(10, 'Full address is required.'),
  locationArea: z.string().min(3, 'Location area is required.'),
  primaryContact: z.string().min(3, 'Primary contact name is required.'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // Step 2
  children: z.array(childSchema),

  // Step 3
  familyPhotoUrl: z.string().optional(),
  housePhotoUrl: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function RegisterHouseholdForm() {
  const router = useRouter();
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
    let fieldsToValidate: (keyof FormData)[] = [];
    if (step === 1) fieldsToValidate = ['familyName', 'fullAddress', 'locationArea', 'primaryContact'];
    if (step === 2) fieldsToValidate = ['children'];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep((s) => s + 1);
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


  function onSubmit(values: FormData) {
    console.log(values);
    toast({
      title: 'Registration Complete!',
      description: `The ${values.familyName} has been added to the system.`,
    });
    router.push('/dashboard');
  }
  
  const progressValue = (step / 3) * 100;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Progress value={progressValue} className="mb-8" />
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium font-headline">Step 1: Household Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <FormField name="familyName" render={({ field }) => <FormItem><FormLabel>Family Name</FormLabel><FormControl><Input placeholder="e.g., Sharma Family" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField name="primaryContact" render={({ field }) => <FormItem><FormLabel>Primary Contact Name</FormLabel><FormControl><Input placeholder="e.g., Raj Sharma" {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <FormField name="fullAddress" render={({ field }) => <FormItem><FormLabel>Full Address</FormLabel><FormControl><Input placeholder="e.g., 123 B-Block, Wazirpur" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField name="locationArea" render={({ field }) => <FormItem><FormLabel>Location / Area</FormLabel><FormControl><Input placeholder="e.g., Wazirpur" {...field} /></FormControl><FormMessage /></FormItem>} />
            <Button type="button" variant="outline" onClick={handleGetLocation} disabled={isLocating}>
              {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
              {isLocating ? 'Fetching...' : 'Get Current Location'}
            </Button>
            {form.watch('latitude') && <FormDescription>GPS captured: {form.watch('latitude')}, {form.watch('longitude')}</FormDescription>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium font-headline">Step 2: Children Details</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-lg space-y-4 relative">
                 <div className="grid md:grid-cols-3 gap-4">
                    <FormField name={`children.${index}.name`} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField name={`children.${index}.age`} render={({ field }) => <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField name={`children.${index}.gender`} render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                 </div>
                 <FormField name={`children.${index}.isStudying`} render={({ field }) => <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Is the child studying?</FormLabel></FormItem>} />
                 {watch(`children.${index}.isStudying`) && (
                     <div className="grid md:grid-cols-2 gap-4">
                         <FormField name={`children.${index}.currentClass`} render={({ field }) => <FormItem><FormLabel>Current Class</FormLabel><FormControl><Input placeholder="e.g., 2nd Class" {...field} /></FormControl><FormMessage /></FormItem>} />
                         <FormField name={`children.${index}.schoolName`} render={({ field }) => <FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="e.g., Local Public School" {...field} /></FormControl><FormMessage /></FormItem>} />
                     </div>
                 )}
                 <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({ name: '', age: 0, gender: 'Male', isStudying: false })}><PlusCircle className="mr-2 h-4 w-4" />Add Child</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium font-headline">Step 3: Photos</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <FormLabel>Family Photo</FormLabel>
                {familyPhotoUrl ? <Image src={familyPhotoUrl} alt="Family" width={600} height={400} className="rounded-lg border aspect-video object-cover" data-ai-hint="family portrait"/> : <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center text-muted-foreground">No photo</div>}
                <Button type="button" variant="outline" className="w-full" onClick={() => handleCapturePhoto('family')} disabled={isCapturing === 'family'}>
                    {isCapturing === 'family' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isCapturing === 'family' ? 'Capturing...' : familyPhotoUrl ? 'Retake Family Photo' : 'Capture Family Photo'}
                </Button>
              </div>
              <div className="space-y-2">
                <FormLabel>House Photo</FormLabel>
                {housePhotoUrl ? <Image src={housePhotoUrl} alt="House" width={600} height={400} className="rounded-lg border aspect-video object-cover" data-ai-hint="modest house" /> : <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center text-muted-foreground">No photo</div>}
                <Button type="button" variant="outline" className="w-full" onClick={() => handleCapturePhoto('house')} disabled={isCapturing === 'house'}>
                    {isCapturing === 'house' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isCapturing === 'house' ? 'Capturing...' : housePhotoUrl ? 'Retake House Photo' : 'Capture House Photo'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          {step > 1 && <Button type="button" variant="secondary" onClick={handleBack}>Back</Button>}
          {step < 3 && <Button type="button" onClick={handleNext} className="ml-auto">Next</Button>}
          {step === 3 && <Button type="submit" className="ml-auto font-headline">Complete Registration</Button>}
        </div>
      </form>
    </Form>
  );
}
