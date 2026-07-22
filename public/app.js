// Vanilla JS, no build step, no framework - deliberately, to keep this a
// thin presentation layer over the existing REST API (POST /analyze,
// POST /compare). Every number/fact rendered here comes straight from the
// API response; this file only formats it.

function switchTab(tabName) {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabName}-tab`);
  });
}

document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function formatFromFilename(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  return null;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // readAsDataURL yields "data:<mime>;base64,<data>" - the API only
      // wants the raw base64 payload, same shape infrastructure/extract-text.ts
      // decodes on the server.
      const commaIndex = reader.result.indexOf(',');
      resolve(reader.result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// A resume/job "document" is either pasted text or an uploaded file - if a
// file is present it wins over whatever is in the textarea, since selecting
// a file is a clearer signal of intent than stale placeholder text.
async function resolveDocument(textEl, fileEl) {
  const file = fileEl.files[0];
  if (file) {
    const format = formatFromFilename(file.name);
    if (format) {
      return { base64: await fileToBase64(file), format };
    }
    return { text: await file.text() };
  }
  return { text: textEl.value };
}

function isEmptyDocument(doc) {
  return 'text' in doc && !doc.text.trim();
}

function formatConfidence(confidence) {
  return typeof confidence === 'number' ? `${confidence}%` : 'n/a (nothing was evaluated)';
}

function renderCategory(category) {
  const label = category.category.charAt(0).toUpperCase() + category.category.slice(1);
  const matchedItems = category.matched.map(item => `<li class="matched">+ ${escapeHtml(item)}</li>`).join('');
  const missingItems = category.missing.map(item => `<li class="missing">- ${escapeHtml(item)} (missing)</li>`).join('');
  return `
    <div class="category">
      <div class="category-label"><span>${label}</span><span class="score">${category.score}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, category.score))}%"></div></div>
      <ul class="fact-list">${matchedItems}${missingItems}</ul>
    </div>`;
}

function renderRecommendations(title, recommendations) {
  if (!recommendations || !recommendations.length) return '';
  const items = recommendations.map(rec => `
    <div class="recommendation">
      <span class="severity-badge severity-${rec.severity || 'low'}">${rec.severity || 'info'}</span>
      <span>${escapeHtml(rec.text)}</span>
    </div>`).join('');
  return `<div class="recommendations"><h3>${title}</h3>${items}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderAnalysisResult(result) {
  const { analysis, explanation, recommendations, aiRecommendations, recommendationError } = result;
  const categories = explanation.map(renderCategory).join('');
  const warnings = analysis.warnings && analysis.warnings.length
    ? `<p class="status error">${analysis.warnings.map(escapeHtml).join(' - ')}</p>`
    : '';
  const errorNote = recommendationError
    ? `<p class="status error">AI-enhanced recommendations unavailable: ${escapeHtml(recommendationError)}</p>`
    : '';

  return `
    <div class="result-card">
      <div class="result-header">
        <h2>Overall: ${analysis.overall}%</h2>
        <span class="confidence">Confidence: ${formatConfidence(analysis.confidence)}</span>
      </div>
      ${warnings}
      ${categories}
      ${renderRecommendations('Recommendations', recommendations)}
      ${renderRecommendations('AI-enhanced recommendations', aiRecommendations)}
      ${errorNote}
    </div>`;
}

// --- Analyze tab ---

const analyzeForm = document.getElementById('analyze-form');
const analyzeStatus = document.getElementById('analyze-status');
const analyzeResults = document.getElementById('analyze-results');

analyzeForm.addEventListener('submit', async event => {
  event.preventDefault();
  analyzeResults.innerHTML = '';
  analyzeStatus.className = 'status';

  const resume = await resolveDocument(
    document.getElementById('analyze-resume-text'),
    document.getElementById('analyze-resume-file')
  );
  const job = await resolveDocument(
    document.getElementById('analyze-job-text'),
    document.getElementById('analyze-job-file')
  );

  if (isEmptyDocument(resume) || isEmptyDocument(job)) {
    analyzeStatus.textContent = 'Paste or upload both a resume and a job posting first.';
    analyzeStatus.className = 'status error';
    return;
  }

  analyzeStatus.textContent = 'Analyzing...';
  const submitButton = analyzeForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, job })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    analyzeStatus.textContent = '';
    analyzeResults.innerHTML = renderAnalysisResult(body);
  } catch (error) {
    analyzeStatus.textContent = error.message;
    analyzeStatus.className = 'status error';
  } finally {
    submitButton.disabled = false;
  }
});

// --- Compare tab ---

const candidateList = document.getElementById('candidate-list');
const candidateTemplate = document.getElementById('candidate-template');
const addCandidateButton = document.getElementById('add-candidate');
const compareForm = document.getElementById('compare-form');
const compareStatus = document.getElementById('compare-status');
const compareResults = document.getElementById('compare-results');

function addCandidateRow() {
  const node = candidateTemplate.content.cloneNode(true);
  node.querySelector('.remove-candidate').addEventListener('click', event => {
    event.target.closest('.candidate').remove();
  });
  candidateList.appendChild(node);
}

addCandidateButton.addEventListener('click', addCandidateRow);
// Start with 2 candidate rows - compareResumesToJob requires at least 2.
addCandidateRow();
addCandidateRow();

function renderCompareResults(body) {
  const rows = body.results.map(result => `
    <div class="compare-row">
      <span class="rank">#${result.rank}</span>
      <span class="name">${escapeHtml(result.id)}</span>
      <span class="scores">overall ${result.analysis.overall}% &middot; confidence ${formatConfidence(result.analysis.confidence)}</span>
    </div>`).join('');
  return `<p class="status">Compared ${body.compared} candidates - ${new Date(body.generatedAt).toLocaleString()}</p>${rows}`;
}

compareForm.addEventListener('submit', async event => {
  event.preventDefault();
  compareResults.innerHTML = '';
  compareStatus.className = 'status';

  const job = await resolveDocument(
    document.getElementById('compare-job-text'),
    document.getElementById('compare-job-file')
  );
  if (isEmptyDocument(job)) {
    compareStatus.textContent = 'Paste or upload a job posting first.';
    compareStatus.className = 'status error';
    return;
  }

  const candidateEls = Array.from(candidateList.querySelectorAll('.candidate'));
  if (candidateEls.length < 2) {
    compareStatus.textContent = 'Add at least 2 resumes to compare.';
    compareStatus.className = 'status error';
    return;
  }

  const resumes = [];
  for (const [index, el] of candidateEls.entries()) {
    const idInput = el.querySelector('.candidate-id');
    const id = idInput.value.trim() || `Candidate ${index + 1}`;
    const document_ = await resolveDocument(el.querySelector('.candidate-text'), el.querySelector('.candidate-file'));
    if (isEmptyDocument(document_)) {
      compareStatus.textContent = `"${id}" has no resume text or file - fill it in or remove that row.`;
      compareStatus.className = 'status error';
      return;
    }
    resumes.push({ id, document: document_ });
  }

  const ids = resumes.map(r => r.id);
  if (new Set(ids).size !== ids.length) {
    compareStatus.textContent = 'Candidate names/labels must be unique.';
    compareStatus.className = 'status error';
    return;
  }

  compareStatus.textContent = 'Comparing...';
  const submitButton = compareForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch('/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, resumes })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    compareStatus.textContent = '';
    compareResults.innerHTML = renderCompareResults(body);
  } catch (error) {
    compareStatus.textContent = error.message;
    compareStatus.className = 'status error';
  } finally {
    submitButton.disabled = false;
  }
});
