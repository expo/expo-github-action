<div align="center">
  <h1>continuous-deploy-fingerprint</h1>
  <p>Continuously deploys an Expo project using EAS Build and EAS Update in combination with a fingerprint runtime version</p>
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

`continuous-deploy-fingerprint` is a GitHub Action that continuously deploys an Expo project using the expo-updates fingerprint runtime version policy. When run, it performs the following tasks in order, once for each platform:
1. Check current fingerprint of the project.
2. Check for EAS builds with specified profile matching that fingerprint.
3. If a in-progress or finished EAS build doesn't exist, start one. Optionally submit any created builds to their respective app stores.
4. Publish an update on EAS update.
5. If run on a PR, post a comment indicating what was done.

### Prerequisites

- Must have expo-updates set up with a `fingerprint` runtime version policy.
- Must be configured for EAS Update.
- Should configure [`expo-dev-client`](https://docs.expo.dev/versions/latest/sdk/dev-client/) (recommended).
- Must have run the builds at least once manually in order to configure credentials. This can be done by running `eas build --profile <profile> --platform <platform>` for each profile and platform you have set up for this action.
- When using EAS Build auto submission (`auto-submit-builds`), must have configured [EAS Submit](https://docs.expo.dev/submit/introduction/) and run submissions manually at least once.

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable                | default        | description                                                                  |
| ----------------------- | -------------- | ---------------------------------------------------------------------------- |
| **profile**             | (required)     | The EAS Build profile to use                                                 |
| **branch**              | (required)     | The EAS Update branch on which to publish                                    |
| **environment**         | -              | The environment to use for server-side defined EAS environment variables     |
| **working-directory**   | -              | The relative directory of your Expo app                                      |
| **platform**            | `all`          | The platform to deploy on (available options are `ios`, `android` and `all`) |
| **auto-submit-builds**  | -              | Whether to add the `--auto-submit` flag to the issued `eas build` commands.  |
| **github-token**        | `github.token` | GitHub token to use when commenting on PR ([read more](#github-tokens))      |

And the action will generate these [outputs](#available-outputs) for other actions to do something based on what this action did.

### Available outputs

In case you want to reuse this action for other purpose, this action will set the following action outputs.

| output name             | description                                      |
| ----------------------- | ------------------------------------------------ |
| **ios-fingerprint**     | The iOS fingerprint of the current commit.       |
| **android-fingerprint** | The Android fingerprint of the current commit.   |
| **android-build-id**    | ID for Android EAS Build if one was started.     |
| **ios-build-id**        | ID for iOS EAS Build if one was started.         |
| **update-output**       | The output (JSON) from the `eas update` command. |

## Caveats

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

Below are two examples of how to uses these actions to achieve CI/CD in development and production. While production continuous deployment of apps is possible as demonstrated below, it is far more complex due to the added complication of app store submission. Therefore, continuous CI/CD is only recommended on development branches (PRs).

### Continuous integration and development (CI/CD) on pull requests (recommended)

This example workflow continuously deploys PR branches to the development EAS Build profile and EAS Update branch. It will do a development build if necessary and display a QR code to scan to preview the latest commit on the PR. This is most effective when combined with [`expo-dev-client`](https://docs.expo.dev/versions/latest/sdk/dev-client/) as the QR code is designed for that.

```yml
name: Continuous Development (PRs)

on:
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
    concurrency: continuous-deploy-fingerprint-${{ github.run_id }}
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
          profile: development
          branch: development
```

### Continuous deployment on main (advanced)

This example workflow continuously deploys the main branch to the production EAS Build profile and EAS Update branch. It also does automatic version bumping and auto-submission using EAS Submit when applicable. Note that this still will require human intervention on the app store side in order to promote the submitted build to production.

> [!CAUTION]
> Caveats:
> - When configured, this will do a submission to the app store every time the fingerprint changes. While it is possible to configure submission just to test flight, this likely will still cause too many submissions if your fingerprint changes often. In this case, continuous main deployment is not recommended; instead, a more traditional branch cut release process should be used.
> - This demonstrates a simplified example of what is likely needed to do automatic version bumping (prerequisite for continuous deployment on main).

```yml
name: Continuous Deployment (main)

on:
  push:
    branches:
      - main

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
    concurrency: continuous-deploy-fingerprint-main
    permissions:
      contents: write # Allow checkout and automated version bump write
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

      # Get current fingerprint info and builds to check if we need to do a version bump
      - name: Get fingerprint info
        id: info
        uses: expo/expo-github-action/continuous-deploy-fingerprint-info@main
        with:
          profile: production

      # If we do need to do a version bump, calculate the version to bump to. Note that this will vary greatly depending on your versioning preferences.
      - name: Get current version and calculate next version
        id: getversion
        if: ${{ github.event.head_commit.message != 'Automated version bump commit' && (steps.info.outputs.android-build-id == '' || steps.info.outputs.ios-build-id == '') }}
        run: |
          echo "currentversion=$(node -p "require('./app.json').expo.version")" >> $GITHUB_OUTPUT
          echo "nextversion=$(node -p "parseInt(require('./app.json').expo.version, 10) + 1 + '.0.0'")" >> $GITHUB_OUTPUT

      # Bump the version. Note that this will vary greatly depending on your CNG and versioning preferences.
      - name: Bump Version
        id: bumpversion
        if: ${{ github.event.head_commit.message != 'Automated version bump commit' && (steps.info.outputs.android-build-id == '' || steps.info.outputs.ios-build-id == '') }}
        uses: restackio/update-json-file-action@2.1
        with:
          file: app.json
          fields: "{\"expo.version\": \"${{ steps.getversion.outputs.nextversion }}\"}"

      # Commit and push the version bump to main.
      - name: Commit version bump
        id: commitversionbump
        if: ${{ github.event.head_commit.message != 'Automated version bump commit' && (steps.info.outputs.android-build-id == '' || steps.info.outputs.ios-build-id == '') }}
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Automated version bump commit"

      # Always continuously deploy. When no version bump is done (already have production builds for the fingerprint), this will solely deploy OTA updates.
      # When a version bump is done, this will kick off new production builds and auto-submit them to the app stores if configured.
      # Important note: the above version bump commit doesn't trigger a new workflow run due to
      # https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
      # so it is safe to always continuously deploy here, it'll use the post-commit fingerprint. If instead it did kick off a new workflow run, we'd skip
      # this step here.
      - name: Continuously Deploy
        uses: expo/expo-github-action/continuous-deploy-fingerprint@main
        with:
          profile: production
          branch: production
          # auto-submit-builds: true
```

<div align="center">
  <br />
  with :heart:&nbsp;<strong>Expo</strong>
  <br />
</div>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-gha-token]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
