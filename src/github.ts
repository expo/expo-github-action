import { getOctokit, context } from '@actions/github';

type IssueContext = typeof context['issue'];

type Comment = {
  /** A hidden identifier to embed in the comment */
  id: string;
  /** The contents of the comment */
  body: string;
};

/**
 * Determine if a comment exists on an issue or pull with the provided identifier.
 * This will iterate all comments received from GitHub, and try to exit early if it exists.
 */
export async function fetchIssueComment(issue: IssueContext, commentId: Comment['id']) {
  const github = githubApi();
  const iterator = github.paginate.iterator(github.rest.issues.listComments, {
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.number,
  });

  for await (const { data: batch } of iterator) {
    for (const item of batch) {
      if ((item.body || '').includes(commentId)) {
        return item;
      }
    }
  }
}

/**
 * Create a new comment on an existing issue or pull.
 * This includes a hidden identifier (markdown comment) to identify the comment later.
 * It will also update the comment when a previous comment id was found.
 */
export async function createIssueComment(issue: IssueContext, comment: Comment) {
  const github = githubApi();
  const body = `${comment.body}\n\n<!-- ${comment.id} -->`;
  const existing = await fetchIssueComment(issue, comment.id);

  if (existing) {
    return github.rest.issues.updateComment({
      owner: issue.owner,
      repo: issue.repo,
      comment_id: existing.id,
      body,
    });
  }

  return github.rest.issues.createComment({
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.number,
    body,
  });
}

/**
 * Get an authenticated octokit instance.
 * This uses the 'GITHUB_TOKEN' environment variable.
 */
export function githubApi(): ReturnType<typeof getOctokit> {
  const githubToken = process.env['GITHUB_TOKEN'];
  if (!githubToken) {
    throw new Error(`This step requires a 'GITHUB_TOKEN' environment variable to create comments.`);
  }
  return getOctokit(githubToken);
}

/**
 * Validate and extract the pull reference from context.
 * If it's not a supported event, e.g. not a pull, it will throw an error.
 */
export function pullContext(): IssueContext {
  if (context.eventName !== 'pull_request') {
    throw new Error(`Could not find the pull context, make sure to run this from a pull request.`);
  }
  return context.issue;
}
