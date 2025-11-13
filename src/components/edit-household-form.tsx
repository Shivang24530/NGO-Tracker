
'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, writeBatch, collection, getDocs, query, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

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


const childSchema = z.object({
  id: z.string().optional(), // Existing children will have an ID
  name: z.string().min(2, 'Name is too short'),
  age: z.coerce.number().min(0, 'Age cannot be negative').max(25),
  gender: z.enum(['Male', 'Female', 'Other']),
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
  children: z.array(childSchema),
  newChildName: z.string().optional(),
  newChildAge: z.coerce.number().optional(),
  newChildGender: z.enum(['Male', 'Female', 'Other']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditHouseholdFormProps {
    household: Household;
    initialChildren: Child[];
}

export function EditHouseholdForm({ household, initialChildren }: EditHouseholdFormProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      children: initialChildren.map(c => ({ id: c.id, name: c.name, age: c.age, gender: c.gender })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'children',
  });

  const handleGetLocation = () => {
    setIsLocating(true);
    // In a real app, this would use Capacitor's Geolocation API
    setTimeout(() => {
      const lat = 28.7041 + (Math.random() - 0.5) * 0.01;
      const lng = 77.1025 + (Math.random() - 0.5) * 0.01;
      form.setValue('latitude', lat, { shouldValidate: true });
      form.setValue('longitude', lng, { shouldValidate: true });
      setIsLocating(false);
      toast({
        title: 'Location Captured',
        description: 'GPS coordinates have been successfully updated.',
      });
    }, 1500);
  };

  const handleAddNewChild = () => {
    const name = form.getValues('newChildName');
    const age = form.getValues('newChildAge');
    const gender = form.getValues('newChildGender');

    if (name && age !== undefined && gender) {
        append({ name, age, gender });
        form.setValue('newChildName', '');
        form.setValue('newChildAge', undefined);
        form.setValue('newChildGender', undefined);
    } else {
        toast({ variant: 'destructive', title: 'Missing child details', description: 'Please fill out all fields for the new child.' });
    }
  };

  const handleDeleteChild = async (index: number) => {
    const childToDelete = fields[index];
    
    // If child is not saved in DB yet, just remove from form
    if (!childToDelete.id) {
        remove(index);
        return;
    }

    try {
        const childRef = doc(firestore, 'households', household.id, 'children', childToDelete.id);
        
        // Batch delete child and their progress updates
        const batch = writeBatch(firestore);

        const progressUpdatesQuery = query(collection(childRef, 'childProgressUpdates'));
        const progressUpdatesSnapshot = await getDocs(progressUpdatesQuery);
        progressUpdatesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(childRef);

        await batch.commit();

        remove(index); // Remove from UI after successful DB deletion
        toast({
            title: 'Child Deleted',
            description: `${childToDelete.name} has been removed from the family.`,
        });
    } catch (error) {
        console.error("Error deleting child:", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "An error occurred while deleting the child. Please try again.",
        });
    }
  }

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    try {
        const batch = writeBatch(firestore);
        const householdRef = doc(firestore, 'households', household.id);
        const childrenCollectionRef = collection(householdRef, 'children');

        // 1. Update household doc
        batch.update(householdRef, {
            familyName: values.familyName,
            fullAddress: values.fullAddress,
            locationArea: values.locationArea,
            primaryContact: values.primaryContact,
            status: values.status,
            latitude: values.latitude,
            longitude: values.longitude,
        });

        // 2. Handle children updates/additions
        values.children.forEach(child => {
            if (child.id) {
                // Update existing child
                const childRef = doc(childrenCollectionRef, child.id);
                batch.update(childRef, { name: child.name, age: child.age, gender: child.gender });
            } else {
                // Add new child
                const newChildRef = doc(childrenCollectionRef);
                batch.set(newChildRef, { 
                    id: newChildRef.id,
                    householdId: household.id,
                    name: child.name,
                    age: child.age,
                    gender: child.gender,
                    isStudying: false, // Default for new children
                    currentClass: 'N/A',
                    schoolName: 'N/A',
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
                <FormItem>
                  <FormLabel>GPS Location</FormLabel>
                   <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                     <p className="text-sm text-green-900">
                        Location Captured! (Lat: {form.watch('latitude')?.toFixed(4)}, Lng: {form.watch('longitude')?.toFixed(4)})
                    </p>
                    <Button type="button" variant="ghost" size="sm" onClick={handleGetLocation} disabled={isLocating}>
                        {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLocating ? 'Updating...' : 'Recapture'}
                    </Button>
                  </div>
                </FormItem>
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
                                Are you sure you want to remove <span className="font-semibold">{form.getValues(`children.${index}.name`)}</span>? This action is permanent and will delete all their progress records.
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
             <div className="border-t pt-4 mt-6">
                <h4 className="font-medium mb-4">Add New Child</h4>
                 <div className="grid md:grid-cols-4 gap-4 items-end">
                    <FormField control={form.control} name="newChildName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Child's full name" {...field} /></FormControl></FormItem>} />
                    <FormField control={form.control} name="newChildAge" render={({ field }) => <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="e.g. 8" {...field} onChange={event => field.onChange(+event.target.value)} /></FormControl></FormItem>} />
                    <FormField control={form.control} name="newChildGender" render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></FormItem>} />
                    <Button type="button" onClick={handleAddNewChild} variant="outline" size="icon" className="h-10 w-10">
                        <PlusCircle className="h-5 w-5" />
                    </Button>
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

    