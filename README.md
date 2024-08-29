<div align="center">
  <h1>expo-github-action</h1>
  <p>Publish, build or manage your <a href="https://github.com/expo/expo">Expo</a> app with GitHub Actions!</p>
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
  <a href="./CHANGELOG.md"><b>Changelog</b></a>
</p>

<br />

## What's inside?

With this Expo action, you have full access to [Expo CLI][link-expo-cli] and [EAS CLI][link-eas-cli].
It lets you automate the `eas update` or `eas build` commands, leaving you with more time to work on your project.
Some additional features are included to make the usage of this action as simple as possible, like caching and authentication.

## Configuration options

> Create your [`EXPO_TOKEN`][link-expo-token] GitHub secret.

This action is customizable through variables defined in the [`action.yml`](action.yml).
Here is a summary of all the input options you can use.

| variable           | default | description                                                                                   |
| ------------------ | ------- | --------------------------------------------------------------------------------------------- |
| **eas-version**    | -       | EAS CLI version to install _(skips when omitted)_                                             |
| **eas-cache**      | `true`  | If it should use the GitHub actions cache ([read more](#using-the-built-in-cache))            |
| **packager**       | `yarn`  | Package manager to use _(e.g. `bun`, `yarn`, or `npm`)_                                               |
| **token**          | -       | Token of your Expo account - [get your token][link-expo-token] _(use with [secrets][link-actions-secrets])_                  |
| **patch-watchers** | `true`  | If it should patch the `fs.inotify.*` limits on Ubuntu ([read more](#enospc-errors-on-linux)) |

## Example workflows

Before diving into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Create new EAS Update on push to main](#create-new-eas-update-on-push-to-main)
2. [Create new EAS build on push to main](#create-new-eas-build-on-push-to-main)
3. [Create previews on PRs](#create-previews-on-prs)

### Create new EAS Update on push to main

This workflow listens to the `push` event on the `main` branch.
It sets up all required components to publish the app, including authentication with a [token][link-expo-token].

> Always use [secrets][link-actions-secrets] when using tokens.

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

      - name: 🚀 Create update
        run: eas update --auto --non-interactive
```

### Creating new EAS build on push to main

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

      - name: 🚀 Build app
        run: eas build --non-interactive
```

### Create previews on PRs

Reviewing pull requests can take some time.
The reviewer needs to check out the branch, install the changes, and run the bundler to review the results.
You can also automatically publish the project for the reviewer to skip those manual steps.

> See the [preview docs](./preview#create-previews-on-pull-requests) for more information.

```yml
on: [pull_request]
jobs:
  preview:
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
        with:
          # `github.event.pull_request.head.ref` is only available on `pull_request` triggers.
          # Use your own, or keep the automatically inferred branch name from `--auto`, when using different triggers.
          command: eas update --auto --branch ${{ github.event.pull_request.head.ref }}
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
