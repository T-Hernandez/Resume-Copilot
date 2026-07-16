import './../scenarios/frontend-junior.scenario';
import './../scenarios/normalization-basic.scenario';
import './../scenarios/pipeline-config.scenario';
import './../scenarios/vertical-slice.scenario';
import './../scenarios/edge-cases.scenario';
import './../scenarios/public-api.scenario';
import { runAll } from './runner';

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
