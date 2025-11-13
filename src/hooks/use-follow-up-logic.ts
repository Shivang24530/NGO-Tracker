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

  const householdRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'households', user.uid) : null),
    [firestore, user]
  );
  const { data: household, isLoading: householdLoading } =
    useDoc<Household>(householdRef);

  const childrenQuery = useMemoFirebase(
    () =>
      user?.uid
        ? collection(firestore, `households/${user.uid}/children`)
        : null,
    [firestore, user]
  );
  const { data: children, isLoading: childrenLoading } =
    useCollection<Child>(childrenQuery);

  const visitsQuery = useMemoFirebase(
    () =>
      user?.uid
        ? query(
            collection(firestore, `households/${user.uid}/followUpVisits`),
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
    [firestore, user, year, dataVersion] // Add dataVersion to deps
  );

  const {
    data: visits,
    isLoading: visitsLoading,
    error: visitsError,
  } = useCollection<FollowUpVisit>(visitsQuery);

  const [isInitializing, setIsInitializing] = useState(false);

  // This effect will run once when the user and year are available.
  // It checks for missing visits and creates them if needed.
  useEffect(() => {
    const initializeVisits = async () => {
      if (!user?.uid || !firestore || visitsLoading || household === undefined) {
        // Wait for user, firestore, and initial visit load to complete.
        // Also wait if household is still loading (undefined).
        return;
      }

      // If no household is registered, there's nothing to do.
      if (household === null) {
        return;
      }
      
      setIsInitializing(true);
      
      try {
        const visitsColRef = collection(firestore, `households/${user.uid}/followUpVisits`);
        const yearQuery = query(
          visitsColRef,
          where('visitDate', '>=', startOfYear(new Date(year, 0, 1)).toISOString()),
          where('visitDate', '<=', endOfYear(new Date(year, 11, 31)).toISOString())
        );

        const existingVisitsSnapshot = await getDocs(yearQuery);
        const existingVisits = existingVisitsSnapshot.docs.map(d => d.data() as FollowUpVisit);

        const existingQuarters = new Set(
          existingVisits.map(v => getQuarter(new Date(v.visitDate)))
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
              householdId: user.uid,
              visitDate: formatISO(quarterDate),
              visitType: qNum === 4 ? 'Annual' : 'Quarterly',
              status: 'Pending',
              visitedBy: '',
              notes: '',
            };
            batch.set(newVisitRef, newVisitData);
          });
          await batch.commit();
          // Trigger a re-fetch by updating the dataVersion state
          setDataVersion(prev => prev + 1);
        }
      } catch (error) {
        console.error('Failed to initialize follow-up visits:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeVisits();
  // We want this to run when user or year changes, or when the initial visit load completes.
  }, [user, year, firestore, visitsLoading, household]);


  const quarters = useMemo(() => {
    if (!visits) return [];

    return [1, 2, 3, 4].map((qNum) => {
      const quarterDate = new Date(year, (qNum - 1) * 3, 1);
      const start = startOfQuarter(quarterDate);
      const end = endOfQuarter(quarterDate);

      const visitForQuarter = visits.find(
        (v) => getQuarter(new Date(v.visitDate)) === qNum && getYear(new Date(v.visitDate)) === year
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
  }, [year, visits]);

  const isLoading = isUserLoading || householdLoading || visitsLoading || isInitializing;

  return { quarters, household, children, visits, isLoading };
}
