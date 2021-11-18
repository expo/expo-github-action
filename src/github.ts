import { getOctokit, context } from '@actions/github';
import { AppLinks } from './expo';

type RepoRef = {
  owner: string;
  repo: string;
};

type IssueOrPullRef = RepoRef & {
  number: number;
};

type Comment = {
  /** A hidden identifier to embed in the comment */
  id: string;
  /** The contents of the comment */
  body: string;
};

/**
 * Validate and extract the pull reference from context.
 * If it's not a supported event, e.g. not a pull, it will throw an error.
 */
export function getPullRef(): IssueOrPullRef {
  if (context.eventName !== 'pull_request') {
    throw new Error(`Can't find the pull context, make sure to run this step from a pull request.`);
  }

  return context.issue;
}

export function makeCommentId(appName: string, releaseChannel?: string) {
  return `app:${appName} channel:${releaseChannel || 'default'}`;
}

export function makeCommentBody(links: AppLinks) {
  return `Here is a [preview link](${links.url}).<br><br><a href="${links.url}"><img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${links.manifest}" height="200px" width="200px"></a>`;
}

/**
 * Retrieve the token from `GITHUB_TOKEN` environment variable.
 */
export function getToken() {
  const githubToken = process.env['GITHUB_TOKEN'];
  if (!githubToken) {
    throw new Error(`This action requires a valid 'github-token' to create comments.`);
  }

  return githubToken;
}

/**
 * Determine if a comment exists on an issue or pull with the provided identifier.
 * This will iterate all comments received from GitHub, and try to exit early if it exists.
 */
export async function hasPullComment(pull: IssueOrPullRef, comment: Pick<Comment, 'id'>) {
  const github = getOctokit(getToken());
  const iterator = github.paginate.iterator(github.rest.issues.listComments, {
    owner: pull.owner,
    repo: pull.repo,
    issue_number: pull.number,
  });

  for await (const { data: batch } of iterator) {
    for (const item of batch) {
      if ((item.body || '').includes(comment.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create a new comment on an existing issue or pull.
 * This includes a hidden identifier (markdown comment) to identify the comment later.
 */
export async function createPullComment(pull: IssueOrPullRef, comment: Comment) {
  const github = getOctokit(getToken());
  const body = `<!-- ${comment.id} --> ${comment.body}`;

  return github.rest.issues.createComment({
    owner: pull.owner,
    repo: pull.repo,
    issue_number: pull.number,
    body,
  });
}

/**
 * Only create a comment if there are no comments with the identifier.
 * This avoids spamming a pull multiple times by using a hidden identifier in the comment.
 */
export async function createPullCommentOnce(pull: IssueOrPullRef, comment: Comment) {
  const commentExists = await hasPullComment(pull, comment);
  if (!commentExists) {
    return createPullComment(pull, comment);
  }

  return null;
}
