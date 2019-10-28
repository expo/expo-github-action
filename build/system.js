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
const core = __importStar(require("@actions/core"));
const cli = __importStar(require("@actions/exec"));
/**
 * Try to patch the default watcher/inotify limit.
 * This is a limitation from GitHub Actions and might be an issue in some Expo projects.
 * It sets the system's `fs.inotify` limits to a more sensible setting.
 *
 * @see https://github.com/expo/expo-github-action/issues/20
 */
function patchWatchers() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.platform !== 'linux') {
            return core.debug('Skipping patch for watchers, not running on Linux...');
        }
        core.debug('Patching system watchers for the `ENOSPC` error...');
        try {
            // see https://github.com/expo/expo-cli/issues/277#issuecomment-452685177
            yield cli.exec('sudo sysctl fs.inotify.max_user_instances=524288');
            yield cli.exec('sudo sysctl fs.inotify.max_user_watches=524288');
            yield cli.exec('sudo sysctl fs.inotify.max_queued_events=524288');
            yield cli.exec('sudo sysctl -p');
        }
        catch (_a) {
            core.warning('Looks like we can\'t patch watchers/inotify limits, you might encouter the `ENOSPC` error.');
            core.warning('For more info, https://github.com/expo/expo-github-action/issues/20');
        }
    });
}
exports.patchWatchers = patchWatchers;
