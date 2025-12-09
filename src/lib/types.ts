
export type Household = {
  id: string;
  ownerId: string; // ID of the user who registered the household
  familyName: string;
  fullAddress: string;
  locationArea: string;
  primaryContact: string;
  status: 'Active' | 'Migrated' | 'Inactive';
  createdAt: string; // ISO date string
  nextFollowupDue: string; // ISO date string
  latitude: number | null;
  longitude: number | null;
  locationUntracked?: boolean;
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
  // Annual survey data (stored per-visit for historical accuracy)
  toilet_available?: boolean;
  water_supply?: string;
  electricity?: boolean;
  annual_income?: number;
};


// Note: `is_working`, `work_details` are snake_case to match AI model output
export type ChildProgressUpdate = {
  id: string;
  child_id: string;
  visitId: string;
  is_studying: boolean;
  current_class?: string; // Added for historical accuracy
  school_name?: string; // Added for historical accuracy
  not_studying_reason?: 'Financial Problems' | 'Working' | 'Family Issues' | 'Lack of Interest' | 'Other';
  is_working: boolean;
  work_details?: string;
  studying_challenges?: string;
};

