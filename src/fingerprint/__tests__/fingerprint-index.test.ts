import { describe, expect, it, mock } from 'bun:test';

import { collectFingerprintActionInput } from '../index';

mock.module('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo',
    },
    sha: 'test-sha',
    payload: {
      before: 'test-before-sha',
      pull_request: {
        base: {
          sha: 'test-base-sha',
        },
        head: {
          sha: 'test-head-sha',
        },
      },
    },
    eventName: 'push', // Change to 'pull_request' to test that branch
  },
}));

mock.module('@actions/core', () => ({
  getInput: mock().mockImplementation((name: string) => {
    switch (name) {
      case 'packager':
        return '';
      case 'github-token':
        return '******';
      case 'working-directory':
        return '/path/to/working/dir';
      case 'fingerprint-version':
        return '';
      case 'fingerprint-installation-cache':
        return 'true';
      case 'fingerprint-db-cache-key':
        return '';
      case 'previous-git-commit':
        return '';
      case 'current-git-commit':
        return '';
      case 'saving-db-branch':
        return '';
      default:
        return '';
    }
  }),
  getBooleanInput: mock().mockReturnValue(true),
}));

describe(collectFingerprintActionInput, () => {
  it('returns an object with expected properties', () => {
    const input = collectFingerprintActionInput();
    expect(input).toMatchInlineSnapshot(`
      {
        "currentGitCommitHash": "test-sha",
        "fingerprintDbCacheKey": "",
        "fingerprintInstallationCache": true,
        "fingerprintVersion": "latest",
        "githubToken": "******",
        "packager": "yarn",
        "previousGitCommitHash": "test-before-sha",
        "savingDbBranch": undefined,
        "workingDirectory": "/path/to/working/dir",
      }
    `);
  });
});
