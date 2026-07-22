// UI-chrome translations only (labels, buttons, status/error messages this
// page itself writes) - NOT the analysis content the API returns
// (recommendation text, "Missing required skill: X", etc.), which is
// generated deterministically by 01-domain in English and stays that way
// regardless of this toggle. Translating that would mean either duplicating
// domain logic bilingually or adding an LLM translation step - a separate,
// bigger decision, not something to fold into a UI-chrome i18n pass.
const translations = {
  en: {
    tagline: "Paste a resume and a job posting to get an instant, explainable match score - no AI black box, just rules you can see.",
    howItWorks: {
      step1: "Paste or upload a resume and a job posting",
      step2: "Get an instant score with a full breakdown by category",
      step3: "See exactly what's missing and what to improve"
    },
    common: { tryExample: "Try with example data" },
    tabs: { analyze: "Analyze one resume", compare: "Compare multiple resumes" },
    analyze: {
      resumeLabel: "Resume",
      jobLabel: "Job posting",
      pasteResume: "Paste resume text here...",
      pasteJob: "Paste job posting text here...",
      uploadHint: "or upload a file (.txt, .pdf, .docx)",
      submit: "Analyze",
      statusAnalyzing: "Analyzing...",
      statusMissing: "Paste or upload both a resume and a job posting first."
    },
    compare: {
      addCandidate: "+ Add another resume",
      submit: "Compare",
      candidatePlaceholder: "Candidate name or label (e.g. Alice)",
      removeCandidate: "Remove",
      statusComparing: "Comparing...",
      statusMissingJob: "Paste or upload a job posting first.",
      statusMinCandidates: "Add at least 2 resumes to compare.",
      statusMissingCandidate: '"{name}" has no resume text or file - fill it in or remove that row.',
      statusDuplicateIds: "Candidate names/labels must be unique.",
      candidateDefaultName: "Candidate {n}",
      comparedLabel: "Compared {count} candidates - {date}"
    },
    results: {
      overall: "Overall",
      confidence: "Confidence",
      confidenceNA: "n/a (nothing was evaluated)",
      recommendations: "Recommendations",
      aiRecommendations: "AI-enhanced recommendations",
      recommendationErrorPrefix: "AI-enhanced recommendations unavailable: ",
      missingSuffix: "(missing)"
    },
    categories: { skills: "Skills", experience: "Experience", education: "Education" },
    errors: { requestFailed: "Request failed ({status})" }
  },
  es: {
    tagline: "Pega un CV y una oferta laboral para obtener un puntaje de compatibilidad instantáneo y explicable - sin caja negra de IA, solo reglas que puedes ver.",
    howItWorks: {
      step1: "Pega o sube un CV y una oferta laboral",
      step2: "Obtén un puntaje instantáneo con un desglose completo por categoría",
      step3: "Ve exactamente qué falta y qué mejorar"
    },
    common: { tryExample: "Probar con datos de ejemplo" },
    tabs: { analyze: "Analizar un CV", compare: "Comparar varios CVs" },
    analyze: {
      resumeLabel: "Currículum (CV)",
      jobLabel: "Oferta laboral",
      pasteResume: "Pega el texto del CV aquí...",
      pasteJob: "Pega el texto de la oferta aquí...",
      uploadHint: "o sube un archivo (.txt, .pdf, .docx)",
      submit: "Analizar",
      statusAnalyzing: "Analizando...",
      statusMissing: "Pega o sube tanto el CV como la oferta laboral primero."
    },
    compare: {
      addCandidate: "+ Agregar otro CV",
      submit: "Comparar",
      candidatePlaceholder: "Nombre o etiqueta del candidato (ej. Alice)",
      removeCandidate: "Eliminar",
      statusComparing: "Comparando...",
      statusMissingJob: "Pega o sube una oferta laboral primero.",
      statusMinCandidates: "Agrega al menos 2 CVs para comparar.",
      statusMissingCandidate: '"{name}" no tiene texto ni archivo de CV - complétalo o elimina esa fila.',
      statusDuplicateIds: "Los nombres o etiquetas de los candidatos deben ser únicos.",
      candidateDefaultName: "Candidato {n}",
      comparedLabel: "{count} candidatos comparados - {date}"
    },
    results: {
      overall: "Puntaje general",
      confidence: "Confianza",
      confidenceNA: "N/D (nada fue evaluado)",
      recommendations: "Recomendaciones",
      aiRecommendations: "Recomendaciones mejoradas con IA",
      recommendationErrorPrefix: "Recomendaciones con IA no disponibles: ",
      missingSuffix: "(falta)"
    },
    categories: { skills: "Habilidades", experience: "Experiencia", education: "Educación" },
    errors: { requestFailed: "La solicitud falló ({status})" }
  }
};

function detectDefaultLang() {
  const stored = localStorage.getItem('lang');
  if (stored === 'en' || stored === 'es') return stored;
  return navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let currentLang = detectDefaultLang();

function t(key, vars) {
  const value = key.split('.').reduce((obj, part) => (obj ? obj[part] : undefined), translations[currentLang]);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return Object.entries(vars).reduce((str, [name, val]) => str.replace(new RegExp(`\\{${name}\\}`, 'g'), val), value);
}

// Applies data-i18n/-placeholder/-title within `root` - scoped so app.js can
// translate a single freshly-cloned candidate row, not just the whole
// document, without re-deriving this logic.
function translateElement(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  // Separate from data-i18n-title: the remove-candidate button needs an
  // aria-label because its visible content is a bare "x" glyph, which
  // screen readers announce literally ("multiplication sign") rather than
  // as a meaningful action name.
  root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
  });
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  translateElement(document);
  document.querySelectorAll('.lang-button').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  // Lets app.js re-render already-displayed results (if any) in the new
  // language, for strings this page itself controls - not a re-fetch.
  window.dispatchEvent(new CustomEvent('languagechange-app'));
}

document.querySelectorAll('.lang-button').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

document.documentElement.lang = currentLang;
translateElement(document);
document.querySelectorAll('.lang-button').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === currentLang));
