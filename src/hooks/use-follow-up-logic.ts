
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
} from 'firebase/firestore';
import type { Household, Child, FollowUpVisit } from '@/lib/types';
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

  // Effect for fetching nested children and visits data
  useEffect(() => {
    if (!firestore || households === null) {
      setChildrenLoading(true);
      setVisitsLoading(true);
      return;
    }

    if (households.length === 0) {
      setAllChildren([]);
      setAllVisits([]);
      setChildrenLoading(false);
      setVisitsLoading(false);
      return;
    }

    const fetchChildAndVisitData = async () => {
      setChildrenLoading(true);
      setVisitsLoading(true);

      const childrenPromises = households.map(h => 
          getDocs(collection(firestore, 'households', h.id, 'children'))
      );
      
      const visitsPromises = households.map(h => 
          getDocs(query(
              collection(firestore, 'households', h.id, 'followUpVisits'),
              where('visitDate', '>=', startOfYear(new Date(year, 0, 1)).toISOString()),
              where('visitDate', '<=', endOfYear(new Date(year, 11, 31)).toISOString())
          ))
      );

      try {
          const [childrenSnapshots, visitsSnapshots] = await Promise.all([
              Promise.all(childrenPromises),
              Promise.all(visitsPromises)
          ]);

          const childrenData = childrenSnapshots.flatMap(snap => 
              snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child))
          );
          const visitsData = visitsSnapshots.flatMap(snap => 
              snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FollowUpVisit))
          );

          setAllChildren(childrenData);
          setAllVisits(visitsData);
      } catch (error) {
          console.error("Error fetching child and visit data:", error);
      } finally {
          setChildrenLoading(false);
          setVisitsLoading(false);
      }
    };
    
    fetchChildAndVisitData();

  }, [firestore, households, year]);
  
  // Effect for initializing missing visits for the selected year
  useEffect(() => {
    const initializeVisits = async () => {
        if (!firestore || !user || !households || households.length === 0) return;

        for (const h of households) {
            // CRITICAL: Only allow owners to create visits to align with security rules
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
    if (!allVisits || !households) return [];

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
      
      return {
        id: qNum,
        name: `Quarter ${qNum} (${start.toLocaleString('default', {
          month: 'short',
        })} - ${end.toLocaleString('default', { month: 'short' })})`,
        status,
        completed: completedCount,
        total: totalCount,
        visits: visitsForQuarter,
      };
    });
  }, [year, allVisits, households]);

  const isLoading = isUserLoading || householdsLoading || visitsLoading || childrenLoading;

  return { quarters, households, children: allChildren, visits: allVisits, isLoading };
}
