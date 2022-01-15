<div align="center">
  <h1>expo-github-action</h1>
  <p>Publish, build or manage your <a href="https://github.com/expo/expo">Expo</a> app with GitHub Actions!</p>
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
    <a href="#example-workflows"><b>Examples</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="#things-to-know"><b>Caveats</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="/blob/main/CHANGELOG.md"><b>Changelog</b></a>
  </p>
</div>

## What's inside?

With this Expo action, you have full access to [Expo CLI][link-expo-cli] and [EAS CLI][link-eas-cli].
It allows you to fully automate the `expo publish` or `eas build` process, leaving you with more time available for your project.
There are some additional features included to make the usage of this action as simple as possible, like caching and authentication.

## Configuration options

This action is customizable through variables; they are defined in the [`action.yml`](action.yml).
Here is a summary of all the variables that you can use and their purpose.

| variable           | default | description                                                                                   |
| ------------------ | ------- | --------------------------------------------------------------------------------------------- |
| **expo-version**   | -       | Expo CLI version to install _(skips when omitted)_                                            |
| **expo-cache**     | `true`  | If it should use the GitHub actions cache ([read more](#using-the-built-in-cache))            |
| **eas-version**    | -       | EAS CLI version to install _(skips when omitted)_                                             |
| **eas-cache**      | `true`  | If it should use the GitHub actions cache ([read more](#using-the-built-in-cache))            |
| **packager**       | `yarn`  | Package manager to use _(e.g. `yarn` or `npm`)_                                               |
| **token**          | -       | Token of your Expo account _(only use with [secrets][link-actions-secrets])_                  |
| **patch-watchers** | `true`  | If it should patch the `fs.inotify.*` limits on Ubuntu ([read more](#enospc-errors-on-linux)) |

## Example workflows

Before you dive into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish on any push to main](#publish-on-any-push-to-main)
2. [Creating a new EAS build](#creating-a-new-eas-build)
3. [Publish a preview from PR](#publish-a-preview-from-PR)

### Publish on any push to main

This workflow listens to the **push** event on the **main** branch.
It sets up all required components to publish the app, including authentication with a token.

> Always use [secrets][link-actions-secrets] when using tokens.

```yml
on:
  push:
    branches:
      - main
jobs:
  publish:
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

      - name: 🚀 Publish app
        run: expo publish
```

### Creating a new EAS build

You can also install [EAS](https://docs.expo.dev/eas/) CLI with this GitHub Action.
To do this, add the **eas-version** and it will install the EAS CLI too.
The **token** is shared for both Expo and EAS CLI.

> We recommend using `latest` for **eas-version** to always have the most up-to-date version.

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
          eas-version: latest
          expo-version: 5.x
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Build app
        run: eas build
```

### Publish a preview from PR

Reviewing pull requests can take some time if you have to read every line of code.
To make this easier, you can publish the PR using a [release channel][link-expo-release-channels].
This workflow first publishes the changes to the **pr-N** channel, and adds a comment for the reviewers.

> See the [preview-comment docs](./preview-comment).

```yml
on: [pull_request]
jobs:
  publish:
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

      - name: 🚀 Publish preview
        run: expo publish --release-channel=pr-${{ github.event.number }}

      - name: 💬 Comment preview
        uses: expo/expo-github-action/preview-comment@v7
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: pr-${{ github.event.number }}
```

## Things to know

### Automatic Expo login

You need to authenticate for some Expo commands like `expo publish` and `expo build`.
This action can export the `EXPO_TOKEN` variable to access it in every step.

> Note, this action does not store the token anywhere. For every seperate job, you need to setup the token.

### Using the built-in cache

You can opt-in to caching the installation, making it a lot faster.
Under the hood, it uses the [`@actions/cache`][link-actions-cache-package] package to restore the Expo CLI installation.
This action generates a unique cache key for the OS, used packager, and exact version of the Expo CLI.

> Note, this cache will count towards your [repo cache limit][link-actions-cache-limit]. The Expo and EAS CLI are stored in different caches.

### ENOSPC errors on Linux

When you run `expo publish` or `expo build`, a new bundle is created.
Creating these bundles require quite some resources.
As of writing, GitHub actions has some small default values for the `fs.inotify` settings.
Inside this action, we included a patch that increases these limits for the current workflow.
It increases the `max_user_instances`, `max_user_watches` and `max_queued_events` to `524288`.
You can disable this patch by setting the `patch-watchers` to `false`.

<div align="center">
  <br />
  with :heart:&nbsp;<strong>byCedric</strong>
  <br />
</div>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-actions-cache-limit]: https://github.com/actions/cache#cache-limits
[link-actions-cache-package]: https://github.com/actions/toolkit/tree/main/packages/cache
[link-actions-secrets]: https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
[link-expo-cli]: https://docs.expo.dev/workflow/expo-cli/
[link-expo-release-channels]: https://docs.expo.dev/distribution/release-channels/
[link-eas-cli]: https://github.com/expo/eas-cli#readme
[link-preview-comment]: https://github.com/expo/expo-github-action/pull/149#issuecomment-1013184520
