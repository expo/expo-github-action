import * as core from '@actions/core';

import {
  CommentInput,
  commentInput,
  commentAction,
  DEFAULT_ID,
  DEFAULT_MESSAGE,
} from '../../src/actions/preview-comment';
import * as expo from '../../src/expo';
import * as github from '../../src/github';
import { mockInput } from '../utils';

jest.mock('@actions/core');
jest.mock('../../src/expo');
jest.mock('../../src/github');
jest.mock('../../src/worker');

describe(commentInput, () => {
  it('returns object with correct defaults', () => {
    expect(commentInput()).toMatchObject({
      channel: 'default',
      comment: true,
      message: DEFAULT_MESSAGE,
      messageId: DEFAULT_ID,
      project: undefined,
      githubToken: undefined,
    });
  });

  it('returns project path', () => {
    mockInput({ project: 'fake/project' });
    expect(commentInput()).toMatchObject({ project: 'fake/project' });
  });

  it('returns disabled comment', () => {
    mockInput({ comment: 'false' });
    expect(commentInput()).toMatchObject({ comment: false });
  });

  it('returns message and id', () => {
    mockInput({ message: 'fake message', 'message-id': 'fake id' });
    expect(commentInput()).toMatchObject({ message: 'fake message', messageId: 'fake id' });
  });

  it('returns channel', () => {
    mockInput({ channel: 'pr-420' });
    expect(commentInput()).toMatchObject({ channel: 'pr-420' });
  });

  it('returns github-token', () => {
    mockInput({ 'github-token': 'fakegithubtoken' });
    expect(commentInput()).toMatchObject({ githubToken: 'fakegithubtoken' });
  });
});

describe(commentAction, () => {
  const input: CommentInput = {
    channel: 'default',
    comment: false,
    message: DEFAULT_MESSAGE,
    messageId: DEFAULT_ID,
    project: '',
    githubToken: '',
  };

  beforeEach(() => {
    jest.mocked(expo.projectInfo).mockResolvedValue({ name: 'fakename', slug: 'fakeslug' });
    jest.mocked(expo.projectOwner).mockResolvedValue('fakeuser');
  });

  it('resolves project info by project path', async () => {
    await commentAction({ ...input, project: 'fake/path' });
    expect(expo.projectInfo).toBeCalledWith('fake/path');
  });

  it('resolves project owner info by manifest owner', async () => {
    jest.mocked(expo.projectInfo).mockResolvedValue({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' });
    await commentAction({ ...input });
    expect(core.setOutput).toBeCalledWith('projectOwner', 'fakeowner');
    expect(expo.projectOwner).not.toBeCalled();
  });

  it('resolves project owner info by current user', async () => {
    await commentAction({ ...input });
    expect(core.setOutput).toBeCalledWith('projectOwner', 'fakeuser');
  });

  it('creates comment when enabled', async () => {
    await commentAction({ ...input, comment: true });
    expect(github.pullContext).toBeCalled();
    expect(github.createIssueComment).toBeCalled();
  });

  it('resolves the template variables for message', async () => {
    await commentAction({ ...input });
    const message = jest.mocked(core.setOutput).mock.calls.find(call => call[0] === 'message');
    expect(message![1]).not.toMatch(DEFAULT_MESSAGE);
  });

  describe('outputs', () => {
    it('sets projectOwner', async () => {
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('projectOwner', 'fakeuser');
    });

    it('sets projectName', async () => {
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('projectName', 'fakename');
    });

    it('sets projectSlug', async () => {
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('projectSlug', 'fakeslug');
    });

    it('sets projectLink', async () => {
      jest.mocked(expo.projectLink).mockReturnValue('https://expo.dev/@fakeuser/fakeslug');
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('projectLink', 'https://expo.dev/@fakeuser/fakeslug');
    });

    it('sets projectQR', async () => {
      jest.mocked(expo.projectQR).mockReturnValue('https://qr.expo.dev/expo-go?owner=fakeuser&slug=fakeslug');
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('projectQR', 'https://qr.expo.dev/expo-go?owner=fakeuser&slug=fakeslug');
    });

    it('sets message', async () => {
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('message', expect.any(String));
    });

    it('sets messageId', async () => {
      await commentAction({ ...input });
      expect(core.setOutput).toBeCalledWith('messageId', expect.any(String));
    });
  });
});
