'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { FollowUpVisit, Household, Child } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

const formSchema = z.object({
  childrenUpdates: z.array(
    z.object({
      childId: z.string(),
      isStudying: z.boolean(),
      studyingChallenges: z.string().optional(),
      notStudyingReason: z.string().optional(),
      isWorking: z.boolean().optional(),
      workDetails: z.string().optional(),
    })
  ),
  annualSurvey: z
    .object({
      toiletAvailable: z.boolean(),
      waterSupply: z.string(),
      electricity: z.boolean(),
      annualIncome: z.number(),
    })
    .optional(),
  notes: z.string().optional(),
});

type ConductVisitFormProps = {
  visit: FollowUpVisit;
  household: Household;
  children: Child[];
};

export function ConductVisitForm({ visit, household, children }: ConductVisitFormProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      childrenUpdates: children.map((child) => ({
        childId: child.id,
        isStudying: child.isStudying,
        studyingChallenges: '',
        notStudyingReason: '',
        isWorking: false,
        workDetails: '',
      })),
      annualSurvey:
        visit.visitType === 'Annual'
          ? {
              toiletAvailable: household.toiletAvailable,
              waterSupply: household.waterSupply,
              electricity: household.electricity,
              annualIncome: household.annualIncome,
            }
          : undefined,
      notes: '',
    },
  });

  const { watch } = form;
  const childrenUpdates = watch('childrenUpdates');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "You must be logged in to complete a visit.",
        });
        return;
    }

    try {
        const batch = writeBatch(firestore);

        // 1. Update Child Progress Updates
        values.childrenUpdates.forEach(update => {
            const progressUpdateRef = doc(collection(firestore, `households/${household.id}/children/${update.childId}/childProgressUpdates`));
            batch.set(progressUpdateRef, {
                id: progressUpdateRef.id,
                childId: update.childId,
                visitId: visit.id,
                is_studying: update.isStudying,
                not_studying_reason: update.notStudyingReason,
                is_working: update.isWorking,
                work_details: update.workDetails,
                studying_challenges: update.studyingChallenges,
            });

            // Also update the child's main document
            const childRef = doc(firestore, `households/${household.id}/children/${update.childId}`);
            batch.update(childRef, { isStudying: update.isStudying });
        });
        
        // 2. Update Household if it's an Annual visit
        if (visit.visitType === 'Annual' && values.annualSurvey) {
            const householdRef = doc(firestore, 'households', household.id);
            batch.update(householdRef, { ...values.annualSurvey });
        }

        // 3. Update the FollowUpVisit status
        const visitRef = doc(firestore, `households/${household.id}/followUpVisits`, visit.id);
        batch.update(visitRef, {
            status: 'Completed',
            notes: values.notes,
            visitedBy: user.displayName || 'Field Worker',
        });
        
        await batch.commit();

        toast({
            title: 'Visit Completed!',
            description: `Survey for ${household.familyName} has been successfully submitted.`,
        });
        router.push('/follow-ups');
        router.refresh(); // To ensure the reports page gets fresh data
    } catch (error) {
        console.error("Error completing visit:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "An error occurred while saving the visit data.",
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Child Progress Updates</CardTitle>
                <CardDescription>Record the current status of each child in the household.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {children.map((child, index) => (
                    <div key={child.id} className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg mb-4">{child.name}</h3>
                        <FormField
                            control={form.control}
                            name={`childrenUpdates.${index}.isStudying`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Is {child.name} currently studying?</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        {childrenUpdates[index]?.isStudying ? (
                             <FormField
                                control={form.control}
                                name={`childrenUpdates.${index}.studyingChallenges`}
                                render={({ field }) => (
                                    <FormItem className="mt-4">
                                        <FormLabel>Any challenges with studies?</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Needs help with maths, requests a tutor." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name={`childrenUpdates.${index}.notStudyingReason`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reason for not studying?</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a reason" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Financial Problems">Financial Problems</SelectItem>
                                                    <SelectItem value="Working">Working</SelectItem>
                                                    <SelectItem value="Family Issues">Family Issues</SelectItem>
                                                    <SelectItem value="Lack of Interest">Lack of Interest</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`childrenUpdates.${index}.isWorking`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Is the child working?</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                {childrenUpdates[index]?.isWorking && (
                                     <FormField
                                        control={form.control}
                                        name={`childrenUpdates.${index}.workDetails`}
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>What kind of work?</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Helps at a local tea stall." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        )}
                        {index < children.length -1 && <Separator className="mt-6"/>}
                    </div>
                ))}
            </CardContent>
        </Card>

        {visit.visitType === 'Annual' && (
          <Card>
             <CardHeader>
                <CardTitle>Annual Household Survey</CardTitle>
                <CardDescription>These questions are asked once a year.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="annualSurvey.toiletAvailable" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                             <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                             <FormLabel>Toilet Available?</FormLabel>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="annualSurvey.electricity" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                             <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                             <FormLabel>Electricity Supply?</FormLabel>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="annualSurvey.waterSupply" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Primary Water Supply</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select water source" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Piped">Piped</SelectItem>
                                    <SelectItem value="Well">Well</SelectItem>
                                    <SelectItem value="Tanker">Tanker</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="annualSurvey.annualIncome" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Annual Income (INR)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 80000" {...field} onChange={event => field.onChange(+event.target.value)} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Visit Notes</CardTitle>
            </CardHeader>
            <CardContent>
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea placeholder="Add any additional notes about the visit..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" size="lg" className="font-headline">Complete Visit</Button>
        </div>
      </form>
    </Form>
  );
}
