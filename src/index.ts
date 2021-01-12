import { run } from './run';
import { handleError } from './tools';

run().catch(handleError);
