<div align="center">
  <h1>expo-github-action/command</h1>
  <p>Run <a href="https://github.com/expo/expo-cli">Expo CLI</a> or <a href="https://github.com/expo/eas-cli">EAS CLI</a> command by a comment on the PR</p>
  <p>
    <a href="https://github.com/expo/expo-github-action/releases">
      <img src="https://img.shields.io/github/v/release/expo/expo-github-action" alt="releases" />
    </a>
    <a href="https://github.com/expo/expo-github-action/actions">
      <img src="https://img.shields.io/github/workflow/status/expo/expo-github-action/test" alt="builds" />
    </a>
    <a href="https://github.com/expo/expo-github-action/blob/main/LICENSE.md">
      <img src="https://img.shields.io/github/license/expo/expo-github-action" alt="license" />
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
</div>

## Experimental

**_This sub action is experimental and might change without notice. Use it at your own risk_**

## Configuration options

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable       | default                     | description                                                                                      |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| **github-token** | `github.token` | A GitHub token to use when commenting on PR ([read more](#github-tokens)) |

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

### Run the `eas build` command via an issue comment

This workflow listens to the `issue_comment` event and run the `eas build` command to start a build at Expo.

```yml
name: EAS Command
on:
  issue_comment:
    types: [created]
jobs:
  comment:
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
          eas-version: latest
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 💬 Respond to command
        uses: expo/expo-github-action/command@v7
```

## Things to know

### GitHub tokens

When using the GitHub API, you always need to be authenticated.
This action tries to auto-authenticate using the [Automatic token authentication][link-gha-token] from GitHub.
You can overwrite the token by adding the `GITHUB_TOKEN` environment variable, or add the **github-token** input.

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-gha-token]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
