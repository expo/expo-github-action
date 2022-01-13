<div align="center">
  <h1>expo github action</h1>
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
    <a href="https://github.com/expo/expo-github-action#configuration-options"><b>Usage</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="https://github.com/expo/expo-github-action#example-workflows"><b>Examples</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="https://github.com/expo/expo-github-action#things-to-know"><b>Caveats</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="https://github.com/expo/expo-github-action/blob/main/CHANGELOG.md"><b>Changelog</b></a>
  </p>
</div>

## What's inside?

With this Expo action, you have full access to [Expo CLI][link-expo-cli] and [EAS CLI][link-eas-cli].
It allows you to fully automate the `expo publish` or `eas build` process, leaving you with more time available for your project.
There are some additional features included to make the usage of this action as simple as possible, like caching and authentication.

## Configuration options

This action is customizable through variables; they are defined in the [`action.yml`](action.yml).
Here is a summary of all the variables that you can use and their purpose.

| variable         | default | description                                                                          |
| ---------------- | ------- | ------------------------------------------------------------------------------------ |
| `expo-version`   | `''`    | [Expo CLI](https://github.com/expo/expo-cli) version to install, skips when omitted. |
| `expo-cache`     | `false` | If it should use the [GitHub actions cache](#using-the-built-in-cache).     |
| `eas-version`    | `''`    | [EAS CLI](https://github.com/expo/eas-cli) version to install, skips when omitted.   |
| `eas-cache`      | `false` | If it should use the [GitHub actions cache](#using-the-built-in-cache).     |
| `packager`       | `yarn`  | The package manager to use. _(e.g. `yarn` or `npm`)_                                 |
| `token`          | `''`    | The token of your Expo account                                                       |
| `patch-watchers` | `true`  | If it should [patch the `fs.inotify.` limits](#enospc-errors-on-linux).              |

> Never hardcode `expo-token` in your workflow, use [secrets][link-actions-secrets] to store them.

> Using `latest` for `eas-version` is recommened, you should always have the latest version of this CLI installed.

## Example workflows

Before you dive into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish on any push to main](#publish-on-any-push-to-main)
2. [Creating a new EAS build](#creating-a-new-eas-build)
3. [Test PRs and publish a review version](#test-prs-and-publish-a-review-version)
4. [Test PRs on multiple nodes and systems](#test-prs-on-multiple-node-versions-and-systems)

### Publish on any push to main

Below you can see the example configuration to publish whenever the main branch is updated.
The workflow listens to the `push` event and sets up Node 14 using the [Setup Node Action][link-actions-node].
It also auto-authenticates when the `token` is provided.

```yml
on:
  push:
    branches:
      - main
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16.x
          cache: yarn
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 5.x
          token: ${{ secrets.EXPO_TOKEN }}
      - run: yarn install
      - run: expo publish
```

### Creating a new EAS build

You can also install [EAS](https://docs.expo.dev/eas/) CLI with this GitHub Action.
Below we've swapped `expo-version` with `eas-version`, but you can also use them together.
Both the `token` and `username`/`password` is shared between both Expo and EAS CLI.

> We recommend using `latest` for `eas-version` to always have the most up-to-date version.

```yml
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16.x
          cache: yarn
      - uses: expo/expo-github-action@v6
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: yarn install
      - run: eas build
```

### Test PRs and publish a review version

Reviewing pull requests can take some time if you have to read every line of code.
To make this easier, you can publish the edited version of the PR using a [release channel][link-expo-release-channels].
Below you can see an example of a workflow that publishes and comments on te PR when the app is published.

```yml
on: [pull_request]
env:
  projectOwner: bycedric
  projectSlug: use-expo
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16.x
          cache: yarn
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 5.x
          token: ${{ secrets.EXPO_TOKEN }}
      - run: yarn install
      - run: expo publish --release-channel=pr-${{ github.event.number }}
      - uses: unsplash/comment-on-pr@v1.1.1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          msg: App is ready for review, you can [see it here](https://expo.dev/@${{ env.projectOwner }}/${{ env.projectSlug }}?release-channel=pr-${{ github.event.number }}).\n\n<img src="https://qr.expo.dev/expo-go?owner=${{ env.projectOwner }}&slug=${{ env.projectSlug }}&releaseChannel=pr-${{ github.event.number }}" height="200px" width="200px"></a>
```

### Test PRs on multiple node versions and systems

With GitHub Actions, it's reasonably easy to set up a matrix build and test the app on multiple environments.
These matrixes can help to make sure your app runs smoothly on a broad set of different development machines.

> If you don't need automatic authentication, you can omit the `token` variables.

```yml
on: [pull_request]
jobs:
  ci:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]
        node: [14.x, 16.x]
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: ${{ matrix.node }}
          cache: yarn
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 5.x
      - run: yarn install
      - run: yarn test
      - run: expo doctor
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
[link-actions-node]: https://github.com/actions/setup-node
[link-actions-secrets]: https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
[link-expo-cli]: https://docs.expo.dev/workflow/expo-cli/
[link-expo-release-channels]: https://docs.expo.dev/distribution/release-channels/
[link-eas-cli]: https://github.com/expo/eas-cli#readme
