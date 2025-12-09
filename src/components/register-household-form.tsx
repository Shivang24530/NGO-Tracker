'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
  uploadBytesResumable
} from 'firebase/storage';
import { useFirestore, useUser, useFirebaseApp } from '@/firebase';
import { formatISO, addMonths, getYear, getQuarter } from 'date-fns';
import { LocationPicker } from '@/components/map/location-picker';
import { Button } from '@/components/ui/button';
import { OfflineWarning } from '@/components/offline-warning';
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
import {
  MapPin,
  Trash2,
  PlusCircle,
  Loader2,
  Users,
  Home,
  Phone,
  ArrowRight,
  Upload,
  XCircle
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { FollowUpVisit } from '@/lib/types';

const childSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  dateOfBirth: z.string().refine((dob) => new Date(dob).toString() !== 'Invalid Date', {
    message: 'Please enter a valid date of birth.',
  }),
  gender: z.enum(['Male', 'Female', 'Other']),
  studyingStatus: z.enum(['Studying', 'Not Studying', 'Migrated']).default('Not Studying'),
  currentClass: z.string().optional(),
  schoolName: z.string().optional(),
});

const formSchema = z.object({
  familyName: z.string().min(3, 'Family name is required.'),
  fullAddress: z.string().min(10, 'Full address is required.'),
  locationArea: z.string().min(3, 'Location area is required.'),
  primaryContact: z
    .string()
    .min(10, 'A valid contact number is required.')
    .regex(/^[+]?[0-9]+$/, 'Contact number can only contain digits and an optional leading "+".'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationUntracked: z.boolean().default(false),
  children: z.array(childSchema),
}).refine((data) => data.locationUntracked || (data.latitude && data.longitude), {
  message: "Please select a location on the map or mark as untracked.",
  path: ["latitude"], // Attach error to latitude field
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: 'Household Info', fields: ['familyName', 'fullAddress', 'locationArea', 'primaryContact', 'latitude', 'longitude'] as const },
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
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const [step, setStep] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userReadyToSubmit, setUserReadyToSubmit] = useState(false); // Prevent auto-submit
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLocationUntracked, setIsLocationUntracked] = useState(false);

  const [familyPhotoFile, setFamilyPhotoFile] = useState<File | null>(null);
  const [housePhotoFile, setHousePhotoFile] = useState<File | null>(null);
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState<string | null>(null);
  const [housePhotoUrl, setHousePhotoUrl] = useState<string | null>(null);

  const familyPhotoInputRef = useRef<HTMLInputElement>(null);
  const housePhotoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      familyName: '',
      fullAddress: '',
      locationArea: '',
      primaryContact: '',
      locationUntracked: false,
      children: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'children',
  });

  const { watch, setValue } = form;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setMapError("Google Maps API key is missing. Please add it to your .env file.");
      return;
    }

    let isMounted = true;

    const getCurrentLocation = async () => {
      try {
        // Dynamic import for Capacitor Geolocation and Core
        const { Geolocation } = await import('@capacitor/geolocation');
        const { Capacitor } = await import('@capacitor/core');

        // Only check/request permissions on native platforms (iOS/Android)
        if (Capacitor.isNativePlatform()) {
          const permissionStatus = await Geolocation.checkPermissions();

          if (permissionStatus.location !== 'granted') {
            const requestStatus = await Geolocation.requestPermissions();
            if (requestStatus.location !== 'granted') {
              console.warn("Location permission denied");
              if (isMounted && !initialCenter) {
                setInitialCenter({ lat: 28.7041, lng: 77.1025 });
              }
              return;
            }
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        if (isMounted) {
          const { latitude, longitude } = position.coords;
          if (!initialCenter) {
            setInitialCenter({ lat: latitude, lng: longitude });
          }
          // Always update form values with latest accurate position
          setValue('latitude', latitude);
          setValue('longitude', longitude);
        }
      } catch (error) {
        console.error("Error getting location:", error);
        if (isMounted && !initialCenter) {
          setInitialCenter({ lat: 28.7041, lng: 77.1025 });
        }
      }
    };

    getCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, [apiKey, setValue]);

  const handleNext = async () => {
    console.log('handleNext called, current step:', step, 'steps.length:', steps.length);

    let isValid = true;
    if (step === 1) isValid = await form.trigger(steps[0].fields);
    else if (step === 2) isValid = await form.trigger(steps[1].fields);

    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Incomplete Information",
        description: "Please fill out all required fields before proceeding.",
      });
      return;
    }

    if (step < steps.length) {
      console.log('Moving to next step:', step + 1);
      setUserReadyToSubmit(false); // Reset on step change
      setStep(step + 1);
    } else {
      console.log('Submitting form from handleNext');
      await form.handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => setStep(step - 1);

  const handleLocationChange = (lat: number, lng: number) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'family' | 'house') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 1;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Image Too Large",
        description: `Please select an image smaller than ${MAX_SIZE_MB}MB.`,
      });
      event.target.value = '';
      return;
    }

    if (type === 'family') {
      setFamilyPhotoFile(file);
      setFamilyPhotoUrl(URL.createObjectURL(file));
    } else {
      setHousePhotoFile(file);
      setHousePhotoUrl(URL.createObjectURL(file));
    }

    toast({
      title: 'Photo Selected',
      description: `Photo for ${type} is ready for upload.`,
    });
  };

  const cancelPhoto = (type: 'family' | 'house') => {
    if (type === 'family') {
      setFamilyPhotoFile(null);
      setFamilyPhotoUrl(null);
      if (familyPhotoInputRef.current) familyPhotoInputRef.current.value = '';
    } else {
      setHousePhotoFile(null);
      setHousePhotoUrl(null);
      if (housePhotoInputRef.current) housePhotoInputRef.current.value = '';
    }
  };

  // ⭐ FIXED UPLOAD FUNCTION — stable, resumable, cancelable, never hangs
  const uploadImage = async (
    file: File,
    path: string,
    timeoutMs = 30000
  ): Promise<string> => {
    if (!firebaseApp) throw new Error("Firebase App is not initialized");

    const storage = getStorage(firebaseApp);
    const imageRef = storageRef(storage, path);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(imageRef, file);

      const timeout = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error(`Upload timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      uploadTask.on(
        "state_changed",
        () => { },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        async () => {
          clearTimeout(timeout);
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  };

  async function onSubmit(values: FormData) {
    console.log('🔴 onSubmit called!', new Error().stack);
    setIsSubmitting(true);

    if (!user) {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Authentication or database service is not available.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Firestore Error",
        description: "Firestore is not initialized.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const householdRef = doc(collection(firestore, 'households'));
      const householdId = householdRef.id;
      let finalFamilyPhotoUrl: string | null = null;
      let finalHousePhotoUrl: string | null = null;

      const uploadPromises: Promise<void>[] = [];

      if (familyPhotoFile) {
        if (navigator.onLine) {
          try {
            finalFamilyPhotoUrl = await uploadImage(familyPhotoFile, `households/${householdId}/familyPhoto.jpg`);
          } catch (err) {
            console.error("Family photo upload failed:", err);
            toast({
              variant: "destructive",
              title: "Photo Upload Failed",
              description: "Could not upload family photo. Registration will proceed without it.",
            });
            // Proceed without photo
          }
        } else {
          toast({
            title: "Offline Mode",
            description: "Skipping family photo upload. You can add it later.",
          });
        }
      }

      if (housePhotoFile) {
        if (navigator.onLine) {
          try {
            finalHousePhotoUrl = await uploadImage(housePhotoFile, `households/${householdId}/housePhoto.jpg`);
          } catch (err) {
            console.error("House photo upload failed:", err);
            toast({
              variant: "destructive",
              title: "Photo Upload Failed",
              description: "Could not upload house photo. Registration will proceed without it.",
            });
            // Proceed without photo
          }
        } else {
          toast({
            title: "Offline Mode",
            description: "Skipping house photo upload. You can add it later.",
          });
        }
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      const batch = writeBatch(firestore);
      const newHouseholdData = {
        id: householdId,
        ownerId: user.uid,
        familyName: values.familyName,
        fullAddress: values.fullAddress,
        locationArea: values.locationArea,
        primaryContact: values.primaryContact,
        status: 'Active' as const,
        createdAt: formatISO(new Date()),
        nextFollowupDue: formatISO(addMonths(new Date(), 3)),
        latitude: values.locationUntracked ? null : (values.latitude ?? null),
        longitude: values.locationUntracked ? null : (values.longitude ?? null),
        locationUntracked: values.locationUntracked || false,
        familyPhotoUrl: finalFamilyPhotoUrl,
        housePhotoUrl: finalHousePhotoUrl,
        toiletAvailable: false,
        waterSupply: 'Other' as const,
        electricity: false,
        annualIncome: 0,
      };
      batch.set(householdRef, newHouseholdData);

      (values.children || []).forEach(child => {
        const childRef = doc(collection(householdRef, 'children'));
        batch.set(childRef, {
          id: childRef.id,
          householdId: householdRef.id,
          name: child.name,
          dateOfBirth: child.dateOfBirth,
          gender: child.gender,
          isStudying: child.studyingStatus === 'Studying',
          currentClass: child.currentClass || 'N/A',
          schoolName: child.schoolName || 'N/A',
        });
      });

      const createdDate = new Date();
      const createdQuarter = getQuarter(createdDate);
      const visitsColRef = collection(householdRef, 'followUpVisits');
      const year = getYear(createdDate);

      for (let qNum = createdQuarter; qNum <= 4; qNum++) {
        const quarterDate = new Date(year, (qNum - 1) * 3 + 1, 15);
        const newVisitRef = doc(visitsColRef);
        batch.set(newVisitRef, {
          id: newVisitRef.id,
          householdId: householdRef.id,
          visitDate: formatISO(quarterDate),
          visitType: qNum === 4 ? 'Annual' : 'Quarterly',
          status: 'Pending' as const,
          visitedBy: '',
          notes: '',
        });
      }

      try {
        const commitPromise = batch.commit();
        await Promise.race([
          commitPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Commit timed out')), 20000)),
        ]);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Could not save household data. Please try again.",
        });
      }



      toast({
        title: 'Registration Complete!',
        description: `The ${values.familyName} family has been added.`,
      });
      router.push('/dashboard');
      // router.refresh(); // Removed to prevent offline hanging

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "An error occurred while saving the data.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <FormField name="familyName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-primary" />Family Name *
                </FormLabel>
                <FormControl><Input placeholder="e.g., Kumar Family" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="fullAddress" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Home className="mr-2 h-4 w-4 text-primary" />Full Address *
                </FormLabel>
                <FormControl><Input placeholder="Complete address with landmarks" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="locationArea" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-primary" />Location/Area *
                </FormLabel>
                <FormControl><Input placeholder="e.g., Sector 15, Dharavi" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField
              control={form.control}
              name="latitude"
              render={() => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-primary" />GPS Location {!isLocationUntracked && '*'}
                  </FormLabel>
                  <FormDescription>
                    {isLocationUntracked
                      ? 'Location marked as untracked. You can add it later when editing.'
                      : 'Drag the pin to the house location, or mark as untracked for offline registration.'}
                  </FormDescription>
                  <FormControl>
                    {!isLocationUntracked ? (
                      <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                        {apiKey && initialCenter ? (
                          <LocationPicker
                            apiKey={apiKey}
                            initialCenter={initialCenter}
                            onLocationChange={handleLocationChange}
                            currentLocation={{ lat: watch('latitude') || initialCenter.lat, lng: watch('longitude') || initialCenter.lng }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                            {mapError ? <span className='text-destructive p-4'>{mapError}</span> : <Loader2 className="h-8 w-8 animate-spin" />}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-[200px] w-full rounded-lg border border-dashed flex items-center justify-center bg-secondary/30">
                        <div className="text-center p-6">
                          <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Location tracking disabled for offline registration
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You can add the GPS location later when editing this family
                          </p>
                        </div>
                      </div>
                    )}
                  </FormControl>

                  {/* Untracked Location Toggle Button */}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant={isLocationUntracked ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newUntrackedState = !isLocationUntracked;
                        setIsLocationUntracked(newUntrackedState);
                        setValue('locationUntracked', newUntrackedState);

                        if (newUntrackedState) {
                          // Clear location values when marking as untracked
                          setValue('latitude', undefined);
                          setValue('longitude', undefined);
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {isLocationUntracked ? 'Enable Location Tracking' : 'Mark as Untracked (Offline Mode)'}
                    </Button>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField name="primaryContact" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-primary" />Primary Contact *
                </FormLabel>
                <FormControl><Input placeholder="10-digit number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-lg space-y-4 relative bg-secondary/30">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name={`children.${index}.name`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`children.${index}.dateOfBirth`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="dark:[color-scheme:dark]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`children.${index}.gender`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name={`children.${index}.studyingStatus`} render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Child Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer transition-all", field.value === 'Studying' ? "border-primary bg-primary/10" : "border-input hover:bg-accent")}>
                          <FormControl><RadioGroupItem value="Studying" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">Studying</FormLabel>
                        </FormItem>
                        <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer transition-all", field.value === 'Not Studying' ? "border-primary bg-primary/10" : "border-input hover:bg-accent")}>
                          <FormControl><RadioGroupItem value="Not Studying" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">Not Studying</FormLabel>
                        </FormItem>
                        <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer transition-all", field.value === 'Migrated' ? "border-primary bg-primary/10" : "border-input hover:bg-accent")}>
                          <FormControl><RadioGroupItem value="Migrated" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">Migrated</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {watch(`children.${index}.studyingStatus`) === 'Studying' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`children.${index}.currentClass`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Class</FormLabel>
                        <FormControl><Input placeholder="e.g., 3rd" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`children.${index}.schoolName`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Public School" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  name: '',
                  dateOfBirth: '',
                  gender: 'Male',
                  studyingStatus: 'Not Studying',
                  currentClass: '',
                  schoolName: ''
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />Add Child
            </Button>
          </div>
        );

      case 3:
        return (
          <>
            <input type="file" accept="image/*" ref={familyPhotoInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'family')} />
            <input type="file" accept="image/*" ref={housePhotoInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'house')} />

            <div className="space-y-4">
              <OfflineWarning compact message="Photos cannot be uploaded while offline. You can add them later." />
              <div className="grid md:grid-cols-2 gap-8">
                {/* FAMILY PHOTO */}
                <div className="space-y-4">
                  <FormLabel>Family Photo</FormLabel>
                  <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center bg-secondary/30 overflow-hidden">
                    {familyPhotoUrl ? (
                      <Image src={familyPhotoUrl} alt="Family" width={600} height={400} className="w-full h-full object-cover" />
                    ) : <span>No photo</span>}
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => familyPhotoInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                    {familyPhotoUrl && (
                      <Button type="button" variant="destructive" onClick={() => cancelPhoto('family')}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* HOUSE PHOTO */}
                <div className="space-y-4">
                  <FormLabel>House Photo</FormLabel>
                  <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center bg-secondary/30 overflow-hidden">
                    {housePhotoUrl ? (
                      <Image src={housePhotoUrl} alt="House" width={600} height={400} className="w-full h-full object-cover" />
                    ) : <span>No photo</span>}
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => housePhotoInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                    {housePhotoUrl && (
                      <Button type="button" variant="destructive" onClick={() => cancelPhoto('house')}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const stepTitles = ["Household Information", "Children Details", "Photos"];
  const stepDescriptions = [
    "Enter the basic details of the family and set their location.",
    "Add details for each child in the household.",
    "Optionally, add photos of the family and their house."
  ];
  const nextButtonLabels = ["Next: Add Children", "Next: Add Photos", "Complete Registration"];

  return (
    <Form {...form}>
      <OfflineWarning className="mb-6" />
      <Stepper currentStep={step} />
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-xl">{stepTitles[step - 1]}</CardTitle>
          </div>
          <CardDescription>{stepDescriptions[step - 1]}</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(e) => {
              console.log('📝 Form onSubmit event triggered', e.nativeEvent);
              e.preventDefault(); // Always prevent default form submission

              // CRITICAL: Only allow if user has clicked the submit button
              if (!userReadyToSubmit && step === 3) {
                console.log('❌ Blocked submission - user has not clicked submit button yet');
                return;
              }

              // CRITICAL: Only allow submission on step 3
              if (step !== 3) {
                console.log('❌ Blocked submission - not on final step (step:', step, ')');
                return;
              }

              // CRITICAL: Prevent double submission
              if (isSubmitting) {
                console.log('❌ Blocked submission - already submitting');
                return;
              }

              // Check if this is a legitimate button click
              const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
              console.log('Submitter:', submitter, 'Type:', submitter?.type, 'Disabled:', submitter?.disabled);

              // Block if button is disabled
              if (submitter?.disabled) {
                console.log('❌ Blocked submission - button is disabled');
                return;
              }

              // Only proceed if submitted via the submit button
              if (submitter && submitter.type === 'submit') {
                console.log('✅ Calling form.handleSubmit');
                form.handleSubmit(onSubmit)(e);
              } else {
                console.log('❌ Blocked submission - no valid submitter');
              }
            }}
            className="space-y-8"
            onKeyDown={(e) => {
              // Prevent Enter key from submitting form or triggering buttons
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
          >
            {/* Hidden button to prevent implicit form submission on Enter */}
            <button type="button" disabled style={{ display: 'none' }} aria-hidden="true" />

            {renderStepContent()}
            <div className="flex justify-between mt-12">
              {step > 1 ? (
                <Button type="button" variant="secondary" onClick={handleBack}>Back</Button>
              ) : <div></div>}

              {step < steps.length ? (
                <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                  {isSubmitting && step === steps.length ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <>
                    {nextButtonLabels[step - 1]} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  className="font-headline bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                  onClick={() => {
                    console.log('🖱️ Submit button clicked by user');
                    setUserReadyToSubmit(true);
                  }}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Registering...' : 'Complete Registration'}
                </Button>
              )}
            </div>

          </form>
        </CardContent>
      </Card>
    </Form>
  );
}