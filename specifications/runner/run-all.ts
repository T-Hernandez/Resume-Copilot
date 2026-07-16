import './../scenarios/frontend-junior.scenario';
import './../scenarios/normalization-basic.scenario';
import { runAll } from './runner';

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
