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
    // Note: this is the semver.org version of the spec that it implements
    // Not necessarily the package version of this code.
    const SEMVER_SPEC_VERSION = '2.0.0';
    const MAX_LENGTH = 256;
    const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */ 9007199254740991;
    // Max safe segment length for coercion.
    const MAX_SAFE_COMPONENT_LENGTH = 16;
    module.exports = {
        SEMVER_SPEC_VERSION,
        MAX_LENGTH,
        MAX_SAFE_INTEGER,
        MAX_SAFE_COMPONENT_LENGTH
    };
});
var load4 = __swcpack_require__.bind(void 0, function(module, exports) {
    const debug = typeof process === 'object' && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args)=>console.error('SEMVER', ...args)
     : ()=>{};
    module.exports = debug;
});
var load5 = __swcpack_require__.bind(void 0, function(module, exports) {
    const { MAX_SAFE_COMPONENT_LENGTH  } = load3();
    const debug = load4();
    exports = module.exports = {};
    // The actual regexps go on exports.re
    const re = exports.re = [];
    const src = exports.src = [];
    const t = exports.t = {};
    let R = 0;
    const createToken = (name, value, isGlobal)=>{
        const index = R++;
        debug(index, value);
        t[name] = index;
        src[index] = value;
        re[index] = new RegExp(value, isGlobal ? 'g' : undefined);
    };
    // The following Regular Expressions can be used for tokenizing,
    // validating, and parsing SemVer version strings.
    // ## Numeric Identifier
    // A single `0`, or a non-zero digit followed by zero or more digits.
    createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*');
    createToken('NUMERICIDENTIFIERLOOSE', '[0-9]+');
    // ## Non-numeric Identifier
    // Zero or more digits, followed by a letter or hyphen, and then zero or
    // more letters, digits, or hyphens.
    createToken('NONNUMERICIDENTIFIER', '\\d*[a-zA-Z-][a-zA-Z0-9-]*');
    // ## Main Version
    // Three dot-separated numeric identifiers.
    createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` + `(${src[t.NUMERICIDENTIFIER]})\\.` + `(${src[t.NUMERICIDENTIFIER]})`);
    createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` + `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` + `(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    // ## Pre-release Version Identifier
    // A numeric identifier, or a non-numeric identifier.
    createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NUMERICIDENTIFIER]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NUMERICIDENTIFIERLOOSE]}|${src[t.NONNUMERICIDENTIFIER]})`);
    // ## Pre-release Version
    // Hyphen, followed by one or more dot-separated pre-release version
    // identifiers.
    createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    // ## Build Metadata Identifier
    // Any combination of digits, letters, or hyphens.
    createToken('BUILDIDENTIFIER', '[0-9A-Za-z-]+');
    // ## Build Metadata
    // Plus sign, followed by one or more period-separated build metadata
    // identifiers.
    createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    // ## Full Version String
    // A main version, followed optionally by a pre-release version and
    // build metadata.
    // Note that the only major, minor, patch, and pre-release sections of
    // the version string are capturing groups.  The build metadata is not a
    // capturing group, because it should not ever be used in version
    // comparison.
    createToken('FULLPLAIN', `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken('FULL', `^${src[t.FULLPLAIN]}$`);
    // like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
    // also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
    // common in the npm registry.
    createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`);
    createToken('GTLT', '((?:<|>)?=?)');
    // Something like "2.*" or "1.2.x".
    // Note that "x.x" is a valid xRange identifer, meaning "any version"
    // Only the first item is strictly required.
    createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` + `(?:\\.(${src[t.XRANGEIDENTIFIER]})` + `(?:\\.(${src[t.XRANGEIDENTIFIER]})` + `(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?` + `)?)?`);
    createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?` + `)?)?`);
    createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    // Coercion.
    // Extract anything that could conceivably be a part of a valid semver
    createToken('COERCE', `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})` + `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` + `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` + `(?:$|[^\\d])`);
    createToken('COERCERTL', src[t.COERCE], true);
    // Tilde ranges.
    // Meaning is "reasonably at or greater than"
    createToken('LONETILDE', '(?:~>?)');
    createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = '$1~';
    createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    // Caret ranges.
    // Meaning is "at least and backwards compatible with"
    createToken('LONECARET', '(?:\\^)');
    createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = '$1^';
    createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    // A simple gt/lt/eq thing, or just "" to indicate "any version"
    createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    // An expression to strip any whitespace between the gtlt and the thing
    // it modifies, so that `> 1.2.3` ==> `>1.2.3`
    createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = '$1$2$3';
    // Something like `1.2.3 - 1.2.4`
    // Note that these all use the loose form, because they'll be
    // checked against either the strict or loose comparator form
    // later.
    createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` + `\\s+-\\s+` + `(${src[t.XRANGEPLAIN]})` + `\\s*$`);
    createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` + `\\s+-\\s+` + `(${src[t.XRANGEPLAINLOOSE]})` + `\\s*$`);
    // Star ranges basically just allow anything at all.
    createToken('STAR', '(<|>)?=?\\s*\\*');
    // >=0.0.0 is like a star
    createToken('GTE0', '^\\s*>=\\s*0.0.0\\s*$');
    createToken('GTE0PRE', '^\\s*>=\\s*0.0.0-0\\s*$');
});
var load6 = __swcpack_require__.bind(void 0, function(module, exports) {
    // parse out just the options we care about so we always get a consistent
    // obj with keys in a consistent order.
    const opts = [
        'includePrerelease',
        'loose',
        'rtl'
    ];
    const parseOptions = (options1)=>!options1 ? {} : typeof options1 !== 'object' ? {
            loose: true
        } : opts.filter((k)=>options1[k]
        ).reduce((options, k)=>{
            options[k] = true;
            return options;
        }, {})
    ;
    module.exports = parseOptions;
});
var load7 = __swcpack_require__.bind(void 0, function(module, exports) {
    const numeric = /^[0-9]+$/;
    const compareIdentifiers = (a, b)=>{
        const anum = numeric.test(a);
        const bnum = numeric.test(b);
        if (anum && bnum) {
            a = +a;
            b = +b;
        }
        return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    const rcompareIdentifiers = (a, b)=>compareIdentifiers(b, a)
    ;
    module.exports = {
        compareIdentifiers,
        rcompareIdentifiers
    };
});
var load8 = __swcpack_require__.bind(void 0, function(module, exports) {
    const debug = load4();
    const { MAX_LENGTH , MAX_SAFE_INTEGER  } = load3();
    const { re , t  } = load5();
    const parseOptions = load6();
    const { compareIdentifiers  } = load7();
    class SemVer {
        constructor(version, options){
            options = parseOptions(options);
            if (version instanceof SemVer) {
                if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
                else version = version.version;
            } else if (typeof version !== 'string') throw new TypeError(`Invalid Version: ${version}`);
            if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
            debug('SemVer', version, options);
            this.options = options;
            this.loose = !!options.loose;
            // this isn't actually relevant for versions, but keep it so that we
            // don't run into trouble passing this.options around.
            this.includePrerelease = !!options.includePrerelease;
            const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
            if (!m) throw new TypeError(`Invalid Version: ${version}`);
            this.raw = version;
            // these are actually numbers
            this.major = +m[1];
            this.minor = +m[2];
            this.patch = +m[3];
            if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError('Invalid major version');
            if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError('Invalid minor version');
            if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError('Invalid patch version');
            // numberify any prerelease numeric ids
            if (!m[4]) this.prerelease = [];
            else this.prerelease = m[4].split('.').map((id)=>{
                if (/^[0-9]+$/.test(id)) {
                    const num = +id;
                    if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
                }
                return id;
            });
            this.build = m[5] ? m[5].split('.') : [];
            this.format();
        }
        format() {
            this.version = `${this.major}.${this.minor}.${this.patch}`;
            if (this.prerelease.length) this.version += `-${this.prerelease.join('.')}`;
            return this.version;
        }
        toString() {
            return this.version;
        }
        compare(other) {
            debug('SemVer.compare', this.version, this.options, other);
            if (!(other instanceof SemVer)) {
                if (typeof other === 'string' && other === this.version) return 0;
                other = new SemVer(other, this.options);
            }
            if (other.version === this.version) return 0;
            return this.compareMain(other) || this.comparePre(other);
        }
        compareMain(other) {
            if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
            return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
        }
        comparePre(other) {
            if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
            // NOT having a prerelease is > having one
            if (this.prerelease.length && !other.prerelease.length) return -1;
            else if (!this.prerelease.length && other.prerelease.length) return 1;
            else if (!this.prerelease.length && !other.prerelease.length) return 0;
            let i = 0;
            do {
                const a = this.prerelease[i];
                const b = other.prerelease[i];
                debug('prerelease compare', i, a, b);
                if (a === undefined && b === undefined) return 0;
                else if (b === undefined) return 1;
                else if (a === undefined) return -1;
                else if (a === b) continue;
                else return compareIdentifiers(a, b);
            }while (++i)
        }
        compareBuild(other) {
            if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
            let i = 0;
            do {
                const a = this.build[i];
                const b = other.build[i];
                debug('prerelease compare', i, a, b);
                if (a === undefined && b === undefined) return 0;
                else if (b === undefined) return 1;
                else if (a === undefined) return -1;
                else if (a === b) continue;
                else return compareIdentifiers(a, b);
            }while (++i)
        }
        // preminor will bump the version up to the next minor release, and immediately
        // down to pre-release. premajor and prepatch work the same way.
        inc(release, identifier) {
            switch(release){
                case 'premajor':
                    this.prerelease.length = 0;
                    this.patch = 0;
                    this.minor = 0;
                    this.major++;
                    this.inc('pre', identifier);
                    break;
                case 'preminor':
                    this.prerelease.length = 0;
                    this.patch = 0;
                    this.minor++;
                    this.inc('pre', identifier);
                    break;
                case 'prepatch':
                    // If this is already a prerelease, it will bump to the next version
                    // drop any prereleases that might already exist, since they are not
                    // relevant at this point.
                    this.prerelease.length = 0;
                    this.inc('patch', identifier);
                    this.inc('pre', identifier);
                    break;
                // If the input is a non-prerelease version, this acts the same as
                // prepatch.
                case 'prerelease':
                    if (this.prerelease.length === 0) this.inc('patch', identifier);
                    this.inc('pre', identifier);
                    break;
                case 'major':
                    // If this is a pre-major version, bump up to the same major version.
                    // Otherwise increment major.
                    // 1.0.0-5 bumps to 1.0.0
                    // 1.1.0 bumps to 2.0.0
                    if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
                    this.minor = 0;
                    this.patch = 0;
                    this.prerelease = [];
                    break;
                case 'minor':
                    // If this is a pre-minor version, bump up to the same minor version.
                    // Otherwise increment minor.
                    // 1.2.0-5 bumps to 1.2.0
                    // 1.2.1 bumps to 1.3.0
                    if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
                    this.patch = 0;
                    this.prerelease = [];
                    break;
                case 'patch':
                    // If this is not a pre-release version, it will increment the patch.
                    // If it is a pre-release it will bump up to the same patch version.
                    // 1.2.0-5 patches to 1.2.0
                    // 1.2.0 patches to 1.2.1
                    if (this.prerelease.length === 0) this.patch++;
                    this.prerelease = [];
                    break;
                // This probably shouldn't be used publicly.
                // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
                case 'pre':
                    if (this.prerelease.length === 0) this.prerelease = [
                        0
                    ];
                    else {
                        let i = this.prerelease.length;
                        while(--i >= 0)if (typeof this.prerelease[i] === 'number') {
                            this.prerelease[i]++;
                            i = -2;
                        }
                        if (i === -1) // didn't increment anything
                        this.prerelease.push(0);
                    }
                    if (identifier) {
                        // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
                        // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
                        if (this.prerelease[0] === identifier) {
                            if (isNaN(this.prerelease[1])) this.prerelease = [
                                identifier,
                                0
                            ];
                        } else this.prerelease = [
                            identifier,
                            0
                        ];
                    }
                    break;
                default:
                    throw new Error(`invalid increment argument: ${release}`);
            }
            this.format();
            this.raw = this.version;
            return this;
        }
    }
    module.exports = SemVer;
});
var load9 = __swcpack_require__.bind(void 0, function(module, exports) {
    const { MAX_LENGTH  } = load3();
    const { re , t  } = load5();
    const SemVer = load8();
    const parseOptions = load6();
    const parse = (version, options)=>{
        options = parseOptions(options);
        if (version instanceof SemVer) return version;
        if (typeof version !== 'string') return null;
        if (version.length > MAX_LENGTH) return null;
        const r = options.loose ? re[t.LOOSE] : re[t.FULL];
        if (!r.test(version)) return null;
        try {
            return new SemVer(version, options);
        } catch (er) {
            return null;
        }
    };
    module.exports = parse;
});
var load10 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load9();
    const valid = (version, options)=>{
        const v = parse(version, options);
        return v ? v.version : null;
    };
    module.exports = valid;
});
var load11 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load9();
    const clean = (version, options)=>{
        const s = parse(version.trim().replace(/^[=v]+/, ''), options);
        return s ? s.version : null;
    };
    module.exports = clean;
});
var load12 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const inc = (version, release, options, identifier)=>{
        if (typeof options === 'string') {
            identifier = options;
            options = undefined;
        }
        try {
            return new SemVer(version, options).inc(release, identifier).version;
        } catch (er) {
            return null;
        }
    };
    module.exports = inc;
});
var load13 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const compare = (a, b, loose)=>new SemVer(a, loose).compare(new SemVer(b, loose))
    ;
    module.exports = compare;
});
var load14 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const eq = (a, b, loose)=>compare(a, b, loose) === 0
    ;
    module.exports = eq;
});
var load15 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load9();
    const eq = load14();
    const diff = (version1, version2)=>{
        if (eq(version1, version2)) return null;
        else {
            const v1 = parse(version1);
            const v2 = parse(version2);
            const hasPre = v1.prerelease.length || v2.prerelease.length;
            const prefix = hasPre ? 'pre' : '';
            const defaultResult = hasPre ? 'prerelease' : '';
            for(const key in v1)if (key === 'major' || key === 'minor' || key === 'patch') {
                if (v1[key] !== v2[key]) return prefix + key;
            }
            return defaultResult // may be undefined
            ;
        }
    };
    module.exports = diff;
});
var load16 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const major = (a, loose)=>new SemVer(a, loose).major
    ;
    module.exports = major;
});
var load17 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const minor = (a, loose)=>new SemVer(a, loose).minor
    ;
    module.exports = minor;
});
var load18 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const patch = (a, loose)=>new SemVer(a, loose).patch
    ;
    module.exports = patch;
});
var load19 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load9();
    const prerelease = (version, options)=>{
        const parsed = parse(version, options);
        return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
});
var load20 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const rcompare = (a, b, loose)=>compare(b, a, loose)
    ;
    module.exports = rcompare;
});
var load21 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const compareLoose = (a, b)=>compare(a, b, true)
    ;
    module.exports = compareLoose;
});
var load22 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const compareBuild = (a, b, loose)=>{
        const versionA = new SemVer(a, loose);
        const versionB = new SemVer(b, loose);
        return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
});
var load23 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compareBuild = load22();
    const sort = (list, loose)=>list.sort((a, b)=>compareBuild(a, b, loose)
        )
    ;
    module.exports = sort;
});
var load24 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compareBuild = load22();
    const rsort = (list, loose)=>list.sort((a, b)=>compareBuild(b, a, loose)
        )
    ;
    module.exports = rsort;
});
var load25 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const gt = (a, b, loose)=>compare(a, b, loose) > 0
    ;
    module.exports = gt;
});
var load26 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const lt = (a, b, loose)=>compare(a, b, loose) < 0
    ;
    module.exports = lt;
});
var load27 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const neq = (a, b, loose)=>compare(a, b, loose) !== 0
    ;
    module.exports = neq;
});
var load28 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const gte = (a, b, loose)=>compare(a, b, loose) >= 0
    ;
    module.exports = gte;
});
var load29 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load13();
    const lte = (a, b, loose)=>compare(a, b, loose) <= 0
    ;
    module.exports = lte;
});
var load30 = __swcpack_require__.bind(void 0, function(module, exports) {
    const eq = load14();
    const neq = load27();
    const gt = load25();
    const gte = load28();
    const lt = load26();
    const lte = load29();
    const cmp = (a, op, b, loose)=>{
        switch(op){
            case '===':
                if (typeof a === 'object') a = a.version;
                if (typeof b === 'object') b = b.version;
                return a === b;
            case '!==':
                if (typeof a === 'object') a = a.version;
                if (typeof b === 'object') b = b.version;
                return a !== b;
            case '':
            case '=':
            case '==':
                return eq(a, b, loose);
            case '!=':
                return neq(a, b, loose);
            case '>':
                return gt(a, b, loose);
            case '>=':
                return gte(a, b, loose);
            case '<':
                return lt(a, b, loose);
            case '<=':
                return lte(a, b, loose);
            default:
                throw new TypeError(`Invalid operator: ${op}`);
        }
    };
    module.exports = cmp;
});
var load31 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const parse = load9();
    const { re , t  } = load5();
    const coerce = (version, options)=>{
        if (version instanceof SemVer) return version;
        if (typeof version === 'number') version = String(version);
        if (typeof version !== 'string') return null;
        options = options || {};
        let match = null;
        if (!options.rtl) match = version.match(re[t.COERCE]);
        else {
            // Find the right-most coercible string that does not share
            // a terminus with a more left-ward coercible string.
            // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
            //
            // Walk through the string checking with a /g regexp
            // Manually set the index so as to pick up overlapping matches.
            // Stop when we get a match that ends at the string end, since no
            // coercible string can be more right-ward without the same terminus.
            let next;
            while((next = re[t.COERCERTL].exec(version)) && (!match || match.index + match[0].length !== version.length)){
                if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
                re[t.COERCERTL].lastIndex = next.index + next[1].length + next[2].length;
            }
            // leave it in a clean state
            re[t.COERCERTL].lastIndex = -1;
        }
        if (match === null) return null;
        return parse(`${match[2]}.${match[3] || '0'}.${match[4] || '0'}`, options);
    };
    module.exports = coerce;
});
var load32 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    module.exports = function(Yallist) {
        Yallist.prototype[Symbol.iterator] = function*() {
            for(let walker = this.head; walker; walker = walker.next)yield walker.value;
        };
    };
});
var load33 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    module.exports = Yallist;
    Yallist.Node = Node;
    Yallist.create = Yallist;
    function Yallist(list) {
        var self = this;
        if (!(self instanceof Yallist)) self = new Yallist();
        self.tail = null;
        self.head = null;
        self.length = 0;
        if (list && typeof list.forEach === 'function') list.forEach(function(item) {
            self.push(item);
        });
        else if (arguments.length > 0) for(var i = 0, l = arguments.length; i < l; i++)self.push(arguments[i]);
        return self;
    }
    Yallist.prototype.removeNode = function(node) {
        if (node.list !== this) throw new Error('removing node which does not belong to this list');
        var next = node.next;
        var prev = node.prev;
        if (next) next.prev = prev;
        if (prev) prev.next = next;
        if (node === this.head) this.head = next;
        if (node === this.tail) this.tail = prev;
        node.list.length--;
        node.next = null;
        node.prev = null;
        node.list = null;
        return next;
    };
    Yallist.prototype.unshiftNode = function(node) {
        if (node === this.head) return;
        if (node.list) node.list.removeNode(node);
        var head = this.head;
        node.list = this;
        node.next = head;
        if (head) head.prev = node;
        this.head = node;
        if (!this.tail) this.tail = node;
        this.length++;
    };
    Yallist.prototype.pushNode = function(node) {
        if (node === this.tail) return;
        if (node.list) node.list.removeNode(node);
        var tail = this.tail;
        node.list = this;
        node.prev = tail;
        if (tail) tail.next = node;
        this.tail = node;
        if (!this.head) this.head = node;
        this.length++;
    };
    Yallist.prototype.push = function() {
        for(var i = 0, l = arguments.length; i < l; i++)push(this, arguments[i]);
        return this.length;
    };
    Yallist.prototype.unshift = function() {
        for(var i = 0, l = arguments.length; i < l; i++)unshift(this, arguments[i]);
        return this.length;
    };
    Yallist.prototype.pop = function() {
        if (!this.tail) return undefined;
        var res = this.tail.value;
        this.tail = this.tail.prev;
        if (this.tail) this.tail.next = null;
        else this.head = null;
        this.length--;
        return res;
    };
    Yallist.prototype.shift = function() {
        if (!this.head) return undefined;
        var res = this.head.value;
        this.head = this.head.next;
        if (this.head) this.head.prev = null;
        else this.tail = null;
        this.length--;
        return res;
    };
    Yallist.prototype.forEach = function(fn, thisp) {
        thisp = thisp || this;
        for(var walker = this.head, i = 0; walker !== null; i++){
            fn.call(thisp, walker.value, i, this);
            walker = walker.next;
        }
    };
    Yallist.prototype.forEachReverse = function(fn, thisp) {
        thisp = thisp || this;
        for(var walker = this.tail, i = this.length - 1; walker !== null; i--){
            fn.call(thisp, walker.value, i, this);
            walker = walker.prev;
        }
    };
    Yallist.prototype.get = function(n) {
        for(var i = 0, walker = this.head; walker !== null && i < n; i++)// abort out of the list early if we hit a cycle
        walker = walker.next;
        if (i === n && walker !== null) return walker.value;
    };
    Yallist.prototype.getReverse = function(n) {
        for(var i = 0, walker = this.tail; walker !== null && i < n; i++)// abort out of the list early if we hit a cycle
        walker = walker.prev;
        if (i === n && walker !== null) return walker.value;
    };
    Yallist.prototype.map = function(fn, thisp) {
        thisp = thisp || this;
        var res = new Yallist();
        for(var walker = this.head; walker !== null;){
            res.push(fn.call(thisp, walker.value, this));
            walker = walker.next;
        }
        return res;
    };
    Yallist.prototype.mapReverse = function(fn, thisp) {
        thisp = thisp || this;
        var res = new Yallist();
        for(var walker = this.tail; walker !== null;){
            res.push(fn.call(thisp, walker.value, this));
            walker = walker.prev;
        }
        return res;
    };
    Yallist.prototype.reduce = function(fn, initial) {
        var acc;
        var walker = this.head;
        if (arguments.length > 1) acc = initial;
        else if (this.head) {
            walker = this.head.next;
            acc = this.head.value;
        } else throw new TypeError('Reduce of empty list with no initial value');
        for(var i = 0; walker !== null; i++){
            acc = fn(acc, walker.value, i);
            walker = walker.next;
        }
        return acc;
    };
    Yallist.prototype.reduceReverse = function(fn, initial) {
        var acc;
        var walker = this.tail;
        if (arguments.length > 1) acc = initial;
        else if (this.tail) {
            walker = this.tail.prev;
            acc = this.tail.value;
        } else throw new TypeError('Reduce of empty list with no initial value');
        for(var i = this.length - 1; walker !== null; i--){
            acc = fn(acc, walker.value, i);
            walker = walker.prev;
        }
        return acc;
    };
    Yallist.prototype.toArray = function() {
        var arr = new Array(this.length);
        for(var i = 0, walker = this.head; walker !== null; i++){
            arr[i] = walker.value;
            walker = walker.next;
        }
        return arr;
    };
    Yallist.prototype.toArrayReverse = function() {
        var arr = new Array(this.length);
        for(var i = 0, walker = this.tail; walker !== null; i++){
            arr[i] = walker.value;
            walker = walker.prev;
        }
        return arr;
    };
    Yallist.prototype.slice = function(from, to) {
        to = to || this.length;
        if (to < 0) to += this.length;
        from = from || 0;
        if (from < 0) from += this.length;
        var ret = new Yallist();
        if (to < from || to < 0) return ret;
        if (from < 0) from = 0;
        if (to > this.length) to = this.length;
        for(var i = 0, walker = this.head; walker !== null && i < from; i++)walker = walker.next;
        for(; walker !== null && i < to; i++, walker = walker.next)ret.push(walker.value);
        return ret;
    };
    Yallist.prototype.sliceReverse = function(from, to) {
        to = to || this.length;
        if (to < 0) to += this.length;
        from = from || 0;
        if (from < 0) from += this.length;
        var ret = new Yallist();
        if (to < from || to < 0) return ret;
        if (from < 0) from = 0;
        if (to > this.length) to = this.length;
        for(var i = this.length, walker = this.tail; walker !== null && i > to; i--)walker = walker.prev;
        for(; walker !== null && i > from; i--, walker = walker.prev)ret.push(walker.value);
        return ret;
    };
    Yallist.prototype.splice = function(start, deleteCount, ...nodes) {
        if (start > this.length) start = this.length - 1;
        if (start < 0) start = this.length + start;
        for(var i = 0, walker = this.head; walker !== null && i < start; i++)walker = walker.next;
        var ret = [];
        for(var i = 0; walker && i < deleteCount; i++){
            ret.push(walker.value);
            walker = this.removeNode(walker);
        }
        if (walker === null) walker = this.tail;
        if (walker !== this.head && walker !== this.tail) walker = walker.prev;
        for(var i = 0; i < nodes.length; i++)walker = insert(this, walker, nodes[i]);
        return ret;
    };
    Yallist.prototype.reverse = function() {
        var head = this.head;
        var tail = this.tail;
        for(var walker = head; walker !== null; walker = walker.prev){
            var p = walker.prev;
            walker.prev = walker.next;
            walker.next = p;
        }
        this.head = tail;
        this.tail = head;
        return this;
    };
    function insert(self, node, value) {
        var inserted = node === self.head ? new Node(value, null, node, self) : new Node(value, node, node.next, self);
        if (inserted.next === null) self.tail = inserted;
        if (inserted.prev === null) self.head = inserted;
        self.length++;
        return inserted;
    }
    function push(self, item) {
        self.tail = new Node(item, self.tail, null, self);
        if (!self.head) self.head = self.tail;
        self.length++;
    }
    function unshift(self, item) {
        self.head = new Node(item, null, self.head, self);
        if (!self.tail) self.tail = self.head;
        self.length++;
    }
    function Node(value, prev, next, list) {
        if (!(this instanceof Node)) return new Node(value, prev, next, list);
        this.list = list;
        this.value = value;
        if (prev) {
            prev.next = this;
            this.prev = prev;
        } else this.prev = null;
        if (next) {
            next.prev = this;
            this.next = next;
        } else this.next = null;
    }
    try {
        // add if support for Symbol.iterator is present
        load32()(Yallist);
    } catch (er) {}
});
var load34 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    // A linked list to keep track of recently-used-ness
    const Yallist = load33();
    const MAX = Symbol('max');
    const LENGTH = Symbol('length');
    const LENGTH_CALCULATOR = Symbol('lengthCalculator');
    const ALLOW_STALE = Symbol('allowStale');
    const MAX_AGE = Symbol('maxAge');
    const DISPOSE = Symbol('dispose');
    const NO_DISPOSE_ON_SET = Symbol('noDisposeOnSet');
    const LRU_LIST = Symbol('lruList');
    const CACHE = Symbol('cache');
    const UPDATE_AGE_ON_GET = Symbol('updateAgeOnGet');
    const naiveLength = ()=>1
    ;
    // lruList is a yallist where the head is the youngest
    // item, and the tail is the oldest.  the list contains the Hit
    // objects as the entries.
    // Each Hit object has a reference to its Yallist.Node.  This
    // never changes.
    //
    // cache is a Map (or PseudoMap) that matches the keys to
    // the Yallist.Node object.
    class LRUCache {
        constructor(options){
            if (typeof options === 'number') options = {
                max: options
            };
            if (!options) options = {};
            if (options.max && (typeof options.max !== 'number' || options.max < 0)) throw new TypeError('max must be a non-negative number');
            this[MAX] = options.max || Infinity;
            const lc = options.length || naiveLength;
            this[LENGTH_CALCULATOR] = typeof lc !== 'function' ? naiveLength : lc;
            this[ALLOW_STALE] = options.stale || false;
            if (options.maxAge && typeof options.maxAge !== 'number') throw new TypeError('maxAge must be a number');
            this[MAX_AGE] = options.maxAge || 0;
            this[DISPOSE] = options.dispose;
            this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
            this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
            this.reset();
        }
        // resize the cache when the max changes.
        set max(mL) {
            if (typeof mL !== 'number' || mL < 0) throw new TypeError('max must be a non-negative number');
            this[MAX] = mL || Infinity;
            trim(this);
        }
        get max() {
            return this[MAX];
        }
        set allowStale(allowStale) {
            this[ALLOW_STALE] = !!allowStale;
        }
        get allowStale() {
            return this[ALLOW_STALE];
        }
        set maxAge(mA) {
            if (typeof mA !== 'number') throw new TypeError('maxAge must be a non-negative number');
            this[MAX_AGE] = mA;
            trim(this);
        }
        get maxAge() {
            return this[MAX_AGE];
        }
        // resize the cache when the lengthCalculator changes.
        set lengthCalculator(lC) {
            if (typeof lC !== 'function') lC = naiveLength;
            if (lC !== this[LENGTH_CALCULATOR]) {
                this[LENGTH_CALCULATOR] = lC;
                this[LENGTH] = 0;
                this[LRU_LIST].forEach((hit)=>{
                    hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
                    this[LENGTH] += hit.length;
                });
            }
            trim(this);
        }
        get lengthCalculator() {
            return this[LENGTH_CALCULATOR];
        }
        get length() {
            return this[LENGTH];
        }
        get itemCount() {
            return this[LRU_LIST].length;
        }
        rforEach(fn, thisp) {
            thisp = thisp || this;
            for(let walker = this[LRU_LIST].tail; walker !== null;){
                const prev = walker.prev;
                forEachStep(this, fn, walker, thisp);
                walker = prev;
            }
        }
        forEach(fn, thisp) {
            thisp = thisp || this;
            for(let walker = this[LRU_LIST].head; walker !== null;){
                const next = walker.next;
                forEachStep(this, fn, walker, thisp);
                walker = next;
            }
        }
        keys() {
            return this[LRU_LIST].toArray().map((k)=>k.key
            );
        }
        values() {
            return this[LRU_LIST].toArray().map((k)=>k.value
            );
        }
        reset() {
            if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) this[LRU_LIST].forEach((hit)=>this[DISPOSE](hit.key, hit.value)
            );
            this[CACHE] = new Map() // hash of items by key
            ;
            this[LRU_LIST] = new Yallist() // list of items in order of use recency
            ;
            this[LENGTH] = 0 // length of items in the list
            ;
        }
        dump() {
            return this[LRU_LIST].map((hit)=>isStale(this, hit) ? false : {
                    k: hit.key,
                    v: hit.value,
                    e: hit.now + (hit.maxAge || 0)
                }
            ).toArray().filter((h)=>h
            );
        }
        dumpLru() {
            return this[LRU_LIST];
        }
        set(key, value, maxAge) {
            maxAge = maxAge || this[MAX_AGE];
            if (maxAge && typeof maxAge !== 'number') throw new TypeError('maxAge must be a number');
            const now = maxAge ? Date.now() : 0;
            const len = this[LENGTH_CALCULATOR](value, key);
            if (this[CACHE].has(key)) {
                if (len > this[MAX]) {
                    del(this, this[CACHE].get(key));
                    return false;
                }
                const node = this[CACHE].get(key);
                const item = node.value;
                // dispose of the old one before overwriting
                // split out into 2 ifs for better coverage tracking
                if (this[DISPOSE]) {
                    if (!this[NO_DISPOSE_ON_SET]) this[DISPOSE](key, item.value);
                }
                item.now = now;
                item.maxAge = maxAge;
                item.value = value;
                this[LENGTH] += len - item.length;
                item.length = len;
                this.get(key);
                trim(this);
                return true;
            }
            const hit = new Entry(key, value, len, now, maxAge);
            // oversized objects fall out of cache automatically.
            if (hit.length > this[MAX]) {
                if (this[DISPOSE]) this[DISPOSE](key, value);
                return false;
            }
            this[LENGTH] += hit.length;
            this[LRU_LIST].unshift(hit);
            this[CACHE].set(key, this[LRU_LIST].head);
            trim(this);
            return true;
        }
        has(key) {
            if (!this[CACHE].has(key)) return false;
            const hit = this[CACHE].get(key).value;
            return !isStale(this, hit);
        }
        get(key) {
            return get(this, key, true);
        }
        peek(key) {
            return get(this, key, false);
        }
        pop() {
            const node = this[LRU_LIST].tail;
            if (!node) return null;
            del(this, node);
            return node.value;
        }
        del(key) {
            del(this, this[CACHE].get(key));
        }
        load(arr) {
            // reset the cache
            this.reset();
            const now = Date.now();
            // A previous serialized cache has the most recent items first
            for(let l = arr.length - 1; l >= 0; l--){
                const hit = arr[l];
                const expiresAt = hit.e || 0;
                if (expiresAt === 0) // the item was created without expiration in a non aged cache
                this.set(hit.k, hit.v);
                else {
                    const maxAge = expiresAt - now;
                    // dont add already expired items
                    if (maxAge > 0) this.set(hit.k, hit.v, maxAge);
                }
            }
        }
        prune() {
            this[CACHE].forEach((value, key)=>get(this, key, false)
            );
        }
    }
    const get = (self, key, doUse)=>{
        const node = self[CACHE].get(key);
        if (node) {
            const hit = node.value;
            if (isStale(self, hit)) {
                del(self, node);
                if (!self[ALLOW_STALE]) return undefined;
            } else if (doUse) {
                if (self[UPDATE_AGE_ON_GET]) node.value.now = Date.now();
                self[LRU_LIST].unshiftNode(node);
            }
            return hit.value;
        }
    };
    const isStale = (self, hit)=>{
        if (!hit || !hit.maxAge && !self[MAX_AGE]) return false;
        const diff = Date.now() - hit.now;
        return hit.maxAge ? diff > hit.maxAge : self[MAX_AGE] && diff > self[MAX_AGE];
    };
    const trim = (self)=>{
        if (self[LENGTH] > self[MAX]) for(let walker = self[LRU_LIST].tail; self[LENGTH] > self[MAX] && walker !== null;){
            // We know that we're about to delete this one, and also
            // what the next least recently used key will be, so just
            // go ahead and set it now.
            const prev = walker.prev;
            del(self, walker);
            walker = prev;
        }
    };
    const del = (self, node)=>{
        if (node) {
            const hit = node.value;
            if (self[DISPOSE]) self[DISPOSE](hit.key, hit.value);
            self[LENGTH] -= hit.length;
            self[CACHE].delete(hit.key);
            self[LRU_LIST].removeNode(node);
        }
    };
    class Entry {
        constructor(key, value, length, now, maxAge){
            this.key = key;
            this.value = value;
            this.length = length;
            this.now = now;
            this.maxAge = maxAge || 0;
        }
    }
    const forEachStep = (self, fn, node, thisp)=>{
        let hit = node.value;
        if (isStale(self, hit)) {
            del(self, node);
            if (!self[ALLOW_STALE]) hit = undefined;
        }
        if (hit) fn.call(thisp, hit.value, hit.key, self);
    };
    module.exports = LRUCache;
});
var load35 = __swcpack_require__.bind(void 0, function(module, exports) {
    const ANY = Symbol('SemVer ANY');
    // hoisted class for cyclic dependency
    class Comparator {
        static get ANY() {
            return ANY;
        }
        constructor(comp, options){
            options = parseOptions(options);
            if (comp instanceof Comparator) {
                if (comp.loose === !!options.loose) return comp;
                else comp = comp.value;
            }
            debug('comparator', comp, options);
            this.options = options;
            this.loose = !!options.loose;
            this.parse(comp);
            if (this.semver === ANY) this.value = '';
            else this.value = this.operator + this.semver.version;
            debug('comp', this);
        }
        parse(comp) {
            const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
            const m = comp.match(r);
            if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
            this.operator = m[1] !== undefined ? m[1] : '';
            if (this.operator === '=') this.operator = '';
            // if it literally is just '>' or '' then allow anything.
            if (!m[2]) this.semver = ANY;
            else this.semver = new SemVer(m[2], this.options.loose);
        }
        toString() {
            return this.value;
        }
        test(version) {
            debug('Comparator.test', version, this.options.loose);
            if (this.semver === ANY || version === ANY) return true;
            if (typeof version === 'string') try {
                version = new SemVer(version, this.options);
            } catch (er) {
                return false;
            }
            return cmp(version, this.operator, this.semver, this.options);
        }
        intersects(comp, options) {
            if (!(comp instanceof Comparator)) throw new TypeError('a Comparator is required');
            if (!options || typeof options !== 'object') options = {
                loose: !!options,
                includePrerelease: false
            };
            if (this.operator === '') {
                if (this.value === '') return true;
                return new Range(comp.value, options).test(this.value);
            } else if (comp.operator === '') {
                if (comp.value === '') return true;
                return new Range(this.value, options).test(comp.semver);
            }
            const sameDirectionIncreasing = (this.operator === '>=' || this.operator === '>') && (comp.operator === '>=' || comp.operator === '>');
            const sameDirectionDecreasing = (this.operator === '<=' || this.operator === '<') && (comp.operator === '<=' || comp.operator === '<');
            const sameSemVer = this.semver.version === comp.semver.version;
            const differentDirectionsInclusive = (this.operator === '>=' || this.operator === '<=') && (comp.operator === '>=' || comp.operator === '<=');
            const oppositeDirectionsLessThan = cmp(this.semver, '<', comp.semver, options) && (this.operator === '>=' || this.operator === '>') && (comp.operator === '<=' || comp.operator === '<');
            const oppositeDirectionsGreaterThan = cmp(this.semver, '>', comp.semver, options) && (this.operator === '<=' || this.operator === '<') && (comp.operator === '>=' || comp.operator === '>');
            return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
        }
    }
    module.exports = Comparator;
    const parseOptions = load6();
    const { re , t  } = load5();
    const cmp = load30();
    const debug = load4();
    const SemVer = load8();
    const Range = load36();
});
var load36 = __swcpack_require__.bind(void 0, function(module, exports) {
    // hoisted class for cyclic dependency
    class Range {
        constructor(range1, options){
            options = parseOptions(options);
            if (range1 instanceof Range) {
                if (range1.loose === !!options.loose && range1.includePrerelease === !!options.includePrerelease) return range1;
                else return new Range(range1.raw, options);
            }
            if (range1 instanceof Comparator) {
                // just put it in the set and return
                this.raw = range1.value;
                this.set = [
                    [
                        range1
                    ]
                ];
                this.format();
                return this;
            }
            this.options = options;
            this.loose = !!options.loose;
            this.includePrerelease = !!options.includePrerelease;
            // First, split based on boolean or ||
            this.raw = range1;
            this.set = range1.split(/\s*\|\|\s*/)// map the range to a 2d array of comparators
            .map((range)=>this.parseRange(range.trim())
            )// throw out any comparator lists that are empty
            // this generally means that it was not a valid range, which is allowed
            // in loose mode, but will still throw if the WHOLE range is invalid.
            .filter((c)=>c.length
            );
            if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${range1}`);
            // if we have any that are not the null set, throw out null sets.
            if (this.set.length > 1) {
                // keep the first one, in case they're all null sets
                const first = this.set[0];
                this.set = this.set.filter((c)=>!isNullSet(c[0])
                );
                if (this.set.length === 0) this.set = [
                    first
                ];
                else if (this.set.length > 1) {
                    // if we have any that are *, then the range is just *
                    for (const c of this.set)if (c.length === 1 && isAny(c[0])) {
                        this.set = [
                            c
                        ];
                        break;
                    }
                }
            }
            this.format();
        }
        format() {
            this.range = this.set.map((comps)=>{
                return comps.join(' ').trim();
            }).join('||').trim();
            return this.range;
        }
        toString() {
            return this.range;
        }
        parseRange(range) {
            range = range.trim();
            // memoize range parsing for performance.
            // this is a very hot path, and fully deterministic.
            const memoOpts = Object.keys(this.options).join(',');
            const memoKey = `parseRange:${memoOpts}:${range}`;
            const cached = cache.get(memoKey);
            if (cached) return cached;
            const loose = this.options.loose;
            // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
            const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
            range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
            debug('hyphen replace', range);
            // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
            range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
            debug('comparator trim', range, re[t.COMPARATORTRIM]);
            // `~ 1.2.3` => `~1.2.3`
            range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
            // `^ 1.2.3` => `^1.2.3`
            range = range.replace(re[t.CARETTRIM], caretTrimReplace);
            // normalize spaces
            range = range.split(/\s+/).join(' ');
            // At this point, the range is completely trimmed and
            // ready to be split into comparators.
            const compRe = loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
            const rangeList = range.split(' ').map((comp)=>parseComparator(comp, this.options)
            ).join(' ').split(/\s+/)// >=0.0.0 is equivalent to *
            .map((comp)=>replaceGTE0(comp, this.options)
            )// in loose mode, throw out any that are not valid comparators
            .filter(this.options.loose ? (comp)=>!!comp.match(compRe)
             : ()=>true
            ).map((comp)=>new Comparator(comp, this.options)
            );
            rangeList.length;
            const rangeMap = new Map();
            for (const comp1 of rangeList){
                if (isNullSet(comp1)) return [
                    comp1
                ];
                rangeMap.set(comp1.value, comp1);
            }
            if (rangeMap.size > 1 && rangeMap.has('')) rangeMap.delete('');
            const result = [
                ...rangeMap.values()
            ];
            cache.set(memoKey, result);
            return result;
        }
        intersects(range, options) {
            if (!(range instanceof Range)) throw new TypeError('a Range is required');
            return this.set.some((thisComparators)=>{
                return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators)=>{
                    return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator)=>{
                        return rangeComparators.every((rangeComparator)=>{
                            return thisComparator.intersects(rangeComparator, options);
                        });
                    });
                });
            });
        }
        // if ANY of the sets match ALL of its comparators, then pass
        test(version) {
            if (!version) return false;
            if (typeof version === 'string') try {
                version = new SemVer(version, this.options);
            } catch (er) {
                return false;
            }
            for(let i = 0; i < this.set.length; i++){
                if (testSet(this.set[i], version, this.options)) return true;
            }
            return false;
        }
    }
    module.exports = Range;
    const LRU = load34();
    const cache = new LRU({
        max: 1000
    });
    const parseOptions = load6();
    const Comparator = load35();
    const debug = load4();
    const SemVer = load8();
    const { re , t , comparatorTrimReplace , tildeTrimReplace , caretTrimReplace  } = load5();
    const isNullSet = (c)=>c.value === '<0.0.0-0'
    ;
    const isAny = (c)=>c.value === ''
    ;
    // take a set of comparators and determine whether there
    // exists a version which can satisfy it
    const isSatisfiable = (comparators, options)=>{
        let result = true;
        const remainingComparators = comparators.slice();
        let testComparator = remainingComparators.pop();
        while(result && remainingComparators.length){
            result = remainingComparators.every((otherComparator)=>{
                return testComparator.intersects(otherComparator, options);
            });
            testComparator = remainingComparators.pop();
        }
        return result;
    };
    // comprised of xranges, tildes, stars, and gtlt's at this point.
    // already replaced the hyphen ranges
    // turn into a set of JUST comparators.
    const parseComparator = (comp, options)=>{
        debug('comp', comp, options);
        comp = replaceCarets(comp, options);
        debug('caret', comp);
        comp = replaceTildes(comp, options);
        debug('tildes', comp);
        comp = replaceXRanges(comp, options);
        debug('xrange', comp);
        comp = replaceStars(comp, options);
        debug('stars', comp);
        return comp;
    };
    const isX = (id)=>!id || id.toLowerCase() === 'x' || id === '*'
    ;
    // ~, ~> --> * (any, kinda silly)
    // ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
    // ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
    // ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
    // ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
    // ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
    const replaceTildes = (comp2, options)=>comp2.trim().split(/\s+/).map((comp)=>{
            return replaceTilde(comp, options);
        }).join(' ')
    ;
    const replaceTilde = (comp, options)=>{
        const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
        return comp.replace(r, (_, M, m, p, pr)=>{
            debug('tilde', comp, _, M, m, p, pr);
            let ret;
            if (isX(M)) ret = '';
            else if (isX(m)) ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
            else if (isX(p)) // ~1.2 == >=1.2.0 <1.3.0-0
            ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
            else if (pr) {
                debug('replaceTilde pr', pr);
                ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            } else // ~1.2.3 == >=1.2.3 <1.3.0-0
            ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            debug('tilde return', ret);
            return ret;
        });
    };
    // ^ --> * (any, kinda silly)
    // ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
    // ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
    // ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
    // ^1.2.3 --> >=1.2.3 <2.0.0-0
    // ^1.2.0 --> >=1.2.0 <2.0.0-0
    const replaceCarets = (comp3, options)=>comp3.trim().split(/\s+/).map((comp)=>{
            return replaceCaret(comp, options);
        }).join(' ')
    ;
    const replaceCaret = (comp, options)=>{
        debug('caret', comp, options);
        const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
        const z = options.includePrerelease ? '-0' : '';
        return comp.replace(r, (_, M, m, p, pr)=>{
            debug('caret', comp, _, M, m, p, pr);
            let ret;
            if (isX(M)) ret = '';
            else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
            else if (isX(p)) {
                if (M === '0') ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
                else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
            } else if (pr) {
                debug('replaceCaret pr', pr);
                if (M === '0') {
                    if (m === '0') ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
                    else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
                } else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
            } else {
                debug('no pr');
                if (M === '0') {
                    if (m === '0') ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
                    else ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
                } else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
            }
            debug('caret return', ret);
            return ret;
        });
    };
    const replaceXRanges = (comp4, options)=>{
        debug('replaceXRanges', comp4, options);
        return comp4.split(/\s+/).map((comp)=>{
            return replaceXRange(comp, options);
        }).join(' ');
    };
    const replaceXRange = (comp, options)=>{
        comp = comp.trim();
        const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
        return comp.replace(r, (ret, gtlt, M, m, p, pr)=>{
            debug('xRange', comp, ret, gtlt, M, m, p, pr);
            const xM = isX(M);
            const xm = xM || isX(m);
            const xp = xm || isX(p);
            const anyX = xp;
            if (gtlt === '=' && anyX) gtlt = '';
            // if we're including prereleases in the match, then we need
            // to fix this to -0, the lowest possible prerelease value
            pr = options.includePrerelease ? '-0' : '';
            if (xM) {
                if (gtlt === '>' || gtlt === '<') // nothing is allowed
                ret = '<0.0.0-0';
                else // nothing is forbidden
                ret = '*';
            } else if (gtlt && anyX) {
                // we know patch is an x, because we have any x at all.
                // replace X with 0
                if (xm) m = 0;
                p = 0;
                if (gtlt === '>') {
                    // >1 => >=2.0.0
                    // >1.2 => >=1.3.0
                    gtlt = '>=';
                    if (xm) {
                        M = +M + 1;
                        m = 0;
                        p = 0;
                    } else {
                        m = +m + 1;
                        p = 0;
                    }
                } else if (gtlt === '<=') {
                    // <=0.7.x is actually <0.8.0, since any 0.7.x should
                    // pass.  Similarly, <=7.x is actually <8.0.0, etc.
                    gtlt = '<';
                    if (xm) M = +M + 1;
                    else m = +m + 1;
                }
                if (gtlt === '<') pr = '-0';
                ret = `${gtlt + M}.${m}.${p}${pr}`;
            } else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
            else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
            debug('xRange return', ret);
            return ret;
        });
    };
    // Because * is AND-ed with everything else in the comparator,
    // and '' means "any version", just remove the *s entirely.
    const replaceStars = (comp, options)=>{
        debug('replaceStars', comp, options);
        // Looseness is ignored here.  star is always as loose as it gets!
        return comp.trim().replace(re[t.STAR], '');
    };
    const replaceGTE0 = (comp, options)=>{
        debug('replaceGTE0', comp, options);
        return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '');
    };
    // This function is passed to string.replace(re[t.HYPHENRANGE])
    // M, m, patch, prerelease, build
    // 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
    // 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
    // 1.2 - 3.4 => >=1.2.0 <3.5.0-0
    const hyphenReplace = (incPr)=>($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb)=>{
            if (isX(fM)) from = '';
            else if (isX(fm)) from = `>=${fM}.0.0${incPr ? '-0' : ''}`;
            else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`;
            else if (fpr) from = `>=${from}`;
            else from = `>=${from}${incPr ? '-0' : ''}`;
            if (isX(tM)) to = '';
            else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
            else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
            else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
            else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
            else to = `<=${to}`;
            return `${from} ${to}`.trim();
        }
    ;
    const testSet = (set, version, options)=>{
        for(let i = 0; i < set.length; i++){
            if (!set[i].test(version)) return false;
        }
        if (version.prerelease.length && !options.includePrerelease) {
            // Find the set of versions that are allowed to have prereleases
            // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
            // That should allow `1.2.3-pr.2` to pass.
            // However, `1.2.4-alpha.notready` should NOT be allowed,
            // even though it's within the range set by the comparators.
            for(let i = 0; i < set.length; i++){
                debug(set[i].semver);
                if (set[i].semver === Comparator.ANY) continue;
                if (set[i].semver.prerelease.length > 0) {
                    const allowed = set[i].semver;
                    if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
                }
            }
            // Version has a -pre, but it's not one of the ones we like.
            return false;
        }
        return true;
    };
});
var load37 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load36();
    const satisfies = (version, range, options)=>{
        try {
            range = new Range(range, options);
        } catch (er) {
            return false;
        }
        return range.test(version);
    };
    module.exports = satisfies;
});
var load38 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load36();
    // Mostly just for testing and legacy API reasons
    const toComparators = (range, options)=>new Range(range, options).set.map((comp)=>comp.map((c)=>c.value
            ).join(' ').trim().split(' ')
        )
    ;
    module.exports = toComparators;
});
var load39 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const Range = load36();
    const maxSatisfying = (versions, range, options)=>{
        let max = null;
        let maxSV = null;
        let rangeObj = null;
        try {
            rangeObj = new Range(range, options);
        } catch (er) {
            return null;
        }
        versions.forEach((v)=>{
            if (rangeObj.test(v)) // satisfies(v, range, options)
            {
                if (!max || maxSV.compare(v) === -1) {
                    // compare(max, v, true)
                    max = v;
                    maxSV = new SemVer(max, options);
                }
            }
        });
        return max;
    };
    module.exports = maxSatisfying;
});
var load40 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const Range = load36();
    const minSatisfying = (versions, range, options)=>{
        let min = null;
        let minSV = null;
        let rangeObj = null;
        try {
            rangeObj = new Range(range, options);
        } catch (er) {
            return null;
        }
        versions.forEach((v)=>{
            if (rangeObj.test(v)) // satisfies(v, range, options)
            {
                if (!min || minSV.compare(v) === 1) {
                    // compare(min, v, true)
                    min = v;
                    minSV = new SemVer(min, options);
                }
            }
        });
        return min;
    };
    module.exports = minSatisfying;
});
var load41 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const Range = load36();
    const gt = load25();
    const minVersion = (range, loose)=>{
        range = new Range(range, loose);
        let minver = new SemVer('0.0.0');
        if (range.test(minver)) return minver;
        minver = new SemVer('0.0.0-0');
        if (range.test(minver)) return minver;
        minver = null;
        for(let i = 0; i < range.set.length; ++i){
            const comparators = range.set[i];
            let setMin = null;
            comparators.forEach((comparator)=>{
                // Clone to avoid manipulating the comparator's semver object.
                const compver = new SemVer(comparator.semver.version);
                switch(comparator.operator){
                    case '>':
                        if (compver.prerelease.length === 0) compver.patch++;
                        else compver.prerelease.push(0);
                        compver.raw = compver.format();
                    /* fallthrough */ case '':
                    case '>=':
                        if (!setMin || gt(compver, setMin)) setMin = compver;
                        break;
                    case '<':
                    case '<=':
                        break;
                    /* istanbul ignore next */ default:
                        throw new Error(`Unexpected operation: ${comparator.operator}`);
                }
            });
            if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
        }
        if (minver && range.test(minver)) return minver;
        return null;
    };
    module.exports = minVersion;
});
var load42 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load36();
    const validRange = (range, options)=>{
        try {
            // Return '*' instead of '' so that truthiness works.
            // This will throw if it's invalid anyway
            return new Range(range, options).range || '*';
        } catch (er) {
            return null;
        }
    };
    module.exports = validRange;
});
var load43 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load8();
    const Comparator = load35();
    const { ANY  } = Comparator;
    const Range = load36();
    const satisfies = load37();
    const gt = load25();
    const lt = load26();
    const lte = load29();
    const gte = load28();
    const outside = (version, range, hilo, options)=>{
        version = new SemVer(version, options);
        range = new Range(range, options);
        let gtfn, ltefn, ltfn, comp, ecomp;
        switch(hilo){
            case '>':
                gtfn = gt;
                ltefn = lte;
                ltfn = lt;
                comp = '>';
                ecomp = '>=';
                break;
            case '<':
                gtfn = lt;
                ltefn = gte;
                ltfn = gt;
                comp = '<';
                ecomp = '<=';
                break;
            default:
                throw new TypeError('Must provide a hilo val of "<" or ">"');
        }
        // If it satisfies the range it is not outside
        if (satisfies(version, range, options)) return false;
        // From now on, variable terms are as if we're in "gtr" mode.
        // but note that everything is flipped for the "ltr" function.
        for(let i = 0; i < range.set.length; ++i){
            const comparators = range.set[i];
            let high = null;
            let low = null;
            comparators.forEach((comparator)=>{
                if (comparator.semver === ANY) comparator = new Comparator('>=0.0.0');
                high = high || comparator;
                low = low || comparator;
                if (gtfn(comparator.semver, high.semver, options)) high = comparator;
                else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
            });
            // If the edge version comparator has a operator then our version
            // isn't outside it
            if (high.operator === comp || high.operator === ecomp) return false;
            // If the lowest version comparator has an operator and our version
            // is less than it then it isn't higher than the range
            if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
            else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
        }
        return true;
    };
    module.exports = outside;
});
var load44 = __swcpack_require__.bind(void 0, function(module, exports) {
    // Determine if version is greater than all the versions possible in the range.
    const outside = load43();
    const gtr = (version, range, options)=>outside(version, range, '>', options)
    ;
    module.exports = gtr;
});
var load45 = __swcpack_require__.bind(void 0, function(module, exports) {
    const outside = load43();
    // Determine if version is less than all the versions possible in the range
    const ltr = (version, range, options)=>outside(version, range, '<', options)
    ;
    module.exports = ltr;
});
var load46 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load36();
    const intersects = (r1, r2, options)=>{
        r1 = new Range(r1, options);
        r2 = new Range(r2, options);
        return r1.intersects(r2);
    };
    module.exports = intersects;
});
var load47 = __swcpack_require__.bind(void 0, function(module, exports) {
    // given a set of versions and a range, create a "simplified" range
    // that includes the same versions that the original range does
    // If the original range is shorter than the simplified one, return that.
    const satisfies = load37();
    const compare = load13();
    module.exports = (versions, range, options)=>{
        const set = [];
        let min = null;
        let prev = null;
        const v = versions.sort((a, b)=>compare(a, b, options)
        );
        for (const version of v){
            const included = satisfies(version, range, options);
            if (included) {
                prev = version;
                if (!min) min = version;
            } else {
                if (prev) set.push([
                    min,
                    prev
                ]);
                prev = null;
                min = null;
            }
        }
        if (min) set.push([
            min,
            null
        ]);
        const ranges = [];
        for (const [min1, max] of set){
            if (min1 === max) ranges.push(min1);
            else if (!max && min1 === v[0]) ranges.push('*');
            else if (!max) ranges.push(`>=${min1}`);
            else if (min1 === v[0]) ranges.push(`<=${max}`);
            else ranges.push(`${min1} - ${max}`);
        }
        const simplified = ranges.join(' || ');
        const original = typeof range.raw === 'string' ? range.raw : String(range);
        return simplified.length < original.length ? simplified : range;
    };
});
var load48 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load36();
    const Comparator = load35();
    const { ANY  } = Comparator;
    const satisfies = load37();
    const compare = load13();
    // Complex range `r1 || r2 || ...` is a subset of `R1 || R2 || ...` iff:
    // - Every simple range `r1, r2, ...` is a null set, OR
    // - Every simple range `r1, r2, ...` which is not a null set is a subset of
    //   some `R1, R2, ...`
    //
    // Simple range `c1 c2 ...` is a subset of simple range `C1 C2 ...` iff:
    // - If c is only the ANY comparator
    //   - If C is only the ANY comparator, return true
    //   - Else if in prerelease mode, return false
    //   - else replace c with `[>=0.0.0]`
    // - If C is only the ANY comparator
    //   - if in prerelease mode, return true
    //   - else replace C with `[>=0.0.0]`
    // - Let EQ be the set of = comparators in c
    // - If EQ is more than one, return true (null set)
    // - Let GT be the highest > or >= comparator in c
    // - Let LT be the lowest < or <= comparator in c
    // - If GT and LT, and GT.semver > LT.semver, return true (null set)
    // - If any C is a = range, and GT or LT are set, return false
    // - If EQ
    //   - If GT, and EQ does not satisfy GT, return true (null set)
    //   - If LT, and EQ does not satisfy LT, return true (null set)
    //   - If EQ satisfies every C, return true
    //   - Else return false
    // - If GT
    //   - If GT.semver is lower than any > or >= comp in C, return false
    //   - If GT is >=, and GT.semver does not satisfy every C, return false
    //   - If GT.semver has a prerelease, and not in prerelease mode
    //     - If no C has a prerelease and the GT.semver tuple, return false
    // - If LT
    //   - If LT.semver is greater than any < or <= comp in C, return false
    //   - If LT is <=, and LT.semver does not satisfy every C, return false
    //   - If GT.semver has a prerelease, and not in prerelease mode
    //     - If no C has a prerelease and the LT.semver tuple, return false
    // - Else return true
    const subset = (sub, dom, options = {})=>{
        if (sub === dom) return true;
        sub = new Range(sub, options);
        dom = new Range(dom, options);
        let sawNonNull = false;
        OUTER: for (const simpleSub of sub.set){
            for (const simpleDom of dom.set){
                const isSub = simpleSubset(simpleSub, simpleDom, options);
                sawNonNull = sawNonNull || isSub !== null;
                if (isSub) continue OUTER;
            }
            // the null set is a subset of everything, but null simple ranges in
            // a complex range should be ignored.  so if we saw a non-null range,
            // then we know this isn't a subset, but if EVERY simple range was null,
            // then it is a subset.
            if (sawNonNull) return false;
        }
        return true;
    };
    const simpleSubset = (sub, dom, options)=>{
        if (sub === dom) return true;
        if (sub.length === 1 && sub[0].semver === ANY) {
            if (dom.length === 1 && dom[0].semver === ANY) return true;
            else if (options.includePrerelease) sub = [
                new Comparator('>=0.0.0-0')
            ];
            else sub = [
                new Comparator('>=0.0.0')
            ];
        }
        if (dom.length === 1 && dom[0].semver === ANY) {
            if (options.includePrerelease) return true;
            else dom = [
                new Comparator('>=0.0.0')
            ];
        }
        const eqSet = new Set();
        let gt, lt;
        for (const c of sub){
            if (c.operator === '>' || c.operator === '>=') gt = higherGT(gt, c, options);
            else if (c.operator === '<' || c.operator === '<=') lt = lowerLT(lt, c, options);
            else eqSet.add(c.semver);
        }
        if (eqSet.size > 1) return null;
        let gtltComp;
        if (gt && lt) {
            gtltComp = compare(gt.semver, lt.semver, options);
            if (gtltComp > 0) return null;
            else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<=')) return null;
        }
        // will iterate one or zero times
        for (const eq of eqSet){
            if (gt && !satisfies(eq, String(gt), options)) return null;
            if (lt && !satisfies(eq, String(lt), options)) return null;
            for (const c of dom){
                if (!satisfies(eq, String(c), options)) return false;
            }
            return true;
        }
        let higher, lower;
        let hasDomLT, hasDomGT;
        // if the subset has a prerelease, we need a comparator in the superset
        // with the same tuple and a prerelease, or it's not a subset
        let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
        let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
        // exception: <1.2.3-0 is the same as <1.2.3
        if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === '<' && needDomLTPre.prerelease[0] === 0) needDomLTPre = false;
        for (const c1 of dom){
            hasDomGT = hasDomGT || c1.operator === '>' || c1.operator === '>=';
            hasDomLT = hasDomLT || c1.operator === '<' || c1.operator === '<=';
            if (gt) {
                if (needDomGTPre) {
                    if (c1.semver.prerelease && c1.semver.prerelease.length && c1.semver.major === needDomGTPre.major && c1.semver.minor === needDomGTPre.minor && c1.semver.patch === needDomGTPre.patch) needDomGTPre = false;
                }
                if (c1.operator === '>' || c1.operator === '>=') {
                    higher = higherGT(gt, c1, options);
                    if (higher === c1 && higher !== gt) return false;
                } else if (gt.operator === '>=' && !satisfies(gt.semver, String(c1), options)) return false;
            }
            if (lt) {
                if (needDomLTPre) {
                    if (c1.semver.prerelease && c1.semver.prerelease.length && c1.semver.major === needDomLTPre.major && c1.semver.minor === needDomLTPre.minor && c1.semver.patch === needDomLTPre.patch) needDomLTPre = false;
                }
                if (c1.operator === '<' || c1.operator === '<=') {
                    lower = lowerLT(lt, c1, options);
                    if (lower === c1 && lower !== lt) return false;
                } else if (lt.operator === '<=' && !satisfies(lt.semver, String(c1), options)) return false;
            }
            if (!c1.operator && (lt || gt) && gtltComp !== 0) return false;
        }
        // if there was a < or >, and nothing in the dom, then must be false
        // UNLESS it was limited by another range in the other direction.
        // Eg, >1.0.0 <1.0.1 is still a subset of <2.0.0
        if (gt && hasDomLT && !lt && gtltComp !== 0) return false;
        if (lt && hasDomGT && !gt && gtltComp !== 0) return false;
        // we needed a prerelease range in a specific tuple, but didn't get one
        // then this isn't a subset.  eg >=1.2.3-pre is not a subset of >=1.0.0,
        // because it includes prereleases in the 1.2.3 tuple
        if (needDomGTPre || needDomLTPre) return false;
        return true;
    };
    // >=1.2.3 is lower than >1.2.3
    const higherGT = (a, b, options)=>{
        if (!a) return b;
        const comp = compare(a.semver, b.semver, options);
        return comp > 0 ? a : comp < 0 ? b : b.operator === '>' && a.operator === '>=' ? b : a;
    };
    // <=1.2.3 is higher than <1.2.3
    const lowerLT = (a, b, options)=>{
        if (!a) return b;
        const comp = compare(a.semver, b.semver, options);
        return comp < 0 ? a : comp > 0 ? b : b.operator === '<' && a.operator === '<=' ? b : a;
    };
    module.exports = subset;
});
var load49 = __swcpack_require__.bind(void 0, function(module, exports) {
    // just pre-load all the stuff that index.js lazily exports
    const internalRe = load5();
    module.exports = {
        re: internalRe.re,
        src: internalRe.src,
        tokens: internalRe.t,
        SEMVER_SPEC_VERSION: load3().SEMVER_SPEC_VERSION,
        SemVer: load8(),
        compareIdentifiers: load7().compareIdentifiers,
        rcompareIdentifiers: load7().rcompareIdentifiers,
        parse: load9(),
        valid: load10(),
        clean: load11(),
        inc: load12(),
        diff: load15(),
        major: load16(),
        minor: load17(),
        patch: load18(),
        prerelease: load19(),
        compare: load13(),
        rcompare: load20(),
        compareLoose: load21(),
        compareBuild: load22(),
        sort: load23(),
        rsort: load24(),
        gt: load25(),
        lt: load26(),
        eq: load14(),
        neq: load27(),
        gte: load28(),
        lte: load29(),
        cmp: load30(),
        coerce: load31(),
        Comparator: load35(),
        Range: load36(),
        satisfies: load37(),
        toComparators: load38(),
        maxSatisfying: load39(),
        minSatisfying: load40(),
        minVersion: load41(),
        validRange: load42(),
        outside: load43(),
        gtr: load44(),
        ltr: load45(),
        intersects: load46(),
        simplifyRange: load47(),
        subset: load48()
    };
});
var load50 = __swcpack_require__.bind(void 0, function(module, exports) {
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
    var _semver = load49();
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
        if ((0, _semver).diff(latest, current) === 'major') {
            core.warning(`There is a new major version available of the Expo CLI (${latest})`);
            core.warning(`If you run into issues, try upgrading your workflow to "${binaryName}-version: ${(0, _semver).major(latest)}.x"`);
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
var tools = _interopRequireWildcard(load50());
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
