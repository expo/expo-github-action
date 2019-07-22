# Expo for Docker

[![Build Status](https://travis-ci.com/expo/expo-github-action.svg?branch=master)](https://travis-ci.com/expo/expo-github-action)

A prebuilt docker image to use the [Expo CLI][link-expo-cli] on Docker-based environments.
This image contains all necessary libraries to perform all commands of the CLI.
To make sure this image stays up to date, Travis CI is scheduled to run weekly builds.

- Based on `node:10` image
- Contains globally installed `expo-cli@2`

> This version is capped to `expo-cli@2.x.x` and `node@10.x.x`, which are outdated.
> Please [upgrade to the latest version ASAP](../3).

## Usage

The entry point of this image forwards to the Expo CLI itself.
With this entry point, you can provide any command directly to Docker.
When nothing is provided, it will output the help information provided by the CLI.

> The entry point uses `sh -c` to invoke Expo, making environment variables available to that command.

```bash
$ docker run --rm bycedric/expo-cli:2
$ docker run --rm bycedric/expo-cli:2 pubish
$ docker run --rm -ti bycedric/expo-cli:2 login
$ docker run --rm -ti --entrypoint sh bycedric/expo-cli:2
```

> This image is intended to use on Docker-based CI environments, see [the Expo CI guide][link-expo-cicd] to get started.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>

[link-expo-cli]: https://docs.expo.io/versions/latest/workflow/expo-cli
[link-expo-cicd]: https://docs.expo.io/versions/latest/guides/setting-up-continuous-integration
