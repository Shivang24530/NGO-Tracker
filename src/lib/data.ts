import { Household, Child, FollowUpVisit, ChildProgressUpdate } from './types';

// This file contains mock data. In a real application, this data would
// be fetched from a database like Firestore.
// It is kept here to prevent build errors in components that may still rely on it,
// but the data is intentionally left empty as pages are migrated to live data.

export const childProgressUpdates: ChildProgressUpdate[] = [];

export const followUpVisits: FollowUpVisit[] = [];

export const children: Child[] = [];

export const households: Household[] = [];
