import { getInput } from '@actions/core';

import { collectFingerprintActionInput } from '../fingerprint';

export function collectRepackAppActionInput() {
  return {
    ...collectFingerprintActionInput(),
    //
    // [BEGIN] Inputs for @actions/upload-artifact
    //
    artifactName: getInput('artifact-name'),
    uploadPath: getInput('upload-path', { required: true }),
    retentionDays: getInput('retention-days'),
    compressionLevel: getInput('compression-level'),
    //
    // [END] Inputs for @actions/upload-artifact
    //
    platform: getInput('platform', { required: true }),
    repackVersion: getInput('repack-version'),
  };
}
