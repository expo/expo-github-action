<div align="center">
  <h1>expo github action</h1>
  <p></p>
  <p>Publish, build or manage your <a href="https://github.com/expo/expo">Expo</a> app with Github Actions!</p>
  <sup>
    <a href="https://github.com/expo/expo-github-action/releases">
      <img src="https://img.shields.io/github/release/expo/expo-github-action/all.svg?style=flat-square" alt="releases" />
    </a>
    <a href="https://app.circleci.com/pipelines/github/expo/expo-github-action">
      <img src="https://img.shields.io/circleci/build/github/expo/expo-github-action/master?style=flat-square" alt="builds" />
    </a>
    <a href="https://github.com/expo/expo-github-action/blob/master/LICENSE.md">
      <img src="https://img.shields.io/github/license/expo/expo-github-action?style=flat-square" alt="license" />
    </a>
  </sup>
  <br />
  <p align="center">
    <a href="https://github.com/expo/expo-github-action#configuration-options"><b>Usage</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="https://github.com/expo/expo-github-action#example-workflows"><b>Examples</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="https://github.com/expo/expo-github-action#things-to-know"><b>Caveats</b></a>
    &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
    <a href="https://github.com/expo/expo-github-action/blob/master/CHANGELOG.md"><b>Changelog</b></a>
  </p>
  <br />
</div>

## What's inside?

With this Expo action, you have full access to the [Expo CLI][link-expo-cli] itself.
It allows you to fully automate the `expo publish` or `expo build` process, leaving you with more time available for your project.
There are some additional features included to make the usage of this action as simple as possible, like caching and authentication.

## Configuration options

This action is customizable through variables; they are defined in the [`action.yml`](action.yml).
Here is a summary of all the variables that you can use and their purpose.

variable              | default  | description
---                   | ---      | ---
`expo-username`       | -        | The username of your Expo account _(e.g. `bycedric`)_
`expo-password`       | -        | The password of your Expo account _(e.g. [`${{ secrets.EXPO_CLI_PASSWORD }}`][link-actions-secrets])_
`expo-version`        | `latest` | The Expo CLI version to use, can be any [SemVer][link-semver-playground]. _(e.g. `3.x`)_
`expo-packager`       | `yarn`   | The package manager to install the CLI with. _(e.g. `npm`)_
`expo-cache`          | `false`  | If it should the [GitHub actions (remote) cache]((#using-the-built-in-cache)).
`expo-cache-key`      | -        | An optional custom (remote) cache key. _(**use with caution**)_
`expo-patch-watchers` | `true`   | If it should [patch the `fs.inotify.` limits](#enospc-errors-on-linux).

> Never hardcode your `expo-password` in your workflow, use [secrets][link-actions-secrets] to store them.
> It's also recommended to set the `expo-version` to avoid breaking changes when a new major version is released.

## Example workflows

Before you dive into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish on any push to master](#publish-on-any-push-to-master)
2. [Cache Expo CLI for other jobs](#cache-expo-cli-for-other-jobs)
3. [Test PRs and publish a review version](#test-prs-and-publish-a-review-version)
4. [Test PRs on multiple nodes and systems](#test-prs-on-multiple-nodes-and-systems)
5. [Test and build web every day at 08:00](#test-and-build-web-every-day-at-0800)

### Publish on any push to master

Below you can see the example configuration to publish whenever the master branch is updated.
The workflow listens to the `push` event and sets up Node 12 using the [Setup Node Action][link-actions-node].
It also authenticates the Expo project by defining both `expo-username` and `expo-password`.

```yml
name: Expo Publish
on:
  push:
    branches:
      - master
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v1
        with:
          node-version: 12.x
      - uses: expo/expo-github-action@v5
        with:
          expo-version: 3.x
          expo-username: ${{ secrets.EXPO_CLI_USERNAME }}
          expo-password: ${{ secrets.EXPO_CLI_PASSWORD }}
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
      - master
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v1
        with:
          node-version: 12.x
      - uses: expo/expo-github-action@v5
        with:
          expo-version: 3.x
          expo-username: ${{ secrets.EXPO_CLI_USERNAME }}
          expo-password: ${{ secrets.EXPO_CLI_PASSWORD }}
          expo-cache: true
      - run: yarn install
      - run: expo publish
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
      - uses: actions/setup-node@v1
        with:
          node-version: 12.x
      - uses: expo/expo-github-action@v5
        with:
          expo-version: 3.x
          expo-username: ${{ secrets.EXPO_CLI_USERNAME }}
          expo-password: ${{ secrets.EXPO_CLI_PASSWORD }}
      - run: yarn install
      - run: expo publish --release-channel=pr-${{ github.event.number }}
      - uses: unsplash/comment-on-pr@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          msg: App is ready for review, you can [see it here](https://expo.io/@bycedric/use-expo?release-channel=pr-${{ github.event.number }}).
```

### Test PRs on multiple nodes and systems

With GitHub Actions, it's reasonably easy to set up a matrix build and test the app on multiple environments.
These matrixes can help to make sure your app runs smoothly on a broad set of different development machines.

> If you don't need automatic authentication, you can omit the `expo-username` and `expo-password` variables.

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
      - uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node }}
      - uses: expo/expo-github-action@v5
        with:
          expo-version: 3.x
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
      - uses: actions/setup-node@v1
        with:
          node-version: 12.x
      - uses: expo/expo-github-action@v5
        with:
          expo-version: 3.x
      - run: yarn install
      - run: yarn test
      - run: expo build:web
```

## Things to know

### Automatic Expo login

You need to authenticate for some Expo commands like `expo publish` and `expo build`.
This action gives you configuration options to keep your workflow simple.
Under the hood, it uses the [`EXPO_CLI_PASSWORD`][link-expo-cli-password] environment variable to make this as secure as possible.

> Note, this action only uses your credentials to authenticate with Expo. It doesn't store these anywhere.

### Using the built-in cache

As of writing, GitHub doesn't provide a (remote) cache for 3rd party actions.
That's why we implemented the [Cypress fork of the `actions/cache`][link-actions-cache-cypress].
With this, you can opt-in to caching the Expo CLI install, making it a lot faster.
If you need more control over this cache, you can define a custom cache key with `expo-cache-key`.

> Note, this cache will count towards your [repo cache limit][link-actions-cache-limit].

### ENOSPC errors on Linux

When you run `expo publish` or `expo build`, a new bundle is created.
Creating these bundles require quite some resources.
As of writing, GitHub actions has some small default values for the `fs.inotify` settings.
Inside this action, we included a patch that increases these limits for the current workflow.
It increases the `max_user_instances`, `max_user_watches` and `max_queued_events` to `524288`.
You can disable this patch by setting the `expo-patch-watchers` to `false`.

<div align="center">
  <br />
  with :heart: <strong>byCedric</strong>
  <br />
</div>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-actions-cache-cypress]: https://github.com/cypress-io/github-actions-cache
[link-actions-cache-limit]: https://github.com/actions/cache#cache-limits
[link-actions-node]: https://github.com/actions/setup-node
[link-actions-secrets]: https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
[link-expo-cli]: https://docs.expo.io/workflow/expo-cli/
[link-expo-cli-password]: https://github.com/expo/expo-cli/blob/master/packages/expo-cli/src/accounts.ts#L88-L90
[link-expo-release-channels]: https://docs.expo.io/distribution/release-channels/
[link-semver-playground]: https://semver.npmjs.com/
