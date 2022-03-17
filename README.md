<div align="center">
  <h1>expo-github-action</h1>
  <p>Publish, build or manage your <a href="https://github.com/expo/expo">Expo</a> app with GitHub Actions!</p>
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
    <a href="/blob/main/CHANGELOG.md"><b>Changelog</b></a>
  </p>
</div>

## What's inside?

With this Expo action, you have full access to [Expo CLI][link-expo-cli] and [EAS CLI][link-eas-cli].
It lets you automate the `expo publish` or `eas build` commands, leaving you with more time to work on your project.
Some additional features are included to make the usage of this action as simple as possible, like caching and authentication.

## Configuration options

> Create your [`EXPO_TOKEN`][link-expo-token] GitHub secret.

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable           | default | description                                                                                   |
| ------------------ | ------- | --------------------------------------------------------------------------------------------- |
| **expo-version**   | -       | Expo CLI version to install _(skips when omitted)_                                            |
| **expo-cache**     | `true`  | If it should use the GitHub actions cache ([read more](#using-the-built-in-cache))            |
| **eas-version**    | -       | EAS CLI version to install _(skips when omitted)_                                             |
| **eas-cache**      | `true`  | If it should use the GitHub actions cache ([read more](#using-the-built-in-cache))            |
| **packager**       | `yarn`  | Package manager to use _(e.g. `yarn` or `npm`)_                                               |
| **token**          | -       | Token of your Expo account - [get your token][link-expo-token] _(use with [secrets][link-actions-secrets])_                  |
| **patch-watchers** | `true`  | If it should patch the `fs.inotify.*` limits on Ubuntu ([read more](#enospc-errors-on-linux)) |

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish on any push to main](#publish-on-any-push-to-main)
2. [Creating a new EAS build](#creating-a-new-eas-build)
3. [Publish a preview from PR](#publish-a-preview-from-PR)

### Publish on any push to main

This workflow listens to the `push` event on the `main` branch.
It sets up all required components to publish the app, including authentication with a [token][link-expo-token].

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
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish app
        run: expo publish --non-interactive
```

### Creating a new EAS build

This action also allows you to install the EAS CLI.
To do this, add the **eas-version** property, and the action will install it.
We recommend using `latest` for the EAS CLI.

> The [**token**][link-expo-token] is shared for both Expo and EAS CLI.

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

      - name: 🏗 Setup Expo and EAS
        uses: expo/expo-github-action@v7
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Build app
        run: eas build --non-interactive
```

### Publish a preview from PR

Reviewing pull requests can take some time. 
The reviewer needs to check out the branch, install the changes, and run the bundler to review the results.
You can also automatically publish the project for the reviewer to skip those manual steps.

This workflow publishes the changes on the `pr-#` [release channel][link-expo-release-channels] and adds a comment to the pull request once it's ready for review.

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
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish preview
        run: expo publish --release-channel=pr-${{ github.event.number }} --non-interactive

      - name: 💬 Comment preview
        uses: expo/expo-github-action/preview-comment@v7
        with:
          channel: pr-${{ github.event.number }}
```

## Things to know

### Automatic Expo login

Some Expo commands, like `expo publish` and `eas build`, require you to be authenticated. 
This action exports the [**token**][link-expo-token] to ensure you are authenticated in every workflow step.

> Note, this action does not store the [token][link-expo-token] anywhere. Each separate workflow job needs to set up the [**token**][link-expo-token] individually.

### Using the built-in cache

You can opt-out from caching the Expo and EAS CLI installations.
Under the hood, it uses the [`@actions/cache`][link-actions-cache-package] package to restore a previous install. 
It reduces the installation time because it only needs to download and extract a single tar file.

> Note, using cache will count towards your [repo cache limit][link-actions-cache-limit]. Both the Expo and EAS CLI are stored in different caches.

### ENOSPC errors on Linux

Creating new bundles with Metro can be memory intensive. 
In the past, some builds resulted in `ENOSPC` errors. 
To prevent anyone from running into this, we make sure Ubuntu has sensible defaults in terms of file system availability. 
You can opt-out from patching the file system by setting **patch-watchers** to `false`.

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
[link-expo-token]: https://expo.dev/accounts/%5Baccount%5D/settings/access-tokens