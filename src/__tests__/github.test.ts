import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import process from 'node:process';

import { getRepoDefaultBranch, githubApi, isPushBranchContext } from '../github';

describe(githubApi, () => {
  const { GITHUB_TOKEN: _, ...originalEnv } = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates octokit with GITHUB_TOKEN from environment', () => {
    process.env['GITHUB_TOKEN'] = 'test-token-env';
    const mockGetOctokit = mock<typeof import('@actions/github').getOctokit>();
    mock.module('@actions/github', () => ({
      getOctokit: mockGetOctokit,
      context: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = githubApi();

    expect(mockGetOctokit).toHaveBeenCalledWith('test-token-env');
  });

  it('creates octokit with token from options', () => {
    const mockGetOctokit = mock<typeof import('@actions/github').getOctokit>();
    mock.module('@actions/github', () => ({
      getOctokit: mockGetOctokit,
      context: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = githubApi({ token: 'test-token-options' });

    expect(mockGetOctokit).toHaveBeenCalledWith('test-token-options');
  });

  it('prefers environment token over options token', () => {
    process.env['GITHUB_TOKEN'] = 'test-token-env';
    const mockGetOctokit = mock().mockReturnValue({ rest: {} });
    mock.module('@actions/github', () => ({
      getOctokit: mockGetOctokit,
      context: {},
    }));

    githubApi({ token: 'test-token-options' });

    expect(mockGetOctokit).toHaveBeenCalledWith('test-token-env');
  });

  it('throws when no token is available', () => {
    mock.module('@actions/github', () => ({
      getOctokit: mock(),
      context: {},
    }));

    expect(() => githubApi()).toThrow(
      `This step requires 'github-token' or a GITHUB_TOKEN environment variable to create comments`
    );
  });
});

describe(getRepoDefaultBranch, () => {
  it('returns default branch from context payload', () => {
    mock.module('@actions/github', () => ({
      context: {
        payload: {
          repository: {
            default_branch: 'main',
          },
        },
      },
      getOctokit: mock(),
    }));

    const branch = getRepoDefaultBranch();

    expect(branch).toBe('main');
  });

  it('returns undefined when no repository in payload', () => {
    mock.module('@actions/github', () => ({
      context: {
        payload: {},
      },
      getOctokit: mock(),
    }));

    const branch = getRepoDefaultBranch();

    expect(branch).toBeUndefined();
  });

  it('returns undefined when no payload', () => {
    mock.module('@actions/github', () => ({
      context: {},
      getOctokit: mock(),
    }));

    const branch = getRepoDefaultBranch();

    expect(branch).toBeUndefined();
  });
});

describe(isPushBranchContext, () => {
  it('returns true for push event to target branch', () => {
    mock.module('@actions/github', () => ({
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
      },
      getOctokit: mock(),
    }));

    const result = isPushBranchContext('main');

    expect(result).toBe(true);
  });

  it('returns false for push event to different branch', () => {
    mock.module('@actions/github', () => ({
      context: {
        eventName: 'push',
        ref: 'refs/heads/develop',
      },
      getOctokit: mock(),
    }));

    const result = isPushBranchContext('main');

    expect(result).toBe(false);
  });

  it('returns false for non-push event', () => {
    mock.module('@actions/github', () => ({
      context: {
        eventName: 'pull_request',
        ref: 'refs/heads/main',
      },
      getOctokit: mock(),
    }));

    const result = isPushBranchContext('main');

    expect(result).toBe(false);
  });

  it('returns false for push event without refs/heads prefix', () => {
    mock.module('@actions/github', () => ({
      context: {
        eventName: 'push',
        ref: 'main',
      },
      getOctokit: mock(),
    }));

    const result = isPushBranchContext('main');

    expect(result).toBe(false);
  });
});
