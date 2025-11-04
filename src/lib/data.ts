import { Household, Child, FollowUpVisit, ChildProgressUpdate } from './types';
import { subDays, addMonths, formatISO } from 'date-fns';

// This file contains mock data. In a real application, this data would
// be fetched from a database like Firestore.
// It is kept here to prevent build errors in components that still rely on it.

const today = new Date();

export const childProgressUpdates: ChildProgressUpdate[] = [];

export const followUpVisits: FollowUpVisit[] = [];

export const children: Child[] = [];

export const households: Household[] = [];
