<div align="center">
  <h1>preview-build</h1>
  <p>Create [EAS Builds](https://docs.expo.dev/build/introduction/) for pull requests using [`@expo/fingerprint`](https://www.npmjs.com/package/@expo/fingerprint)</p>
</div>

<p align="center">
  <a href="https://github.com/expo/expo-github-action/releases" title="Latest release">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/github/package-json/v/expo/expo-github-action?style=flat-square&color=0366D6&labelColor=49505A">
      <img alt="Latest release" src="https://img.shields.io/github/package-json/v/expo/expo-github-action?style=flat-square&color=0366D6&labelColor=D1D5DA" />
    </picture>
  </a>
  <a href="https://github.com/expo/expo-github-action/actions" title="Workflow status">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/github/actions/workflow/status/expo/expo-github-action/test.yml?branch=main&style=flat-square&labelColor=49505A">
      <img alt="Workflow status" src="https://img.shields.io/github/actions/workflow/status/expo/expo-github-action/test.yml?branch=main&style=flat-square&labelColor=D1D5DA" />
    </picture>
  </a>
</p>

<p align="center">
  <a href="#usage"><b>Usage</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#available-outputs"><b>Outputs</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#example-workflows"><b>Examples</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#caveats"><b>Caveats</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="https://github.com/expo/expo-github-action/blob/main/CHANGELOG.md"><b>Changelog</b></a>
</p>

<br />

> **Warning**
> This sub action is experimental and might change without notice. Use it at your own risk

## Overview

`preview-build` is a GitHub Action that creates new EAS Builds for pull requests using [`@expo/fingerprint`](https://www.npmjs.com/package/@expo/fingerprint). When a pull request is updated, you can use this action to check the fingerprint integrity. If a pull request is fingerprint compatible, it means there are no changes from native code and be EAS Update compatible. Otherwise, if fingerprint changed, it means native code changed and the action will create new EAS Builds.

This action is designed to be used in conjunction with the `@expo/fingerprint` package, which generates a unique fingerprint for each pull request based on the contents of the code. By using fingerprinting, this action can determine if a pull request has already been built, and reuse the existing build instead of creating a new one.

## Usage

To use this action, add the following code to your workflow:

```yaml
on:
  push:
    # REQUIRED: push main(default) branch is necessary for this action to update its fingerprint database
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  <JOB_NAME>:
    runs-on: <RUNNER>
    # REQUIRED: limit concurrency when pushing main(default) branch to prevent conflict for this action to update its fingerprint database
    concurrency: fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      # REQUIRED: Allow comments of PRs
      pull-requests: write # Allow comments on PRs
      # REQUIRED: Allow updating fingerprint in acton caches
      actions: write

    steps:
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Create preview builds if fingerprint changed
        uses: expo/expo-github-action/preview-build
        with:
          command: eas build --profile development --platform all
```

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable                           | default                                        | description                                                                                    |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **command**                        | -                                              | EAS CLI command to run when creating builds                                                    |
| **comment**                        | `true`                                         | If the action should summarize the EAS Update information as comment on a pull request         |
| **comment-id**                     | _[see code][code-defaults]_                    | unique id template to prevent duplicate comments ([read more](#preventing-duplicate-comments)) |
| **working-directory**              | -                                              | The relative directory of your Expo app                                                        |
| **packager**                       | - `yarn`                                       | The package manager used to install the fingerprint tools                                      |
| **github-token**                   | `github.token`                                 | GitHub token to use when commenting on PR ([read more](#github-tokens))                        |
| **fingerprint-version**            | `latest`                                       | `@expo/fingerprint` version to install                                                         |
| **fingerprint-installation-cache** | `true`                                         | If the `@expo/fingerprint` should be cached to speed up installation                           |
| **fingerprint-db-cache-key**       | `fingerprint-db`                               | A cache key to use for saving the fingerprint database                                         |
| **eas-build-message**              | Will retrieve from the Git branch HEAD message | A short message describing the build that will pass to `eas build --message`                   |

### Available outputs

In case you want to reuse this action for other purpose, this action will set the following action outputs.

| output name           | description                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **projectId**         | The resolved EAS project ID                                                                       |
| **commentId**         | The unique comment ID to prevent duplicate comments ([read more](#preventing-duplicate-comments)) |
| **comment**           | The comment with information about the updates                                                    |
| **gitCommitHash**     | Git commit hash that was found when creating this build                                           |
| **androidBuildId**    | EAS Build ID for Android                                                                          |
| **androidLink**       | Absolute URL to Android build on expo.dev                                                         |
| **androidAppVersion** | Version of the Android app                                                                        |
| **iosBuildId**        | EAS Build ID for iOS                                                                              |
| **iosLink**           | Absolute URL to iOS build on expo.dev                                                             |
| **iosAppVersion**     | Version of the iOS app                                                                            |

## Example workflows

Here's an example workflow that uses this action to comment pull requests and create EAS Builds if fingerprint changed

```yaml
name: Build preview for pull requests

on:
  push:
    # REQUIRED: push main(default) branch is necessary for this action to update its fingerprint database
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  build:
    runs-on: ubuntu-latest
    # REQUIRED: limit concurrency when pushing main(default) branch to prevent conflict for this action to update its fingerprint database
    concurrency: fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      # REQUIRED: Allow comments of PRs
      pull-requests: write # Allow comments on PRs
      # REQUIRED: Allow updating fingerprint in acton caches
      actions: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: 🏗  Setup EAS
        uses: expo/expo-github-action
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: yarn install

      - name: Create preview builds if needed
        uses: expo/expo-github-action/preview-build
        with:
          command: eas build --profile development --platform all
```

This workflow listens for pull request events and generates a fingerprint for each pull request. It then uses this action to create an EAS Build for the pull request, and deploys the build using another action.

## Caveats

### Preventing duplicate comments

When automating these preview comments, you have to be careful not to spam a pull request on every successful run.
Every comment contains a generated **message-id** to identify previously made comments and update them instead of creating a new comment.

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.
