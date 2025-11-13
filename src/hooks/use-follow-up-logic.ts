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
} from 'firebase/firestore';
import type { Household, Child, FollowUpVisit } from '@/lib/types';
import {
  startOfQuarter,
  endOfQuarter,
  getQuarter,
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
          where('visitDate', '>=', startOfYear(new Date(year, 0, 1)).toISOString()),
          where('visitDate', '<=', endOfYear(new Date(year, 11, 31)).toISOString())
      ) : null,
      [firestore, user, year]
  );
  const { data: visits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);

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

  const isLoading = isUserLoading || householdLoading || visitsLoading;

  return { quarters, household, children, visits, isLoading };
}
