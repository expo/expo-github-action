# Contributing to Expo GitHub Action

## 📦 Download and Setup

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device. (`git remote add upstream git@github.com:expo/expo-github-action.git` 😉)
2. Make sure you have the following packages globally installed on your system:
   - [node](https://nodejs.org/) (active Node LTS or higher is recommended)
   - [yarn](https://yarnpkg.com/)
3. Install the Node packages (`yarn install`)

## 🏎️ Running a custom version

To try out your changes with GitHub Action, you have [to reference your fork and/or branch or commit reference](https://docs.github.com/en/actions/learn-github-actions/finding-and-customizing-actions#using-release-management-for-your-custom-actions) in the workflow you want to try. After that, you have two options:

1. Run the workflow in GitHub Actions itself by triggering your workflow.
2. Run the workflow locally with [nektos/act](https://github.com/nektos/act).

## 🧪 Testing

Testing is done using [Jest](https://jestjs.io/https://jestjs.io/). Run `yarn test` to run Jest.

If your PR is ready, run the **test** workflow to test the workflows on all supported OS system.

## 📝 Writing a Commit Message

> If this is your first time committing to a large public repo, you could look through this neat tutorial: ["How to Write a Git Commit Message"](https://chris.beams.io/posts/git-commit/)

Commit messages are formatted using the [Conventional Commits](https://www.conventionalcommits.org/) format. You can take a look at [`.releaserc.js`](./.releaserc.js) for the allowed commit types.

```
docs: fix typo in xxx
feature: add support for SDK 40
chore: add test-case for custom completions
fix: improve logging for errors
refactor: update loading icon
```

## 🔎 Before Submitting a PR

To get your PR merged as fast as possible, please make sure you have done the following:

- Run `yarn lint --fix` to fix the formatting of the code. Ensure that `yarn lint` succeeds without errors or warnings.
- Run `yarn test` to make sure all normal use cases are passing.
- Run `yarn build` to ensure the build is up-to-date and runs correctly and without errors or warnings.

## 🚀 Releasing a new version

To release a new version for GitHub Actions, we have to create a new release in GitHub. You can run the `Release` workflow to generate a new version, changelog, and GitHub release. 

That workflow also bumps up the major version tag, like `v7`. In cases of failure, you could run this manually.

```bash
$ git checkout main
$ git fetch --tags && git pull
$ git tag --force v{major}
$ git push --force --tags
```

When the release is fully tagged and ready, we still need to submit it to the marketplace. You can do that by editing the published version on [GitHub's release page](https://github.com/expo/expo-github-action/releases). Just saving it again notifies the marketplace of the new version.
