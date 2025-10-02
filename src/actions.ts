import * as core from '@actions/core';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

/**
 * Auto-execute the action and pass errors to 'core.setFailed'.
 * It also passes the full error, with stacktrace, to 'core.debug'.
 * You'll need to enable debugging to view these full errors.
 *
 * @see https://github.com/actions/toolkit/blob/main/docs/action-debugging.md#step-debug-logs
 */
export function executeAction(action: () => Promise<void>) {
  return action().catch((error: Error) => {
    core.setFailed(error.message || error);
    core.debug(error.stack || 'No stacktrace available');
  });
}

/**
 * Create a temporary path within the GitHub Actions worker for tooling.
 * This implementation is based on `@actions/tool-cache`.
 *
 * @note This does not actually create the path
 * @see https://github.com/actions/toolkit/blob/f58042f9cc16bcaa87afaa86c2974a8c771ce1ea/packages/tool-cache/src/tool-cache.ts#L660-L677
 */
export function createToolPath(name: string, version: string) {
  assert(process.env['RUNNER_TOOL_CACHE'], 'Expected RUNNER_TOOL_CACHE to be defined');
  return path.join(process.env['RUNNER_TOOL_CACHE'], name, version, os.arch());
}

/**
 * Add extra `searchPath` to the global search path for require()
 */
export function addGlobalNodeSearchPath(searchPath: string) {
  const nodePath = process.env['NODE_PATH'] || '';
  const delimiter = process.platform === 'win32' ? ';' : ':';
  const nodePaths = nodePath.split(delimiter);
  nodePaths.push(searchPath);
  process.env['NODE_PATH'] = nodePaths.join(delimiter);
  require('node:module').Module._initPaths();
}

/**
 * Install a "tool" from a node package.
 * This will add the folder, containing the `node_modules`, to the global path.
 */
export function installToolFromPackage(dir: string) {
  return core.addPath(path.join(dir, 'node_modules', '.bin'));
}
