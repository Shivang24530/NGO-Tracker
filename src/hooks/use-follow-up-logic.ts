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
  const { data: visits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);
  
  const [logicIsLoading, setLogicIsLoading] = useState(true);

  useEffect(() => {
    // Don't do anything until we know who the user is and if they have a household
    if (isUserLoading || householdLoading) {
      return; 
    }
    
    // If there is no user or no household, there's nothing to do.
    if (!user || !household) {
      setLogicIsLoading(false);
      return;
    }

    // If visits are still loading from the hook, wait.
    if (visitsLoading) {
        return;
    }

    const manageVisits = async () => {
        const visitsColRef = collection(firestore, `households/${user.uid}/followUpVisits`);
        const existingVisits = visits || [];
        const missingQuarters: number[] = [];

        for (let qNum = 1; qNum <= 4; qNum++) {
            const visitExists = existingVisits.some(v => getQuarter(new Date(v.visitDate)) === qNum && getYear(new Date(v.visitDate)) === year);
            if (!visitExists) {
                missingQuarters.push(qNum);
            }
        }

        if (missingQuarters.length > 0) {
            try {
                const batch = writeBatch(firestore);
                missingQuarters.forEach(qNum => {
                    const quarterDate = new Date(year, (qNum - 1) * 3, 15); // Mid-month of the start of the quarter
                    const newVisitRef = doc(visitsColRef);
                    const newVisitData: FollowUpVisit = {
                        id: newVisitRef.id,
                        householdId: user.uid,
                        visitDate: formatISO(quarterDate),
                        visitType: 'Quarterly',
                        status: 'Pending',
                        visitedBy: '',
                        notes: '',
                        childProgressUpdates: [],
                    };
                    batch.set(newVisitRef, newVisitData);
                });
                await batch.commit();
                // The useCollection hook will automatically pick up the new visits,
                // so no need to set state manually.
            } catch (error) {
                console.error("Error creating missing visits:", error);
            }
        }
        setLogicIsLoading(false);
    };

    manageVisits();

  }, [year, user, household, isUserLoading, householdLoading, firestore, visits, visitsLoading]);


  const quarters = useMemo(() => {
    if (!household || !visits) return []; 
    
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
