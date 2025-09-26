import { context, getOctokit } from '@actions/github';
import assert from 'node:assert';

type AuthContext = {
  /** GitHub token from the 'github-input' to authenticate with */
  token?: string;
};

/**
 * Get an authenticated octokit instance.
 * This uses the 'GITHUB_TOKEN' environment variable, or 'github-token' input.
 */
export function githubApi(options: AuthContext = {}): ReturnType<typeof getOctokit> {
  const token = process.env['GITHUB_TOKEN'] || options.token;
  assert(
    token,
    `This step requires 'github-token' or a GITHUB_TOKEN environment variable to create comments`
  );
  return getOctokit(token);
}

/**
 * Get the default branch for the repository.
 */
export function getRepoDefaultBranch(): string | undefined {
  return context.payload?.repository?.default_branch;
}

/**
 * True if the current event is a push to the target branch.
 *
 * @param targetBranch The branch to compare against.
 */
export function isPushBranchContext(targetBranch: string) {
  return context.eventName === 'push' && context.ref === `refs/heads/${targetBranch}`;
}
