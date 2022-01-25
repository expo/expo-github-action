import * as github from '@actions/github';

import { githubApi, pullContext } from '../src/github';
import { setEnv, resetEnv } from './utils';

jest.mock('@actions/github');

describe(githubApi, () => {
  afterEach(resetEnv);

  it('throws when GITHUB_TOKEN and input are undefined', () => {
    setEnv('GITHUB_TOKEN', '');
    expect(() => githubApi()).toThrow(`requires 'github-token' or a GITHUB_TOKEN`);
  });

  it('returns octokit instance with GITHUB_TOKEN', () => {
    setEnv('GITHUB_TOKEN', 'fakegithubtoken');
    const fakeGithub = {};
    jest.mocked(github.getOctokit).mockReturnValue(fakeGithub as any);
    expect(githubApi()).toBe(fakeGithub);
    expect(github.getOctokit).toBeCalledWith('fakegithubtoken');
  });

  it('returns octokit instance with input', () => {
    setEnv('GITHUB_TOKEN', '');
    const fakeGithub = {};
    jest.mocked(github.getOctokit).mockReturnValue(fakeGithub as any);
    expect(githubApi({ token: 'fakegithubtoken' })).toBe(fakeGithub);
    expect(github.getOctokit).toBeCalledWith('fakegithubtoken');
  });

  it('uses GITHUB_TOKEN before input', () => {
    setEnv('GITHUB_TOKEN', 'fakegithubtoken');
    const fakeGithub = {};
    jest.mocked(github.getOctokit).mockReturnValue(fakeGithub as any);
    expect(githubApi({ token: 'badfakegithubtoken' })).toBe(fakeGithub);
    expect(github.getOctokit).toBeCalledWith('fakegithubtoken');
  });
});

describe(pullContext, () => {
  it('throws when github context event is not a pull request', () => {
    jest.mocked(github.context).eventName = 'push';
    expect(() => pullContext()).toThrow('Could not find the pull request context');
  });

  it('returns pull request context', () => {
    jest.mocked(github.context).eventName = 'pull_request';
    jest.mocked(github.context).issue = { owner: 'fakeowner', repo: 'fakerepo', number: 1337 };
    expect(pullContext()).toMatchObject({ owner: 'fakeowner', repo: 'fakerepo', number: 1337 });
  });
});
