<div align="center">
  <h1>expo-github-action/preview-comment</h1>
  <p>Add <a href="https://github.com/expo/expo">Expo</a> preview comments to pull requests</p>
  <p>
    <a href="https://github.com/expo/expo-github-action/releases">
      <img src="https://img.shields.io/github/release/expo/expo-github-action/all.svg?style=flat-square" alt="releases" />
    </a>
    <a href="https://github.com/expo/expo-github-action/actions">
      <img src="https://img.shields.io/github/workflow/status/expo/expo-github-action/CI/main.svg?style=flat-square" alt="builds" />
    </a>
    <a href="https://github.com/expo/expo-github-action/blob/main/LICENSE.md">
      <img src="https://img.shields.io/github/license/expo/expo-github-action?style=flat-square" alt="license" />
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
</div>

## What's inside?

This subaction allows you to create comments on pull requests, containing Expo QR codes.
It can help speeding up the review process by letting the reviewer load the app directly on their phone.

> This action only creates the comment, you still have to publish the project.

## Configuration options

This action is customizable through variables; they are defined in the [`action.yml`](action.yml).
Here is a summary of all the variables that you can use and their purpose.

| variable       | default                     | description                                                                                      |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| **project**    | -                           | The relative path to the Expo project                                                            |
| **channel**    | `default`                   | On what channel the project was published                                                        |
| **comment**    | `true`                      | If this action should comment on a PR                                                            |
| **message**    | _[see code][code-defaults]_ | The message template                                                                             |
| **message-id** | _[see code][code-defaults]_ | A unique id template to prevent duplicate comments ([read more](#preventing-duplicate-comments)) |

## Available ouputs

There a few ouput and template variables available for both `message` and `message-id`.

| output name      | template name    | description                                          |
| ---------------- | ---------------- | ---------------------------------------------------- |
| **projectOwner** | `{projectOwner}` | The resolved owner of the project                    |
| **projectSlug**  | `{projectSlug}`  | The resolved slug of the project                     |
| **projectName**  | `{projectName}`  | The resolved name of the project                     |
| **projectLink**  | `{projectLink}`  | The expo.dev project link, including release channel |
| **projectQR**    | `{projectQR}`    | The QR code link, to load the project in Expo Go     |
| -                | `{channel}`      | The release channel that was used                    |
| **message**      | -                | The resolved message content                         |
| **messageId**    | -                | The resolved message id content                      |

## Example workflows

Before you dive into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish and preview on pull request](#publish-and-preview-on-pull-request)
2. [Sending preview comments elsewhere](#sending-preview-comments-elsewhere)

### Publish and preview on pull request

This workflow listens to the `pull_request` event and publishes a to Expo, on release channel `pr-N`.
Once that's done, it will comment with the QR code on that same pull request.
It's important to keep pull requests separated, by release channel, to avoid writing over pull requests.

```yml
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v2

      - name: 🏗 Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: 16.x
          cache: yarn

      - name: 🏗 Setup Expo
        uses: expo/expo-github-action@v7
        with:
          expo-version: 5.x
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish to Expo
        run: expo publish --release-channel=pr-${{ github.event.number }}

      - name: 💬 Comment in preview
        uses: expo/expo-github-action/preview-comment@v6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: pr-${{ github.event.number }}
```

### Sending preview comments elsewhere

You can also use this action to generate the comment, without actually commenting.
This can be useful for workflows that aren't triggered on the `pull_request` event.

> See [Available variables](#available-variables) for a list of all outputs.

```yml
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v2

      - name: 🏗 Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: 16.x
          cache: yarn

      - name: 🏗 Setup Expo
        uses: expo/expo-github-action@v7
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish preview
        run: expo publish --release-channel=production

      - name: 👷 Create preview comment
        uses: expo/expo-github-action/preview-comment@v6
        id: preview
        with:
          comment: false
          channel: production

      - name: 💬 Comment in Slack
        uses: slackapi/slack-github-action@v1.17.0
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_TOKEN }}
        with:
          channel-id: deployments
          slack-message: 'New deployment is ready!\n- Preview: ${{ steps.preview.outputs.projectQR }}'
```

## Things to know

### Preventing duplicate comments

When automating comments, you have to be careful not to spam a pull request with new comments.
In every comment this action creates, we include a hidden **message-id**.
We use this ID to identify previously made comments to avoid spamming.

<div align="center">
  <br />
  with :heart:&nbsp;<strong>byCedric</strong>
  <br />
</div>

[code-defaults]: ../src/actions/preview-comment.ts
[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
