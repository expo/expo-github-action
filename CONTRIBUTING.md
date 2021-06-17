# Contributing to Expo Github Action

## 📦 Download and Setup

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device. (`git remote add upstream git@github.com:expo/expo-github-action.git` 😉)
2. Make sure you have the following packages globally installed on your system:
   - [node](https://nodejs.org/) (active Node LTS or higher is recommended)
   - [yarn](https://yarnpkg.com/)
3. Install the Node packages (`yarn install`)

## 🏎️ Running a custom version

To try out your changed with Github Action, you have [to reference your fork and/or branch or commit reference](https://docs.github.com/en/actions/learn-github-actions/finding-and-customizing-actions#using-release-management-for-your-custom-actions) in the workflow you want to try. After that, you have two options:

1. Run the workflow in Github Actions itself by triggering your workflow.
2. Run the workflow locally with [nektos/act](https://github.com/nektos/act).

## ✅ Testing

Testing is done using [Jest](https://jestjs.io/https://jestjs.io/). Run `yarn test` to run Jest.

In CI we are running tests on multiple Node versions using Windows, Linux, and MacOS. Make sure they are passing for your PR.

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

To release a new version for Github Actions, we have to create a new release in Github. You can run the `Release` workflow to generate a new version, changelog, and Github release.

After the exact version tag is created, update the `v{major}` tag to the latest major version.
