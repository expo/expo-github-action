import { getInput } from '@actions/core';
import * as path from 'path';

import * as tools from '../tools';
import { createPullCommentOnce, getPullRef, makeCommitBody, makeCommitId } from '../github';
import { getAppFullName, getAppLinks } from '../expo';

// Auto-execute in GitHub actions
tools.performAction(commentQRAction);

export async function commentQRAction(): Promise<void> {
  const { githubToken, releaseChannel, projectRoot } = getInputs();

  const repoRef = getPullRef();
  const appName = getAppFullName(projectRoot);
  const appLink = getAppLinks(appName, releaseChannel);

  await createPullCommentOnce(githubToken, repoRef, {
    id: makeCommitId(appName, releaseChannel),
    body: makeCommitBody(appLink),
  });
}

function getInputs() {
  const githubWorkspace = process.env['GITHUB_WORKSPACE'];
  if (!githubWorkspace) {
    throw new Error(`Environment variable 'GITHUB_WORKSPACE' is not set`);
  }

  const githubToken = getInput('github-token');
  if (!githubToken) {
    throw new Error(`This action requires a valid 'github-token' to create comments.`);
  }

  return {
    githubToken,
    releaseChannel: getInput('release-channel') || undefined,
    projectRoot: path.resolve(githubWorkspace, getInput('project-root') || '.'),
  };
}
