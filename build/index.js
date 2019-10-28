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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const expo_1 = require("./expo");
const install_1 = require("./install");
const system_1 = require("./system");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = yield install_1.install(core_1.getInput('expo-version') || 'latest', core_1.getInput('expo-packager') || 'npm');
        core_1.addPath(path);
        yield expo_1.authenticate(core_1.getInput('expo-username'), core_1.getInput('expo-password'));
        const shouldPatchWatchers = core_1.getInput('expo-patch-watchers') || 'true';
        if (shouldPatchWatchers !== 'false') {
            yield system_1.patchWatchers();
        }
    });
}
exports.run = run;
run();
