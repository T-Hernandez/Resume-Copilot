import {
  JobField,
  JOB_BLOCK_FIELDS,
  JOB_LIST_FIELDS,
  inlineValueAfterLabel,
  matchJobField
} from './job-field-labels';

// Same shape-first philosophy as ParsedResumeDocument: the interface exists
// up front with every field the domain will eventually want, even though
// several are still plain strings today. Structured fields (requiredSkills,
// minExperienceYears) already parse cleanly because job postings in this
// repo's fixtures label them explicitly ("Required Skills:",
// "MinExperienceYears:") - description/responsibilities/benefits stay raw
// blocks until there's a reason to parse bullets out of them.
export interface ParsedJobDocument {
  title?: string;
  company?: string;
  description?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears?: number;
  educationLevel?: string;
  responsibilities?: string;
  benefits?: string;
  keywords: string[];
  other?: string[];
}

function splitListValue(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

export function parseJobDocument(text: string): ParsedJobDocument {
  const lines = text.split(/\r?\n/);

  const singleValues: Partial<Record<JobField, string>> = {};
  const listValues: Partial<Record<JobField, string[]>> = { requiredSkills: [], preferredSkills: [], keywords: [] };
  const blockValues: Partial<Record<JobField, string[]>> = {};
  const other: string[] = [];

  let cursor: JobField | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const field = matchJobField(line);
    if (field) {
      cursor = field;
      const inline = inlineValueAfterLabel(line);
      if (JOB_LIST_FIELDS.includes(field)) {
        if (inline) (listValues[field] ??= []).push(...splitListValue(inline));
      } else if (JOB_BLOCK_FIELDS.includes(field)) {
        if (inline) (blockValues[field] ??= []).push(inline);
      } else if (inline) {
        singleValues[field] = inline;
      }
      continue;
    }

    // A colon with a label we don't recognize ("Salary: $100k") looks like
    // it was trying to be a field - keep it visible in `other` instead of
    // silently folding it into whatever prose block is active.
    if (line.includes(':') && !JOB_BLOCK_FIELDS.includes(cursor as JobField)) {
      other.push(line);
      continue;
    }

    // No label on this line. Single-value fields (title/company/...) don't
    // span multiple lines in practice, so an unlabeled line right after one
    // is almost always the start of unlabeled prose, not a continuation -
    // treat it as description instead. Block/list fields DO span multiple
    // lines, so those keep accumulating into whatever field we're in.
    const carriesForward = cursor !== undefined && (JOB_BLOCK_FIELDS.includes(cursor) || JOB_LIST_FIELDS.includes(cursor));
    const target: JobField = carriesForward ? (cursor as JobField) : 'description';

    if (JOB_LIST_FIELDS.includes(target)) {
      (listValues[target] ??= []).push(...splitListValue(line));
    } else {
      (blockValues[target] ??= []).push(line);
    }
    cursor = target;
  }

  const result: ParsedJobDocument = {
    requiredSkills: listValues.requiredSkills || [],
    preferredSkills: listValues.preferredSkills || [],
    keywords: listValues.keywords || []
  };

  if (singleValues.title) result.title = singleValues.title;
  if (singleValues.company) result.company = singleValues.company;
  if (singleValues.educationLevel) result.educationLevel = singleValues.educationLevel;
  if (singleValues.minExperienceYears) {
    const parsed = parseInt(singleValues.minExperienceYears, 10);
    if (!Number.isNaN(parsed)) result.minExperienceYears = parsed;
  }
  if (blockValues.description?.length) result.description = blockValues.description.join('\n');
  if (blockValues.responsibilities?.length) result.responsibilities = blockValues.responsibilities.join('\n');
  if (blockValues.benefits?.length) result.benefits = blockValues.benefits.join('\n');
  if (other.length) result.other = other;

  return result;
}
