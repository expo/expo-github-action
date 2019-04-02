# Expo for Docker

A prebuilt docker image to use the [Expo CLI](https://docs.expo.io/versions/latest/workflow/expo-cli) on Docker-based environments.
This image contains all necessary libraries to perform all commands of the CLI.

- Based on `node:10` image
- Contains globally installed `expo-cli@2`

## Usage

The entry point of this image forwards to the Expo CLI itself.
With this entry point, you can provide any command directly to Docker.
When nothing is provided, it will output the help information provided by the CLI.

> The entry point uses `sh -c` to invoke Expo, making environment variable available to that command.

```bash
$ docker run --rm bycedric/ci-expo
$ docker run --rm bycedric/ci-expo pubish
$ docker run --rm -ti bycedric/ci-expo login
$ docker run --rm -ti --entrypoint sh bycedric/ci-expo
```

> This image is intended to use on Docker-based CI environments, see [the Expo CI guide](https://docs.expo.io/versions/latest/guides/setting-up-continuous-integration) to get started.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>
