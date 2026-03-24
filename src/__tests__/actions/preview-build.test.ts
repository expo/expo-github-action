import * as cacher from '../../cacher';
import * as core from '@actions/core';

import * as expo from '../../expo';
import * as fingerprint from '../../fingerprint';
import * as github from '../../github';
import * as project from '../../project';
import * as utils from '../../utils';
import { previewAction } from '../../actions/preview-build';

jest.mock('@actions/core');
jest.mock('../../cacher');
jest.mock('../../expo');
jest.mock('../../fingerprint');
jest.mock('../../github');
jest.mock('../../project');
jest.mock('../../utils');
jest.mock('../../worker', () => ({
  executeAction: jest.fn(),
}));

describe(previewAction, () => {
  const dbManager = {
    upsertFingerprintByGitCommitHashAsync: jest.fn(),
    getLatestEasEntityFromFingerprintAsync: jest.fn(),
  };

  const input = {
    command: 'eas build --platform all',
    commentId: 'comment-id',
    currentGitCommitHash: 'head-sha',
    easBuildMessage: '',
    fingerprintDbCacheKey: 'fingerprint-db',
    fingerprintInstallationCache: true,
    fingerprintVersion: 'latest',
    githubToken: 'github-token',
    packager: 'yarn',
    previousGitCommitHash: 'base-sha',
    savingDbBranch: undefined,
    shouldComment: false,
    workingDirectory: '/tmp/app',
  };

  beforeEach(() => {
    process.env.GITHUB_REF = 'refs/heads/feature-a';
    jest.mocked(core.group).mockImplementation((_, action) => action());
    jest.mocked(utils.retryAsync).mockImplementation(async action => await action());
    jest.mocked(project.loadProjectConfig).mockResolvedValue({
      extra: { eas: { projectId: 'project-id' } },
    } as any);
    jest.mocked(github.hasPullContext).mockReturnValue(false);
    jest.mocked(github.resolveFingerprintDbSavingBranch).mockReturnValue('feature-a');
    jest.mocked(github.isPushBranchContext).mockReturnValue(true);
    jest.mocked(github.getPullRequestFromGitCommitShaAsync).mockResolvedValue([]);
    jest.mocked(fingerprint.createFingerprintDbManagerAsync).mockResolvedValue(dbManager as any);
    jest.mocked(fingerprint.createFingerprintOutputAsync).mockResolvedValue({
      currentFingerprint: { hash: 'hash', sources: [] },
      previousFingerprint: null,
      diff: [],
    });
  });

  afterEach(() => {
    delete process.env.GITHUB_REF;
    jest.resetAllMocks();
    dbManager.upsertFingerprintByGitCommitHashAsync.mockReset();
    dbManager.getLatestEasEntityFromFingerprintAsync.mockReset();
  });

  it('updates the fingerprint db on pushes to the resolved branch', async () => {
    await previewAction(input as any);
    await new Promise(resolve => setImmediate(resolve));

    expect(github.resolveFingerprintDbSavingBranch).toHaveBeenCalledWith(undefined);
    expect(github.isPushBranchContext).toHaveBeenCalledWith('feature-a');
    expect(dbManager.upsertFingerprintByGitCommitHashAsync).toHaveBeenCalledWith('head-sha', {
      fingerprint: { hash: 'hash', sources: [] },
    });
    expect(cacher.deleteCacheAsync).toHaveBeenCalledWith(
      'github-token',
      'fingerprint-db',
      'refs/heads/feature-a'
    );
    expect(fingerprint.saveDbToCacheAsync).toHaveBeenCalledWith('fingerprint-db');
  });

  it('skips db updates when the event is not a push to the resolved branch', async () => {
    jest.mocked(github.isPushBranchContext).mockReturnValue(false);

    await previewAction(input as any);
    await new Promise(resolve => setImmediate(resolve));

    expect(fingerprint.createFingerprintDbManagerAsync).not.toHaveBeenCalled();
    expect(cacher.deleteCacheAsync).not.toHaveBeenCalled();
    expect(fingerprint.saveDbToCacheAsync).not.toHaveBeenCalled();
    expect(expo.queryEasBuildInfoAsync).not.toHaveBeenCalled();
  });
});
