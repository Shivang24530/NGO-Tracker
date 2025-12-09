
'use client';

import { useState, useEffect } from 'react';
import { addMonths, getQuarter, getYear } from 'date-fns';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { OfflineWarning } from '@/components/offline-warning';
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
import type { FollowUpVisit, Household, Child, ChildProgressUpdate } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

const formSchema = z.object({
    childrenUpdates: z.array(
        z.object({
            childId: z.string(),
            isStudying: z.boolean(),
            studyingChallenges: z.string().optional(),
            currentClass: z.string().optional(),
            schoolName: z.string().optional(),
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
    visitedBy: z.string().min(2, 'Please enter the name of the person conducting this visit'),
    notes: z.string().optional(),
});

type ConductVisitFormProps = {
    visit: FollowUpVisit;
    household: Household;
    children: Child[];
    existingUpdates?: ChildProgressUpdate[]; // Added prop
    householdChildren?: Child[]; // Added for fallback matching
};

export function ConductVisitForm({ visit, household, children, existingUpdates = [], householdChildren }: ConductVisitFormProps) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            childrenUpdates: children.map((child) => {
                // First try to match by child_id
                let existing = existingUpdates.find(u => u.child_id === child.id);

                // If not found by ID, try to match by child name (fallback for migrated data)
                if (!existing) {
                    const existingUpdateByNameMatch = existingUpdates.find(u => {
                        const childInHousehold = children.find(c => c.id === u.child_id);
                        return childInHousehold && childInHousehold.name === child.name;
                    });
                    if (existingUpdateByNameMatch) {
                        existing = existingUpdateByNameMatch;
                    }
                }

                const childUpdate = {
                    childId: child.id,
                    isStudying: existing ? existing.is_studying : child.isStudying,
                    studyingChallenges: (existing?.studying_challenges ?? '') || '',
                    currentClass: (child.currentClass ?? '') || '',
                    schoolName: (child.schoolName ?? '') || '',
                    notStudyingReason: (existing?.not_studying_reason ?? '') || '',
                    isWorking: existing?.is_working ?? false,
                    workDetails: (existing?.work_details ?? '') || '',
                };

                return childUpdate;
            }),
            annualSurvey:
                visit.visitType === 'Annual'
                    ? {
                        toiletAvailable: household.toiletAvailable || false,
                        waterSupply: household.waterSupply || '',
                        electricity: household.electricity || false,
                        annualIncome: household.annualIncome || 0,
                    }
                    : undefined,
            visitedBy: visit.visitedBy || user?.displayName || '',
            notes: visit.notes || '',
        },
    });

    const { watch } = form;
    const childrenUpdates = watch('childrenUpdates');

    // Reset form when existingUpdates changes (for edit mode)
    useEffect(() => {
        if (existingUpdates && existingUpdates.length > 0) {
            const updatedValues = {
                childrenUpdates: children.map((child) => {
                    let existing = existingUpdates.find(u => u.child_id === child.id);

                    if (!existing) {
                        const existingUpdateByNameMatch = existingUpdates.find(u => {
                            const childInHousehold = children.find(c => c.id === u.child_id);
                            return childInHousehold && childInHousehold.name === child.name;
                        });
                        if (existingUpdateByNameMatch) {
                            existing = existingUpdateByNameMatch;
                        }
                    }

                    return {
                        childId: child.id,
                        isStudying: existing ? existing.is_studying : child.isStudying,
                        studyingChallenges: existing?.studying_challenges ?? '',
                        currentClass: child.currentClass ?? '',
                        schoolName: child.schoolName ?? '',
                        notStudyingReason: existing?.not_studying_reason ?? '',
                        isWorking: existing?.is_working ?? false,
                        workDetails: existing?.work_details ?? '',
                    };
                }),
                visitedBy: visit.visitedBy || user?.displayName || '',
                notes: visit.notes || '',
            };

            form.reset(updatedValues);
        }
    }, [existingUpdates, children, visit, user, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        if (!user) {
            toast({
                variant: "destructive",
                title: "Not Authenticated",
                description: "You must be logged in to complete a visit.",
            });
            setIsSubmitting(false);
            return;
        }

        try {
            const batch = writeBatch(firestore);

            // 1. Update Child Progress Updates
            values.childrenUpdates.forEach(update => {
                // Use deterministic ID: visitId_childId
                const updateId = `${visit.id}_${update.childId}`;
                const progressUpdateRef = doc(firestore, `households/${household.id}/children/${update.childId}/childProgressUpdates`, updateId);

                batch.set(progressUpdateRef, {
                    id: updateId,
                    child_id: update.childId,
                    visitId: visit.id,
                    is_studying: update.isStudying,
                    current_class: update.currentClass || '', // Added for historical accuracy
                    school_name: update.schoolName || '', // Added for historical accuracy
                    not_studying_reason: update.notStudyingReason,
                    is_working: update.isWorking,
                    work_details: update.workDetails,
                    studying_challenges: update.studyingChallenges,
                });

                // Also update the child's main document ONLY if it's a current quarter visit
                // This prevents past data edits from overwriting the child's current status
                const visitDateObj = new Date(visit.visitDate);
                const now = new Date();
                const isCurrentQuarterVisit = getQuarter(visitDateObj) === getQuarter(now) && getYear(visitDateObj) === getYear(now);

                if (isCurrentQuarterVisit) {
                    const childRef = doc(firestore, `households/${household.id}/children/${update.childId}`);
                    const childUpdateData: Partial<Child> = {
                        isStudying: update.isStudying,
                    };

                    if (update.isStudying) {
                        childUpdateData.currentClass = update.currentClass || 'N/A';
                        childUpdateData.schoolName = update.schoolName || 'N/A';
                    }

                    batch.update(childRef, childUpdateData);
                }
            });

            // 2. Update Household
            const householdRef = doc(firestore, 'households', household.id);
            const householdUpdateData: any = {};

            const visitDateObj = new Date(visit.visitDate);
            const now = new Date();
            const isCurrentQuarterVisit = getQuarter(visitDateObj) === getQuarter(now) && getYear(visitDateObj) === getYear(now);

            // Only update main household record for current quarter annual surveys
            if (visit.visitType === 'Annual' && values.annualSurvey && isCurrentQuarterVisit) {
                Object.assign(householdUpdateData, values.annualSurvey);
            }

            // Calculate next follow-up date (3 months from now)
            // Only update if this is a NEW completion AND it's for the CURRENT quarter
            if (visit.status !== 'Completed' && isCurrentQuarterVisit) {
                const nextDue = addMonths(now, 3);
                householdUpdateData.nextFollowupDue = nextDue.toISOString();
            }

            // Only update household if there are changes
            if (Object.keys(householdUpdateData).length > 0) {
                batch.update(householdRef, householdUpdateData);
            }

            // 3. Update the FollowUpVisit status
            const visitRef = doc(firestore, `households/${household.id}/followUpVisits`, visit.id);

            const visitUpdateData: any = {
                status: 'Completed',
                visitedBy: values.visitedBy,
                notes: values.notes,
            };

            // Save annual survey data to visit document for historical accuracy
            if (visit.visitType === 'Annual' && values.annualSurvey) {
                visitUpdateData.toilet_available = values.annualSurvey.toiletAvailable;
                visitUpdateData.water_supply = values.annualSurvey.waterSupply;
                visitUpdateData.electricity = values.annualSurvey.electricity;
                visitUpdateData.annual_income = values.annualSurvey.annualIncome;
            }

            // Only update visitDate to 'now' if it's a current quarter visit
            // For past visits, we keep the original scheduled date to avoid messing up reports
            if (isCurrentQuarterVisit) {
                visitUpdateData.visitDate = now.toISOString();
            }

            batch.update(visitRef, visitUpdateData);

            await batch.commit();

            toast({
                title: 'Visit Completed!',
                description: `Survey for ${household.familyName} has been successfully submitted.`,
            });
            router.push('/follow-ups');
            // router.refresh(); // Removed to prevent offline hanging
        } catch (error) {
            console.error("Error completing visit:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "An error occurred while saving the visit data.",
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
                                    <div className="mt-4 space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`childrenUpdates.${index}.currentClass`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Current Class</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., 5th Standard" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`childrenUpdates.${index}.schoolName`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>School Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Local Public School" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`childrenUpdates.${index}.studyingChallenges`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Any challenges with studies?</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="e.g., Needs help with maths, requests a tutor." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name={`childrenUpdates.${index}.notStudyingReason`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Reason for not studying?</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || undefined}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a reason" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Financial Problems">Financial Problems</SelectItem>
                                                            <SelectItem value="Family Issues">Family Issues</SelectItem>
                                                            <SelectItem value="Lack of Interest">Lack of Interest</SelectItem>
                                                            <SelectItem value="Health Issues">Health Issues</SelectItem>
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
                                {index < children.length - 1 && <Separator className="mt-6" />}
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
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <CardTitle>Visit Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="visitedBy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Visited By *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Name of field worker conducting this visit" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Visit Notes</FormLabel>
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
                    <Button type="submit" size="lg" className="font-headline" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Submitting...' : 'Complete Visit'}
                    </Button>
                </div>
                <OfflineWarning className="mt-4" />
            </form>
        </Form>
    );
}
