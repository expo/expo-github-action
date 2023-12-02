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

| variable              | default                     | description                                                                                                                                                                      |
| --------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **command**           | -                           | EAS CLI command to run when creating updates                                                                                                                                     |
| **working-directory** | -                           | The relative directory of your Expo app                                                                                                                                          |
| **comment**           | `true`                      | If the action should summarize the EAS Update information as comment on a pull request                                                                                           |
| **comment-id**        | _[see code][code-defaults]_ | Unique id template to prevent duplicate comments ([read more](#preventing-duplicate-comments))                                                                                   |
| **qr-target**         | _inferred from project_     | Either `dev-build` or `expo-go`, affects how the EAS Update is opened through the QR code. <br /> Defaults to `dev-build` when `expo-dev-client` is detected within the project. |
| **github-token**      | `github.token`              | GitHub token to use when commenting on PR ([read more](#github-tokens))                                                                                                          |

## Available outputs

There are a few variables available that you can use to set up your own notifications.
These variables are strings; some may be empty because of your project configuration.

| output name        | description                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **projectId**      | The resolved EAS project ID                                                                                                                      |
| **projectName**    | The name of your project ([read more](https://docs.expo.dev/versions/latest/config/app/#name))                                                   |
| **projectSlug**    | The slug of your project ([read more](https://docs.expo.dev/versions/latest/config/app/#slug))                                                   |
| **projectScheme**  | The longest (custom) app scheme ([read more](https://docs.expo.dev/versions/latest/config/app/#scheme))                                          |
| **projectSchemes** | All (custom) app schemes in order of longest to shortest, as JSON string ([read more](https://docs.expo.dev/versions/latest/config/app/#scheme)) |
| **commentId**      | The unique comment ID to prevent duplicate comments ([read more](#preventing-duplicate-comments))                                                |
| **comment**        | The comment with information about the updates                                                                                                   |

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

| output name                  | description                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **androidId**                | Android-specific update id                                                                                                             |
| **androidGroupId**           | Update group ID that contains one or more platform-specific updates                                                                    |
| **androidBranchName**        | Branch name that was used when creating this update ([read more](https://docs.expo.dev/eas-update/getting-started/#publish-an-update)) |
| **andriodManifestPermalink** | Absolute URL to the Android-specific update manifest                                                                                   |
| **androidMessage**           | Custom message to describe the Android-specific update                                                                                 |
| **androidRuntimeVersion**    | Runtime version used for the Android-specific update ([read more](https://docs.expo.dev/eas-update/runtime-versions/))                 |
| **androidQR**                | Absolute URL to the QR code to load this Android-specific update                                                                       |
| **androidLink**              | Absolute URL to the Android-specific update on [expo.dev](https://expo.dev)                                                            |

#### iOS-specific update information

These variables contain iOS-specific update information.
When skipping the iOS update, these variables are empty strings.

| output name              | description                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **iosId**                | iOS-specific update id                                                                                                                 |
| **iosGroupId**           | Update group ID that contains one or more platform-specific updates                                                                    |
| **iosBranchName**        | Branch name that was used when creating this update ([read more](https://docs.expo.dev/eas-update/getting-started/#publish-an-update)) |
| **iosManifestPermalink** | Absolute URL to the ios-specific update manifest                                                                                       |
| **iosMessage**           | Custom message to describe the iOS-specific update                                                                                     |
| **iosRuntimeVersion**    | Runtime version used for the iOS-specific update ([read more](https://docs.expo.dev/eas-update/runtime-versions/))                     |
| **iosQR**                | Absolute URL to the QR code to load this iOS-specific update                                                                           |
| **iosLink**              | Absolute URL to the iOS-specific update on [expo.dev](https://expo.dev)                                                                |

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Create previews on pull requests](#create-previews-on-pull-requests)
2. [Sending preview information elsewhere](#sending-preview-information-elsewhere)

### Create previews on pull requests

This workflow creates a new EAS Update every time a pull request is created or updated.
We are using the `--auto`, together with the `--branch`, flag in this example.

- `--auto` will automatically create an update using the current git commit message and git branch.
- `--branch` will overwrite this value infere from git with our own value.

> **Warning**
> GitHub Actions might use a temporary merge branch for PRs. To avoid using this merge branch for our update, we overwrite the branch name from `--auto` with our own `--branch` value.

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
          # `github.event.pull_request.head.ref` is only available on `pull_request` triggers.
          # Use your own, or keep the automatically infered branch name from `--auto`, when using different triggers.
          command: eas update --auto --branch ${{ github.event.pull_request.head.ref }}
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
          # In this example, we use the `push` trigger which will always use the branch name that was pushed to.
          # By using `--auto` we both use the git commit message and branch name for the update.
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

### Update branch and workflow triggers

GitHub Actions uses slightly different checkout logic for different workflow triggers.
When using the `push` trigger, GitHub Actions checks out the branch that was pushed to.
But for [`pull_request` triggers][link-gha-trigger-pull], GitHub Actions might use a temporary branch name.
This affects in what "branch" your EAS Update is created when using the `--auto` flag.

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
[link-gha-trigger-pull]: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request
[link-gha-trigger-push]: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push
