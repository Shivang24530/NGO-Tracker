'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useFirestore,
  useUser,
  useCollection,
  useDoc,
  useMemoFirebase,
  addDocumentNonBlocking,
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

  // Fetch the single household for the user
  const householdRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'households', user.uid) : null),
    [firestore, user]
  );
  const { data: household, isLoading: householdLoading } =
    useDoc<Household>(householdRef);

  // Fetch all children for that household
  const childrenQuery = useMemoFirebase(
    () =>
      user?.uid ? collection(firestore, `households/${user.uid}/children`) : null,
    [firestore, user]
  );
  const { data: children, isLoading: childrenLoading } =
    useCollection<Child>(childrenQuery);

  const [visits, setVisits] = useState<FollowUpVisit[]>([]);
  const [logicIsLoading, setLogicIsLoading] = useState(true);

  // Effect to manage visit creation and fetching for the selected year
  useEffect(() => {
    if (isUserLoading || !user || !household) {
        if (!isUserLoading && !household) {
            // If user is loaded but there's no household, we can stop loading.
            setLogicIsLoading(false);
        }
        return;
    }

    const manageVisitsForYear = async () => {
      setLogicIsLoading(true);
      const visitsColRef = collection(firestore, `households/${user.uid}/followUpVisits`);
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(new Date(year, 11, 31));

      // 1. Fetch existing visits for the year
      const q = query(
        visitsColRef,
        where('visitDate', '>=', formatISO(yearStart)),
        where('visitDate', '<=', formatISO(yearEnd))
      );
      const existingVisitsSnapshot = await getDocs(q);
      const existingVisits = existingVisitsSnapshot.docs.map(
        (d) => d.data() as FollowUpVisit
      );

      // 2. Check for missing visits and create them
      const batch = writeBatch(firestore);
      const newVisits: FollowUpVisit[] = [];
      let batchHasWrites = false;

      for (let qNum = 1; qNum <= 4; qNum++) {
        const quarterDate = new Date(year, (qNum - 1) * 3, 15); // Use mid-quarter date
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

      // 3. Commit batch if needed
      if (batchHasWrites) {
        await batch.commit();
      }

      // 4. Set the complete list of visits for the year
      setVisits([...existingVisits, ...newVisits]);
      setLogicIsLoading(false);
    };

    manageVisitsForYear();
  }, [year, user, household, isUserLoading, firestore]);

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
      const currentQuarter = getQuarter(now);
      const isOngoing = year === now.getFullYear() && qNum === currentQuarter;
      
      let status: 'Completed' | 'Ongoing' | 'Pending' = 'Pending';
      if (isCompleted) {
        status = 'Completed';
      } else if (isOngoing) {
        status = 'Ongoing';
      }

      return {
        id: qNum,
        name: `Quarter ${qNum} (${start.toLocaleString('default', {
          month: 'short',
        })} - ${end.toLocaleString('default', { month: 'short' })})`,
        status,
        completed: isCompleted ? 1 : 0,
        total: 1, // Only one household per user
        visit: visitForQuarter,
      };
    });
  }, [year, visits, household]);

  const isLoading = isUserLoading || householdLoading || childrenLoading || logicIsLoading;

  return { quarters, household, children, isLoading };
}
