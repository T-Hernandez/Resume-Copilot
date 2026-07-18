const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

const MONTH_YEAR = `(?:${Object.keys(MONTHS).join('|')})[a-z]*\\.?\\s+\\d{4}`;
const NUMERIC_DATE = `\\d{1,2}\\/\\d{4}`;
const YEAR = `\\d{4}`;
const PRESENT = `present|current|now|today`;

const DATE_TOKEN = `(?:${MONTH_YEAR}|${NUMERIC_DATE}|${YEAR})`;
const DATE_RANGE_PATTERN = new RegExp(
  `\\b(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|${PRESENT})\\b`,
  'i'
);

// Turns a loosely-formatted date token ("Jan 2023", "01/2023", "2023",
// "Present") into a partial-ISO string ("2023-01" or "2023") or the literal
// 'present'. This is a light, local normalization scoped to what an
// Experience/Education entry needs - not the domain-wide date normalization
// that would live in a later phase.
function normalizeDateToken(token: string): string {
  const trimmed = token.trim();
  if (new RegExp(`^(?:${PRESENT})$`, 'i').test(trimmed)) return 'present';

  const monthYear = trimmed.match(/^([a-z]+)\.?\s+(\d{4})$/i);
  if (monthYear) {
    const monthKey = monthYear[1].slice(0, 3).toLowerCase();
    const month = MONTHS[monthKey];
    if (month) return `${monthYear[2]}-${month}`;
  }

  const numeric = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (numeric) return `${numeric[2]}-${numeric[1].padStart(2, '0')}`;

  const year = trimmed.match(/^\d{4}$/);
  if (year) return trimmed;

  return trimmed;
}

export interface ExtractedDateRange {
  startDate: string;
  endDate: string;
  // The line with the matched date range removed, so the rest of the line
  // (if any) can still be checked for a company/title.
  remainder: string;
}

export function extractDateRange(line: string): ExtractedDateRange | undefined {
  const match = line.match(DATE_RANGE_PATTERN);
  if (!match) return undefined;

  return {
    startDate: normalizeDateToken(match[1]),
    endDate: normalizeDateToken(match[2]),
    remainder: (line.slice(0, match.index) + line.slice((match.index || 0) + match[0].length)).trim()
  };
}
