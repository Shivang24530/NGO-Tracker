'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function FixChildIdsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [isFixing, setIsFixing] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const [totalFixed, setTotalFixed] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const addLog = (message: string) => {
        setResults(prev => [...prev, message]);
        console.log(message);
    };

    const fixChildIds = async () => {
        if (!firestore || !user) {
            addLog('[ERROR] Not logged in or Firestore not available');
            return;
        }

        setIsFixing(true);
        setResults([]);
        setTotalFixed(0);
        setIsComplete(false);

        try {
            addLog('[START] Beginning child ID fix...');

            // Get all households for this user
            const householdsQuery = query(
                collection(firestore, 'households'),
                where('ownerId', '==', user.uid)
            );
            const householdsSnapshot = await getDocs(householdsQuery);

            addLog(`[INFO] Found ${householdsSnapshot.size} households`);

            let fixedCount = 0;

            for (const householdDoc of householdsSnapshot.docs) {
                const householdId = householdDoc.id;
                const householdName = householdDoc.data().familyName;
                addLog(`[HOUSEHOLD] Processing: ${householdName} (${householdId})`);

                // Get all children for this household
                const childrenSnapshot = await getDocs(
                    collection(firestore, `households/${householdId}/children`)
                );

                addLog(`[INFO] Found ${childrenSnapshot.size} children in ${householdName}`);

                // For each child, check their progress updates
                for (const childDoc of childrenSnapshot.docs) {
                    const childId = childDoc.id;
                    const childName = childDoc.data().name;

                    const progressUpdatesSnapshot = await getDocs(
                        collection(firestore, `households/${householdId}/children/${childId}/childProgressUpdates`)
                    );

                    for (const progressDoc of progressUpdatesSnapshot.docs) {
                        const progressData = progressDoc.data();

                        // If the child_id in the progress update doesn't match the actual child ID
                        if (progressData.child_id !== childId) {
                            addLog(`[MISMATCH] ${childName}: stored=${progressData.child_id}, actual=${childId}`);

                            // Update the progress update with the correct child_id
                            await updateDoc(progressDoc.ref, {
                                child_id: childId
                            });

                            fixedCount++;
                            addLog(`[FIXED] Updated progress update ${progressDoc.id} for ${childName}`);
                        }
                    }
                }
            }

            setTotalFixed(fixedCount);
            setIsComplete(true);
            addLog(`[COMPLETE] Fixed ${fixedCount} progress updates!`);

        } catch (error) {
            console.error('Error fixing child IDs:', error);
            addLog(`[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isComplete ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-orange-600" />
                        )}
                        Fix Child ID Mismatches
                    </CardTitle>
                    <CardDescription>
                        This tool will fix any mismatched child_id values in your survey data.
                        This is a one-time fix for existing data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                            <strong>What this does:</strong> Updates all child progress updates to use the correct child IDs
                            based on the current children in your database. This fixes the issue where survey data doesn't
                            load when editing.
                        </p>
                    </div>

                    <Button
                        onClick={fixChildIds}
                        disabled={isFixing || !firestore || !user}
                        size="lg"
                        className="w-full"
                    >
                        {isFixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isFixing ? 'Fixing...' : 'Run Fix'}
                    </Button>

                    {isComplete && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800 font-semibold">
                                ✓ Complete! Fixed {totalFixed} progress updates.
                            </p>
                            <p className="text-sm text-green-700 mt-2">
                                You can now go back and try editing your surveys again. The data should load correctly.
                            </p>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Log:</h3>
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-xs">
                                {results.map((log, i) => (
                                    <div key={i} className="mb-1">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
