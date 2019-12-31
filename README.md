# Expo GitHub Action

Publish, build, or manage your [Expo][link-expo] project with GitHub Actions!
This action installs the [Expo CLI][link-expo-cli] on your preferred os and authenticates your project.
You can also use [the Docker image][link-docker-expo] in other Docker-based environments.

1. [What's inside?](#whats-inside)
2. [Used variables](#used-variables)
3. [Example workflows](#example-workflows)
4. [Things to know](#things-to-know)

## What's inside?

Within this Expo action, you have full access to the [Expo CLI][link-expo-cli] itself.
That means you can perform any command like login, publish, and build.
Also, this action takes care of authentication when both `expo-username` and `expo-password` variables are defined.

## Used variables

This action is customizable through variables; they are defined in the [`action.yml`][link-expo-cli-action].
Here is a summary of all the variables that you can use and their purpose.

variable              | description
---                   | ---
`expo-username`       | The username of your Expo account. _(you can hardcode this or use secrets)_
`expo-password`       | The password of your Expo account. _**([use this with secrets][link-actions-secrets])**_
`expo-version`        | The Expo CLI you want to use. _(can be any semver range, defaults to `latest`)_
`expo-packager`       | The package manager you want to use to install the CLI. _(can be `npm` or `yarn`, defaults to `yarn`)_
`expo-cache`          | If it should the actions cache, [read more about it here](#using-the-built-in-cache) _(can be `true` or `false`, defaults to `false`)_
`expo-cache-key`      | An optional custom remote cache key _(**warning**, only use this when you know what you are doing)_
`expo-patch-watchers` | If it should patch the `fs.inotify.` limits causing `ENOSPC` errors on Linux. _(can be `true` or `false`, defaults to `true`)_

> It's recommended to set the `expo-version` to avoid breaking changes when a new major version is released.
> For more info on how to use this, please read the [workflow syntax documentation][link-actions-syntax-with].

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
      - uses: actions/checkout@v1
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
In this one, we enabled the built-in cache that will reuse a previous installed Expo CLI.
This skips the installation part and extracts the files directly, boosting the performance of your workflow.

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
      - uses: actions/checkout@v1
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
To make this easier, you can publish the edited version of the PR using a dedicated release channel.
Below you can see an example of a workflow that publishes and comments when the app is ready for review.

```yml
name: Expo Review
on: [pull_request]
jobs:
  publish:
    name: Install and publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
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
The action below is only running on pull requests to avoid unnecessary builds.

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
      - uses: actions/checkout@v1
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
It helps you update or check your app now and then.
For example, the [Expo CLI Docker images uses this][link-docker-expo-cron] to make sure the images are up to date.

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
      - uses: actions/checkout@v1
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

You need to authenticate for some Expo commands as `expo publish` and `expo build:*`.
This project has an additional feature to make this easy and secure.
The action uses the [`EXPO_CLI_PASSWORD`][link-expo-cli-password] variable internally to make this happen.

### Using the built-in cache

As of writing, GitHub Actions lacks a feature to "cache" files and directories in 3rd party actions.
That's why we implemented the [Cypress fork of the `actions/cache`][link-actions-cache-cypress] to enable some sort of caching.
You can opt-in to this by setting the `expo-cache` variable to `true`.
If you know what you are doing and need more control, you can also define a custom cache key with `expo-cache-key`.

> Note, this cache will count towards your [repo cache limit][link-actions-cache-limit].

### ENOSPC errors on Linux

React Native bundles are created by the Metro bundler, even when using Expo.
Unfortunately, this Metro bundler requires quite some resources.
As of writing, GitHub Actions has some small default values for the `fs.inotify` settings.
Inside we included a patch that increases these limits for the "active workflow" run.
It increases the `max_user_instances`, `max_user_watches` and `max_queued_events` to `524288`.
You can disable this patch by setting the `expo-patch-watchers` to `false`.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
 with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-actions-cache]: https://github.com/actions/cache
[link-actions-cache-cypress]: https://github.com/cypress-io/github-actions-cache
[link-actions-cache-limit]: https://github.com/actions/cache#cache-limits
[link-actions-node]: https://github.com/actions/setup-node
[link-actions-secrets]: https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables
[link-actions-syntax-with]: https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith
[link-docker-expo]: https://github.com/bycedric/expo-cli-images
[link-docker-expo-cron]: https://github.com/byCedric/expo-cli-images/blob/d93389e52135d6a599853aed7893adc6a8b57c84/.github/workflows/daily-builds.yml#L5
[link-expo]: https://expo.io
[link-expo-cli]: https://docs.expo.io/versions/latest/workflow/expo-cli
[link-expo-cli-action]: action.yml
[link-expo-cli-password]: https://github.com/expo/expo-cli/blob/8ea616d8848a123270b97e226e33dcb3dde49653/packages/expo-cli/src/accounts.js#L94
