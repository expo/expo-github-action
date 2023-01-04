<div align="center">
  <h1>expo-github-action/command</h1>
  <p>Run <a href="https://github.com/expo/expo-cli">Expo CLI</a> or <a href="https://github.com/expo/eas-cli">EAS CLI</a> command by a comment on the PR</p>
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
  <a href="#example-workflows"><b>Examples</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="#things-to-know"><b>Caveats</b></a>
  &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
  <a href="https://github.com/expo/expo-github-action/blob/main/CHANGELOG.md"><b>Changelog</b></a>
</p>

<br />

> **Warning**
> This sub action is experimental and might change without notice. Use it at your own risk

## Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable         | default        | description                                                               |
| ---------------- | -------------- | ------------------------------------------------------------------------- |
| **github-token** | `github.token` | A GitHub token to use when commenting on PR ([read more](#github-tokens)) |

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

### Run the `eas build` command via an issue comment

This workflow listens to the `issue_comment` event and run the `eas build` command to start a build at Expo.

```yml
on:
  issue_comment:
    types: [created, edited]
concurrency:
  # Limit the max concurrency to only 1 active action per pull
  group: expo-bot-${{ github.event.issue.number }}
  cancel-in-progress: true
jobs:
  bot:
    runs-on: ubuntu-latest
    # Only trigger from comments on pulls
    if: ${{ github.event.issue.pull_request }}
    # Allow the bot to comment on pulls
    permissions:
      pull-requests: write
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v3
        with:
          # Checkout the repo on the pull
          ref: refs/pull/${{ github.event.issue.number }}/merge

      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: yarn

      - name: 🏗 Setup Expo
        uses: expo/expo-github-action@v7
        with:
          eas-version: latest
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🤖 Run expo bot
        uses: expo/expo-github-action/command@v7
```

## Things to know

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable, or add the **github-token** input.

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-gha-token]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
