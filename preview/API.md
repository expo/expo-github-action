# Non-intrusive reuse of `eas update ...` command

```yaml
on:
  pull_request:
    types: [opened, synchronize]

concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repository
        uses: actions/checkout@v3

      - name: 🏗 Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish preview
        id: preview
        run: echo "update=$(eas update --branch=pr-${{ github.event.number }} --json --non-interactive)" >> $GITHUB_OUTPUT

      - name: 💬 Comment preview
        uses: expo/expo-github-action/preview-comment@v8
        with:
          update: ${{ steps.preview.outputs.update }}
```

# Intrusive without option to overwrite command

```yaml
on:
  pull_request:
    types: [opened, synchronize]

concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repository
        uses: actions/checkout@v3

      - name: 🏗 Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish preview
        uses: expo/expo-github-action/preview@v8
        with:
          branch: pr-${{ github.event.number }}
          platform: android
```

# Intrusive with option to overwrite command

```yaml
on:
  pull_request:
    types: [opened, synchronize]

concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repository
        uses: actions/checkout@v3

      - name: 🏗 Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: yarn install

      - name: 🚀 Publish preview
        uses: expo/expo-github-action/preview@v8
        with:
          command: eas update --platform android --branch pr-${{ github.event.number }}
```
