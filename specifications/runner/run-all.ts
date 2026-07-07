import { runAll } from './runner';

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
