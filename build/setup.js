function __swcpack_require__(mod) {
    function interop(obj) {
        if (obj && obj.__esModule) {
            return obj;
        } else {
            var newObj = {};
            if (obj != null) {
                for(var key in obj){
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};
                        if (desc.get || desc.set) {
                            Object.defineProperty(newObj, key, desc);
                        } else {
                            newObj[key] = obj[key];
                        }
                    }
                }
            }
            newObj.default = obj;
            return newObj;
        }
    }
    var cache;
    if (cache) {
        return cache;
    }
    var module = {
        exports: {}
    };
    mod(module, module.exports);
    cache = interop(module.exports);
    return cache;
}
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {};
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
var load = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.fromLocalCache = fromLocalCache;
    exports.toLocalCache = toLocalCache;
    exports.fromRemoteCache = fromRemoteCache;
    exports.toRemoteCache = toRemoteCache;
    var _cache = require("@actions/cache");
    var core = _interopRequireWildcard(require("@actions/core"));
    var toolCache = _interopRequireWildcard(require("@actions/tool-cache"));
    var _path = _interopRequireDefault(require("path"));
    var _os = _interopRequireDefault(require("os"));
    async function fromLocalCache(config) {
        return toolCache.find(config.package, config.version);
    }
    async function toLocalCache(root, config) {
        return toolCache.cacheDir(root, config.package, config.version);
    }
    async function fromRemoteCache(config) {
        // see: https://github.com/actions/toolkit/blob/8a4134761f09d0d97fb15f297705fd8644fef920/packages/tool-cache/src/tool-cache.ts#L401
        const target = _path.default.join(process.env['RUNNER_TOOL_CACHE'] || '', config.package, config.version, _os.default.arch());
        const cacheKey = config.cacheKey || getRemoteKey(config);
        try {
            // When running with nektos/act, or other custom environments, the cache might not be set up.
            const hit = await (0, _cache).restoreCache([
                target
            ], cacheKey);
            if (hit) return target;
        } catch (error) {
            if (!handleRemoteCacheError(error)) throw error;
        }
    }
    async function toRemoteCache(source, config) {
        const cacheKey = config.cacheKey || getRemoteKey(config);
        try {
            await (0, _cache).saveCache([
                source
            ], cacheKey);
        } catch (error) {
            if (!handleRemoteCacheError(error)) throw error;
        }
    }
    /**
 * Get the cache key to use when (re)storing the Expo CLI from remote cache.
 */ function getRemoteKey(config) {
        return `${config.package}-${process.platform}-${_os.default.arch()}-${config.packager}-${config.version}`;
    }
    /**
 * Handle any incoming errors from cache methods.
 * This can include actual errors like `ReserveCacheErrors` or unavailability errors.
 * When the error is handled, it MUST provide feedback for the developer.
 *
 * @returns If the error was handled properly.
 */ function handleRemoteCacheError(error) {
        const isReserveCacheError = error instanceof _cache.ReserveCacheError;
        const isCacheUnavailable = error.message.toLowerCase().includes('cache service url not found');
        if (isReserveCacheError || isCacheUnavailable) {
            core.warning('Skipping remote cache storage, encountered error:');
            core.warning(error.message);
            return true;
        }
        return false;
    }
});
var load1 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.install = install;
    exports.fromPackager = fromPackager;
    var core = _interopRequireWildcard(require("@actions/core"));
    var cli = _interopRequireWildcard(require("@actions/exec"));
    var io = _interopRequireWildcard(require("@actions/io"));
    var path = _interopRequireWildcard(require("path"));
    var _cache = load();
    async function install(config) {
        let root = await (0, _cache).fromLocalCache(config);
        if (!root && config.cache) root = await (0, _cache).fromRemoteCache(config);
        else core.info('Skipping remote cache, not enabled...');
        if (!root) {
            root = await fromPackager(config);
            root = await (0, _cache).toLocalCache(root, config);
            if (config.cache) await (0, _cache).toRemoteCache(root, config);
        }
        return path.join(root, 'node_modules', '.bin');
    }
    async function fromPackager(config) {
        const root = process.env['RUNNER_TEMP'] || '';
        const tool = await io.which(config.packager);
        await io.mkdirP(root);
        await cli.exec(tool, [
            'add',
            `${config.package}@${config.version}`
        ], {
            cwd: root
        });
        return root;
    }
});
var load2 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.resolveVersion = resolveVersion;
    var _exec = require("@actions/exec");
    async function resolveVersion(name, range) {
        let stdout = '';
        try {
            await (0, _exec).exec('npm', [
                'info',
                `${name}@${range}`,
                'version',
                '--json'
            ], {
                silent: true,
                listeners: {
                    stdout (data) {
                        stdout += data.toString();
                    }
                }
            });
        } catch (error) {
            throw new Error(`Could not resolve version "${range}" of "${name}", reason:\n${error.message || error}`);
        }
        // thanks npm, for returning a "x.x.x" json value...
        if (stdout.startsWith('"')) stdout = `[${stdout}]`;
        return JSON.parse(stdout).at(-1);
    }
});
var load3 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getBinaryName = getBinaryName;
    exports.maybeAuthenticate = maybeAuthenticate;
    exports.maybePatchWatchers = maybePatchWatchers;
    exports.maybeWarnForUpdate = maybeWarnForUpdate;
    exports.handleError = handleError;
    exports.performAction = performAction;
    var core = _interopRequireWildcard(require("@actions/core"));
    var cli = _interopRequireWildcard(require("@actions/exec"));
    var _semver = _interopRequireDefault(require("semver"));
    var _packager1 = load2();
    function getBinaryName(name, forWindows = false) {
        const bin = name.toLowerCase().replace('-cli', '');
        return forWindows ? `${bin}.cmd` : bin;
    }
    async function maybeAuthenticate(options = {}) {
        if (options.token) {
            if (options.cli) {
                const bin = getBinaryName(options.cli, process.platform === 'win32');
                await cli.exec(bin, [
                    'whoami'
                ], {
                    env: {
                        ...process.env,
                        EXPO_TOKEN: options.token
                    }
                });
            } else core.info("Skipping token validation: no CLI installed, can't run `whoami`.");
            return core.exportVariable('EXPO_TOKEN', options.token);
        }
        if (options.username || options.password) {
            if (options.cli !== 'expo-cli') return core.warning('Skipping authentication: only Expo CLI supports programmatic credentials, use `token` instead.');
            if (!options.username || !options.password) return core.info('Skipping authentication: `username` and/or `password` not set...');
            const bin = getBinaryName(options.cli, process.platform === 'win32');
            await cli.exec(bin, [
                'login',
                `--username=${options.username}`
            ], {
                env: {
                    ...process.env,
                    EXPO_CLI_PASSWORD: options.password
                }
            });
        }
        core.info('Skipping authentication: `token`, `username`, and/or `password` not set...');
    }
    async function maybePatchWatchers() {
        if (process.platform !== 'linux') return core.info('Skipping patch for watchers, not running on Linux...');
        core.info('Patching system watchers for the `ENOSPC` error...');
        try {
            // see https://github.com/expo/expo-cli/issues/277#issuecomment-452685177
            await cli.exec('sudo sysctl fs.inotify.max_user_instances=524288');
            await cli.exec('sudo sysctl fs.inotify.max_user_watches=524288');
            await cli.exec('sudo sysctl fs.inotify.max_queued_events=524288');
            await cli.exec('sudo sysctl -p');
        } catch  {
            core.warning("Looks like we can't patch watchers/inotify limits, you might encouter the `ENOSPC` error.");
            core.warning('For more info, https://github.com/expo/expo-github-action/issues/20');
        }
    }
    async function maybeWarnForUpdate(name) {
        const binaryName = getBinaryName(name);
        const latest = await (0, _packager1).resolveVersion(name, 'latest');
        const current = await (0, _packager1).resolveVersion(name, core.getInput(`${getBinaryName(name)}-version`) || 'latest');
        if (_semver.default.diff(latest, current) === 'major') {
            core.warning(`There is a new major version available of the Expo CLI (${latest})`);
            core.warning(`If you run into issues, try upgrading your workflow to "${binaryName}-version: ${_semver.default.major(latest)}.x"`);
        }
    }
    async function handleError(name, error) {
        try {
            await maybeWarnForUpdate(name);
        } catch  {
        // If this fails, ignore it
        }
        core.setFailed(error);
    }
    function performAction(action) {
        if (process.env.JEST_WORKER_ID) return Promise.resolve(null);
        return action();
    }
});
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setupAction = setupAction;
var _core = require("@actions/core");
var _install = load1();
var _packager = load2();
var tools = _interopRequireWildcard(load3());
// Auto-execute in GitHub actions
tools.performAction(setupAction);
async function setupAction() {
    const expoVersion = await installCli('expo-cli');
    const easVersion = await installCli('eas-cli');
    await (0, _core).group('Checking current authenticated account', ()=>tools.maybeAuthenticate({
            cli: expoVersion ? 'expo-cli' : easVersion ? 'eas-cli' : undefined,
            token: (0, _core).getInput('token') || undefined,
            username: (0, _core).getInput('username') || undefined,
            password: (0, _core).getInput('password') || undefined
        })
    );
    if (!(0, _core).getInput('patch-watchers') || (0, _core).getBooleanInput('patch-watchers') !== false) await (0, _core).group('Patching system watchers for the `ENOSPC` error', ()=>tools.maybePatchWatchers()
    );
}
async function installCli(name) {
    const shortName = tools.getBinaryName(name);
    const inputVersion = (0, _core).getInput(`${shortName}-version`);
    const packager = (0, _core).getInput('packager') || 'yarn';
    if (!inputVersion) return (0, _core).info(`Skipping installation of ${name}, \`${shortName}-version\` not provided.`);
    const version = await (0, _packager).resolveVersion(name, inputVersion);
    const cache = (0, _core).getBooleanInput(`${shortName}-cache`);
    try {
        const path = await (0, _core).group(cache ? `Installing ${name} (${version}) from cache or with ${packager}` : `Installing ${name} (${version}) with ${packager}`, ()=>(0, _install).install({
                packager,
                version,
                cache,
                package: name,
                cacheKey: (0, _core).getInput(`${shortName}-cache-key`) || undefined
            })
        );
        (0, _core).addPath(path);
    } catch (error) {
        tools.handleError(name, error);
    }
    return version;
}
