<div align="center">
  <h1>expo-github-action/preview</h1>
  <p>Create <a href="https://github.com/expo/expo">Expo</a> previews with <a href="https://docs.expo.dev/eas-update/introduction/">EAS Update</a></p>
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
  <a href="#configuration-options"><b>Usage</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#available-outputs"><b>Outputs</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#example-workflows"><b>Examples</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#things-to-know"><b>Caveats</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="https://github.com/expo/expo-github-action/blob/main/CHANGELOG.md"><b>Changelog</b></a>
</p>

<br />

## What's inside?

This (sub)action creates new <a href="https://docs.expo.dev/eas-update/introduction/">EAS Updates</a> and creates comments containing Expo QR codes and useful links.
It can help speed up the review process by letting the reviewer load the app directly on their phone.

## Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable              | default                     | description                                                                                    |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| **command**           | -                           | EAS CLI command to run when creating updates                                                   |
| **working-directory** | -                           | The relative directory of your Expo app                                                        |
| **app-scheme**        | -                           | The (custom) app scheme to use when creating the preview QR code                               |
| **comment**           | `true`                      | If the action should summarize the EAS Update information as comment on a pull request         |
| **comment-id**        | _[see code][code-defaults]_ | unique id template to prevent duplicate comments ([read more](#preventing-duplicate-comments)) |
| **github-token**      | `github.token`              | GitHub token to use when commenting on PR ([read more](#github-tokens))                        |

## Available outputs

There are a few variables available that you can use to set up your own notifications.
These variables are strings; some may be empty because of your project configuration.

| output name       | description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| **projectId**     | The resolved EAS project ID                                                                       |
| **projectName**   | The name of your project ([read more](https://docs.expo.dev/versions/latest/config/app/#name))    |
| **projectSlug**   | The slug of your project ([read more](https://docs.expo.dev/versions/latest/config/app/#slug))    |
| **projectScheme** | The (custom) app scheme ([read more](https://docs.expo.dev/versions/latest/config/app/#scheme))   |
| **commentId**     | The unique comment ID to prevent duplicate comments ([read more](#preventing-duplicate-comments)) |
| **comment**       | The comment with information about the updates                                                    |

### Update information

Some of the EAS Update variables can be shared for all platforms if the [runtime version](https://docs.expo.dev/eas-update/runtime-versions/) of all platforms is identical.

| output name        | description                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **groupId**        | Update group ID that contains one or more platform-specific updates                                                                    |
| **runtimeVersion** | Runtime version used for one or more platform-specific updates ([read more](https://docs.expo.dev/eas-update/runtime-versions/))       |
| **qr**             | Absolute URL to the QR code to load this update                                                                                        |
| **link**           | Absolute URL to platform-independent update on [expo.dev](https://expo.dev)                                                            |
| **branchName**     | Branch name that was used when creating this update ([read more](https://docs.expo.dev/eas-update/getting-started/#publish-an-update)) |
| **message**        | Custom message to describe the update                                                                                                  |
| **createdAt**      | When the update was created                                                                                                            |
| **gitCommitHash**  | Git commit hash that was found when creating this update                                                                               |

#### Android-specific update information

These variables contain Android-specific update information.
When skipping the Android update, these variables are empty strings.

| output name               | description                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **androidId**             | Android-specific update id                                                                                                             |
| **androidGroupId**        | Update group ID that contains one or more platform-specific updates                                                                    |
| **androidBranchName**     | Branch name that was used when creating this update ([read more](https://docs.expo.dev/eas-update/getting-started/#publish-an-update)) |
| **androidMessage**        | Custom message to describe the Android-specific update                                                                                 |
| **androidRuntimeVersion** | Runtime version used for the Android-specific update ([read more](https://docs.expo.dev/eas-update/runtime-versions/))                 |
| **androidQR**             | Absolute URL to the QR code to load this Android-specific update                                                                       |
| **androidLink**           | Absolute URL to the Android-specific update on [expo.dev](https://expo.dev)                                                            |

#### iOS-specific update information

These variables contain iOS-specific update information.
When skipping the iOS update, these variables are empty strings.

| output name           | description                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **iosId**             | iOS-specific update id                                                                                                                 |
| **iosGroupId**        | Update group ID that contains one or more platform-specific updates                                                                    |
| **iosBranchName**     | Branch name that was used when creating this update ([read more](https://docs.expo.dev/eas-update/getting-started/#publish-an-update)) |
| **iosMessage**        | Custom message to describe the iOS-specific update                                                                                     |
| **iosRuntimeVersion** | Runtime version used for the iOS-specific update ([read more](https://docs.expo.dev/eas-update/runtime-versions/))                     |
| **iosQR**             | Absolute URL to the QR code to load this iOS-specific update                                                                           |
| **iosLink**           | Absolute URL to the iOS-specific update on [expo.dev](https://expo.dev)                                                                |

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Create previews on pull requests](#create-previews-on-pull-requests)
2. [Sending preview information elsewhere](#sending-preview-information-elsewhere)

### Create previews on pull requests

This workflow creates a new EAS Update every time a pull request is created or updated.
Since we're using the `--auto` flag, the EAS branch will be named after the GitHub branch, and the message for the update will match the commit's message.

```yml
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write # Allow comments on PRs
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v3

      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: yarn

      - name: 🏗 Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Create preview
        uses: expo/expo-github-action/preview@v8
        with:
          command: eas update --auto
```

### Sending preview information elsewhere

You can also use this action to create the EAS Update and use the information to create a Slack message instead of a pull request comment.
By disabling commenting with **comment** set to `false`, you can reuse this action with any workflow trigger and send it to any service accessible in GitHub Actions.

> See [Available variables](#available-variables) for a list of all outputs.

```yml
on:
  push:
    branches:
      - main
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v3

      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: yarn

      - name: 🏗 Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Create preview
        uses: expo/expo-github-action/preview@v8
        id: preview
        with:
          command: eas update --auto
          comment: false

      - name: 💬 Comment in Slack
        uses: slackapi/slack-github-action@v1.17.0
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_TOKEN }}
        with:
          channel-id: deployments
          slack-message: 'New deployment is ready!\n- Preview: ${{ steps.preview.outputs.qr }}'
```

## Things to know

### Preventing duplicate comments

When automating these preview comments, you have to be careful not to spam a pull request on every successful run.
Every comment contains a generated **message-id** to identify previously made comments and update them instead of creating a new comment.

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable or add the **github-token** input.

<div align="center">
  <br />
  with :heart:&nbsp;<strong>byCedric</strong>
  <br />
</div>

[code-defaults]: ../src/actions/preview.ts#L10
[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-gha-token]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
