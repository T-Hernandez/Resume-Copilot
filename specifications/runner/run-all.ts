import './../scenarios/frontend-junior.scenario';
import './../scenarios/normalization-basic.scenario';
import './../scenarios/pipeline-config.scenario';
import './../scenarios/vertical-slice.scenario';
import './../scenarios/edge-cases.scenario';
import './../scenarios/public-api.scenario';
import './../scenarios/document-processing.scenario';
import './../scenarios/section-header-variants.scenario';
import './../scenarios/parse-experience-education.scenario';
import './../scenarios/parse-skills.scenario';
import './../scenarios/parse-job-document.scenario';
import './../scenarios/match-skill-evidence.scenario';
import './../scenarios/score-engine.scenario';
import './../scenarios/match-experience.scenario';
import './../scenarios/match-education.scenario';
import './../scenarios/generate-analysis-v2.scenario';
import './../scenarios/build-weaknesses.scenario';
import './../scenarios/build-strengths.scenario';
import './../scenarios/build-recommendation-input.scenario';
import './../scenarios/build-score-explanation.scenario';
import './../scenarios/build-recommendations.scenario';
import { runAll } from './runner';

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
