import { getOctokit, context } from '@actions/github';
import { ok as assert } from 'assert';

type IssueContext = typeof context['issue'];

type IssueCommentContext = IssueContext & {
  comment_id?: number;
};

type AuthContext = {
  /** GitHub token from the 'github-input' to authenticate with */
  token?: string;
};

type Comment = {
  /** A hidden identifier to embed in the comment */
  id: string;
  /** The contents of the comment */
  body: string;
};

export type Reaction = {
  content: '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes';
};

/**
 * Determine if a comment exists on an issue or pull with the provided identifier.
 * This will iterate all comments received from GitHub, and try to exit early if it exists.
 */
export async function fetchIssueComment(options: AuthContext & IssueContext & Pick<Comment, 'id'>) {
  const github = githubApi(options);
  const iterator = github.paginate.iterator(github.rest.issues.listComments, {
    owner: options.owner,
    repo: options.repo,
    issue_number: options.number,
  });

  for await (const { data: batch } of iterator) {
    for (const item of batch) {
      if ((item.body || '').includes(options.id)) {
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
export async function createIssueComment(options: AuthContext & IssueContext & Comment) {
  const github = githubApi(options);
  const body = `<!-- ${options.id} -->\n${options.body}`;
  const existing = await fetchIssueComment(options);

  if (existing) {
    return github.rest.issues.updateComment({
      owner: options.owner,
      repo: options.repo,
      comment_id: existing.id,
      body,
    });
  }

  return github.rest.issues.createComment({
    owner: options.owner,
    repo: options.repo,
    issue_number: options.number,
    body,
  });
}

/**
 * Get an authenticated octokit instance.
 * This uses the 'GITHUB_TOKEN' environment variable, or 'github-token' input.
 */
export function githubApi(options: AuthContext = {}): ReturnType<typeof getOctokit> {
  const token = process.env['GITHUB_TOKEN'] || options.token;
  assert(token, `This step requires 'github-token' or a GITHUB_TOKEN environment variable to create comments`);
  return getOctokit(token);
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

export async function createReaction(options: AuthContext & IssueCommentContext & Reaction) {
  const github = githubApi(options);

  if (options.comment_id) {
    return github.rest.reactions.createForIssueComment({
      owner: options.owner,
      repo: options.repo,
      comment_id: options.comment_id,
      content: options.content,
    });
  }

  return github.rest.reactions.createForIssue({
    owner: options.owner,
    repo: options.repo,
    issue_number: options.number,
    content: options.content,
  });
}

export function issueComment() {
  assert(
    context.eventName === 'issue_comment',
    'Could not find the issue comment context, make sure to run this from a issue_comment triggered workflow'
  );
  return [
    (context.payload?.comment?.body ?? '') as string,
    {
      ...context.issue,
      comment_id: context.payload?.comment?.id,
    },
  ] as const;
}
