"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// keep track of the original one to revert the platform
const originalPlatform = process.platform;
/**
 * Change the node platform for testing purposes.
 * With this you can fake the `process.platform`.
 */
function setPlatform(platform) {
    Object.defineProperty(process, 'platform', { value: platform });
}
exports.setPlatform = setPlatform;
/**
 * Revert the platform to the original one.
 */
function resetPlatform() {
    setPlatform(originalPlatform);
}
exports.resetPlatform = resetPlatform;
