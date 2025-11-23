import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInYears, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    return 0;
  }
  try {
    const dob = parseISO(dateOfBirth);
    const age = differenceInYears(new Date(), dob);
    return isNaN(age) ? 0 : age;
  } catch (error) {
    console.error("Error calculating age:", error);
    return 0;
  }
}
