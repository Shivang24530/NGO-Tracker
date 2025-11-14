
'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useFirebaseApp } from '@/firebase';
import { LocationPicker } from '@/components/map/location-picker';
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
import { MapPin, Loader2, Users, Home, Phone, Trash2, PlusCircle } from 'lucide-react';
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
  age: z.coerce.number().min(0, 'Age cannot be negative').max(25),
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
  latitude: z.number({ required_error: "Please set a location on the map." }),
  longitude: z.number({ required_error: "Please set a location on the map." }),
  children: z.array(childSchema),
  // Fields for adding a new child
  newChildName: z.string().optional(),
  newChildAge: z.coerce.number().optional(),
  newChildGender: z.enum(['Male', 'Female', 'Other']).optional(),
  newChildStudyingStatus: z.enum(['Studying', 'Not Studying', 'Migrated']).optional(),
  newChildCurrentClass: z.string().optional(),
  newChildSchoolName: z.string().optional(),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [childrenToDelete, setChildrenToDelete] = useState<string[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      familyName: household.familyName,
      fullAddress: household.fullAddress,
      locationArea: household.locationArea,
      primaryContact: household.primaryContact,
      status: household.status,
      latitude: household.latitude,
      longitude: household.longitude,
      children: initialChildren.map(c => ({ 
        id: c.id, 
        name: c.name, 
        age: 0, // Age will be calculated from dateOfBirth
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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setMapError("Google Maps API key is missing. Please add it to your .env file.");
    }
  }, [apiKey]);
  
  const handleLocationChange = (lat: number, lng: number) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
  };

  const handleAddNewChild = () => {
    const name = form.getValues('newChildName');
    const age = form.getValues('newChildAge');
    const gender = form.getValues('newChildGender');
    const studyingStatus = form.getValues('newChildStudyingStatus');
    const currentClass = form.getValues('newChildCurrentClass');
    const schoolName = form.getValues('newChildSchoolName');

    if (name && age !== undefined && gender && studyingStatus) {
        append({ 
            name, 
            age, 
            gender, 
            isStudying: studyingStatus === 'Studying',
            currentClass: studyingStatus === 'Studying' ? currentClass : '',
            schoolName: studyingStatus === 'Studying' ? schoolName : ''
        });
        // Reset fields
        form.setValue('newChildName', '');
        form.setValue('newChildAge', undefined);
        form.setValue('newChildGender', undefined);
        form.setValue('newChildStudyingStatus', 'Not Studying');
        form.setValue('newChildCurrentClass', '');
        form.setValue('newChildSchoolName', '');
    } else {
        toast({ variant: 'destructive', title: 'Missing child details', description: 'Please fill out Name, Age, Gender, and Status for the new child.' });
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
    try {
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
            familyName: values.familyName,
            fullAddress: values.fullAddress,
            locationArea: values.locationArea,
            primaryContact: values.primaryContact,
            status: values.status,
            latitude: values.latitude,
            longitude: values.longitude,
        });

        // 3. Handle children updates/additions
        values.children.forEach(child => {
            const dob = new Date(new Date().getFullYear() - child.age, 0, 1).toISOString();
            if (child.id) {
                // Update existing child
                const childRef = doc(childrenCollectionRef, child.id);
                batch.update(childRef, { 
                    name: child.name, 
                    dateOfBirth: dob, 
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
                    name: child.name,
                    dateOfBirth: dob,
                    gender: child.gender,
                    isStudying: child.isStudying,
                    currentClass: child.isStudying ? child.currentClass : '',
                    schoolName: child.isStudying ? child.schoolName : '',
                });
            }
        });
        
        await batch.commit();

        toast({
            title: 'Update Complete!',
            description: `The ${values.familyName} family has been updated.`,
        });
        router.push('/households');
        router.refresh();

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
                        <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />GPS Location *</FormLabel>
                        <FormDescription>Drag the pin to the exact house location on the map.</FormDescription>
                        <FormControl>
                          <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                            {apiKey && latitude && longitude ? (
                              <LocationPicker 
                                apiKey={apiKey}
                                initialCenter={{lat: latitude, lng: longitude}}
                                onLocationChange={handleLocationChange}
                                currentLocation={{lat: latitude, lng: longitude}}
                              />
                            ) : (
                               <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                                {mapError ? <span className='text-destructive p-4'>{mapError}</span> : <Loader2 className="h-8 w-8 animate-spin" />}
                              </div>
                            )}
                          </div>
                        </FormControl>
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
                    <FormField control={form.control} name={`children.${index}.age`} render={({ field }) => <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
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
                        <FormField control={form.control} name="newChildName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Child's full name" {...field} value={field.value || ''}/></FormControl></FormItem>} />
                        <FormField control={form.control} name="newChildAge" render={({ field }) => <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="e.g. 8" {...field} value={field.value || ''} onChange={event => field.onChange(+event.target.value)} /></FormControl></FormItem>} />
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="font-headline bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
