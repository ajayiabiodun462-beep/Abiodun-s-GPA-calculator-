/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Course {
  id: string;
  name: string;
  score: string; // can be empty, e.g. "85"
  grade: string; // "A", "B", "C", etc.
  units: number; // e.g., 3, 2, 4
}

export interface Semester {
  id: string;
  userId: string;
  semesterName: string; // e.g. "Year 1 - 1st Semester"
  courses: Course[];
  gpa: number;
  totalUnits: number;
  totalPoints: number;
  createdAt: number;
}

export interface User {
  id: string;
  fullname: string;
  email: string;
  username: string;
  createdAt: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface SavedHistoryResponse {
  success: boolean;
  semesters: Semester[];
}
