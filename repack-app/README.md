<div align="center">
  <h1>repack-app</h1>
  <p>Repack app builds for pull requests using fingerprinting</p>
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

`repack-app` is a GitHub Action that reuses app builds for pull requests using fingerprinting. When a pull request is updated, you can use this action to check if the app needs to be rebuilt based on fingerprint changes. If the fingerprint hasn't changed, it downloads and reuses the existing build artifacts instead of creating a new build.

This action is designed to optimize CI/CD workflows by avoiding unnecessary rebuilds when the app fingerprint remains unchanged. It works by comparing the current commit's fingerprint with previously cached fingerprints, and if they match, it downloads the cached build artifacts.

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
      # REQUIRED: Allow updating fingerprint in action caches
      actions: write

    steps:
      - name: Repack app
        id: repack_app
        uses: expo/expo-github-action/repack-app@main
        with:
          platform: android # or ios
          upload-path: app-output

      - name: Build app (only if fingerprint changed)
        if: steps.repack_app.outputs.fingerprint-hit != 'true'
        run: |
          # Your custom build commands here
          npx expo prebuild -p android
          cd android
          ./gradlew :app:assembleRelease

      - name: Prepare build artifact
        if: steps.repack_app.outputs.fingerprint-hit != 'true'
        run: |
          mkdir -p app-output
          cp android/app/build/outputs/apk/release/app-release.apk app-output/
```

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable                           | default          | description                                                                                 |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| **platform**                      | -                | The platform to build for (android or ios)                                                 |
| **upload-path**                    | -                | The directory path where build artifacts should be placed                                   |
| **working-directory**              | -                | The relative directory of your Expo app                                                     |
| **packager**                       | `yarn`           | The package manager used to install the fingerprint tools                                   |
| **github-token**                   | `github.token`   | GitHub token to use for caching                                                             |
| **fingerprint-version**            | `latest`         | `@expo/fingerprint` version to install                                                      |
| **fingerprint-installation-cache** | `true`           | If the `@expo/fingerprint` should be cached to speed up installation                        |
| **fingerprint-db-cache-key**       | `fingerprint-db` | A cache key to use for saving the fingerprint database                                      |
| **previous-git-commit**            | -                | The Git hash for the base commit                                                            |
| **current-git-commit**             | -                | The Git hash for the current commit                                                         |
| **saving-db-branch**               | -                | The branch for saving the fingerprint database. Defaults to the repository's default branch |

### Available outputs

In case you want to reuse this action for other purpose, this action will set the following action outputs.

| output name              | description                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **fingerprint-hit**      | Whether the fingerprint matched a cached build (`true` if matched, `false` if not)                                                                                                           |
| **previous-fingerprint** | The fingerprint of the base commit if it has been computed previously. May be null if it has not been computed previously.                                                                    |
| **current-fingerprint**  | The fingerprint of the current commit.                                                                                                                                                        |
| **previous-git-commit**  | The Git hash for the base commit.                                                                                                                                                             |
| **current-git-commit**   | The Git hash for the current commit.                                                                                                                                                          |
| **fingerprint-diff**     | The diff between the current and the previous fingerprint. It is a JSON array of fingerprint diff. If the fingerprint does not change in between, the result diff will be an empty array `[]` |

## Example workflows

Here's a complete example workflow that builds Android APK only when needed:

```yaml
name: CI repack 

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  repack-android:
    runs-on: ubuntu-latest
    concurrency: fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      actions: write # Allow updating action caches
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v4

      - name: 🏗 Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: yarn

      - name: 🔨 Use JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: 📦 Install dependencies
        run: yarn install

      - name: repack-android
        id: repack_android
        uses: expo/expo-github-action/repack-app@main
        with:
          platform: android
          upload-path: app-output

      - name: build
        if: steps.repack_android.outputs.fingerprint-hit != 'true'
        run: |
          npx expo prebuild -p android
          cd android
          ./gradlew :app:assembleRelease

      - name: prepare build artifact
        if: steps.repack_android.outputs.fingerprint-hit != 'true'
        run: |
          mkdir -p app-output
          cp android/app/build/outputs/apk/release/app-release.apk app-output/app-release.apk
```

### iOS Example

For iOS builds, you can use a similar workflow:

```yaml
name: CI repack iOS

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  repack-ios:
    runs-on: macos-latest
    concurrency: fingerprint-${{ github.event_name != 'pull_request' && 'main' || github.run_id }}
    permissions:
      actions: write # Allow updating action caches
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v4

      - name: 🏗 Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: yarn

      - name: 📦 Install dependencies
        run: yarn install

      - name: repack-ios
        id: repack_ios
        uses: expo/expo-github-action/repack-app@main
        with:
          platform: ios
          upload-path: app-output

      - name: build
        if: steps.repack_ios.outputs.fingerprint-hit != 'true'
        run: |
          npx expo prebuild -p ios
          cd ios
          xcodebuild -workspace YourApp.xcworkspace -scheme YourApp archive -archivePath build/YourApp.xcarchive

      - name: prepare build artifact
        if: steps.repack_ios.outputs.fingerprint-hit != 'true'
        run: |
          mkdir -p app-output
          cp -r ios/build/YourApp.xcarchive app-output/
```

## Caveats

### Build Artifacts

After your custom build step, make sure to copy the output files to the directory specified by `upload-path`:
- For Android: copy `*.apk` files
- For iOS: copy `*.ipa` or `*.app` files

This allows the repack-app action to upload the artifacts from your custom build for future reuse.

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.

<div align="center">
  <br />
  with :heart:&nbsp;<strong>Expo</strong>
  <br />
</div>