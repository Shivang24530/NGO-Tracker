
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  collectionGroup,
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
  const [dataVersion, setDataVersion] = useState(0); // State to trigger re-fetch

  const householdsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'households')) : null),
    [firestore]
  );
  const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);

  const childrenQuery = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'children') : null),
    [firestore]
  );
  const { data: children, isLoading: childrenLoading } = useCollection<Child>(childrenQuery);
  
  const visitsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collectionGroup(firestore, 'followUpVisits'),
            where(
              'visitDate',
              '>=',
              startOfYear(new Date(year, 0, 1)).toISOString()
            ),
            where(
              'visitDate',
              '<=',
              endOfYear(new Date(year, 11, 31)).toISOString()
            )
          )
        : null,
    [firestore, year, dataVersion] // Add dataVersion to deps
  );

  const {
    data: visits,
    isLoading: visitsLoading,
    error: visitsError,
  } = useCollection<FollowUpVisit>(visitsQuery);

  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const initializeVisitsForHousehold = async (h: Household) => {
      if (!user?.uid || !firestore) return;

      try {
        const visitsColRef = collection(firestore, `households/${h.id}/followUpVisits`);
        const yearQuery = query(
          visitsColRef,
          where('visitDate', '>=', startOfYear(new Date(year, 0, 1)).toISOString()),
          where('visitDate', '<=', endOfYear(new Date(year, 11, 31)).toISOString())
        );

        const existingVisitsSnapshot = await getDocs(yearQuery);
        if (existingVisitsSnapshot.size >= 4) {
          // All visits for the year already exist.
          return;
        }

        const existingQuarters = new Set(
          existingVisitsSnapshot.docs.map(d => getQuarter(new Date((d.data() as FollowUpVisit).visitDate)))
        );
        
        const missingQuarters: number[] = [];
        for (let qNum = 1; qNum <= 4; qNum++) {
          if (!existingQuarters.has(qNum)) {
            missingQuarters.push(qNum);
          }
        }

        if (missingQuarters.length > 0) {
          const batch = writeBatch(firestore);
          missingQuarters.forEach((qNum) => {
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
          });
          await batch.commit();
          return true; // Indicates an update happened
        }
      } catch (error) {
        console.error(`Failed to initialize visits for household ${h.id}:`, error);
      }
      return false; // No update happened
    };

    const runInitialization = async () => {
      if (!households || visitsLoading || isInitializing) return;
      
      setIsInitializing(true);
      let didUpdate = false;
      for (const h of households) {
        const updated = await initializeVisitsForHousehold(h);
        if (updated) didUpdate = true;
      }

      if (didUpdate) {
        setDataVersion(v => v + 1); // Trigger re-fetch if any visits were created
      }
      setIsInitializing(false);
    };

    runInitialization();

  }, [households, year, firestore, user, visitsLoading, isInitializing]); // Reruns if households data changes

  const quarters = useMemo(() => {
    if (!visits || !households) return [];

    return [1, 2, 3, 4].map((qNum) => {
      const quarterDate = new Date(year, (qNum - 1) * 3, 1);
      const start = startOfQuarter(quarterDate);
      const end = endOfQuarter(quarterDate);

      const visitsForQuarter = visits.filter(
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
      
      // Find the specific visit for the first household for navigation purposes.
      // This is a simplification; a multi-household app might need a different approach.
      const visit = households.length > 0 ? visitsForQuarter.find(v => v.householdId === households[0].id) : undefined;
      
      return {
        id: qNum,
        name: `Quarter ${qNum} (${start.toLocaleString('default', {
          month: 'short',
        })} - ${end.toLocaleString('default', { month: 'short' })})`,
        status,
        completed: completedCount,
        total: totalCount,
        visits: visitsForQuarter, // All visits in this quarter for all households
        visit: visit, // A representative visit for actions
      };
    });
  }, [year, visits, households]);

  const isLoading = isUserLoading || householdsLoading || visitsLoading || isInitializing;

  // Simplified for now, just returning the first household for display purposes
  const household = households ? households[0] : null;

  // Returning households and children for broader use in components
  return { quarters, household, households, children, visits, isLoading };
}
