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
> This sub action is experimental and might change without notice. Use it at your own risk.

## Overview

`continuous-deploy-fingerprint` is a GitHub Action continuously deploys an Expo project using the expo-updates fingerprint runtime version policy. When run, it performs the following tasks in order, once for each platform:
1. Check current fingerprint of the project.
2. Check for EAS builds with specified profile matching that fingerprint.
3. If an EAS build doesn't exist, start one.
4. Publish an update on EAS update.
5. If run on a PR, post a comment indicating what was done.

## Usage

To use this action, add the following code to your workflow:

```yaml
on:
  push:
    # REQUIRED: push main (default) branch is necessary for this action to update its fingerprint database
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  <JOB_NAME>:
    runs-on: <RUNNER>
    # REQUIRED: limit concurrency when running on main or within a PR
    concurrency: continuous-deploy-fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      # REQUIRED: Allow comments of PRs
      pull-requests: write # Allow comments on PRs

    steps:
      - name: 🏗 Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Continuously Deploy
        id: continuous-deploy
        uses: expo/expo-github-action/continuous-deploy-fingerprint@main
        with:
          profile: ${{ github.event_name != 'pull_request' && 'production' || 'development }}
```

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable                           | default          | description                                                             |
| ---------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| **profile**                        | (required)       | The EAS Build profile to use, must have EAS Update channel specified in eas.json |
| **branch**                     | (channel name from profile)       | The EAS Update branch on which to publish |
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

<div align="center">
  <br />
  with :heart:&nbsp;<strong>Expo</strong>
  <br />
</div>
