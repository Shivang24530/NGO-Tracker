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

  const [visits, setVisits] = useState<FollowUpVisit[]>([]);
  const [logicIsLoading, setLogicIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user state is resolved
    }
    // If user is loaded but there is no household, we can stop loading and proceed.
    if (!user || !household) {
      setLogicIsLoading(false);
      setVisits([]);
      return;
    }

    const manageVisitsForYear = async () => {
      setLogicIsLoading(true);
      const visitsColRef = collection(firestore, `households/${user.uid}/followUpVisits`);
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(new Date(year, 11, 31));

      const q = query(
        visitsColRef,
        where('visitDate', '>=', formatISO(yearStart)),
        where('visitDate', '<=', formatISO(yearEnd))
      );

      try {
        const existingVisitsSnapshot = await getDocs(q);
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
              childProgressUpdates: [],
            };
            batch.set(newVisitRef, newVisitData);
            newVisits.push(newVisitData);
            batchHasWrites = true;
          }
        }

        if (batchHasWrites) {
          await batch.commit();
        }

        setVisits([...existingVisits, ...newVisits]);
      } catch (error) {
        console.error("Error managing visits for year:", error);
      } finally {
        setLogicIsLoading(false);
      }
    };

    manageVisitsForYear();
  }, [year, user, household, isUserLoading, firestore]);

  const quarters = useMemo(() => {
    const now = new Date();
    
    return [1, 2, 3, 4].map((qNum) => {
      const quarterDate = new Date(year, (qNum - 1) * 3, 1);
      const start = startOfQuarter(quarterDate);
      const end = endOfQuarter(quarterDate);

      const visitForQuarter = visits.find(
        (v) => getQuarter(new Date(v.visitDate)) === qNum
      );

      const isCompleted = visitForQuarter?.status === 'Completed';
      const currentQuarter = getQuarter(now);
      const isOngoing = year === now.getFullYear() && qNum === currentQuarter && !isCompleted;
      
      let status: 'Completed' | 'Ongoing' | 'Pending' = 'Pending';
      if (isCompleted) {
        status = 'Completed';
      } else if (isOngoing) {
        status = 'Ongoing';
      }
      
      const total = household ? 1 : 0;
      const completedCount = household && isCompleted ? 1 : 0;

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

  const isLoading = isUserLoading || householdLoading || logicIsLoading;

  return { quarters, household, children, isLoading };
}
