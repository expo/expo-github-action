<div align="center">
  <h1>continuous-deploy-fingerprint</h1>
  <p>Continuously deploys an Expo project using EAS Build and EAS Update in combination with fingerprint runtime versions</p>
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
> This sub action is still in development and might change without notice. It is not yet ready for use.

## Overview

`continuous-deploy-fingerprint` is a GitHub Action continuously deploys an Expo project using the expo-updates fingerprint runtime version policy. When run, it performs the following tasks in order, once for each platform:
1. Check current fingerprint of the project.
2. Check for EAS builds with specified profile matching that fingerprint.
3. If an EAS build doesn't exist, start one.
4. Publish an update on EAS update.
5. If run on a PR, post a comment indicating what was done.

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable                           | default          | description                                                             |
| ---------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| **profile**                        | (required)       | The EAS Build profile to use |
| **branch**                     | (required)       | The EAS Update branch on which to publish |
| **working-directory**              | -                | The relative directory of your Expo app                                 |
| **github-token**                   | `github.token`   | GitHub token to use when commenting on PR ([read more](#github-tokens)) |

And the action will generate these [outputs](#available-outputs) for other actions to do something based on what this action did.

### Available outputs

In case you want to reuse this action for other purpose, this action will set the following action outputs.

| output name              | description                                                                                                                                                                                   |
| ------------------------ | ------------------------------ |
| **ios-fingerprint**      | The iOS fingerprint of the current commit.          |
| **android-fingerprint**  | The Android fingerprint of the current commit.                 |
| **android-build-id**  | ID for Android EAS Build if one was started. |
| **ios-build-id**  | ID for iOS EAS Build if one was started.         |
| **update-output**     | The output (JSON) from the `eas update` command. |

## Caveats

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

### Continuously deploy after tests on main branch and pull requests

This workflow continuously deploys:
- main branch -> production EAS Build profile and EAS Update branch
- PR branches -> development EAS Build profile and EAS Update branch

This means that every commit landed to main will go out to users on production. If a new build is created, it will need to be manually submitted to the app stores.

Pull requests also do a build if necessary and display a QR code to scan to preview the latest commit on the PR.

```yml
on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize]

env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v4
      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: yarn
      - name: 📦 Install dependencies
        run: yarn install
      - name: 🧪 Run tests
        run: yarn test

  continuously-deploy:
    needs: test
    runs-on: ubuntu-latest
    concurrency: continuous-deploy-fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      contents: read # Allow checkout
      pull-requests: write # Allow comments on PRs
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v4

      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18.x

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🏗 Setup EAS
        uses: expo/expo-github-action@main
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Continuously Deploy
        uses: expo/expo-github-action/continuous-deploy-fingerprint@main
        with:
          profile: ${{ github.event_name != 'pull_request' && 'production' || 'development' }}
          branch: ${{ github.event_name != 'pull_request' && 'production' || 'development' }}
```

<div align="center">
  <br />
  with :heart:&nbsp;<strong>Expo</strong>
  <br />
</div>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-gha-token]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
