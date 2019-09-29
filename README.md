# Expo GitHub Action

> GitHub Actions [is still in beta][link-actions-beta], use it at your own risk.

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

> You don't necessarily need this action to use Expo.
> You can also add `expo-cli` as a dependency to your project and use `npx expo ...` for example.
> However, when you do that you need to perform authentication yourself.


## Used variables

This action is customizable through variables; they are defined in the [`action.yml`][link-expo-cli-action].
Here is a summary of all the variables that you can use and their purpose.

variable        | description
---             | ---
`expo-username` | The username of your Expo account. _(you can hardcode this or use secrets)_
`expo-password` | The password of your Expo account. _**([use this with secrets][link-actions-secrets])**_
`expo-version`  | The Expo CLI you want to use. _(can be any semver range, defaults to `latest`)_
`expo-packager` | The package manager you want to use to install the CLI. _(can be `npm` or `yarn`, defaults to `npm`)_

> It's recommended to set the `expo-version` to avoid breaking changes when a new major version is released.
> For more info on how to use this, please read the [workflow syntax documentation][link-actions-syntax-with].


## Example workflows

Before you dive into the workflow examples, you should know the basics of GitHub Actions.
You can read more about this in the [GitHub Actions documentation][link-actions].

1. [Publish on any push to master](#publish-on-any-push-to-master)
2. [Test PRs on Linux, MacOS and Windows](#test-prs-on-linux-macos-and-windows)
3. [Test PRs on Node 10 and 12](#test-prs-on-node-10-and-12)
4. [Test and build web every day at 08:00](#test-and-build-web-every-day-at-0800)
5. [Use Docker for improved performance](#use-docker-for-improved-performance)


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
      - uses: expo/expo-github-action@v4
        with:
          expo-version: 3.x
          expo-username: ${{ secrets.EXPO_CLI_USERNAME }}
          expo-password: ${{ secrets.EXPO_CLI_PASSWORD }}
      - run: npm ci
      - run: expo publish
```


### Test PRs on Linux, MacOS, and Windows

With GitHub Actions, it's reasonably easy to set up a matrix build and test the app on various operating systems.
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
    steps:
      - uses: actions/checkout@v1
      - uses: actions/setup-node@v1
        with:
          node-version: 12.x
      - uses: expo/expo-github-action@v4
        with:
          expo-version: 3.x
      - run: npm ci
      - run: npm test
      - run: expo doctor
```


### Test PRs on Node 10 and 12

Sometimes you want to double-check if your app builds on multiple node versions.
Setting this up is just as easy as defining a matrix build for multiple systems.

```yml
name: Expo CI
on: [pull_request]
jobs:
  ci:
    name: Continuous Integration
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [10, 12]
    steps:
      - uses: actions/checkout@v1
      - uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node }}
      - uses: expo/expo-github-action@v4
        with:
          expo-version: 3.x
      - run: npm ci
      - run: npm test
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
      - uses: expo/expo-github-action@v4
        with:
          expo-version: 3.x
      - run: npm ci
      - run: npm test
      - run: expo build:web
```


### Use Docker for improved performance

Unfortunately, GitHub Actions lack a feature to cache files and directories across multiple jobs.
Because of this, the action has to pull and install the [Expo CLI][link-expo-cli] _on every run_.
If you want faster runs and don't care about customizing your workflows in detail, you can use [the Expo Docker image][link-docker-expo] to speed things up.

> Because Docker uses a predefined environment, you lose the ability to customize the Node versions and system types.
> For most projects this won't be an issue, but please make sure you understand the tradeoffs.
> This approach is also a robust way and won't break once we implement the caching feature.

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
      - run: npm ci
      - uses: docker://bycedric/expo-cli:3
        with:
          args: publish
        env:
          EXPO_CLI_USERNAME: ${{ secrets.EXPO_CLI_USERNAME }}
          EXPO_CLI_PASSWORD: ${{ secrets.EXPO_CLI_PASSWORD }}
```


### Things to know


#### Automatic Expo login

You need to authenticate for some Expo commands as `expo publish` and `expo build:*`.
This project has an additional feature to make this easy and secure.
The action uses the [`EXPO_CLI_PASSWORD`][link-expo-cli-password] variable internally to make this happen.


#### Why is the action slow?

As of writing, GitHub Actions lacks a feature to "cache" files and directories across multiple jobs.
Because of this, the action has to pull and install the [Expo CLI][link-expo-cli] _on every run_.
Fortunately, GitHub is working on a feature that should make this happen, but it's not available yet.
If this is a show-stopper for you, read about how to set the [Expo CLI up with Docker](#use-docker-for-improved-performance).
Please note that this approach has its limitations and make sure you understand these before trying this out.
When GitHub releases this caching feature, we will implement this feature and it and make it significantly faster.


## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>

[link-actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[link-actions-beta]: https://help.github.com/en/articles/about-github-actions
[link-actions-node]: https://github.com/actions/setup-node
[link-actions-secrets]: https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables
[link-actions-syntax-with]: https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith
[link-docker-expo]: https://github.com/bycedric/expo-cli-images
[link-docker-expo-cron]: https://github.com/byCedric/expo-cli-images/blob/d93389e52135d6a599853aed7893adc6a8b57c84/.github/workflows/daily-builds.yml#L5
[link-expo]: https://expo.io
[link-expo-cli]: https://docs.expo.io/versions/latest/workflow/expo-cli
[link-expo-cli-action]: action.yml
[link-expo-cli-password]: https://github.com/expo/expo-cli/blob/8ea616d8848a123270b97e226e33dcb3dde49653/packages/expo-cli/src/accounts.js#L94
