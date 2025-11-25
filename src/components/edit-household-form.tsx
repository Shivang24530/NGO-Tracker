
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirestore, useFirebaseApp, useUser } from '@/firebase';
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
import { MapPin, Loader2, Users, Home, Phone, Trash2, PlusCircle, Upload, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Household, Child } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';


const childSchema = z.object({
  id: z.string().optional(), // Existing children will have an ID
  name: z.string().min(2, 'Name is too short'),
  dateOfBirth: z.string(),
  gender: z.enum(['Male', 'Female', 'Other']),
  isStudying: z.boolean(),
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
  status: z.enum(['Active', 'Inactive', 'Migrated']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationUntracked: z.boolean().default(false),
  children: z.array(childSchema),
  // Fields for adding a new child
  newChildName: z.string().optional(),
  newChildDateOfBirth: z.string().optional(),
  newChildGender: z.enum(['Male', 'Female', 'Other']).optional(),
  newChildStudyingStatus: z.enum(['Studying', 'Not Studying', 'Migrated']).optional(),
  newChildCurrentClass: z.string().optional(),
  newChildSchoolName: z.string().optional(),
}).refine((data) => data.locationUntracked || (data.latitude && data.longitude), {
  message: "Please select a location on the map or mark as untracked.",
  path: ["latitude"],
});

type FormData = z.infer<typeof formSchema>;

interface EditHouseholdFormProps {
  household: Household;
  initialChildren: Child[];
}

export function EditHouseholdForm({ household, initialChildren }: EditHouseholdFormProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [childrenToDelete, setChildrenToDelete] = useState<string[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  // State for untracked location
  const [isLocationUntracked, setIsLocationUntracked] = useState(household.locationUntracked ?? false);

  // Photo State
  const [familyPhotoFile, setFamilyPhotoFile] = useState<File | null>(null);
  const [housePhotoFile, setHousePhotoFile] = useState<File | null>(null);
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState<string | null>(household.familyPhotoUrl || null);
  const [housePhotoUrl, setHousePhotoUrl] = useState<string | null>(household.housePhotoUrl || null);

  const familyPhotoInputRef = useRef<HTMLInputElement>(null);
  const housePhotoInputRef = useRef<HTMLInputElement>(null);

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
      description: `New photo for ${type} is ready for upload.`,
    });
  };

  const cancelPhoto = (type: 'family' | 'house') => {
    if (type === 'family') {
      setFamilyPhotoFile(null);
      // Revert to original URL if available, else null
      setFamilyPhotoUrl(household.familyPhotoUrl || null);
      if (familyPhotoInputRef.current) familyPhotoInputRef.current.value = '';
    } else {
      setHousePhotoFile(null);
      setHousePhotoUrl(household.housePhotoUrl || null);
      if (housePhotoInputRef.current) housePhotoInputRef.current.value = '';
    }
  };

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


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      familyName: household.familyName,
      fullAddress: household.fullAddress,
      locationArea: household.locationArea,
      primaryContact: household.primaryContact,
      status: household.status,
      latitude: household.latitude ?? undefined,
      longitude: household.longitude ?? undefined,
      locationUntracked: household.locationUntracked ?? false,
      children: initialChildren.map(c => ({
        id: c.id,
        name: c.name,
        dateOfBirth: c.dateOfBirth,
        gender: c.gender,
        isStudying: c.isStudying,
        currentClass: c.currentClass || '',
        schoolName: c.schoolName || '',
      })),
      newChildStudyingStatus: 'Not Studying'
    },
  });

  const { control, setValue, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "children",
  });
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const locationUntracked = watch('locationUntracked');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setMapError("Google Maps API key is missing. Please add it to your .env file.");
    }
  }, [apiKey]);

  useEffect(() => {
    setIsLocationUntracked(locationUntracked);
  }, [locationUntracked]);

  const handleLocationChange = (lat: number, lng: number) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
  };

  const handleAddNewChild = () => {
    const name = form.getValues('newChildName');
    const dateOfBirth = form.getValues('newChildDateOfBirth');
    const gender = form.getValues('newChildGender');
    const studyingStatus = form.getValues('newChildStudyingStatus');
    const currentClass = form.getValues('newChildCurrentClass');
    const schoolName = form.getValues('newChildSchoolName');

    if (name && dateOfBirth && gender && studyingStatus) {
      append({
        name,
        dateOfBirth,
        gender,
        isStudying: studyingStatus === 'Studying',
        currentClass: studyingStatus === 'Studying' ? currentClass : '',
        schoolName: studyingStatus === 'Studying' ? schoolName : ''
      });
      // Reset fields
      form.setValue('newChildName', '');
      form.setValue('newChildDateOfBirth', undefined);
      form.setValue('newChildGender', undefined);
      form.setValue('newChildStudyingStatus', 'Not Studying');
      form.setValue('newChildCurrentClass', '');
      form.setValue('newChildSchoolName', '');
    } else {
      toast({ variant: 'destructive', title: 'Missing child details', description: 'Please fill out Name, Date of Birth, Gender, and Status for the new child.' });
    }
  };

  const handleDeleteChild = (index: number) => {
    const childValue = form.getValues(`children.${index}`);

    // If the child has an ID, it exists in the DB.
    // Add its ID to the deletion queue.
    if (childValue.id) {
      setChildrenToDelete((prev) => [...prev, childValue.id!]);
    }

    // Remove the child from the form UI.
    remove(index);

    toast({
      title: 'Child Marked for Deletion',
      description: `${childValue.name} will be permanently removed when you save changes.`,
    });
  };

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore or user is not available.',
      });
      setIsSubmitting(false);
      return;
    }

    console.debug('[EditHousehold] submit started', { householdId: household.id });

    try {
      // Photo Upload Logic
      let finalFamilyPhotoUrl = household.familyPhotoUrl;
      let finalHousePhotoUrl = household.housePhotoUrl;

      if (familyPhotoFile) {
        if (navigator.onLine) {
          try {
            finalFamilyPhotoUrl = await uploadImage(familyPhotoFile, `households/${household.id}/familyPhoto.jpg`);
          } catch (err) {
            console.error("Family photo upload failed:", err);
            toast({
              variant: "destructive",
              title: "Photo Upload Failed",
              description: "Could not upload family photo. Update will proceed without it.",
            });
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
            finalHousePhotoUrl = await uploadImage(housePhotoFile, `households/${household.id}/housePhoto.jpg`);
          } catch (err) {
            console.error("House photo upload failed:", err);
            toast({
              variant: "destructive",
              title: "Photo Upload Failed",
              description: "Could not upload house photo. Update will proceed without it.",
            });
          }
        } else {
          toast({
            title: "Offline Mode",
            description: "Skipping house photo upload. You can add it later.",
          });
        }
      }

      const batch = writeBatch(firestore);
      const householdRef = doc(firestore, 'households', household.id);
      const childrenCollectionRef = collection(householdRef, 'children');

      // 1. Handle Deletions
      for (const childId of childrenToDelete) {
        const childRef = doc(childrenCollectionRef, childId);
        const progressUpdatesRef = collection(childRef, 'childProgressUpdates');
        const progressUpdatesSnapshot = await getDocs(progressUpdatesRef);

        progressUpdatesSnapshot.forEach((progressDoc) => {
          batch.delete(progressDoc.ref);
        });

        batch.delete(childRef);
      }

      // 2. Update household doc
      batch.update(householdRef, {
        familyPhotoUrl: finalFamilyPhotoUrl,
        housePhotoUrl: finalHousePhotoUrl,
        familyName: values.familyName,
        fullAddress: values.fullAddress,
        locationArea: values.locationArea,
        primaryContact: values.primaryContact,
        status: values.status,
        latitude: values.locationUntracked ? null : (values.latitude ?? null),
        longitude: values.locationUntracked ? null : (values.longitude ?? null),
        locationUntracked: values.locationUntracked || false,
      });

      // 3. Handle children updates/additions
      values.children.forEach(child => {
        if (child.id) {
          // Update existing child
          const childRef = doc(childrenCollectionRef, child.id);
          batch.update(childRef, {
            name: child.name,
            dateOfBirth: child.dateOfBirth,
            gender: child.gender,
            isStudying: child.isStudying,
            currentClass: child.isStudying ? child.currentClass : '',
            schoolName: child.isStudying ? child.schoolName : '',
          });
        } else {
          // Add new child
          const newChildRef = doc(childrenCollectionRef);
          batch.set(newChildRef, {
            id: newChildRef.id,
            householdId: household.id,
            ownerId: user.uid,
            name: child.name,
            dateOfBirth: child.dateOfBirth,
            gender: child.gender,
            isStudying: child.isStudying,
            currentClass: child.isStudying ? child.currentClass : '',
            schoolName: child.isStudying ? child.schoolName : '',
          });
        }
      });

      try {
        console.debug('[EditHousehold] committing batch', { householdId: household.id });
        await batch.commit();
        console.debug('[EditHousehold] batch committed', { householdId: household.id });
      } catch (err) {
        console.error('Batch commit failed:', err);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not save household data. Please try again.",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Update Complete!',
        description: `The ${values.familyName} family has been updated.`,
      });
      router.push('/households');
      // router.refresh(); // Removed to prevent offline hanging

    } catch (error) {
      console.error("Error updating family:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An error occurred while saving the data. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Home className="h-5 w-5 text-primary" />
              Household Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField name="familyName" control={form.control} render={({ field }) => <FormItem><FormLabel>Family Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="status" control={form.control} render={({ field }) => <FormItem><FormLabel>Family Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Migrated">Migrated</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
              <FormField name="primaryContact" control={form.control} render={({ field }) => <FormItem><FormLabel>Primary Contact</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="locationArea" control={form.control} render={({ field }) => <FormItem><FormLabel>Location/Area</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="md:col-span-2">
                <FormField name="fullAddress" control={form.control} render={({ field }) => <FormItem><FormLabel>Full Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
              <div className="md:col-span-2">
                <FormField
                  control={control}
                  name="latitude"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-primary" />GPS Location {!isLocationUntracked && '*'}
                      </FormLabel>
                      <FormDescription>
                        {isLocationUntracked
                          ? 'Location marked as untracked. You can add it now.'
                          : 'Drag the pin to the exact house location on the map.'}
                      </FormDescription>
                      <FormControl>
                        {!isLocationUntracked ? (
                          <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                            {apiKey && latitude && longitude ? (
                              <LocationPicker
                                apiKey={apiKey}
                                initialCenter={{ lat: latitude, lng: longitude }}
                                onLocationChange={handleLocationChange}
                                currentLocation={{ lat: latitude, lng: longitude }}
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
                                Location tracking disabled
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click the button below to set the location
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
                            } else {
                              // If enabling tracking, set a default location if none exists
                              if (!latitude || !longitude) {
                                // Default to Delhi or user's current location if available
                                // For now, let's just let the LocationPicker handle initialization or set a default
                                setValue('latitude', 28.7041);
                                setValue('longitude', 77.1025);
                              }
                            }
                          }}
                          className="w-full sm:w-auto"
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          {isLocationUntracked ? 'Enable Location Tracking' : 'Mark as Untracked'}
                        </Button>
                      </div>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Children
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-lg space-y-4 relative bg-background">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name={`children.${index}.name`} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name={`children.${index}.dateOfBirth`} render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name={`children.${index}.gender`} render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
                <FormField
                  control={form.control}
                  name={`children.${index}.isStudying`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Currently Studying?</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {form.watch(`children.${index}.isStudying`) && (
                  <div className="grid md:grid-cols-2 gap-4 pl-2 pt-2 border-l-2 ml-2">
                    <FormField control={form.control} name={`children.${index}.currentClass`} render={({ field }) => <FormItem><FormLabel>Current Class</FormLabel><FormControl><Input placeholder="e.g., 2nd Class" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`children.${index}.schoolName`} render={({ field }) => <FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="e.g., Local Public School" {...field} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete child?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <span className="font-semibold">{form.getValues(`children.${index}.name`)}</span>? This action will be permanent once you save changes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteChild(index)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            <div className="border-t pt-6 mt-6">
              <h4 className="font-medium mb-4">Add New Child</h4>
              <div className="space-y-4 p-4 border rounded-lg bg-secondary/30">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="newChildName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Child's full name" {...field} value={field.value || ''} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="newChildDateOfBirth" render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="newChildGender" render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></FormItem>} />
                </div>
                <FormField
                  control={form.control}
                  name="newChildStudyingStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Child Status</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Studying" /></FormControl>
                            <FormLabel className="font-normal">Studying</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Not Studying" /></FormControl>
                            <FormLabel className="font-normal">Not Studying</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Migrated" /></FormControl>
                            <FormLabel className="font-normal">Migrated</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('newChildStudyingStatus') === 'Studying' && (
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <FormField control={form.control} name="newChildCurrentClass" render={({ field }) => <FormItem><FormLabel>Current Class</FormLabel><FormControl><Input placeholder="e.g., 2nd Class" {...field} value={field.value || ''} /></FormControl></FormItem>} />
                    <FormField control={form.control} name="newChildSchoolName" render={({ field }) => <FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="e.g., Local Public School" {...field} value={field.value || ''} /></FormControl></FormItem>} />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="button" onClick={handleAddNewChild} variant="secondary">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add This Child to List
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5 text-primary" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <OfflineWarning compact message="Photos cannot be uploaded while offline. You can add them later." />
            <input type="file" accept="image/*" ref={familyPhotoInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'family')} />
            <input type="file" accept="image/*" ref={housePhotoInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'house')} />

            <div className="grid md:grid-cols-2 gap-8">
              {/* FAMILY PHOTO */}
              <div className="space-y-4">
                <FormLabel>Family Photo</FormLabel>
                <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center bg-secondary/30 overflow-hidden relative">
                  {familyPhotoUrl ? (
                    <Image src={familyPhotoUrl} alt="Family" width={600} height={400} className="w-full h-full object-cover" />
                  ) : <span>No photo</span>}
                </div>
                <div className="flex justify-center gap-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => familyPhotoInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> {familyPhotoUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {familyPhotoFile && (
                    <Button type="button" variant="destructive" onClick={() => cancelPhoto('family')}>
                      <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* HOUSE PHOTO */}
              <div className="space-y-4">
                <FormLabel>House Photo</FormLabel>
                <div className="border-dashed border-2 rounded-lg aspect-video flex items-center justify-center bg-secondary/30 overflow-hidden relative">
                  {housePhotoUrl ? (
                    <Image src={housePhotoUrl} alt="House" width={600} height={400} className="w-full h-full object-cover" />
                  ) : <span>No photo</span>}
                </div>
                <div className="flex justify-center gap-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => housePhotoInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> {housePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {housePhotoFile && (
                    <Button type="button" variant="destructive" onClick={() => cancelPhoto('house')}>
                      <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="font-headline bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <OfflineWarning className="mt-4" />
      </form>
    </Form>
  );
}
