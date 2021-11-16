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

With this Expo action, you have full access to [Expo CLI][link-expo-cli] and [EAS CLI][link-eas-cli] itself.
It allows you to fully automate the `expo publish` or `expo build` process, leaving you with more time available for your project.
There are some additional features included to make the usage of this action as simple as possible, like caching and authentication.

## Configuration options

This action is customizable through variables; they are defined in the [`action.yml`](action.yml).
Here is a summary of all the variables that you can use and their purpose.

| variable         | default | description                                                                                                  |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `expo-version`   | -       | [Expo CLI](https://github.com/expo/expo-cli) version to install, skips when omitted.                         |
| `expo-cache`     | `false` | If it should use the [GitHub actions (remote) cache](#using-the-built-in-cache).                             |
| `expo-cache-key` | -       | An optional custom (remote) cache key. _(**use with caution**)_                                              |
| `eas-version`    | -       | [EAS CLI](https://github.com/expo/eas-cli) version to install, skips when omitted. (`latest` is recommended) |
| `eas-cache`      | `false` | If it should use the [GitHub actions (remote) cache](#using-the-built-in-cache).                             |
| `eas-cache-key`  | -       | An optional custom (remote) cache key. _(**use with caution**)_                                              |
| `packager`       | `yarn`  | The package manager to use. _(e.g. `npm`)_                                                                   |
| `token`          | -       | The token of your Expo account _(e.g. [`${{ secrets.EXPO_TOKEN }}`][link-actions-secrets])_                  |
| `username`       | -       | The username of your Expo account _(e.g. `bycedric`)_                                                        |
| `password`       | -       | The password of your Expo account _(e.g. [`${{ secrets.EXPO_CLI_PASSWORD }}`][link-actions-secrets])_        |
| `patch-watchers` | `true`  | If it should [patch the `fs.inotify.` limits](#enospc-errors-on-linux).                                      |

> Never hardcode `expo-token` or `expo-password` in your workflow, use [secrets][link-actions-secrets] to store them.

> Using `latest` for `eas-version` is recommened, you should always have the latest version of this CLI installed.

## Example workflows

Before you dive into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish on any push to main](#publish-on-any-push-to-main)
2. [Cache Expo CLI for other jobs](#cache-expo-cli-for-other-jobs)
3. [Creating a new EAS build](#creating-a-new-eas-build)
4. [Test PRs and publish a review version](#test-prs-and-publish-a-review-version)
5. [Test PRs on multiple nodes and systems](#test-prs-on-multiple-nodes-and-systems)
6. [Test and build web every day at 08:00](#test-and-build-web-every-day-at-0800)
7. [Authenticate using credentials](#authenticate-using-credentials)

### Publish on any push to main

Below you can see the example configuration to publish whenever the main branch is updated.
The workflow listens to the `push` event and sets up Node 14 using the [Setup Node Action][link-actions-node].
It also auto-authenticates when the `token` is provided.

```yml
name: Expo Publish
on:
  push:
    branches:
      - main
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14.x
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 4.x
          token: ${{ secrets.EXPO_TOKEN }}
      - run: yarn install
      - run: expo publish
```

### Cache Expo CLI for other jobs

Below you can see a slightly modified version of the example above.
In this one, we enabled the built-in cache that will reuse a previously installed Expo CLI.
It skips the installation part and extracts the files directly, boosting the performance of your workflow.

> You can [read more about the cache here](#using-the-built-in-cache)

```yml
name: Expo Publish
on:
  push:
    branches:
      - main
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14.x
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 4.x
          expo-cache: true
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
name: EAS build
on:
  push:
    branches:
      - main
jobs:
  build:
    name: Create new build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14.x
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
name: Expo Review
on: [pull_request]
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14.x
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 4.x
          token: ${{ secrets.EXPO_TOKEN }}
      - run: yarn install
      - run: expo publish --release-channel=pr-${{ github.event.number }}
      - uses: unsplash/comment-on-pr@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          msg: App is ready for review, you can [see it here](https://expo.dev/@bycedric/use-expo?release-channel=pr-${{ github.event.number }}).
```

### Test PRs on multiple nodes and systems

With GitHub Actions, it's reasonably easy to set up a matrix build and test the app on multiple environments.
These matrixes can help to make sure your app runs smoothly on a broad set of different development machines.

> If you don't need automatic authentication, you can omit the `token` variables.

```yml
name: Expo CI
on: [pull_request]
jobs:
  ci:
    name: Continuous Integration
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]
        node: [10, 12, 13]
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: ${{ matrix.node }}
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 4.x
      - run: yarn install
      - run: yarn test
      - run: expo doctor
```

### Test and build web every day at 08:00

You can also schedule jobs by using the cron syntax.
It can help to minimize the number of updates your users have to install.

```yml
name: Expo Daily CI
on:
  schedule:
    - cron: 0 8 * * *
jobs:
  ci:
    name: Daily Continuous Integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14.x
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 4.x
      - run: yarn install
      - run: yarn test
      - run: expo build:web
```

### Authenticate using credentials

Instead of using an access token, you can also authenticate using credentials.
This is only possible when Expo CLI is installed.

```yml
name: Expo Publish
on:
  push:
    branches:
      - main
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 14.x
      - uses: expo/expo-github-action@v6
        with:
          expo-version: 4.x
          username: ${{ secrets.EXPO_CLI_USERNAME }}
          password: ${{ secrets.EXPO_CLI_PASSWORD }}
      - run: yarn install
      - run: expo publish
```

## Things to know

### Automatic Expo login

You need to authenticate for some Expo commands like `expo publish` and `expo build`.
This action gives you configuration options to keep your workflow simple.
You can choose if you want to authenticate using an `EXPO_TOKEN` or account credentials.
Under the hood, it uses the [`EXPO_CLI_PASSWORD`][link-expo-cli-password] environment variable to make credentials authentication as secure as possible.

> Note, this action only uses your token or credentials to authenticate with Expo. It doesn't store these anywhere.

### Using the built-in cache

You can opt-in to caching the installation, making it a lot faster.
Under the hood, it uses the [`@action/cache`][link-actions-cache-package] package to restore the Expo CLI installation.
This action generates a unique cache key for the OS, used packager, and exact version of the Expo CLI.
If you need more control over this cache, you can define a custom cache key with `expo-cache-key`.

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
[link-actions-cache-package]: https://www.npmjs.com/package/@actions/cache
[link-actions-node]: https://github.com/actions/setup-node
[link-actions-secrets]: https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
[link-expo-cli]: https://docs.expo.dev/workflow/expo-cli/
[link-expo-cli-password]: https://github.com/expo/expo-cli/blob/master/packages/expo-cli/src/accounts.ts#L88-L90
[link-expo-release-channels]: https://docs.expo.dev/distribution/release-channels/
[link-eas-cli]: https://github.com/expo/eas-cli#readme
[link-semver-playground]: https://semver.npmjs.com/
