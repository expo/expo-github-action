"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const cache = __importStar(require("@actions/tool-cache"));
const path = __importStar(require("path"));
const registry = require('libnpm');
/**
 * Resolve the provided semver to exact version of `expo-cli`.
 * This uses the npm registry and accepts latest, dist-tags or version ranges.
 * It's used to determine the cached version of `expo-cli`.
 */
function resolve(version) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield registry.manifest(`expo-cli@${version}`)).version;
    });
}
exports.resolve = resolve;
/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
function install(version, packager) {
    return __awaiter(this, void 0, void 0, function* () {
        const exact = yield resolve(version);
        let root = yield fromCache(exact);
        if (!root) {
            root = yield fromPackager(exact, packager);
            yield toCache(exact, root);
        }
        return path.join(root, 'node_modules', '.bin');
    });
}
exports.install = install;
/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
function fromPackager(version, packager) {
    return __awaiter(this, void 0, void 0, function* () {
        const root = process.env['RUNNER_TEMP'] || '';
        const tool = yield io.which(packager);
        yield io.mkdirP(root);
        yield cli.exec(tool, ['add', `expo-cli@${version}`], { cwd: root });
        return root;
    });
}
exports.fromPackager = fromPackager;
/**
 * Get the path to the `expo-cli` from cache, if any.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
function fromCache(version) {
    return __awaiter(this, void 0, void 0, function* () {
        return cache.find('expo-cli', version);
    });
}
exports.fromCache = fromCache;
/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
function toCache(version, root) {
    return __awaiter(this, void 0, void 0, function* () {
        return cache.cacheDir(root, 'expo-cli', version);
    });
}
exports.toCache = toCache;
