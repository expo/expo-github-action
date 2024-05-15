<div align="center">
  <h1>fingerprint</h1>
  <p>Checking project fingerprinting for pull requests using <a href="https://www.npmjs.com/package/@expo/fingerprint"><code>@expo/fingerprint</code></a></p>
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

`fingerprint` is a GitHub Action that checks project fingerprinting for pull requests using [`@expo/fingerprint`](https://www.npmjs.com/package/@expo/fingerprint). When a pull request is updated, you can use this action to check the fingerprint integrity. If a pull request is fingerprint compatible, it means there are no changes from native code and be Over-The-Air updates compatible. Otherwise, if fingerprint changed, it means the project has native code changes.

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
      # REQUIRED: Allow updating fingerprint in action caches
      actions: write

    steps:
      - name: Check fingerprint
        uses: expo/expo-github-action/fingerprint@main
```

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable                           | default          | description                                                                                 |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| **working-directory**              | -                | The relative directory of your Expo app                                                     |
| **packager**                       | `yarn`           | The package manager used to install the fingerprint tools                                   |
| **github-token**                   | `github.token`   | GitHub token to use when commenting on PR ([read more](#github-tokens))                     |
| **fingerprint-version**            | `latest`         | `@expo/fingerprint` version to install                                                      |
| **fingerprint-installation-cache** | `true`           | If the `@expo/fingerprint` should be cached to speed up installation                        |
| **fingerprint-db-cache-key**       | `fingerprint-db` | A cache key to use for saving the fingerprint database                                      |
| **previous-git-commit**            | -                | The Git hash for the base commit                                                            |
| **current-git-commit**             | -                | The Git hash for the current commit                                                         |
| **saving-db-branch**               | -                | The branch for saving the fingerprint database. Defaults to the repository's default branch |

And the action will generate these [outputs](#available-outputs) for other actions to do something based on current project fingerprint

### Available outputs

In case you want to reuse this action for other purpose, this action will set the following action outputs.

| output name              | description                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **previous-fingerprint** | The fingerprint of the base commit if it has been computed previously. May be null if it has not been computed previously.                                                                    |
| **current-fingerprint**  | The fingerprint of the current commit.                                                                                                                                                        |
| **previous-git-commit**  | The Git hash for the base commit.                                                                                                                                                             |
| **current-git-commit**   | The Git hash for the current commit.                                                                                                                                                          |
| **fingerprint-diff**     | The diff between the current and the previous fingerprint. It is a JSON array of fingerprint diff. If the fingerprint does not change in between, the result diff will be an empty array `[]` |

## Example workflows

Here's an example workflow that uses this action to comment pull requests and add `Fingerprint:compatible` and `Fingerprint:changed` labels

```yaml
name: PR Labeler

on:
  push:
    # REQUIRED: push main(default) branch is necessary for this action to update its fingerprint database
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  fingerprint:
    runs-on: ubuntu-latest
    # REQUIRED: limit concurrency when pushing main(default) branch to prevent conflict for this action to update its fingerprint database
    concurrency: fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      # REQUIRED: Allow comments of PRs
      pull-requests: write # Allow comments on PRs
      # REQUIRED: Allow updating fingerprint in action caches
      actions: write
      # OPTIONAL: Allow reading of repo contents for private projects
      # contents: read

    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v3

      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: yarn

      - name: 📦 Install dependencies
        run: yarn install

      - name: Check fingerprint
        id: fingerprint
        uses: expo/expo-github-action/fingerprint@main

      - uses: actions/github-script@v6
        if: ${{ github.event_name == 'pull_request' && steps.fingerprint.outputs.fingerprint-diff == '[]' }}
        with:
          script: |
            try {
              await github.rest.issues.removeLabel({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                name: ['Fingerprint:changed']
              })
            } catch (e) {
              if (e.status != 404) {
                throw e;
              }
            }
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['Fingerprint:compatible']
            })

      - uses: actions/github-script@v6
        if: ${{ github.event_name == 'pull_request' && steps.fingerprint.outputs.fingerprint-diff != '[]' }}
        with:
          script: |
            try {
              await github.rest.issues.removeLabel({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                name: ['Fingerprint:compatible']
              })
            } catch (e) {
              if (e.status != 404) {
                throw e;
              }
            }
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['Fingerprint:changed']
            })
```

This workflow listens for pull request events and generates a fingerprint for each pull request. Based on the `fingerprint-diff` output, the example then use GitHub API to add/remove labels based on fingerprint compatible state.

## Caveats

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.

<div align="center">
  <br />
  with :heart:&nbsp;<strong>Expo</strong>
  <br />
</div>
