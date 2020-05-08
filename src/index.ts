import * as core from '@actions/core';
import { run } from './run';

run().catch(core.setFailed);
