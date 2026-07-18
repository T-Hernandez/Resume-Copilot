import { Experience } from '../entities/experience';

// Mirrors the "YYYY-MM" / "YYYY" / "present" shape parse-date-range.ts's
// normalizeDateToken already produces - this is the one place that reads
// that format back out, so there's a single definition of what an
// Experience entry's dates mean, not two.
function parseYearMonth(value: string | undefined): { year: number; month: number } | undefined {
  if (!value) return undefined;
  const monthMatch = value.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) return { year: Number(monthMatch[1]), month: Number(monthMatch[2]) };
  const yearMatch = value.match(/^(\d{4})$/);
  if (yearMatch) return { year: Number(yearMatch[1]), month: 1 };
  return undefined;
}

// Duration in years for one Experience entry, or undefined if its dates
// weren't parseable (e.g. parseExperienceSection never found a date line
// for it). Callers decide how to treat "unknown duration" - this never
// silently defaults to 0, which would understate a candidate's experience.
export function experienceDurationYears(entry: Experience, now: Date = new Date()): number | undefined {
  const start = parseYearMonth(entry.startDate);
  if (!start) return undefined;

  const end = entry.endDate === 'present'
    ? { year: now.getFullYear(), month: now.getMonth() + 1 }
    : parseYearMonth(entry.endDate);
  if (!end) return undefined;

  const months = (end.year * 12 + end.month) - (start.year * 12 + start.month);
  return Math.max(0, months / 12);
}

// Sums each entry's own duration. This double-counts overlapping roles
// (e.g. a part-time job during a full-time one) rather than computing a
// true "distinct years worked" figure - a reasonable first pass, since
// resumes rarely list genuinely overlapping full roles. Worth revisiting
// if a real resume's total looks inflated.
export function totalExperienceYears(entries: Experience[], now: Date = new Date()): number {
  return entries.reduce((sum, entry) => sum + (experienceDurationYears(entry, now) ?? 0), 0);
}
