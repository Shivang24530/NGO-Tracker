export type Household = {
  id: string;
  ownerId: string; // ID of the user who registered the household
  familyName: string;
  fullAddress: string;
  locationArea: string;
  primaryContact: string;
  status: 'Active' | 'Migrated' | 'Inactive';
  nextFollowupDue: string; // ISO date string
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  familyPhotoUrl: string;
  housePhotoUrl: string;
  toiletAvailable: boolean;
  waterSupply: 'Piped' | 'Well' | 'Tanker' | 'Other';
  electricity: boolean;
  annualIncome: number;
};

export type Child = {
  id: string;
  householdId: string;
  name: string;
  dateOfBirth: string; // ISO date string
  gender: 'Male' | 'Female' | 'Other';
  isStudying: boolean;
  currentClass: string;
  schoolName: string;
};

export type FollowUpVisit = {
  id: string;
  householdId: string;
  visitDate: string; // ISO date string
  visitType: 'Quarterly' | 'Annual';
  visitedBy: string;
  notes?: string;
  status: 'Completed' | 'Pending' | 'Overdue';
  childProgressUpdates?: ChildProgressUpdate[];
};

// Note: `is_working`, `work_details` are snake_case to match AI model output
export type ChildProgressUpdate = {
  id: string;
  child_id: string;
  visit_id: string;
  is_studying: boolean;
  not_studying_reason?: 'Financial Problems' | 'Working' | 'Family Issues' | 'Lack of Interest' | 'Other';
  is_working: boolean;
  work_details?: string;
  studying_challenges?: string;
};

    