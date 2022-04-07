## [7.2.0](https://github.com/expo/expo-github-action/compare/7.1.1...7.2.0) (2022-04-07)


### New features

* **comment:** add comment-based action to interact with eas in pulls ([#171](https://github.com/expo/expo-github-action/issues/171)) ([088fd4e](https://github.com/expo/expo-github-action/commit/088fd4e6fdfc0c17a87a176a2a7bee50b18482c9))


### Other chores

* bump minimist from 1.2.5 to 1.2.6 ([#173](https://github.com/expo/expo-github-action/issues/173)) ([72721e5](https://github.com/expo/expo-github-action/commit/72721e5519453138c89882c06954665b116f1dc7))
* clean the repo instead of checking out ([ec1a49b](https://github.com/expo/expo-github-action/commit/ec1a49baeb2ec1c952f1fc96f6c25baaaedeb40e))
* disallow any linting issues for pulls ([#177](https://github.com/expo/expo-github-action/issues/177)) ([b5a8ca7](https://github.com/expo/expo-github-action/commit/b5a8ca7f7ff3dc5ec7126734447ad1451337b81d))


### Documentation changes

* **command:** clean up the readme code example ([0811162](https://github.com/expo/expo-github-action/commit/0811162597bbb2719038d9bac02bd074a5d6d124))
* update the release steps in the contribution guide ([b3b45ee](https://github.com/expo/expo-github-action/commit/b3b45ee53f1b6ce7e1db84a06047941fbea5c236))

### [7.1.1](https://github.com/expo/expo-github-action/compare/7.1.0...7.1.1) (2022-03-17)


### Bug fixes

* package tool escape path on windows ([#169](https://github.com/expo/expo-github-action/issues/169)) ([db9b5ce](https://github.com/expo/expo-github-action/commit/db9b5ce00f55fe6dc5d802d41ffbd6c03cb598e4)), closes [#167](https://github.com/expo/expo-github-action/issues/167)


### Other chores

* add tags syncing to the release workflow ([eb1ffb8](https://github.com/expo/expo-github-action/commit/eb1ffb8b234266a58d5fbfa1343e6fe6adfaf914))
* fix dirty repo preventing tag bump ([7cde8f8](https://github.com/expo/expo-github-action/commit/7cde8f899a0771d310e1d62ee65ce3d625d470ea))


### Documentation changes

* add direct link to expo access tokens ([1f38d16](https://github.com/expo/expo-github-action/commit/1f38d16d01677b6ed60d5358bdf23576538d578b))
* increase visibility of the EXPO_TOKEN link ([#168](https://github.com/expo/expo-github-action/issues/168)) ([9fce70f](https://github.com/expo/expo-github-action/commit/9fce70f38003122ae997201dd07d4cc74830c24e))
* **preview-comment:** update expo-cli version to latest ([4681fcf](https://github.com/expo/expo-github-action/commit/4681fcfc4247a28d47e8dfb17d23a9a0bff22827))
* reword the assumptions on package manager ([459b567](https://github.com/expo/expo-github-action/commit/459b5673d55573b6e620015864c95b6b007f2f5f))

## [7.1.0](https://github.com/expo/expo-github-action/compare/7.0.3...7.1.0) (2022-03-04)


### New features

* add projectDeepLink to template variables ([#165](https://github.com/expo/expo-github-action/issues/165)) ([2603f85](https://github.com/expo/expo-github-action/commit/2603f858e975e61d8b7650b890db57c3afc5c658))


### Other chores

* run authed tests only when auth is available ([5815161](https://github.com/expo/expo-github-action/commit/58151613afb24812ce88afb33ed1a6b3f569128e))
* set major tag version to release commit ([b516013](https://github.com/expo/expo-github-action/commit/b5160133d207c9a70283880b33e34beb157cc7ea))
* skip steps if auth is unavailable ([bb7c723](https://github.com/expo/expo-github-action/commit/bb7c72336b557c49ca0a0e84025e1b4cce23ce2e))
* update github action author name ([#166](https://github.com/expo/expo-github-action/issues/166)) ([520d959](https://github.com/expo/expo-github-action/commit/520d9594e099c7b2475d8b376303466a187bcafa))

### [7.0.3](https://github.com/expo/expo-github-action/compare/7.0.2...7.0.3) (2022-02-14)


### Bug fixes

* improve invalid package version error handling ([#159](https://github.com/expo/expo-github-action/issues/159)) ([94c7d8a](https://github.com/expo/expo-github-action/commit/94c7d8acbd68c7dac4ecde503427c98849039499))
* output error stacktraces in debug mode ([#160](https://github.com/expo/expo-github-action/issues/160)) ([6931e3c](https://github.com/expo/expo-github-action/commit/6931e3c78b432c1b94d84e684da42ecba46044b4))


### Other chores

* always dry run a new release on merge ([#162](https://github.com/expo/expo-github-action/issues/162)) ([3f293ee](https://github.com/expo/expo-github-action/commit/3f293ee480f9d567c1c902848d26a5ca6720266b))
* bump node-fetch from 2.6.1 to 2.6.7 ([#157](https://github.com/expo/expo-github-action/issues/157)) ([839215f](https://github.com/expo/expo-github-action/commit/839215f036182d3534f9b91d4573b9f126f56560))
* fully automate releases ([#164](https://github.com/expo/expo-github-action/issues/164)) ([fbd4450](https://github.com/expo/expo-github-action/commit/fbd44501d896448c3c4ac4e5495bb536614fa3fc))


### Documentation changes

* simplify expo cli versioning to latest ([#161](https://github.com/expo/expo-github-action/issues/161)) ([2e1fe6a](https://github.com/expo/expo-github-action/commit/2e1fe6ac53c6fd536ea5691410d73df35384fd07))

### [7.0.2](https://github.com/expo/expo-github-action/compare/7.0.1...7.0.2) (2022-01-25)


### Code changes

* **preview-comment:** auto-fill the github token ([#156](https://github.com/expo/expo-github-action/issues/156)) ([204dfed](https://github.com/expo/expo-github-action/commit/204dfed23cb6416041ee5c918c7a6e3a5dbf8955))

### [7.0.1](https://github.com/expo/expo-github-action/compare/7.0.0...7.0.1) (2022-01-17)


### Bug fixes

* remove double resolving package versions ([#152](https://github.com/expo/expo-github-action/issues/152)) ([d53d38f](https://github.com/expo/expo-github-action/commit/d53d38f65bc6add70cdb1eb0fb1caadd3eae9ae4))


### Other chores

* run test workflow every day at 15:00 utc ([fd33d59](https://github.com/expo/expo-github-action/commit/fd33d597d339279a12768e1b3c99e051324dc8ba))


### Documentation changes

* explicitly add non interactive flag ([#151](https://github.com/expo/expo-github-action/issues/151)) ([844ea09](https://github.com/expo/expo-github-action/commit/844ea09678511192c3685351e3eedd0c92dd4d7d))
* update comment preview readme header ([7a46a49](https://github.com/expo/expo-github-action/commit/7a46a499ece6b413f5c6fb05951606c95546e03e))
* update step title in example with eas cli ([7934883](https://github.com/expo/expo-github-action/commit/79348837ee612ad7393e64b3ed04a93519982fe6))
* update workflow badge with test status ([99593b8](https://github.com/expo/expo-github-action/commit/99593b87875c2d5cb38c2b111cf8bdf85ab54b1c))

## [7.0.0](https://github.com/expo/expo-github-action/compare/6.0.0...7.0.0) (2022-01-15)


### ⚠ BREAKING CHANGES

* some input options are deprecated
  - Username and password authentication is dropped in favor of tokens
  - Custom cache keys are dropped
  - Custom install error handler is dropped

### New features

* add comment qr code subaction ([#149](https://github.com/expo/expo-github-action/issues/149)) ([4648212](https://github.com/expo/expo-github-action/commit/464821230fc5d4c4d848dcf20c5146bf99fd38ce))


### Bug fixes

* use which instead of npx to authenticate ([#147](https://github.com/expo/expo-github-action/issues/147)) ([c5d2c0f](https://github.com/expo/expo-github-action/commit/c5d2c0f8c034b625147bc4b2ccd6d14a29412a1d))


### Code changes

* allow multiple entrypoints for different sub-actions ([#121](https://github.com/expo/expo-github-action/issues/121)) ([8a7306a](https://github.com/expo/expo-github-action/commit/8a7306a97854f9b2853a614d3302061922471a8f))
* clean up setup action ([#146](https://github.com/expo/expo-github-action/issues/146)) ([439ff4c](https://github.com/expo/expo-github-action/commit/439ff4c9aa508ea6f38364859109267d8f26fcf1))
* enable caches by default ([#148](https://github.com/expo/expo-github-action/issues/148)) ([72d4067](https://github.com/expo/expo-github-action/commit/72d406754f3b10aeff9b54a2b3e3e833d4cd3c9f))
* replace libnpm with npm cli ([#139](https://github.com/expo/expo-github-action/issues/139)) ([4f28493](https://github.com/expo/expo-github-action/commit/4f28493708de28b8eebd418702ec8eb93660927d))
* roll back to ncc because of swc bundling issues ([#144](https://github.com/expo/expo-github-action/issues/144)) ([3007741](https://github.com/expo/expo-github-action/commit/3007741466570f1bf8f3cf7417e56c7aab50b60a))
* update the outdated workflows and use node 16 ([#138](https://github.com/expo/expo-github-action/issues/138)) ([3134e26](https://github.com/expo/expo-github-action/commit/3134e26b3a41fcc058c60c0f34f87c8d44189d3c))
* upgrade to node 16 github actions runtime ([#137](https://github.com/expo/expo-github-action/issues/137)) ([3bf9181](https://github.com/expo/expo-github-action/commit/3bf9181edb0df2dcaf9112b50c9d2a9996db8a32))
* use assert instead of if statements ([#150](https://github.com/expo/expo-github-action/issues/150)) ([e4ef6e6](https://github.com/expo/expo-github-action/commit/e4ef6e6950f602a6277c6e35dbd36ca3fa8ccb8e))
* use boolean input instead of manual conversion ([#127](https://github.com/expo/expo-github-action/issues/127)) ([f1fe877](https://github.com/expo/expo-github-action/commit/f1fe8775927c95727008dfe31f580c122913a745))
* use spaces for indentation ([#126](https://github.com/expo/expo-github-action/issues/126)) ([ff2ff0f](https://github.com/expo/expo-github-action/commit/ff2ff0f980f70d0047d10637dd5ef915128199ec))
* use swc pack instead of ncc ([#140](https://github.com/expo/expo-github-action/issues/140)) ([3f9e947](https://github.com/expo/expo-github-action/commit/3f9e9479631f03a941ecfebdcd0351ef57f59a2e))


### Other chores

* add basic e2e test workflow for main action ([#141](https://github.com/expo/expo-github-action/issues/141)) ([414c169](https://github.com/expo/expo-github-action/commit/414c1693e6183ad92723fca4517181b21f93eaf0))
* add manual trigger to the tests ([4908a48](https://github.com/expo/expo-github-action/commit/4908a48f1b5e1ccff9589c0fcaafe4223d53bee1))
* always use lf for build files ([#122](https://github.com/expo/expo-github-action/issues/122)) ([a9b9cfe](https://github.com/expo/expo-github-action/commit/a9b9cfef50ba2c1d38fff1a679c554eb52edc25e))
* bump semver-regex from 3.1.2 to 3.1.3 ([#114](https://github.com/expo/expo-github-action/issues/114)) ([50c0ef9](https://github.com/expo/expo-github-action/commit/50c0ef9028d51bd25197c54102438f494c265438))
* bump tar from 4.4.13 to 4.4.19 ([#112](https://github.com/expo/expo-github-action/issues/112)) ([5f5673b](https://github.com/expo/expo-github-action/commit/5f5673ba7744a05d9c499fbca7b4e503aabef5a1))
* bump tmpl from 1.0.4 to 1.0.5 ([#115](https://github.com/expo/expo-github-action/issues/115)) ([92ec93f](https://github.com/expo/expo-github-action/commit/92ec93fa37744783ec10149e7d755d7181649f8a))
* clean up dependencies and eslint rules ([#145](https://github.com/expo/expo-github-action/issues/145)) ([3ae7999](https://github.com/expo/expo-github-action/commit/3ae799926e78cfecd54e965c77d1c1fb49cac45b))
* clean up master references in release and workflows ([#104](https://github.com/expo/expo-github-action/issues/104)) ([a2d9b1c](https://github.com/expo/expo-github-action/commit/a2d9b1cadf463af1e6b4025af3edc99cf7f4b5a0))
* clean up tsconfig and eslint rules ([#123](https://github.com/expo/expo-github-action/issues/123)) ([c20146f](https://github.com/expo/expo-github-action/commit/c20146f3b7513ae3a3df3dead651d2a2dea988af))
* lint root files with prettier and eslint ([#125](https://github.com/expo/expo-github-action/issues/125)) ([1cfa7bb](https://github.com/expo/expo-github-action/commit/1cfa7bbd9ed623e2e40406addab4bff2c9a7b2fd))
* rebuild project ([45b79a0](https://github.com/expo/expo-github-action/commit/45b79a05ef7496339d33d03fdd7755ef76c7038b))
* rebuild project after dependency bumps ([b099f17](https://github.com/expo/expo-github-action/commit/b099f17d588e23df069b60d39ca1e21327066a4f))
* remove husky and improve ci build message ([#128](https://github.com/expo/expo-github-action/issues/128)) ([39b0d36](https://github.com/expo/expo-github-action/commit/39b0d361f7d97ef1a71a02495463d1e93a72093a))
* simplify review and update build detection ([#142](https://github.com/expo/expo-github-action/issues/142)) ([ee415b0](https://github.com/expo/expo-github-action/commit/ee415b027afce4c15cabcc6fa2f8368530a36c08))
* update `setup-node` action to `v2` release ([#119](https://github.com/expo/expo-github-action/issues/119)) ([3b3e6b8](https://github.com/expo/expo-github-action/commit/3b3e6b8031b898cdf0bc59488d541d90748954b9))
* update semantic release to update the build ([354dc08](https://github.com/expo/expo-github-action/commit/354dc0891761b8d1fc092ec5e9bb3b5ca1922090))
* update the action manifest ([633cdf0](https://github.com/expo/expo-github-action/commit/633cdf0ac9f283f5a7010fef11bfda9174278054))
* upgrade dev dependencies and rebuild action ([#120](https://github.com/expo/expo-github-action/issues/120)) ([186ef00](https://github.com/expo/expo-github-action/commit/186ef0011a259a7b2c745f8cf2743358ca112530))


### Documentation changes

* fix broken sup element in readme ([0b1822a](https://github.com/expo/expo-github-action/commit/0b1822a93580171a0582013a0cf7848cf3503ed7))
* fix github capitalization ([#116](https://github.com/expo/expo-github-action/issues/116)) ([b602469](https://github.com/expo/expo-github-action/commit/b60246939fba50e600b11596b4b1029091017b7c))
* fix unsplash comment on pr branch reference ([#110](https://github.com/expo/expo-github-action/issues/110)) ([f14253e](https://github.com/expo/expo-github-action/commit/f14253ea9c17296e843610c7b8fad4e13c7abda0))
* update default values in readme ([c2f11d2](https://github.com/expo/expo-github-action/commit/c2f11d2d513b75ec0a00c6bf60e5d0e275c3a8af))
* update expo.io links to expo.dev ([#111](https://github.com/expo/expo-github-action/issues/111)) ([1c8e5a2](https://github.com/expo/expo-github-action/commit/1c8e5a21e9689cedd8fbcf61e50a3f4700b6bc41))
* update node version reference in readme ([#107](https://github.com/expo/expo-github-action/issues/107)) ([3ba667b](https://github.com/expo/expo-github-action/commit/3ba667b43f1e103a1c64e92a60d7c36bd0ad10b2))
* update readme and contributing guides ([521de72](https://github.com/expo/expo-github-action/commit/521de724fcb79235773c077e870d7c2293ab51cb))
* use `main` branch to update `v{major}` tag ([#103](https://github.com/expo/expo-github-action/issues/103)) ([def44e2](https://github.com/expo/expo-github-action/commit/def44e2c77a39f5bd48dbb07adec509137afcf67))

## [6.0.0](https://github.com/expo/expo-github-action/compare/5.5.1...6.0.0) (2021-06-22)


### ⚠ BREAKING CHANGES

* GitHub Action inputs are changed to allow both Expo and EAS CLI.

### New features

* add support for eas cli installs ([#98](https://github.com/expo/expo-github-action/issues/98)) ([04692c3](https://github.com/expo/expo-github-action/commit/04692c3cb1f7ad977f62841ca0bb175c903f653f))


### Other chores

* update node to 14 and 16 in ci ([#100](https://github.com/expo/expo-github-action/issues/100)) ([a03876e](https://github.com/expo/expo-github-action/commit/a03876e3c556bea147f2be007eac911bf78c9b23))


### Documentation changes

* add commands to contirbuting guide for updating v{major} tags ([1b57c37](https://github.com/expo/expo-github-action/commit/1b57c37e9bdfe92e183befb3595debc64da672f0))
* update readme for v6 release ([#101](https://github.com/expo/expo-github-action/issues/101)) ([8b43bae](https://github.com/expo/expo-github-action/commit/8b43bae073f280d4fa76aa174642ad46febe985c))
* update upstream reference in contributing guide ([76ce4de](https://github.com/expo/expo-github-action/commit/76ce4de80ea89b343404cdabadc922882af80487))

### [5.5.1](https://github.com/expo/expo-github-action/compare/5.5.0...5.5.1) (2021-06-17)


### Bug fixes

* revert to node 12 for the action ([2662a5f](https://github.com/expo/expo-github-action/commit/2662a5f0dec42d7a9c66b55f8ce937f37aaac9b4))

## [5.5.0](https://github.com/expo/expo-github-action/compare/5.4.0...5.5.0) (2021-06-17)


### New features

* switch to node 14 for the action itself ([f13b0ea](https://github.com/expo/expo-github-action/commit/f13b0ea032efcf2e6689743879af6b3e1c72201d))


### Bug fixes

* add support for environments without remote cache ([#91](https://github.com/expo/expo-github-action/issues/91)) ([9c0e696](https://github.com/expo/expo-github-action/commit/9c0e6962510d4e08c6429cac42f624c563675ee1))


### Code changes

* simplify typescript config with community config ([#94](https://github.com/expo/expo-github-action/issues/94)) ([da4e754](https://github.com/expo/expo-github-action/commit/da4e75428b7c5ffd16e8b2c698f590313c741621))
* update all dependencies to latest versions ([#93](https://github.com/expo/expo-github-action/issues/93)) ([6bc0bed](https://github.com/expo/expo-github-action/commit/6bc0bedbc75bb0d6743e4accf032cd01348d6775))


### Other chores

* add semantic release for easy versioning ([#95](https://github.com/expo/expo-github-action/issues/95)) ([6354b0a](https://github.com/expo/expo-github-action/commit/6354b0a0477a72375cee808d8a5b6006d6e86e77))
* fix the allowed branches for semenatic release ([6b8c488](https://github.com/expo/expo-github-action/commit/6b8c488fd6239c9a76d7f95355a58bc8b2a20ac4))
* mock the github actions warning to avoid leaking annotations ([#96](https://github.com/expo/expo-github-action/issues/96)) ([a11a47a](https://github.com/expo/expo-github-action/commit/a11a47a3e8735a206eed196499604322b0bdc877))
* tweak the release workflow ([79ebfbc](https://github.com/expo/expo-github-action/commit/79ebfbc3b83497f443fd65eb5bd33484e5519f64))


### Documentation changes

* add missing release step to contributing guide ([04e3b32](https://github.com/expo/expo-github-action/commit/04e3b32e94e3abe9cd65d37c57a0cead55186970))

## [5.4.0](https://github.com/expo/expo-github-action/compare/5.3.1...5.4.0) (2021-01-12)

### New features

* improve error handling with update check ([#76](https://github.com/expo/expo-github-action/pull/76)) ([917e072](https://github.com/expo/expo-github-action/commit/917e072))

### Code refactors

* use official actions cache package instead of cypress fork ([#62](https://github.com/expo/expo-github-action/pull/62)) ([0eb46e9](https://github.com/expo/expo-github-action/commit/0eb46e9))
* output cache errors with actions core ([187c4ad](https://github.com/expo/expo-github-action/commit/187c4ad))
* group output by steps for readability ([#70](https://github.com/expo/expo-github-action/pull/70)) ([75b743c](https://github.com/expo/expo-github-action/commit/75b743c))
* update all dev dependencies to latest version ([#71](https://github.com/expo/expo-github-action/pull/71)) ([ed7f67d](https://github.com/expo/expo-github-action/commit/ed7f67d))

### Documentation changes

* update the cache description without the fork ([13d7820](https://github.com/expo/expo-github-action/commit/13d7820))
* update readme to latest expo cli and node ([#77](https://github.com/expo/expo-github-action/pull/77)) ([6c0f4d7](https://github.com/expo/expo-github-action/commit/6c0f4d7))

### Other chores

* update all dependencies to latest versions ([#78](https://github.com/expo/expo-github-action/pull/78)) ([4ec7251](https://github.com/expo/expo-github-action/commit/4ec7251))


## [5.3.1](https://github.com/expo/expo-github-action/compare/5.3.0...5.3.1) (2020-10-20)

### Other chores

* bump @actions/core from 1.2.4 to 1.2.6 ([#63](https://github.com/expo/expo-github-action/pull/63)) ([b807fa6](https://github.com/expo/expo-github-action/commit/b807fa6))


## [5.3.0](https://github.com/expo/expo-github-action/compare/5.2.0...5.3.0) (2020-09-19)

### New features

* add expo token authentication method ([#57](https://github.com/expo/expo-github-action/pull/57)) ([1c36889](https://github.com/expo/expo-github-action/commit/1c36889))


## [5.2.0](https://github.com/expo/expo-github-action/compare/5.1.1...5.2.0) (2020-07-14)

### Bug fixes

* proper space between icon and text ([#50](https://github.com/expo/expo-github-action/pull/50)) ([b8a49f4](https://github.com/expo/expo-github-action/commit/b8a49f4))

### Code refactors

* use github actions instead of circle ([#54](https://github.com/expo/expo-github-action/pull/54)) ([d3602b9](https://github.com/expo/expo-github-action/commit/d3602b9))

### Documentation changes

* fix grammar and link in readme ([#53](https://github.com/expo/expo-github-action/pull/53)) ([6ac67f0](https://github.com/expo/expo-github-action/commit/6ac67f0))
* update build badge in readme ([#56](https://github.com/expo/expo-github-action/pull/56)) ([050b701](https://github.com/expo/expo-github-action/commit/050b701))

### Other chores

* upgrade all dependencies to latest version ([#55](https://github.com/expo/expo-github-action/pull/55)) ([404bd09](https://github.com/expo/expo-github-action/commit/404bd09))


## [5.1.1](https://github.com/expo/expo-github-action/compare/5.1.0...5.1.1) (2020-06-10)

### Bug fixes

* use inputs metadata key ([#49](https://github.com/expo/expo-github-action/pull/49)) ([71dfeab](https://github.com/expo/expo-github-action/commit/71dfeab))


## [5.1.0](https://github.com/expo/expo-github-action/compare/5.0.0...5.1.0) (2020-05-08)

### New features

* fail when provided credentials are incorrect ([#43](https://github.com/expo/expo-github-action/pull/43)) ([a7b6ce4](https://github.com/expo/expo-github-action/commit/a7b6ce4))

### Bug fixes

* remove custom and add global error handling ([#46](https://github.com/expo/expo-github-action/pull/46)) ([a4955da](https://github.com/expo/expo-github-action/commit/a4955da))

### Test changes

* check if build is up to date ([#45](https://github.com/expo/expo-github-action/pull/45)) ([cb49096](https://github.com/expo/expo-github-action/commit/cb49096))
* add missing cache unit tests ([#44](https://github.com/expo/expo-github-action/pull/44)) ([4279327](https://github.com/expo/expo-github-action/commit/4279327))

### Other chores

* update dependencies and configuration ([#42](https://github.com/expo/expo-github-action/pull/42)) ([32b5f9c](https://github.com/expo/expo-github-action/commit/32b5f9c))
* **deps**: bump acorn from 5.7.3 to 5.7.4 ([#37](https://github.com/expo/expo-github-action/pull/37)) ([4aaf05f](https://github.com/expo/expo-github-action/commit/4aaf05f))


## [5.0.0](https://github.com/expo/expo-github-action/compare/4.1.0...5.0.0) (2019-12-31)

### BREAKING CHANGES

* use yarn by default instead of npm ([#32](https://github.com/expo/expo-github-action/pull/32)) ([2de5b8c3](https://github.com/expo/expo-github-action/commit/2de5b8c))
* use ncc to compile scripts ([#31](https://github.com/expo/expo-github-action/pull/31)) ([48288d58](https://github.com/expo/expo-github-action/commit/48288d5))

### New features

* implement caching using github actions cache ([#35](https://github.com/expo/expo-github-action/pull/35)) ([69801f0a](https://github.com/expo/expo-github-action/commit/69801f0))

### Code refactors

* move index code to run ([#33](https://github.com/expo/expo-github-action/pull/33)) ([f80ef1f6](https://github.com/expo/expo-github-action/commit/f80ef1f))
* use yarn by default instead of npm ([#32](https://github.com/expo/expo-github-action/pull/32)) ([2de5b8c3](https://github.com/expo/expo-github-action/commit/2de5b8c))
* use ncc to compile scripts ([#31](https://github.com/expo/expo-github-action/pull/31)) ([48288d58](https://github.com/expo/expo-github-action/commit/48288d5))
* make logs more visible ([#30](https://github.com/expo/expo-github-action/pull/30)) ([12f58a21](https://github.com/expo/expo-github-action/commit/12f58a2))
* update all dependencies to latest versions ([#29](https://github.com/expo/expo-github-action/pull/29)) ([7776e33f](https://github.com/expo/expo-github-action/commit/7776e33))
* use circleci instead of github actions ([#28](https://github.com/expo/expo-github-action/pull/28)) ([e5677e1f](https://github.com/expo/expo-github-action/commit/e5677e1))

### Documentation changes

* update the default packager value in action ([#34](https://github.com/expo/expo-github-action/pull/34)) ([3ac4a96c](https://github.com/expo/expo-github-action/commit/3ac4a96))

### Other chores

* **deps**: bump handlebars from 4.2.0 to 4.5.3 ([#27](https://github.com/expo/expo-github-action/pull/27)) ([4aa2c230](https://github.com/expo/expo-github-action/commit/4aa2c23))


## [4.1.0](https://github.com/expo/expo-github-action/compare/4.0.1...4.1.0) (2019-10-30)

### Bug fixes

* use cmd suffix when authenticating on windows ([831bcb1](https://github.com/expo/expo-github-action/commit/831bcb1))

### Documentation changes

* remove beta warning just before general availability ([68a2de0](https://github.com/expo/expo-github-action/commit/68a2de0))

### Other chores

* update all dependencies to latest version ([16d4b15](https://github.com/expo/expo-github-action/commit/16d4b15))
* enable workflow for pull requests ([8ff07e0](https://github.com/expo/expo-github-action/commit/8ff07e0))


## [4.0.0](https://github.com/expo/expo-github-action/compare/3.0.0...4.0.0) (2019-09-29)

### New features

* add github workflow for ci ([929a76c](https://github.com/expo/expo-github-action/commit/929a76c))
* add new expo action cli install concept ([98b1bea](https://github.com/expo/expo-github-action/commit/98b1bea))
* use new action metadata format ([81344e4](https://github.com/expo/expo-github-action/commit/81344e4))

### Bug fixes

* add build and node node modules before commit ([00692c4](https://github.com/expo/expo-github-action/commit/00692c4))
* add build and node node modules in husky hook ([b2929e3](https://github.com/expo/expo-github-action/commit/b2929e3))

### Code refactors

* remove travis config and base images ([e72ddd8](https://github.com/expo/expo-github-action/commit/e72ddd8))
* move entry point to expo as proxy ([caf499b](https://github.com/expo/expo-github-action/commit/caf499b))
* update proxy for non-interactive mode and help links ([5cfaee2](https://github.com/expo/expo-github-action/commit/5cfaee2))

### Documentation changes

* update documentation for the new action ([38e963b](https://github.com/expo/expo-github-action/commit/38e963b))
* simplify and link the environment variables info ([26c734a](https://github.com/expo/expo-github-action/commit/26c734a))
* replace aliased email with normal email ([f3bc71a](https://github.com/expo/expo-github-action/commit/f3bc71a))
* write about entry point proxy and restructure for easy access ([4766fa8](https://github.com/expo/expo-github-action/commit/4766fa8))
* update license dates ([89005bc](https://github.com/expo/expo-github-action/commit/89005bc))

### Other chores

* add linter and fix all files ([04cd479](https://github.com/expo/expo-github-action/commit/04cd479))
* add husky for repository deployments ([cec6e50](https://github.com/expo/expo-github-action/commit/cec6e50))
* add all missing tests ([22df52e](https://github.com/expo/expo-github-action/commit/22df52e))


## [3.0.0](https://github.com/expo/expo-github-action/compare/2.3.2...3.0.0) (2019-07-23)

## Code refactors

* run travis in parallel for expo cli v2 and v3 ([882d5f9](https://github.com/expo/expo-github-action/commit/882d5f9))
* add latest expo-cli v3 but keep v2 images updated ([cd33736](https://github.com/expo/expo-github-action/commit/cd33736))


## [2.3.2](https://github.com/expo/expo-github-action/compare/2.3.1...2.3.2) (2019-05-09)

### Bug fixes

* use yarn to install expo cli globally ([9fd3635](https://github.com/expo/expo-github-action/commit/9fd3635))


## [2.3.1](https://github.com/expo/expo-github-action/compare/2.3.0...2.3.1) (2019-04-17)

### Bug fixes

* increase node memory limit to 4gb ([4c25ef9](https://github.com/expo/expo-github-action/commit/4c25ef9))

### Documentation changes

* add note about overwriting node options ([aa752f2](https://github.com/expo/expo-github-action/commit/aa752f2))
* add extra link to base image in description ([fa42241](https://github.com/expo/expo-github-action/commit/fa42241))
* rename build action to remove ambiguity with other examples ([92beb0f](https://github.com/expo/expo-github-action/commit/92beb0f))

### Other chores

* make travis build the action to double check the docker file ([698a1c6](https://github.com/expo/expo-github-action/commit/698a1c6))


## [2.3.0](https://github.com/expo/expo-github-action/compare/2.2.0...2.3.0) (2019-04-14)

### New features

* build docker base image from travis ci ([0ce8eff](https://github.com/expo/expo-github-action/commit/0ce8eff))

### Code refactors

* update base image labels ([4e2fd4d](https://github.com/expo/expo-github-action/commit/4e2fd4d))
* remove unofficial from the name ([b8ec502](https://github.com/expo/expo-github-action/commit/b8ec502))
* remove deprecated subactions ([0cfae07](https://github.com/expo/expo-github-action/commit/0cfae07))

### Documentation changes

* add scheduled builds info and update examples ([a801b83](https://github.com/expo/expo-github-action/commit/a801b83))
* add travis link to base image builds ([2c88f88](https://github.com/expo/expo-github-action/commit/2c88f88))
* add 650 industries aka expo as license holder ([3f55e8c](https://github.com/expo/expo-github-action/commit/3f55e8c))
* add 650 industries aka expo as license holder ([fe86cd6](https://github.com/expo/expo-github-action/commit/fe86cd6))
* update references to action repository ([617ebf8](https://github.com/expo/expo-github-action/commit/617ebf8))
* use latest npm action because of an install failure ([e6a3b5c](https://github.com/expo/expo-github-action/commit/e6a3b5c))


## [2.2.0](https://github.com/expo/expo-github-action/compare/2.1.0...2.2.0) (2019-04-10)

### Code refactors

* use better expo cli variables prefix ([cd75584](https://github.com/expo/expo-github-action/commit/cd75584))

### Documentation changes

* pin actions to versions for future releases ([3c76843](https://github.com/expo/expo-github-action/commit/3c76843))


## [2.1.0](https://github.com/expo/expo-github-action/compare/2.0.0...2.1.0) (2019-04-10)

### Code refactors

* authenticate in main action if possible ([a401e30](https://github.com/expo/expo-github-action/commit/a401e30))
* remove extraneous commands from base image ([a90ce59](https://github.com/expo/expo-github-action/commit/a90ce59))

### Documentation changes

* add deprecation notice on all sub-actions ([b5a0311](https://github.com/expo/expo-github-action/commit/b5a0311))
* add examples and more contextual info ([9625bb1](https://github.com/expo/expo-github-action/commit/9625bb1))
* fix typo in documentation and use link references ([48bbaf3](https://github.com/expo/expo-github-action/commit/48bbaf3))
* update license to 2019 ([7596f6b](https://github.com/expo/expo-github-action/commit/7596f6b))

### Other chores

* add some issue templates to github ([9aec1f5](https://github.com/expo/expo-github-action/commit/9aec1f5))


## [2.0.0](https://github.com/expo/expo-github-action/compare/906c910...2.0.0) (2019-04-02)

### New features

* add basic ios build action ([3a81415](https://github.com/expo/expo-github-action/commit/3a81415))
* add basic web build action ([3d4bdb6](https://github.com/expo/expo-github-action/commit/3d4bdb6))
* add basic android build action ([9105177](https://github.com/expo/expo-github-action/commit/9105177))
* add new publish action ([56563f2](https://github.com/expo/expo-github-action/commit/56563f2))
* add login entrypoint ([252f16d](https://github.com/expo/expo-github-action/commit/252f16d))
* add github actions implemented image for expo cli ([864b9bb](https://github.com/expo/expo-github-action/commit/864b9bb))
* add base image with documentation and licenses ([c43e5c3](https://github.com/expo/expo-github-action/commit/c43e5c3))

### Code refactors

* tag all buid actions as unofficial for release ([ed597e5](https://github.com/expo/expo-github-action/commit/ed597e5))
* simplify publish action and remove extraneous entrypoint ([61d0c21](https://github.com/expo/expo-github-action/commit/61d0c21))
* tag all actions as unofficial for release to marketplace ([f56443a](https://github.com/expo/expo-github-action/commit/f56443a))
* expand existing login with documentation and proper icon ([d2e2a6d](https://github.com/expo/expo-github-action/commit/d2e2a6d))
* move cli to root as default ([4545e44](https://github.com/expo/expo-github-action/commit/4545e44))
* expand existing login with documentation and proper icon ([923ed34](https://github.com/expo/expo-github-action/commit/923ed34))
* remove third party notice until its updated ([f4fc39a](https://github.com/expo/expo-github-action/commit/f4fc39a))
* use full node version instead of alpine ([a019c94](https://github.com/expo/expo-github-action/commit/a019c94))

### Documentation changes

* add link to login from publish action ([5b7564c](https://github.com/expo/expo-github-action/commit/5b7564c))
* add custom cli command action ([4cf38f9](https://github.com/expo/expo-github-action/commit/4cf38f9))
* add do not use in production warning ([8291794](https://github.com/expo/expo-github-action/commit/8291794))
* add basic repository description ([906c910](https://github.com/expo/expo-github-action/commit/906c910))

### Other chores

* remove the cli from name ([ab9265b](https://github.com/expo/expo-github-action/commit/ab9265b))
