'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useFirestore,
  useUser,
  useCollection,
  useDoc,
  useMemoFirebase,
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
  formatISO,
  startOfYear,
  endOfYear,
  getYear,
} from 'date-fns';

export function useFollowUpLogic(year: number) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const householdRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'households', user.uid) : null),
    [firestore, user]
  );
  const { data: household, isLoading: householdLoading } =
    useDoc<Household>(householdRef);

  const childrenQuery = useMemoFirebase(
    () =>
      user?.uid ? collection(firestore, `households/${user.uid}/children`) : null,
    [firestore, user]
  );
  const { data: children, isLoading: childrenLoading } =
    useCollection<Child>(childrenQuery);

  const visitsQuery = useMemoFirebase(
      () => user?.uid ? query(
          collection(firestore, `households/${user.uid}/followUpVisits`),
          where('visitDate', '>=', formatISO(startOfYear(new Date(year, 0, 1)))),
          where('visitDate', '<=', formatISO(endOfYear(new Date(year, 11, 31))))
      ) : null,
      [firestore, user, year]
  );
  const { data: initialVisits, isLoading: visitsLoading, error: visitsError } = useCollection<FollowUpVisit>(visitsQuery);
  
  const [visits, setVisits] = useState<FollowUpVisit[]>([]);
  const [logicIsLoading, setLogicIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading || householdLoading) {
      return; 
    }
    
    if (!user || !household) {
      setLogicIsLoading(false);
      setVisits([]);
      return;
    }

    const manageVisitsForYear = async () => {
      setLogicIsLoading(true);
      const visitsColRef = collection(firestore, `households/${user.uid}/followUpVisits`);
      
      try {
        const yearStart = startOfYear(new Date(year, 0, 1));
        const yearEnd = endOfYear(new Date(year, 11, 31));

        const existingVisitsQuery = query(
            visitsColRef,
            where('visitDate', '>=', formatISO(yearStart)),
            where('visitDate', '<=', formatISO(yearEnd))
        );

        const existingVisitsSnapshot = await getDocs(existingVisitsQuery);
        const existingVisits = existingVisitsSnapshot.docs.map(
          (d) => d.data() as FollowUpVisit
        );

        const batch = writeBatch(firestore);
        const newVisits: FollowUpVisit[] = [];
        let batchHasWrites = false;

        for (let qNum = 1; qNum <= 4; qNum++) {
          const quarterDate = new Date(year, (qNum - 1) * 3, 15);
          const visitExists = existingVisits.some(
            (v) => getQuarter(new Date(v.visitDate)) === qNum
          );

          if (!visitExists) {
            const newVisitRef = doc(visitsColRef);
            const newVisitData: FollowUpVisit = {
              id: newVisitRef.id,
              householdId: user.uid,
              visitDate: formatISO(quarterDate),
              visitType: 'Quarterly',
              status: 'Pending',
              visitedBy: '',
              notes: '',
              childProgressUpdates: [], // Initialize as empty
            };
            batch.set(newVisitRef, newVisitData);
            newVisits.push(newVisitData);
            batchHasWrites = true;
          }
        }

        if (batchHasWrites) {
          await batch.commit();
          // After committing, re-fetch all visits for the year to have a consistent state
           const allVisitsSnapshot = await getDocs(existingVisitsQuery);
           const allVisits = allVisitsSnapshot.docs.map(d => d.data() as FollowUpVisit);
           setVisits(allVisits);
        } else {
          setVisits(existingVisits);
        }

      } catch (error) {
        console.error("Error managing visits for year:", error);
      } finally {
        setLogicIsLoading(false);
      }
    };
    
    // This effect now combines creation logic with listening to live updates.
    // When initialVisits from useCollection changes, we re-evaluate.
    if(initialVisits) {
        const allCurrentYearVisits = [...initialVisits];
        const missingQuarters: number[] = [];
        for (let qNum = 1; qNum <= 4; qNum++) {
            const visitExists = initialVisits.some(v => getQuarter(new Date(v.visitDate)) === qNum && getYear(new Date(v.visitDate)) === year);
            if (!visitExists) {
                missingQuarters.push(qNum);
            }
        }

        if(missingQuarters.length > 0) {
            const createMissingVisits = async () => {
                const batch = writeBatch(firestore);
                const visitsColRef = collection(firestore, `households/${user.uid}/followUpVisits`);
                
                missingQuarters.forEach(qNum => {
                    const quarterDate = new Date(year, (qNum - 1) * 3, 15);
                    const newVisitRef = doc(visitsColRef);
                    const newVisitData: FollowUpVisit = {
                        id: newVisitRef.id, householdId: user.uid,
                        visitDate: formatISO(quarterDate), visitType: 'Quarterly',
                        status: 'Pending', visitedBy: '', notes: '', childProgressUpdates: []
                    };
                    batch.set(newVisitRef, newVisitData);
                    allCurrentYearVisits.push(newVisitData);
                });
                await batch.commit();
                // No need to set state here, the onSnapshot from useCollection will trigger a re-render with the new data.
            };
            createMissingVisits();
        }
        setVisits(allCurrentYearVisits.sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()));
        setLogicIsLoading(false);
    } else if (!visitsLoading) {
        // If initialVisits is null and we are not loading, it means there are no visits yet.
        // So we should create them.
        manageVisitsForYear();
    }


  }, [year, user, household, isUserLoading, householdLoading, firestore, initialVisits, visitsLoading]);


  const quarters = useMemo(() => {
    if (!household) return []; 
    
    const now = new Date();
    
    return [1, 2, 3, 4].map((qNum) => {
      const quarterDate = new Date(year, (qNum - 1) * 3, 1);
      const start = startOfQuarter(quarterDate);
      const end = endOfQuarter(quarterDate);

      const visitForQuarter = visits.find(
        (v) => getQuarter(new Date(v.visitDate)) === qNum
      );

      const isCompleted = visitForQuarter?.status === 'Completed';
      
      let status: 'Completed' | 'Pending' = 'Pending';
      if (isCompleted) {
        status = 'Completed';
      }
      
      const total = 1;
      const completedCount = isCompleted ? 1 : 0;

      return {
        id: qNum,
        name: `Quarter ${qNum} (${start.toLocaleString('default', {
          month: 'short',
        })} - ${end.toLocaleString('default', { month: 'short' })})`,
        status,
        completed: completedCount,
        total: total,
        visit: visitForQuarter,
      };
    });
  }, [year, visits, household]);

  const isLoading = isUserLoading || householdLoading || visitsLoading || logicIsLoading;

  return { quarters, household, children, visits, isLoading };
}
