import { getOctokit, context } from '@actions/github';
import { ok as assert } from 'assert';

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
  const body = `<!-- ${comment.id} -->\n${comment.body}`;
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
  assert(process.env['GITHUB_TOKEN'], 'This step requires a GITHUB_TOKEN environment variable to create comments');
  return getOctokit(process.env['GITHUB_TOKEN']);
}

/**
 * Validate and extract the pull reference from context.
 * If it's not a supported event, e.g. not a pull, it will throw an error.
 * Unfortunately, we can't overwrite the GitHub event details, it includes some testing code.
 */
export function pullContext(): IssueContext {
  // see .github/workflows/test.yml in 'comment'
  if (process.env['EXPO_TEST_GITHUB_PULL']) {
    return { ...context.repo, number: Number(process.env['EXPO_TEST_GITHUB_PULL']) };
  }

  assert(
    context.eventName === 'pull_request',
    'Could not find the pull request context, make sure to run this from a pull_request triggered workflow'
  );
  return context.issue;
}
