export interface Experience {
  id?: string;
  company?: string;
  title?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date or 'present'
  description?: string;
  skills?: string[]; // canonical skill names or raw
}
