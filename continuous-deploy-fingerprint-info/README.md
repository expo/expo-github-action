<div align="center">
  <h1>continuous-deploy-fingerprint-info</h1>
  <p>Fetch and output fingerprints and matching builds for use in continuous deployment workflows.</p>
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

`continuous-deploy-fingerprint-info` is a GitHub Action that fetches fingerprints and matching builds for use in continuous deployment workflows.

### Prerequisites

- Must have expo-updates set up with a `fingerprint` runtime version policy.
- Must be configured for EAS Update.

### Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable              | default        | description                                                                  |
| --------------------- | -------------- | ---------------------------------------------------------------------------- |
| **profile**           | (required)     | The EAS Build profile to use                                                 |
| **environment**       | -              | The environment to use for server-side defined EAS environment variables     |
| **working-directory** | -              | The relative directory of your Expo app                                      |
| **platform**          | `all`          | The platform to use (available options are `ios`, `android` and `all`) |
| **github-token**      | `github.token` | GitHub token to use when pushing version bump commit ([read more](#github-tokens))      |

And the action will generate these [outputs](#available-outputs) for other actions to do something based on what this action did.

### Available outputs

In case you want to reuse this action for other purpose, this action will set the following action outputs.

| output name              | description                                                                                                                                                                                   |
| ------------------------ | ------------------------------ |
| **ios-fingerprint**      | The iOS fingerprint of the current commit.          |
| **android-fingerprint**  | The Android fingerprint of the current commit.                 |
| **android-build-id**  | ID for matching Android EAS Build if one exists for fingerprint. |
| **ios-build-id**  | ID for matching iOS EAS Build if one exists for fingerprint.         |

## Caveats

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

See documentation for the `continuous-deploy-fingerprint` for how one may use this action.

<div align="center">
  <br />
  with :heart:&nbsp;<strong>Expo</strong>
  <br />
</div>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-gha-token]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
