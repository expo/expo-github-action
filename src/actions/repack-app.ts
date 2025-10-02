import { getInput, info, isDebug, setOutput } from '@actions/core';
import spawnAsync from '@expo/spawn-async';
import fs from 'node:fs';
import path from 'node:path';

import { executeAction } from '../actions';
import { determineSourceAppPathAsync } from '../repack-app/repackUtils';

executeAction(runAction);

async function runAction() {
  const platform = getInput('platform', { required: true });
  const sourceApp = getInput('source-app', { required: true });
  const outputDirectory = getInput('output-directory');
  const workingDirectory = getInput('working-directory') || process.cwd();
  const repackVersion = getInput('repack-version') || 'latest';

  let outputDirectoryStat: fs.Stats | null;
  try {
    outputDirectoryStat = await fs.promises.stat(outputDirectory);
  } catch {
    outputDirectoryStat = null;
  }
  if (outputDirectoryStat != null && !outputDirectoryStat.isDirectory()) {
    throw new Error(`The 'output-directory' must be a directory: ${outputDirectory}`);
  }
  await fs.promises.mkdir(outputDirectory, { recursive: true });

  const sourceAppPath = await determineSourceAppPathAsync(sourceApp);
  const outputFile = path.join(outputDirectory, path.basename(sourceAppPath));
  info(`Repacking app - sourceAppPath[${sourceAppPath}] outputFile[${outputFile}]`);

  const repackArgs: string[] = [
    `@expo/repack-app@${repackVersion}`,
    '--platform',
    platform,
    '--source-app',
    sourceAppPath,
    '--output',
    outputFile,
  ];
  if (isDebug()) {
    repackArgs.push('--verbose');
  }
  await spawnAsync('npx', repackArgs, {
    cwd: workingDirectory,
    stdio: 'inherit',
  });
  info(`Repacked app created at ${outputFile}`);
  setOutput('output-path', outputFile);
}
