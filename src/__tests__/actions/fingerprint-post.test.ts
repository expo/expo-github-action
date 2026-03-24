import * as cacher from '../../cacher';
import * as fingerprint from '../../fingerprint';
import * as github from '../../github';
import * as utils from '../../utils';
import { runAction } from '../../actions/fingerprint-post';

jest.mock('../../cacher');
jest.mock('../../fingerprint');
jest.mock('../../github');
jest.mock('../../utils');
jest.mock('../../worker', () => ({
  executeAction: jest.fn(),
}));

describe(runAction, () => {
  beforeEach(() => {
    process.env.GITHUB_REF = 'refs/heads/feature-a';
    jest.mocked(utils.retryAsync).mockImplementation(async action => await action());
  });

  afterEach(() => {
    delete process.env.GITHUB_REF;
    jest.resetAllMocks();
  });

  it('saves the fingerprint db on the resolved push branch', async () => {
    jest.mocked(github.resolveFingerprintDbSavingBranch).mockReturnValue('feature-a');
    jest.mocked(github.isPushBranchContext).mockReturnValue(true);

    await runAction({
      fingerprintDbCacheKey: 'fingerprint-db',
      githubToken: 'github-token',
      savingDbBranch: undefined,
    } as any);

    expect(github.resolveFingerprintDbSavingBranch).toHaveBeenCalledWith(undefined);
    expect(github.isPushBranchContext).toHaveBeenCalledWith('feature-a');
    expect(cacher.deleteCacheAsync).toHaveBeenCalledWith(
      'github-token',
      'fingerprint-db',
      'refs/heads/feature-a'
    );
    expect(fingerprint.saveDbToCacheAsync).toHaveBeenCalledWith('fingerprint-db');
  });

  it('skips saving when the event is not a push to the resolved branch', async () => {
    jest.mocked(github.resolveFingerprintDbSavingBranch).mockReturnValue('feature-a');
    jest.mocked(github.isPushBranchContext).mockReturnValue(false);

    await runAction({
      fingerprintDbCacheKey: 'fingerprint-db',
      githubToken: 'github-token',
      savingDbBranch: undefined,
    } as any);

    expect(cacher.deleteCacheAsync).not.toHaveBeenCalled();
    expect(fingerprint.saveDbToCacheAsync).not.toHaveBeenCalled();
  });
});
