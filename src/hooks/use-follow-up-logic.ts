
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useFirestore,
  useUser,
  useCollection,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import {
  collection,
  query,
  where,
  doc,
  writeBatch,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import type { Household, Child, FollowUpVisit, ChildProgressUpdate } from '@/lib/types';
import {
  startOfQuarter,
  endOfQuarter,
  getQuarter,
  startOfYear,
  endOfYear,
  getYear,
  formatISO,
} from 'date-fns';

export function useFollowUpLogic(year: number) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const householdsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'households'), where('ownerId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);

  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [allVisits, setAllVisits] = useState<FollowUpVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [allProgressUpdates, setAllProgressUpdates] = useState<ChildProgressUpdate[]>([]);
  const [progressUpdatesLoading, setProgressUpdatesLoading] = useState(true);

  useEffect(() => {
    if (!firestore || households === null) {
      setChildrenLoading(true);
      setVisitsLoading(true);
      setProgressUpdatesLoading(true);
      return;
    }

    if (households.length === 0) {
      setAllChildren([]);
      setAllVisits([]);
      setAllProgressUpdates([]);
      setChildrenLoading(false);
      setVisitsLoading(false);
      setProgressUpdatesLoading(false);
      return;
    }

    setChildrenLoading(true);
    setVisitsLoading(true);
    setProgressUpdatesLoading(true);

    const unsubscribes: (() => void)[] = [];

    households.forEach(h => {
      const childrenQuery = collection(firestore, 'households', h.id, 'children');
      const childrenUnsubscribe = onSnapshot(childrenQuery, (snapshot) => {
        const childrenData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Child));
        setAllChildren(prev => [...prev.filter(c => c.householdId !== h.id), ...childrenData]);
      });
      unsubscribes.push(childrenUnsubscribe);

      const visitsQuery = query(
        collection(firestore, 'households', h.id, 'followUpVisits'),
        where('visitDate', '>=', startOfYear(new Date(year, 0, 1)).toISOString()),
        where('visitDate', '<=', endOfYear(new Date(year, 11, 31)).toISOString())
      );
      const visitsUnsubscribe = onSnapshot(visitsQuery, (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FollowUpVisit));
        setAllVisits(prev => [...prev.filter(v => v.householdId !== h.id), ...visitsData]);
      });
      unsubscribes.push(visitsUnsubscribe);

      const childProgressQuery = collection(firestore, 'households', h.id, 'children');
      onSnapshot(childProgressQuery, (childSnapshot) => {
        childSnapshot.docs.forEach(childDoc => {
          const progressUpdatesQuery = collection(firestore, `households/${h.id}/children/${childDoc.id}/childProgressUpdates`);
          const progressUnsubscribe = onSnapshot(progressUpdatesQuery, (progressSnapshot) => {
            const progressData = progressSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChildProgressUpdate));
            setAllProgressUpdates(prev => [...prev.filter(p => p.childId !== childDoc.id), ...progressData]);
          });
          unsubscribes.push(progressUnsubscribe);
        });
      });
    });
    
    setChildrenLoading(false);
    setVisitsLoading(false);
    setProgressUpdatesLoading(false);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [firestore, households, year]);
  
  useEffect(() => {
    const initializeVisits = async () => {
        if (!firestore || !user || !households || households.length === 0) return;

        for (const h of households) {
            if (h.ownerId !== user.uid) {
                continue;
            }
            
            try {
                const visitsColRef = collection(firestore, `households/${h.id}/followUpVisits`);
                const yearQuery = query(
                    visitsColRef,
                    where('visitDate', '>=', startOfYear(new Date(year, 0, 1)).toISOString()),
                    where('visitDate', '<=', endOfYear(new Date(year, 11, 31)).toISOString())
                );
                
                const existingVisitsSnapshot = await getDocs(yearQuery);
                
                if (existingVisitsSnapshot.size < 4) {
                    const existingQuarters = new Set(
                        existingVisitsSnapshot.docs.map(d => getQuarter(new Date((d.data() as FollowUpVisit).visitDate)))
                    );
                    
                    const batch = writeBatch(firestore);
                    let batchHasWrites = false;

                    for (let qNum = 1; qNum <= 4; qNum++) {
                        if (!existingQuarters.has(qNum)) {
                            const quarterDate = new Date(year, (qNum - 1) * 3 + 1, 15);
                            const newVisitRef = doc(visitsColRef);
                            const newVisitData: Omit<FollowUpVisit, 'childProgressUpdates'> = {
                                id: newVisitRef.id,
                                householdId: h.id,
                                visitDate: formatISO(quarterDate),
                                visitType: qNum === 4 ? 'Annual' : 'Quarterly',
                                status: 'Pending',
                                visitedBy: '',
                                notes: '',
                            };
                            batch.set(newVisitRef, newVisitData);
                            batchHasWrites = true;
                        }
                    }
                    if (batchHasWrites) {
                       batch.commit().catch(error => {
                           console.error(`Failed to commit batch for household ${h.id}:`, error);
                           const permissionError = new FirestorePermissionError({
                               path: `households/${h.id}/followUpVisits`,
                               operation: 'create',
                               requestResourceData: { note: 'Batch creation of visits' }
                           });
                           errorEmitter.emit('permission-error', permissionError);
                       });
                    }
                }
            } catch (error) {
                console.error(`Failed to initialize visits for household ${h.id}:`, error);
            }
        }
    };

    initializeVisits();
  }, [firestore, user, households, year]);

  const quarters = useMemo(() => {
    if (!households || !allChildren.length) return [];

    const getProgressForQuarter = (q: number) => {
      const visits = allVisits.filter(v => getQuarter(new Date(v.visitDate)) === q && getYear(new Date(v.visitDate)) === year);
      const visitIds = new Set(visits.map(v => v.id));
      return allProgressUpdates.filter(p => visitIds.has(p.visit_id));
    };

    return [1, 2, 3, 4].map((qNum) => {
      const quarterDate = new Date(year, (qNum - 1) * 3, 1);
      const start = startOfQuarter(quarterDate);
      const end = endOfQuarter(quarterDate);

      const visitsForQuarter = allVisits.filter(
        (v) => getQuarter(new Date(v.visitDate)) === qNum && getYear(new Date(v.visitDate)) === year
      );

      const completedCount = visitsForQuarter.filter(v => v.status === 'Completed').length;
      const totalCount = households.length;
      const allCompleted = totalCount > 0 && completedCount === totalCount;

      let status: 'Completed' | 'Pending' | 'Partially Completed' = 'Pending';
      if (allCompleted) {
        status = 'Completed';
      } else if (completedCount > 0) {
        status = 'Partially Completed';
      }

      // New comparison logic
      let improved = 0;
      let declined = 0;
      let noChange = 0;

      if (qNum > 1) {
        const currentQuarterProgress = getProgressForQuarter(qNum);
        const previousQuarterProgress = getProgressForQuarter(qNum - 1);

        const currentProgressByChild = new Map(currentQuarterProgress.map(p => [p.childId, p]));
        const previousProgressByChild = new Map(previousQuarterProgress.map(p => [p.childId, p]));

        allChildren.forEach(child => {
          const current = currentProgressByChild.get(child.id);
          const previous = previousProgressByChild.get(child.id);

          if (current && previous) {
            if (current.is_studying && !previous.is_studying) {
              improved++;
            } else if (!current.is_studying && previous.is_studying) {
              declined++;
            } else {
              noChange++;
            }
          }
        });
      }
      
      const currentQuarterProgress = getProgressForQuarter(qNum);
      const childrenWithData = new Set(currentQuarterProgress.map(p => p.childId));
      const notRecorded = allChildren.length - childrenWithData.size;

      return {
        id: qNum,
        name: `Quarter ${qNum} (${start.toLocaleString('default', {
          month: 'short',
        })} - ${end.toLocaleString('default', { month: 'short' })})`,
        status,
        completed: completedCount,
        total: totalCount,
        visits: visitsForQuarter,
        improved,
        declined,
        noChange,
        notRecorded,
      };
    });
  }, [year, allVisits, households, allChildren, allProgressUpdates]);

  const isLoading = isUserLoading || householdsLoading || visitsLoading || childrenLoading || progressUpdatesLoading;

  return { quarters, households, children: allChildren, visits: allVisits, progressUpdates: allProgressUpdates, isLoading };
}
