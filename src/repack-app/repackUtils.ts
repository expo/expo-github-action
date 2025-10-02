import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Determines the absolute path to the source app.
 */
export async function determineSourceAppPathAsync(sourceApp: string): Promise<string> {
  const sourceAppPath = path.resolve(sourceApp);
  let isFile = false;
  try {
    const stat = await fs.promises.stat(sourceAppPath);
    isFile = stat.isFile();
  } catch {
    throw new Error(`The source app file does not exist: ${sourceApp}`);
  }

  if (isFile) {
    return sourceAppPath;
  }

  const candidates = await glob('*.{apk,aab,ipa}', { cwd: sourceAppPath, absolute: true });
  if (candidates.length === 0) {
    throw new Error(`No app files found in the directory: ${sourceApp}`);
  }
  if (candidates.length > 1) {
    throw new Error(`Multiple app files found in the directory: ${sourceApp}`);
  }
  return candidates[0];
}
