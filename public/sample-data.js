// Illustrative content only, not domain data - deliberately a partial match
// (some skills present, one missing; experience just short of the
// requirement) rather than a perfect or a zero match, so clicking "Try with
// example data" actually shows the bars, the gaps, AND a recommendation in
// one click - a 100% or 0% match would be a less convincing first look.
// Not translated (see i18n.js's own note): this is throwaway demo text the
// user immediately replaces with their own, not a UI-chrome string.
// var (not const) is deliberate: top-level var in a classic script attaches
// to window, same as the function declarations elsewhere in public/*.js -
// that's what lets specifications/public/frontend.spec.ts read it back to
// assert against, without changing anything about how the browser runs it.
var SAMPLE_DATA = {
  analyze: {
    resume: `Jamie Rivera
Frontend Developer

Skills
React, JavaScript, CSS, Git

Experience
TechStart Inc - Frontend Developer (2021 - 2024)
Built and maintained React components for a customer-facing dashboard.
Collaborated with designers to implement responsive layouts.

Education
State University
BSc Computer Science
2017 - 2021`,
    job: `Title: Senior Frontend Engineer
Required Skills: React, TypeScript, CSS
Preferred: GraphQL, Next.js
MinExperienceYears: 5
Education: Bachelor's degree required`
  },
  compare: {
    job: `Title: Senior Frontend Engineer
Required Skills: React, TypeScript, CSS
MinExperienceYears: 4`,
    candidates: [
      {
        id: 'Alice',
        text: `Alice Chen
Skills
React, TypeScript, CSS, GraphQL

Experience
BrightApps - Senior Frontend Engineer (2019 - 2024)
Led development of a React/TypeScript design system used across 5 product teams.`
      },
      {
        id: 'Bob',
        text: `Bob Martinez
Skills
React, CSS

Experience
PixelWorks - Frontend Developer (2022 - 2024)
Built marketing pages using React.`
      }
    ]
  }
};
