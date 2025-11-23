
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
  parseISO,
  isWithinInterval,
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
    
    // Reset state on household change to avoid stale data
    setAllChildren([]);
    setAllVisits([]);
    setAllProgressUpdates([]);


    const unsubscribes: (() => void)[] = [];

    households.forEach(h => {
      // Children listener
      const childrenQuery = collection(firestore, 'households', h.id, 'children');
      const childrenUnsubscribe = onSnapshot(childrenQuery, (snapshot) => {
        const childrenData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Child));
        setAllChildren(prev => [...prev.filter(c => c.householdId !== h.id), ...childrenData]);
        
        // Nested listener for progress updates
        snapshot.docs.forEach(childDoc => {
            const progressUpdatesQuery = collection(firestore, `households/${h.id}/children/${childDoc.id}/childProgressUpdates`);
            const progressUnsubscribe = onSnapshot(progressUpdatesQuery, (progressSnapshot) => {
                const progressData = progressSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChildProgressUpdate));
                setAllProgressUpdates(prev => [...prev.filter(p => p.child_id !== childDoc.id), ...progressData]);
            }, (error) => console.error(`Error fetching progress for child ${childDoc.id}:`, error));
            unsubscribes.push(progressUnsubscribe);
        });

      }, (error) => console.error(`Error fetching children for household ${h.id}:`, error));
      unsubscribes.push(childrenUnsubscribe);

      // Visits listener for the selected year
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(new Date(year, 11, 31));

      const visitsQuery = query(
        collection(firestore, 'households', h.id, 'followUpVisits'),
        where('visitDate', '>=', formatISO(start)),
        where('visitDate', '<=', formatISO(end))
      );
      const visitsUnsubscribe = onSnapshot(visitsQuery, (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FollowUpVisit));
        setAllVisits(prev => [...prev.filter(v => v.householdId !== h.id), ...visitsData]);
      }, (error) => console.error(`Error fetching visits for household ${h.id}:`, error));
      unsubscribes.push(visitsUnsubscribe);
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
                    where('visitDate', '>=', formatISO(startOfYear(new Date(year, 0, 1)))),
                    where('visitDate', '<=', formatISO(endOfYear(new Date(year, 11, 31))))
                );
                
                const existingVisitsSnapshot = await getDocs(yearQuery);
                
                if (existingVisitsSnapshot.size < 4) {
                    const existingQuarters = new Set(
                        existingVisitsSnapshot.docs.map(d => getQuarter(parseISO((d.data() as FollowUpVisit).visitDate)))
                    );
                    
                    const batch = writeBatch(firestore);
                    let batchHasWrites = false;

                     // Compute the household's creation quarter (if available), otherwise allow all quarters.
                    const parseDateSafe = (val: any) => {
                      if (!val) return null;
                      if (typeof val === 'object' && typeof (val as any).toDate === 'function') return (val as any).toDate();
                      if (typeof val === 'string') return parseISO(val);
                      if (val instanceof Date) return val;
                      return null;
                    };

                    const createdAtDate = parseDateSafe((h as any).createdAt);
                    const createdQuarter = createdAtDate ? getQuarter(createdAtDate) : 1;
                    const createdYear = createdAtDate ? getYear(createdAtDate) : year;

                    // Only consider the quarters of the same year. If created at a different year, fallback to full-year behavior.
                    const startQ = (createdYear === year) ? createdQuarter : 1;

                    for (let qNum = startQ; qNum <= 4; qNum++) {
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
    if (!households) return [];

    // helper: parse createdAt / visitDate values to Date safely
    const parseDateSafe = (val: any): Date | null => {
      if (!val) return null;
      // Firestore Timestamp
      if (typeof val === 'object' && typeof (val as any).toDate === 'function') {
        try { return (val as any).toDate(); } catch { return null; }
      }
      // ISO string
      if (typeof val === 'string') {
        try { return parseISO(val); } catch { return null; }
      }
      // native Date
      if (val instanceof Date) return val;
      return null;
    };

    // build earliest visit map (householdId -> earliest visit Date)
    const earliestVisitByHousehold = new Map<string, Date>();
    allVisits.forEach(v => {
      const vd = parseDateSafe(v.visitDate);
      if (!vd) return;
      const prev = earliestVisitByHousehold.get(v.householdId);
      if (!prev || vd < prev) earliestVisitByHousehold.set(v.householdId, vd);
    });

    // Precompute an "effectiveCreatedDate" for each household to avoid repeating logic
    const effectiveCreatedDateByHousehold = new Map<string, Date | null>();
    households.forEach(h => {
      const created = parseDateSafe(h.createdAt);
      if (created) {
        effectiveCreatedDateByHousehold.set(h.id, created);
        return;
      }
      const earliestVisit = earliestVisitByHousehold.get(h.id) ?? null;
      if (earliestVisit) {
        effectiveCreatedDateByHousehold.set(h.id, earliestVisit);
        return;
      }
      // no reliable date -> null (treat as unknown; will be excluded from past quarters)
      effectiveCreatedDateByHousehold.set(h.id, null);
    });
    
    const getProgressForQuarter = (visitIds: Set<string>) =>
      allProgressUpdates.filter(p => visitIds.has(p.visitId));

    return [1, 2, 3, 4].map((qNum) => {
      const quarterDate = new Date(year, (qNum - 1) * 3, 1);
      const start = startOfQuarter(quarterDate);
      const end = endOfQuarter(quarterDate);

      // Determine households that existed on or before `end`
      const householdsInQuarter = households.filter(h => {
        const effective = effectiveCreatedDateByHousehold.get(h.id) ?? null;
        // If we have no effective date, exclude for past quarters (freeze semantics).
        if (!effective) return false;
        // Include only if effective creation date is <= quarter end
        return effective <= end;
      });

      const householdIdsInQuarter = new Set(householdsInQuarter.map(h => h.id));
      const totalCount = householdIdsInQuarter.size;

      const visitsForQuarter = allVisits.filter((v) => {
        const visitDate = parseDateSafe(v.visitDate);
        if (!visitDate) return false;
        return householdIdsInQuarter.has(v.householdId) && isWithinInterval(visitDate, { start, end });
      });

      const completedCount = visitsForQuarter.filter(v => v.status === 'Completed').length;

      let status: 'Completed' | 'Pending' | 'Partially Completed' = 'Pending';
      if (totalCount === 0) {
        status = 'Pending';
      } else if (completedCount === totalCount) {
        status = 'Completed';
      } else if (completedCount > 0) {
        status = 'Partially Completed';
      }

      // progress comparison vs previous quarter
      let improved = 0;
      let declined = 0;
      let noChange = 0;

      const currentVisitIds = new Set(visitsForQuarter.map(v => v.id));
      const currentQuarterProgress = getProgressForQuarter(currentVisitIds);
      const childrenInQuarter = allChildren.filter(child => householdIdsInQuarter.has(child.householdId));

      if (qNum > 1) {
        const prevQuarterDate = new Date(year, (qNum - 2) * 3, 1);
        const prevStart = startOfQuarter(prevQuarterDate);
        const prevEnd = endOfQuarter(prevQuarterDate);

        const householdsInPrevQuarter = households.filter(h => {
          const effective = effectiveCreatedDateByHousehold.get(h.id) ?? null;
          if (!effective) return false;
          return effective <= prevEnd;
        });

        const householdIdsInPrevQuarter = new Set(householdsInPrevQuarter.map(h => h.id));

        const prevVisitsForQuarter = allVisits.filter(v => {
          const visitDate = parseDateSafe(v.visitDate);
          if (!visitDate) return false;
          return householdIdsInPrevQuarter.has(v.householdId) && isWithinInterval(visitDate, { start: prevStart, end: prevEnd });
        });

        const prevVisitIds = new Set(prevVisitsForQuarter.map(v => v.id));
        const previousQuarterProgress = getProgressForQuarter(prevVisitIds);

        const currentProgressByChild = new Map(currentQuarterProgress.map(p => [p.child_id, p]));
        const previousProgressByChild = new Map(previousQuarterProgress.map(p => [p.child_id, p]));

        childrenInQuarter.forEach(child => {
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

      const childrenWithData = new Set(currentQuarterProgress.map(p => p.child_id));
      const notRecorded = childrenInQuarter.length - childrenWithData.size;

      return {
        id: qNum,
        name: `Quarter ${qNum} (${start.toLocaleString('default', { month: 'short' })} - ${end.toLocaleString('default', { month: 'short' })})`,
        status,
        completed: completedCount,
        total: totalCount,
        visits: visitsForQuarter,
        householdsInQuarter: householdsInQuarter, // Pass the filtered households to the UI
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

    