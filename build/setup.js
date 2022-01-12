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
    function getProxyUrl(reqUrl) {
        let usingSsl = reqUrl.protocol === 'https:';
        let proxyUrl;
        if (checkBypass(reqUrl)) return proxyUrl;
        let proxyVar;
        if (usingSsl) proxyVar = process.env['https_proxy'] || process.env['HTTPS_PROXY'];
        else proxyVar = process.env['http_proxy'] || process.env['HTTP_PROXY'];
        if (proxyVar) proxyUrl = new URL(proxyVar);
        return proxyUrl;
    }
    exports.getProxyUrl = getProxyUrl;
    function checkBypass(reqUrl) {
        if (!reqUrl.hostname) return false;
        let noProxy = process.env['no_proxy'] || process.env['NO_PROXY'] || '';
        if (!noProxy) return false;
        // Determine the request port
        let reqPort;
        if (reqUrl.port) reqPort = Number(reqUrl.port);
        else if (reqUrl.protocol === 'http:') reqPort = 80;
        else if (reqUrl.protocol === 'https:') reqPort = 443;
        // Format the request hostname and hostname with port
        let upperReqHosts = [
            reqUrl.hostname.toUpperCase()
        ];
        if (typeof reqPort === 'number') upperReqHosts.push(`${upperReqHosts[0]}:${reqPort}`);
        // Compare request host against noproxy
        for (let upperNoProxyItem of noProxy.split(',').map((x)=>x.trim().toUpperCase()
        ).filter((x)=>x
        )){
            if (upperReqHosts.some((x)=>x === upperNoProxyItem
            )) return true;
        }
        return false;
    }
    exports.checkBypass = checkBypass;
});
var load1 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    require('net');
    var tls = require('tls');
    var http = require('http');
    var https = require('https');
    var events = require('events');
    require('assert');
    var util = require('util');
    exports.httpOverHttp = httpOverHttp;
    exports.httpsOverHttp = httpsOverHttp;
    exports.httpOverHttps = httpOverHttps;
    exports.httpsOverHttps = httpsOverHttps;
    function httpOverHttp(options) {
        var agent = new TunnelingAgent(options);
        agent.request = http.request;
        return agent;
    }
    function httpsOverHttp(options) {
        var agent = new TunnelingAgent(options);
        agent.request = http.request;
        agent.createSocket = createSecureSocket;
        agent.defaultPort = 443;
        return agent;
    }
    function httpOverHttps(options) {
        var agent = new TunnelingAgent(options);
        agent.request = https.request;
        return agent;
    }
    function httpsOverHttps(options) {
        var agent = new TunnelingAgent(options);
        agent.request = https.request;
        agent.createSocket = createSecureSocket;
        agent.defaultPort = 443;
        return agent;
    }
    function TunnelingAgent(options1) {
        var self = this;
        self.options = options1 || {};
        self.proxyOptions = self.options.proxy || {};
        self.maxSockets = self.options.maxSockets || http.Agent.defaultMaxSockets;
        self.requests = [];
        self.sockets = [];
        self.on('free', function onFree(socket, host, port, localAddress) {
            var options = toOptions(host, port, localAddress);
            for(var i = 0, len = self.requests.length; i < len; ++i){
                var pending = self.requests[i];
                if (pending.host === options.host && pending.port === options.port) {
                    // Detect the request to connect same origin server,
                    // reuse the connection.
                    self.requests.splice(i, 1);
                    pending.request.onSocket(socket);
                    return;
                }
            }
            socket.destroy();
            self.removeSocket(socket);
        });
    }
    util.inherits(TunnelingAgent, events.EventEmitter);
    TunnelingAgent.prototype.addRequest = function addRequest(req, host, port, localAddress) {
        var self = this;
        var options = mergeOptions({
            request: req
        }, self.options, toOptions(host, port, localAddress));
        if (self.sockets.length >= this.maxSockets) {
            // We are over limit so we'll add it to the queue.
            self.requests.push(options);
            return;
        }
        // If we are under maxSockets create a new one.
        self.createSocket(options, function(socket) {
            socket.on('free', onFree);
            socket.on('close', onCloseOrRemove);
            socket.on('agentRemove', onCloseOrRemove);
            req.onSocket(socket);
            function onFree() {
                self.emit('free', socket, options);
            }
            function onCloseOrRemove(err) {
                self.removeSocket(socket);
                socket.removeListener('free', onFree);
                socket.removeListener('close', onCloseOrRemove);
                socket.removeListener('agentRemove', onCloseOrRemove);
            }
        });
    };
    TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
        var self = this;
        var placeholder = {};
        self.sockets.push(placeholder);
        var connectOptions = mergeOptions({}, self.proxyOptions, {
            method: 'CONNECT',
            path: options.host + ':' + options.port,
            agent: false,
            headers: {
                host: options.host + ':' + options.port
            }
        });
        if (options.localAddress) connectOptions.localAddress = options.localAddress;
        if (connectOptions.proxyAuth) {
            connectOptions.headers = connectOptions.headers || {};
            connectOptions.headers['Proxy-Authorization'] = 'Basic ' + new Buffer(connectOptions.proxyAuth).toString('base64');
        }
        debug('making CONNECT request');
        var connectReq = self.request(connectOptions);
        connectReq.useChunkedEncodingByDefault = false; // for v0.6
        connectReq.once('response', onResponse); // for v0.6
        connectReq.once('upgrade', onUpgrade); // for v0.6
        connectReq.once('connect', onConnect); // for v0.7 or later
        connectReq.once('error', onError);
        connectReq.end();
        function onResponse(res) {
            // Very hacky. This is necessary to avoid http-parser leaks.
            res.upgrade = true;
        }
        function onUpgrade(res, socket, head) {
            // Hacky.
            process.nextTick(function() {
                onConnect(res, socket, head);
            });
        }
        function onConnect(res, socket, head) {
            connectReq.removeAllListeners();
            socket.removeAllListeners();
            if (res.statusCode !== 200) {
                debug('tunneling socket could not be established, statusCode=%d', res.statusCode);
                socket.destroy();
                var error = new Error("tunneling socket could not be established, statusCode=" + res.statusCode);
                error.code = 'ECONNRESET';
                options.request.emit('error', error);
                self.removeSocket(placeholder);
                return;
            }
            if (head.length > 0) {
                debug('got illegal response body from proxy');
                socket.destroy();
                var error = new Error('got illegal response body from proxy');
                error.code = 'ECONNRESET';
                options.request.emit('error', error);
                self.removeSocket(placeholder);
                return;
            }
            debug('tunneling connection has established');
            self.sockets[self.sockets.indexOf(placeholder)] = socket;
            return cb(socket);
        }
        function onError(cause) {
            connectReq.removeAllListeners();
            debug('tunneling socket could not be established, cause=%s\n', cause.message, cause.stack);
            var error = new Error("tunneling socket could not be established, cause=" + cause.message);
            error.code = 'ECONNRESET';
            options.request.emit('error', error);
            self.removeSocket(placeholder);
        }
    };
    TunnelingAgent.prototype.removeSocket = function removeSocket(socket1) {
        var pos = this.sockets.indexOf(socket1);
        if (pos === -1) return;
        this.sockets.splice(pos, 1);
        var pending = this.requests.shift();
        if (pending) // If we have pending requests and a socket gets closed a new one
        // needs to be created to take over in the pool for the one that closed.
        this.createSocket(pending, function(socket) {
            pending.request.onSocket(socket);
        });
    };
    function createSecureSocket(options, cb) {
        var self = this;
        TunnelingAgent.prototype.createSocket.call(self, options, function(socket) {
            var hostHeader = options.request.getHeader('host');
            var tlsOptions = mergeOptions({}, self.options, {
                socket: socket,
                servername: hostHeader ? hostHeader.replace(/:.*$/, '') : options.host
            });
            // 0 is dummy port for v0.6
            var secureSocket = tls.connect(0, tlsOptions);
            self.sockets[self.sockets.indexOf(socket)] = secureSocket;
            cb(secureSocket);
        });
    }
    function toOptions(host, port, localAddress) {
        if (typeof host === 'string') return {
            host: host,
            port: port,
            localAddress: localAddress
        };
        return host; // for v0.11 or later
    }
    function mergeOptions(target) {
        for(var i = 1, len = arguments.length; i < len; ++i){
            var overrides = arguments[i];
            if (typeof overrides === 'object') {
                var keys = Object.keys(overrides);
                for(var j = 0, keyLen = keys.length; j < keyLen; ++j){
                    var k = keys[j];
                    if (overrides[k] !== undefined) target[k] = overrides[k];
                }
            }
        }
        return target;
    }
    var debug;
    if (process.env.NODE_DEBUG && /\btunnel\b/.test(process.env.NODE_DEBUG)) debug = function() {
        var args = Array.prototype.slice.call(arguments);
        if (typeof args[0] === 'string') args[0] = 'TUNNEL: ' + args[0];
        else args.unshift('TUNNEL:');
        console.error.apply(console, args);
    };
    else debug = function() {};
    exports.debug = debug; // for test
});
var load2 = __swcpack_require__.bind(void 0, function(module, exports) {
    module.exports = load1();
});
var load3 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const http = require("http");
    const https = require("https");
    const pm = load();
    let tunnel;
    var HttpCodes1;
    (function(HttpCodes) {
        HttpCodes[HttpCodes["OK"] = 200] = "OK";
        HttpCodes[HttpCodes["MultipleChoices"] = 300] = "MultipleChoices";
        HttpCodes[HttpCodes["MovedPermanently"] = 301] = "MovedPermanently";
        HttpCodes[HttpCodes["ResourceMoved"] = 302] = "ResourceMoved";
        HttpCodes[HttpCodes["SeeOther"] = 303] = "SeeOther";
        HttpCodes[HttpCodes["NotModified"] = 304] = "NotModified";
        HttpCodes[HttpCodes["UseProxy"] = 305] = "UseProxy";
        HttpCodes[HttpCodes["SwitchProxy"] = 306] = "SwitchProxy";
        HttpCodes[HttpCodes["TemporaryRedirect"] = 307] = "TemporaryRedirect";
        HttpCodes[HttpCodes["PermanentRedirect"] = 308] = "PermanentRedirect";
        HttpCodes[HttpCodes["BadRequest"] = 400] = "BadRequest";
        HttpCodes[HttpCodes["Unauthorized"] = 401] = "Unauthorized";
        HttpCodes[HttpCodes["PaymentRequired"] = 402] = "PaymentRequired";
        HttpCodes[HttpCodes["Forbidden"] = 403] = "Forbidden";
        HttpCodes[HttpCodes["NotFound"] = 404] = "NotFound";
        HttpCodes[HttpCodes["MethodNotAllowed"] = 405] = "MethodNotAllowed";
        HttpCodes[HttpCodes["NotAcceptable"] = 406] = "NotAcceptable";
        HttpCodes[HttpCodes["ProxyAuthenticationRequired"] = 407] = "ProxyAuthenticationRequired";
        HttpCodes[HttpCodes["RequestTimeout"] = 408] = "RequestTimeout";
        HttpCodes[HttpCodes["Conflict"] = 409] = "Conflict";
        HttpCodes[HttpCodes["Gone"] = 410] = "Gone";
        HttpCodes[HttpCodes["TooManyRequests"] = 429] = "TooManyRequests";
        HttpCodes[HttpCodes["InternalServerError"] = 500] = "InternalServerError";
        HttpCodes[HttpCodes["NotImplemented"] = 501] = "NotImplemented";
        HttpCodes[HttpCodes["BadGateway"] = 502] = "BadGateway";
        HttpCodes[HttpCodes["ServiceUnavailable"] = 503] = "ServiceUnavailable";
        HttpCodes[HttpCodes["GatewayTimeout"] = 504] = "GatewayTimeout";
    })(HttpCodes1 = exports.HttpCodes || (exports.HttpCodes = {}));
    var Headers1;
    (function(Headers) {
        Headers["Accept"] = "accept";
        Headers["ContentType"] = "content-type";
    })(Headers1 = exports.Headers || (exports.Headers = {}));
    var MediaTypes1;
    (function(MediaTypes) {
        MediaTypes["ApplicationJson"] = "application/json";
    })(MediaTypes1 = exports.MediaTypes || (exports.MediaTypes = {}));
    /**
 * Returns the proxy URL, depending upon the supplied url and proxy environment variables.
 * @param serverUrl  The server URL where the request will be sent. For example, https://api.github.com
 */ function getProxyUrl(serverUrl) {
        let proxyUrl = pm.getProxyUrl(new URL(serverUrl));
        return proxyUrl ? proxyUrl.href : '';
    }
    exports.getProxyUrl = getProxyUrl;
    const HttpRedirectCodes = [
        HttpCodes1.MovedPermanently,
        HttpCodes1.ResourceMoved,
        HttpCodes1.SeeOther,
        HttpCodes1.TemporaryRedirect,
        HttpCodes1.PermanentRedirect
    ];
    const HttpResponseRetryCodes = [
        HttpCodes1.BadGateway,
        HttpCodes1.ServiceUnavailable,
        HttpCodes1.GatewayTimeout
    ];
    const RetryableHttpVerbs = [
        'OPTIONS',
        'GET',
        'DELETE',
        'HEAD'
    ];
    const ExponentialBackoffCeiling = 10;
    class HttpClientError extends Error {
        constructor(message, statusCode){
            super(message);
            this.name = 'HttpClientError';
            this.statusCode = statusCode;
            Object.setPrototypeOf(this, HttpClientError.prototype);
        }
    }
    exports.HttpClientError = HttpClientError;
    class HttpClientResponse {
        constructor(message){
            this.message = message;
        }
        readBody() {
            return new Promise(async (resolve, reject)=>{
                let output = Buffer.alloc(0);
                this.message.on('data', (chunk)=>{
                    output = Buffer.concat([
                        output,
                        chunk
                    ]);
                });
                this.message.on('end', ()=>{
                    resolve(output.toString());
                });
            });
        }
    }
    exports.HttpClientResponse = HttpClientResponse;
    function isHttps(requestUrl) {
        let parsedUrl = new URL(requestUrl);
        return parsedUrl.protocol === 'https:';
    }
    exports.isHttps = isHttps;
    class HttpClient {
        constructor(userAgent, handlers, requestOptions){
            this._ignoreSslError = false;
            this._allowRedirects = true;
            this._allowRedirectDowngrade = false;
            this._maxRedirects = 50;
            this._allowRetries = false;
            this._maxRetries = 1;
            this._keepAlive = false;
            this._disposed = false;
            this.userAgent = userAgent;
            this.handlers = handlers || [];
            this.requestOptions = requestOptions;
            if (requestOptions) {
                if (requestOptions.ignoreSslError != null) this._ignoreSslError = requestOptions.ignoreSslError;
                this._socketTimeout = requestOptions.socketTimeout;
                if (requestOptions.allowRedirects != null) this._allowRedirects = requestOptions.allowRedirects;
                if (requestOptions.allowRedirectDowngrade != null) this._allowRedirectDowngrade = requestOptions.allowRedirectDowngrade;
                if (requestOptions.maxRedirects != null) this._maxRedirects = Math.max(requestOptions.maxRedirects, 0);
                if (requestOptions.keepAlive != null) this._keepAlive = requestOptions.keepAlive;
                if (requestOptions.allowRetries != null) this._allowRetries = requestOptions.allowRetries;
                if (requestOptions.maxRetries != null) this._maxRetries = requestOptions.maxRetries;
            }
        }
        options(requestUrl, additionalHeaders) {
            return this.request('OPTIONS', requestUrl, null, additionalHeaders || {});
        }
        get(requestUrl, additionalHeaders) {
            return this.request('GET', requestUrl, null, additionalHeaders || {});
        }
        del(requestUrl, additionalHeaders) {
            return this.request('DELETE', requestUrl, null, additionalHeaders || {});
        }
        post(requestUrl, data, additionalHeaders) {
            return this.request('POST', requestUrl, data, additionalHeaders || {});
        }
        patch(requestUrl, data, additionalHeaders) {
            return this.request('PATCH', requestUrl, data, additionalHeaders || {});
        }
        put(requestUrl, data, additionalHeaders) {
            return this.request('PUT', requestUrl, data, additionalHeaders || {});
        }
        head(requestUrl, additionalHeaders) {
            return this.request('HEAD', requestUrl, null, additionalHeaders || {});
        }
        sendStream(verb, requestUrl, stream, additionalHeaders) {
            return this.request(verb, requestUrl, stream, additionalHeaders);
        }
        /**
     * Gets a typed object from an endpoint
     * Be aware that not found returns a null.  Other errors (4xx, 5xx) reject the promise
     */ async getJson(requestUrl, additionalHeaders = {}) {
            additionalHeaders[Headers1.Accept] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.Accept, MediaTypes1.ApplicationJson);
            let res = await this.get(requestUrl, additionalHeaders);
            return this._processResponse(res, this.requestOptions);
        }
        async postJson(requestUrl, obj, additionalHeaders = {}) {
            let data = JSON.stringify(obj, null, 2);
            additionalHeaders[Headers1.Accept] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.Accept, MediaTypes1.ApplicationJson);
            additionalHeaders[Headers1.ContentType] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.ContentType, MediaTypes1.ApplicationJson);
            let res = await this.post(requestUrl, data, additionalHeaders);
            return this._processResponse(res, this.requestOptions);
        }
        async putJson(requestUrl, obj, additionalHeaders = {}) {
            let data = JSON.stringify(obj, null, 2);
            additionalHeaders[Headers1.Accept] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.Accept, MediaTypes1.ApplicationJson);
            additionalHeaders[Headers1.ContentType] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.ContentType, MediaTypes1.ApplicationJson);
            let res = await this.put(requestUrl, data, additionalHeaders);
            return this._processResponse(res, this.requestOptions);
        }
        async patchJson(requestUrl, obj, additionalHeaders = {}) {
            let data = JSON.stringify(obj, null, 2);
            additionalHeaders[Headers1.Accept] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.Accept, MediaTypes1.ApplicationJson);
            additionalHeaders[Headers1.ContentType] = this._getExistingOrDefaultHeader(additionalHeaders, Headers1.ContentType, MediaTypes1.ApplicationJson);
            let res = await this.patch(requestUrl, data, additionalHeaders);
            return this._processResponse(res, this.requestOptions);
        }
        /**
     * Makes a raw http request.
     * All other methods such as get, post, patch, and request ultimately call this.
     * Prefer get, del, post and patch
     */ async request(verb, requestUrl, data, headers) {
            if (this._disposed) throw new Error('Client has already been disposed.');
            let parsedUrl = new URL(requestUrl);
            let info = this._prepareRequest(verb, parsedUrl, headers);
            // Only perform retries on reads since writes may not be idempotent.
            let maxTries = this._allowRetries && RetryableHttpVerbs.indexOf(verb) != -1 ? this._maxRetries + 1 : 1;
            let numTries = 0;
            let response;
            while(numTries < maxTries){
                response = await this.requestRaw(info, data);
                // Check if it's an authentication challenge
                if (response && response.message && response.message.statusCode === HttpCodes1.Unauthorized) {
                    let authenticationHandler;
                    for(let i = 0; i < this.handlers.length; i++)if (this.handlers[i].canHandleAuthentication(response)) {
                        authenticationHandler = this.handlers[i];
                        break;
                    }
                    if (authenticationHandler) return authenticationHandler.handleAuthentication(this, info, data);
                    else // We have received an unauthorized response but have no handlers to handle it.
                    // Let the response return to the caller.
                    return response;
                }
                let redirectsRemaining = this._maxRedirects;
                while(HttpRedirectCodes.indexOf(response.message.statusCode) != -1 && this._allowRedirects && redirectsRemaining > 0){
                    const redirectUrl = response.message.headers['location'];
                    if (!redirectUrl) break;
                    let parsedRedirectUrl = new URL(redirectUrl);
                    if (parsedUrl.protocol == 'https:' && parsedUrl.protocol != parsedRedirectUrl.protocol && !this._allowRedirectDowngrade) throw new Error('Redirect from HTTPS to HTTP protocol. This downgrade is not allowed for security reasons. If you want to allow this behavior, set the allowRedirectDowngrade option to true.');
                    // we need to finish reading the response before reassigning response
                    // which will leak the open socket.
                    await response.readBody();
                    // strip authorization header if redirected to a different hostname
                    if (parsedRedirectUrl.hostname !== parsedUrl.hostname) {
                        for(let header in headers)// header names are case insensitive
                        if (header.toLowerCase() === 'authorization') delete headers[header];
                    }
                    // let's make the request with the new redirectUrl
                    info = this._prepareRequest(verb, parsedRedirectUrl, headers);
                    response = await this.requestRaw(info, data);
                    redirectsRemaining--;
                }
                if (HttpResponseRetryCodes.indexOf(response.message.statusCode) == -1) // If not a retry code, return immediately instead of retrying
                return response;
                numTries += 1;
                if (numTries < maxTries) {
                    await response.readBody();
                    await this._performExponentialBackoff(numTries);
                }
            }
            return response;
        }
        /**
     * Needs to be called if keepAlive is set to true in request options.
     */ dispose() {
            if (this._agent) this._agent.destroy();
            this._disposed = true;
        }
        /**
     * Raw request.
     * @param info
     * @param data
     */ requestRaw(info, data) {
            return new Promise((resolve, reject)=>{
                let callbackForResult = function(err, res) {
                    if (err) reject(err);
                    resolve(res);
                };
                this.requestRawWithCallback(info, data, callbackForResult);
            });
        }
        /**
     * Raw request with callback.
     * @param info
     * @param data
     * @param onResult
     */ requestRawWithCallback(info, data, onResult) {
            let socket;
            if (typeof data === 'string') info.options.headers['Content-Length'] = Buffer.byteLength(data, 'utf8');
            let callbackCalled = false;
            let handleResult = (err, res)=>{
                if (!callbackCalled) {
                    callbackCalled = true;
                    onResult(err, res);
                }
            };
            let req = info.httpModule.request(info.options, (msg)=>{
                let res = new HttpClientResponse(msg);
                handleResult(null, res);
            });
            req.on('socket', (sock)=>{
                socket = sock;
            });
            // If we ever get disconnected, we want the socket to timeout eventually
            req.setTimeout(this._socketTimeout || 180000, ()=>{
                if (socket) socket.end();
                handleResult(new Error('Request timeout: ' + info.options.path), null);
            });
            req.on('error', function(err) {
                // err has statusCode property
                // res should have headers
                handleResult(err, null);
            });
            if (data && typeof data === 'string') req.write(data, 'utf8');
            if (data && typeof data !== 'string') {
                data.on('close', function() {
                    req.end();
                });
                data.pipe(req);
            } else req.end();
        }
        /**
     * Gets an http agent. This function is useful when you need an http agent that handles
     * routing through a proxy server - depending upon the url and proxy environment variables.
     * @param serverUrl  The server URL where the request will be sent. For example, https://api.github.com
     */ getAgent(serverUrl) {
            let parsedUrl = new URL(serverUrl);
            return this._getAgent(parsedUrl);
        }
        _prepareRequest(method, requestUrl, headers) {
            const info = {};
            info.parsedUrl = requestUrl;
            const usingSsl = info.parsedUrl.protocol === 'https:';
            info.httpModule = usingSsl ? https : http;
            const defaultPort = usingSsl ? 443 : 80;
            info.options = {};
            info.options.host = info.parsedUrl.hostname;
            info.options.port = info.parsedUrl.port ? parseInt(info.parsedUrl.port) : defaultPort;
            info.options.path = (info.parsedUrl.pathname || '') + (info.parsedUrl.search || '');
            info.options.method = method;
            info.options.headers = this._mergeHeaders(headers);
            if (this.userAgent != null) info.options.headers['user-agent'] = this.userAgent;
            info.options.agent = this._getAgent(info.parsedUrl);
            // gives handlers an opportunity to participate
            if (this.handlers) this.handlers.forEach((handler)=>{
                handler.prepareRequest(info.options);
            });
            return info;
        }
        _mergeHeaders(headers) {
            const lowercaseKeys = (obj)=>Object.keys(obj).reduce((c, k)=>(c[k.toLowerCase()] = obj[k], c)
                , {})
            ;
            if (this.requestOptions && this.requestOptions.headers) return Object.assign({}, lowercaseKeys(this.requestOptions.headers), lowercaseKeys(headers));
            return lowercaseKeys(headers || {});
        }
        _getExistingOrDefaultHeader(additionalHeaders, header, _default) {
            const lowercaseKeys = (obj)=>Object.keys(obj).reduce((c, k)=>(c[k.toLowerCase()] = obj[k], c)
                , {})
            ;
            let clientHeader;
            if (this.requestOptions && this.requestOptions.headers) clientHeader = lowercaseKeys(this.requestOptions.headers)[header];
            return additionalHeaders[header] || clientHeader || _default;
        }
        _getAgent(parsedUrl) {
            let agent;
            let proxyUrl = pm.getProxyUrl(parsedUrl);
            let useProxy = proxyUrl && proxyUrl.hostname;
            if (this._keepAlive && useProxy) agent = this._proxyAgent;
            if (this._keepAlive && !useProxy) agent = this._agent;
            // if agent is already assigned use that agent.
            if (!!agent) return agent;
            const usingSsl = parsedUrl.protocol === 'https:';
            let maxSockets = 100;
            if (!!this.requestOptions) maxSockets = this.requestOptions.maxSockets || http.globalAgent.maxSockets;
            if (useProxy) {
                // If using proxy, need tunnel
                if (!tunnel) tunnel = load2();
                const agentOptions = {
                    maxSockets: maxSockets,
                    keepAlive: this._keepAlive,
                    proxy: {
                        ...(proxyUrl.username || proxyUrl.password) && {
                            proxyAuth: `${proxyUrl.username}:${proxyUrl.password}`
                        },
                        host: proxyUrl.hostname,
                        port: proxyUrl.port
                    }
                };
                let tunnelAgent;
                const overHttps = proxyUrl.protocol === 'https:';
                if (usingSsl) tunnelAgent = overHttps ? tunnel.httpsOverHttps : tunnel.httpsOverHttp;
                else tunnelAgent = overHttps ? tunnel.httpOverHttps : tunnel.httpOverHttp;
                agent = tunnelAgent(agentOptions);
                this._proxyAgent = agent;
            }
            // if reusing agent across request and tunneling agent isn't assigned create a new agent
            if (this._keepAlive && !agent) {
                const options = {
                    keepAlive: this._keepAlive,
                    maxSockets: maxSockets
                };
                agent = usingSsl ? new https.Agent(options) : new http.Agent(options);
                this._agent = agent;
            }
            // if not using private agent and tunnel agent isn't setup then use global agent
            if (!agent) agent = usingSsl ? https.globalAgent : http.globalAgent;
            if (usingSsl && this._ignoreSslError) // we don't want to set NODE_TLS_REJECT_UNAUTHORIZED=0 since that will affect request for entire process
            // http.RequestOptions doesn't expose a way to modify RequestOptions.agent.options
            // we have to cast it to any and change it directly
            agent.options = Object.assign(agent.options || {}, {
                rejectUnauthorized: false
            });
            return agent;
        }
        _performExponentialBackoff(retryNumber) {
            retryNumber = Math.min(ExponentialBackoffCeiling, retryNumber);
            const ms = 5 * Math.pow(2, retryNumber);
            return new Promise((resolve)=>setTimeout(()=>resolve()
                , ms)
            );
        }
        static dateTimeDeserializer(key, value) {
            if (typeof value === 'string') {
                let a = new Date(value);
                if (!isNaN(a.valueOf())) return a;
            }
            return value;
        }
        async _processResponse(res, options) {
            return new Promise(async (resolve, reject)=>{
                const statusCode = res.message.statusCode;
                const response = {
                    statusCode: statusCode,
                    result: null,
                    headers: {}
                };
                // not found leads to null obj returned
                if (statusCode == HttpCodes1.NotFound) resolve(response);
                let obj;
                let contents;
                // get the result from the body
                try {
                    contents = await res.readBody();
                    if (contents && contents.length > 0) {
                        if (options && options.deserializeDates) obj = JSON.parse(contents, HttpClient.dateTimeDeserializer);
                        else obj = JSON.parse(contents);
                        response.result = obj;
                    }
                    response.headers = res.message.headers;
                } catch (err) {
                // Invalid resource (contents not json);  leaving result obj null
                }
                // note that 3xx redirects are handled by the http layer.
                if (statusCode > 299) {
                    let msg;
                    // if exception/error in body, attempt to get better error
                    if (obj && obj.message) msg = obj.message;
                    else if (contents && contents.length > 0) // it may be the case that the exception is in the body message as string
                    msg = contents;
                    else msg = 'Failed request: (' + statusCode + ')';
                    let err = new HttpClientError(msg, statusCode);
                    err.result = response.result;
                    reject(err);
                } else resolve(response);
            });
        }
    }
    exports.HttpClient = HttpClient;
});
var load4 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    class BasicCredentialHandler {
        constructor(username, password){
            this.username = username;
            this.password = password;
        }
        prepareRequest(options) {
            options.headers['Authorization'] = 'Basic ' + Buffer.from(this.username + ':' + this.password).toString('base64');
        }
        // This handler cannot handle 401
        canHandleAuthentication(response) {
            return false;
        }
        handleAuthentication(httpClient, requestInfo, objs) {
            return null;
        }
    }
    exports.BasicCredentialHandler = BasicCredentialHandler;
    class BearerCredentialHandler {
        constructor(token){
            this.token = token;
        }
        // currently implements pre-authorization
        // TODO: support preAuth = false where it hooks on 401
        prepareRequest(options) {
            options.headers['Authorization'] = 'Bearer ' + this.token;
        }
        // This handler cannot handle 401
        canHandleAuthentication(response) {
            return false;
        }
        handleAuthentication(httpClient, requestInfo, objs) {
            return null;
        }
    }
    exports.BearerCredentialHandler = BearerCredentialHandler;
    class PersonalAccessTokenCredentialHandler {
        constructor(token){
            this.token = token;
        }
        // currently implements pre-authorization
        // TODO: support preAuth = false where it hooks on 401
        prepareRequest(options) {
            options.headers['Authorization'] = 'Basic ' + Buffer.from('PAT:' + this.token).toString('base64');
        }
        // This handler cannot handle 401
        canHandleAuthentication(response) {
            return false;
        }
        handleAuthentication(httpClient, requestInfo, objs) {
            return null;
        }
    }
    exports.PersonalAccessTokenCredentialHandler = PersonalAccessTokenCredentialHandler;
});
var load5 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.toCommandProperties = exports.toCommandValue = void 0;
    /**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */ function toCommandValue(input) {
        if (input === null || input === undefined) return '';
        else if (typeof input === 'string' || input instanceof String) return input;
        return JSON.stringify(input);
    }
    exports.toCommandValue = toCommandValue;
    /**
 *
 * @param annotationProperties
 * @returns The command properties to send with the actual annotation command
 * See IssueCommandProperties: https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionCommandManager.cs#L646
 */ function toCommandProperties(annotationProperties) {
        if (!Object.keys(annotationProperties).length) return {};
        return {
            title: annotationProperties.title,
            file: annotationProperties.file,
            line: annotationProperties.startLine,
            endLine: annotationProperties.endLine,
            col: annotationProperties.startColumn,
            endColumn: annotationProperties.endColumn
        };
    }
    exports.toCommandProperties = toCommandProperties; //# sourceMappingURL=utils.js.map
});
var load6 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issue = exports.issueCommand = void 0;
    const os = __importStar(require("os"));
    const utils_1 = load5();
    /**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */ function issueCommand(command, properties, message) {
        const cmd = new Command(command, properties, message);
        process.stdout.write(cmd.toString() + os.EOL);
    }
    exports.issueCommand = issueCommand;
    function issue(name, message = '') {
        issueCommand(name, {}, message);
    }
    exports.issue = issue;
    const CMD_STRING = '::';
    class Command {
        constructor(command, properties, message){
            if (!command) command = 'missing.command';
            this.command = command;
            this.properties = properties;
            this.message = message;
        }
        toString() {
            let cmdStr = CMD_STRING + this.command;
            if (this.properties && Object.keys(this.properties).length > 0) {
                cmdStr += ' ';
                let first = true;
                for(const key in this.properties)if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) first = false;
                        else cmdStr += ',';
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
            cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
            return cmdStr;
        }
    }
    function escapeData(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    }
    function escapeProperty(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
    } //# sourceMappingURL=command.js.map
});
var load7 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // For internal use, subject to change.
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issueCommand = void 0;
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ const fs = __importStar(require("fs"));
    const os = __importStar(require("os"));
    const utils_1 = load5();
    function issueCommand(command, message) {
        const filePath = process.env[`GITHUB_${command}`];
        if (!filePath) throw new Error(`Unable to find environment variable for file command ${command}`);
        if (!fs.existsSync(filePath)) throw new Error(`Missing file at path: ${filePath}`);
        fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
            encoding: 'utf8'
        });
    }
    exports.issueCommand = issueCommand; //# sourceMappingURL=file-command.js.map
});
var load8 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getIDToken = exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.notice = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
    const command_1 = load6();
    const file_command_1 = load7();
    const utils_1 = load5();
    const os = __importStar(require("os"));
    const path = __importStar(require("path"));
    const oidc_utils_1 = load9();
    /**
 * The code to exit an action
 */ var ExitCode1;
    (function(ExitCode) {
        /**
     * A code indicating that the action was successful
     */ ExitCode[ExitCode["Success"] = 0] = "Success";
        /**
     * A code indicating that the action was a failure
     */ ExitCode[ExitCode["Failure"] = 1] = "Failure";
    })(ExitCode1 = exports.ExitCode || (exports.ExitCode = {}));
    //-----------------------------------------------------------------------
    // Variables
    //-----------------------------------------------------------------------
    /**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function exportVariable(name, val) {
        const convertedVal = utils_1.toCommandValue(val);
        process.env[name] = convertedVal;
        const filePath = process.env['GITHUB_ENV'] || '';
        if (filePath) {
            const delimiter = '_GitHubActionsFileCommandDelimeter_';
            const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
            file_command_1.issueCommand('ENV', commandValue);
        } else command_1.issueCommand('set-env', {
            name
        }, convertedVal);
    }
    exports.exportVariable = exportVariable;
    /**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */ function setSecret(secret) {
        command_1.issueCommand('add-mask', {}, secret);
    }
    exports.setSecret = setSecret;
    /**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */ function addPath(inputPath) {
        const filePath = process.env['GITHUB_PATH'] || '';
        if (filePath) file_command_1.issueCommand('PATH', inputPath);
        else command_1.issueCommand('add-path', {}, inputPath);
        process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
    }
    exports.addPath = addPath;
    /**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */ function getInput(name, options) {
        const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
        if (options && options.required && !val) throw new Error(`Input required and not supplied: ${name}`);
        if (options && options.trimWhitespace === false) return val;
        return val.trim();
    }
    exports.getInput = getInput;
    /**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */ function getMultilineInput(name, options) {
        const inputs = getInput(name, options).split('\n').filter((x)=>x !== ''
        );
        return inputs;
    }
    exports.getMultilineInput = getMultilineInput;
    /**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */ function getBooleanInput(name, options) {
        const trueValue = [
            'true',
            'True',
            'TRUE'
        ];
        const falseValue = [
            'false',
            'False',
            'FALSE'
        ];
        const val = getInput(name, options);
        if (trueValue.includes(val)) return true;
        if (falseValue.includes(val)) return false;
        throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` + `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
    }
    exports.getBooleanInput = getBooleanInput;
    /**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setOutput(name, value) {
        process.stdout.write(os.EOL);
        command_1.issueCommand('set-output', {
            name
        }, value);
    }
    exports.setOutput = setOutput;
    /**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */ function setCommandEcho(enabled) {
        command_1.issue('echo', enabled ? 'on' : 'off');
    }
    exports.setCommandEcho = setCommandEcho;
    //-----------------------------------------------------------------------
    // Results
    //-----------------------------------------------------------------------
    /**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */ function setFailed(message) {
        process.exitCode = ExitCode1.Failure;
        error(message);
    }
    exports.setFailed = setFailed;
    //-----------------------------------------------------------------------
    // Logging Commands
    //-----------------------------------------------------------------------
    /**
 * Gets whether Actions Step Debug is on or not
 */ function isDebug() {
        return process.env['RUNNER_DEBUG'] === '1';
    }
    exports.isDebug = isDebug;
    /**
 * Writes debug message to user log
 * @param message debug message
 */ function debug(message) {
        command_1.issueCommand('debug', {}, message);
    }
    exports.debug = debug;
    /**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 * @param properties optional properties to add to the annotation.
 */ function error(message, properties = {}) {
        command_1.issueCommand('error', utils_1.toCommandProperties(properties), message instanceof Error ? message.toString() : message);
    }
    exports.error = error;
    /**
 * Adds a warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 * @param properties optional properties to add to the annotation.
 */ function warning(message, properties = {}) {
        command_1.issueCommand('warning', utils_1.toCommandProperties(properties), message instanceof Error ? message.toString() : message);
    }
    exports.warning = warning;
    /**
 * Adds a notice issue
 * @param message notice issue message. Errors will be converted to string via toString()
 * @param properties optional properties to add to the annotation.
 */ function notice(message, properties = {}) {
        command_1.issueCommand('notice', utils_1.toCommandProperties(properties), message instanceof Error ? message.toString() : message);
    }
    exports.notice = notice;
    /**
 * Writes info to log with console.log.
 * @param message info message
 */ function info(message) {
        process.stdout.write(message + os.EOL);
    }
    exports.info = info;
    /**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */ function startGroup(name) {
        command_1.issue('group', name);
    }
    exports.startGroup = startGroup;
    /**
 * End an output group.
 */ function endGroup() {
        command_1.issue('endgroup');
    }
    exports.endGroup = endGroup;
    /**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */ function group(name, fn) {
        return __awaiter(this, void 0, void 0, function*() {
            startGroup(name);
            let result;
            try {
                result = yield fn();
            } finally{
                endGroup();
            }
            return result;
        });
    }
    exports.group = group;
    //-----------------------------------------------------------------------
    // Wrapper action state
    //-----------------------------------------------------------------------
    /**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function saveState(name, value) {
        command_1.issueCommand('save-state', {
            name
        }, value);
    }
    exports.saveState = saveState;
    /**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */ function getState(name) {
        return process.env[`STATE_${name}`] || '';
    }
    exports.getState = getState;
    function getIDToken(aud) {
        return __awaiter(this, void 0, void 0, function*() {
            return yield oidc_utils_1.OidcClient.getIDToken(aud);
        });
    }
    exports.getIDToken = getIDToken; //# sourceMappingURL=core.js.map
});
var load9 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.OidcClient = void 0;
    const http_client_1 = load3();
    const auth_1 = load4();
    const core_1 = load8();
    class OidcClient {
        static createHttpClient(allowRetry = true, maxRetry = 10) {
            const requestOptions = {
                allowRetries: allowRetry,
                maxRetries: maxRetry
            };
            return new http_client_1.HttpClient('actions/oidc-client', [
                new auth_1.BearerCredentialHandler(OidcClient.getRequestToken())
            ], requestOptions);
        }
        static getRequestToken() {
            const token = process.env['ACTIONS_ID_TOKEN_REQUEST_TOKEN'];
            if (!token) throw new Error('Unable to get ACTIONS_ID_TOKEN_REQUEST_TOKEN env variable');
            return token;
        }
        static getIDTokenUrl() {
            const runtimeUrl = process.env['ACTIONS_ID_TOKEN_REQUEST_URL'];
            if (!runtimeUrl) throw new Error('Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable');
            return runtimeUrl;
        }
        static getCall(id_token_url) {
            var _a;
            return __awaiter(this, void 0, void 0, function*() {
                const httpclient = OidcClient.createHttpClient();
                const res = yield httpclient.getJson(id_token_url).catch((error)=>{
                    throw new Error(`Failed to get ID Token. \n 
        Error Code : ${error.statusCode}\n 
        Error Message: ${error.result.message}`);
                });
                const id_token = (_a = res.result) === null || _a === void 0 ? void 0 : _a.value;
                if (!id_token) throw new Error('Response json body do not have ID Token field');
                return id_token;
            });
        }
        static getIDToken(audience) {
            return __awaiter(this, void 0, void 0, function*() {
                try {
                    // New ID Token is requested from action service
                    let id_token_url = OidcClient.getIDTokenUrl();
                    if (audience) {
                        const encodedAudience = encodeURIComponent(audience);
                        id_token_url = `${id_token_url}&audience=${encodedAudience}`;
                    }
                    core_1.debug(`ID token url is ${id_token_url}`);
                    const id_token = yield OidcClient.getCall(id_token_url);
                    core_1.setSecret(id_token);
                    return id_token;
                } catch (error) {
                    throw new Error(`Error message: ${error.message}`);
                }
            });
        }
    }
    exports.OidcClient = OidcClient; //# sourceMappingURL=oidc-utils.js.map
});
var load10 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var _a1;
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getCmdPath = exports.tryGetExecutablePath = exports.isRooted = exports.isDirectory = exports.exists = exports.IS_WINDOWS = exports.unlink = exports.symlink = exports.stat = exports.rmdir = exports.rename = exports.readlink = exports.readdir = exports.mkdir = exports.lstat = exports.copyFile = exports.chmod = void 0;
    const fs = __importStar(require("fs"));
    const path = __importStar(require("path"));
    _a1 = fs.promises, exports.chmod = _a1.chmod, exports.copyFile = _a1.copyFile, exports.lstat = _a1.lstat, exports.mkdir = _a1.mkdir, exports.readdir = _a1.readdir, exports.readlink = _a1.readlink, exports.rename = _a1.rename, exports.rmdir = _a1.rmdir, exports.stat = _a1.stat, exports.symlink = _a1.symlink, exports.unlink = _a1.unlink;
    exports.IS_WINDOWS = process.platform === 'win32';
    function exists(fsPath) {
        return __awaiter(this, void 0, void 0, function*() {
            try {
                yield exports.stat(fsPath);
            } catch (err) {
                if (err.code === 'ENOENT') return false;
                throw err;
            }
            return true;
        });
    }
    exports.exists = exists;
    function isDirectory(fsPath, useStat = false) {
        return __awaiter(this, void 0, void 0, function*() {
            const stats = useStat ? yield exports.stat(fsPath) : yield exports.lstat(fsPath);
            return stats.isDirectory();
        });
    }
    exports.isDirectory = isDirectory;
    /**
 * On OSX/Linux, true if path starts with '/'. On Windows, true for paths like:
 * \, \hello, \\hello\share, C:, and C:\hello (and corresponding alternate separator cases).
 */ function isRooted(p) {
        p = normalizeSeparators(p);
        if (!p) throw new Error('isRooted() parameter "p" cannot be empty');
        if (exports.IS_WINDOWS) return p.startsWith('\\') || /^[A-Z]:/i.test(p) // e.g. \ or \hello or \\hello
        ; // e.g. C: or C:\hello
        return p.startsWith('/');
    }
    exports.isRooted = isRooted;
    /**
 * Best effort attempt to determine whether a file exists and is executable.
 * @param filePath    file path to check
 * @param extensions  additional file extensions to try
 * @return if file exists and is executable, returns the file path. otherwise empty string.
 */ function tryGetExecutablePath(filePath, extensions) {
        return __awaiter(this, void 0, void 0, function*() {
            let stats = undefined;
            try {
                // test file exists
                stats = yield exports.stat(filePath);
            } catch (err) {
                if (err.code !== 'ENOENT') // eslint-disable-next-line no-console
                console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
            }
            if (stats && stats.isFile()) {
                if (exports.IS_WINDOWS) {
                    // on Windows, test for valid extension
                    const upperExt = path.extname(filePath).toUpperCase();
                    if (extensions.some((validExt)=>validExt.toUpperCase() === upperExt
                    )) return filePath;
                } else {
                    if (isUnixExecutable(stats)) return filePath;
                }
            }
            // try each extension
            const originalFilePath = filePath;
            for (const extension of extensions){
                filePath = originalFilePath + extension;
                stats = undefined;
                try {
                    stats = yield exports.stat(filePath);
                } catch (err) {
                    if (err.code !== 'ENOENT') // eslint-disable-next-line no-console
                    console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
                }
                if (stats && stats.isFile()) {
                    if (exports.IS_WINDOWS) {
                        // preserve the case of the actual file (since an extension was appended)
                        try {
                            const directory = path.dirname(filePath);
                            const upperName = path.basename(filePath).toUpperCase();
                            for (const actualName of yield exports.readdir(directory))if (upperName === actualName.toUpperCase()) {
                                filePath = path.join(directory, actualName);
                                break;
                            }
                        } catch (err) {
                            // eslint-disable-next-line no-console
                            console.log(`Unexpected error attempting to determine the actual case of the file '${filePath}': ${err}`);
                        }
                        return filePath;
                    } else {
                        if (isUnixExecutable(stats)) return filePath;
                    }
                }
            }
            return '';
        });
    }
    exports.tryGetExecutablePath = tryGetExecutablePath;
    function normalizeSeparators(p) {
        p = p || '';
        if (exports.IS_WINDOWS) {
            // convert slashes on Windows
            p = p.replace(/\//g, '\\');
            // remove redundant slashes
            return p.replace(/\\\\+/g, '\\');
        }
        // remove redundant slashes
        return p.replace(/\/\/+/g, '/');
    }
    // on Mac/Linux, test the execute bit
    //     R   W  X  R  W X R W X
    //   256 128 64 32 16 8 4 2 1
    function isUnixExecutable(stats) {
        return (stats.mode & 1) > 0 || (stats.mode & 8) > 0 && stats.gid === process.getgid() || (stats.mode & 64) > 0 && stats.uid === process.getuid();
    }
    // Get the path of cmd.exe in windows
    function getCmdPath() {
        var _a;
        return (_a = process.env['COMSPEC']) !== null && _a !== void 0 ? _a : `cmd.exe`;
    }
    exports.getCmdPath = getCmdPath; //# sourceMappingURL=io-util.js.map
});
var load11 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.findInPath = exports.which = exports.mkdirP = exports.rmRF = exports.mv = exports.cp = void 0;
    const assert_1 = require("assert");
    const childProcess = __importStar(require("child_process"));
    const path = __importStar(require("path"));
    const util_1 = require("util");
    const ioUtil = __importStar(load10());
    const exec = util_1.promisify(childProcess.exec);
    const execFile = util_1.promisify(childProcess.execFile);
    /**
 * Copies a file or folder.
 * Based off of shelljs - https://github.com/shelljs/shelljs/blob/9237f66c52e5daa40458f94f9565e18e8132f5a6/src/cp.js
 *
 * @param     source    source path
 * @param     dest      destination path
 * @param     options   optional. See CopyOptions.
 */ function cp(source, dest, options = {}) {
        return __awaiter(this, void 0, void 0, function*() {
            const { force , recursive , copySourceDirectory  } = readCopyOptions(options);
            const destStat = (yield ioUtil.exists(dest)) ? yield ioUtil.stat(dest) : null;
            // Dest is an existing file, but not forcing
            if (destStat && destStat.isFile() && !force) return;
            // If dest is an existing directory, should copy inside.
            const newDest = destStat && destStat.isDirectory() && copySourceDirectory ? path.join(dest, path.basename(source)) : dest;
            if (!(yield ioUtil.exists(source))) throw new Error(`no such file or directory: ${source}`);
            const sourceStat = yield ioUtil.stat(source);
            if (sourceStat.isDirectory()) {
                if (!recursive) throw new Error(`Failed to copy. ${source} is a directory, but tried to copy without recursive flag.`);
                else yield cpDirRecursive(source, newDest, 0, force);
            } else {
                if (path.relative(source, newDest) === '') // a file cannot be copied to itself
                throw new Error(`'${newDest}' and '${source}' are the same file`);
                yield copyFile(source, newDest, force);
            }
        });
    }
    exports.cp = cp;
    /**
 * Moves a path.
 *
 * @param     source    source path
 * @param     dest      destination path
 * @param     options   optional. See MoveOptions.
 */ function mv(source, dest, options = {}) {
        return __awaiter(this, void 0, void 0, function*() {
            if (yield ioUtil.exists(dest)) {
                let destExists = true;
                if (yield ioUtil.isDirectory(dest)) {
                    // If dest is directory copy src into dest
                    dest = path.join(dest, path.basename(source));
                    destExists = yield ioUtil.exists(dest);
                }
                if (destExists) {
                    if (options.force == null || options.force) yield rmRF(dest);
                    else throw new Error('Destination already exists');
                }
            }
            yield mkdirP(path.dirname(dest));
            yield ioUtil.rename(source, dest);
        });
    }
    exports.mv = mv;
    /**
 * Remove a path recursively with force
 *
 * @param inputPath path to remove
 */ function rmRF(inputPath) {
        return __awaiter(this, void 0, void 0, function*() {
            if (ioUtil.IS_WINDOWS) {
                // Node doesn't provide a delete operation, only an unlink function. This means that if the file is being used by another
                // program (e.g. antivirus), it won't be deleted. To address this, we shell out the work to rd/del.
                // Check for invalid characters
                // https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
                if (/[*"<>|]/.test(inputPath)) throw new Error('File path must not contain `*`, `"`, `<`, `>` or `|` on Windows');
                try {
                    const cmdPath = ioUtil.getCmdPath();
                    if (yield ioUtil.isDirectory(inputPath, true)) yield exec(`${cmdPath} /s /c "rd /s /q "%inputPath%""`, {
                        env: {
                            inputPath
                        }
                    });
                    else yield exec(`${cmdPath} /s /c "del /f /a "%inputPath%""`, {
                        env: {
                            inputPath
                        }
                    });
                } catch (err) {
                    // if you try to delete a file that doesn't exist, desired result is achieved
                    // other errors are valid
                    if (err.code !== 'ENOENT') throw err;
                }
                // Shelling out fails to remove a symlink folder with missing source, this unlink catches that
                try {
                    yield ioUtil.unlink(inputPath);
                } catch (err1) {
                    // if you try to delete a file that doesn't exist, desired result is achieved
                    // other errors are valid
                    if (err1.code !== 'ENOENT') throw err1;
                }
            } else {
                let isDir = false;
                try {
                    isDir = yield ioUtil.isDirectory(inputPath);
                } catch (err) {
                    // if you try to delete a file that doesn't exist, desired result is achieved
                    // other errors are valid
                    if (err.code !== 'ENOENT') throw err;
                    return;
                }
                if (isDir) yield execFile(`rm`, [
                    `-rf`,
                    `${inputPath}`
                ]);
                else yield ioUtil.unlink(inputPath);
            }
        });
    }
    exports.rmRF = rmRF;
    /**
 * Make a directory.  Creates the full path with folders in between
 * Will throw if it fails
 *
 * @param   fsPath        path to create
 * @returns Promise<void>
 */ function mkdirP(fsPath) {
        return __awaiter(this, void 0, void 0, function*() {
            assert_1.ok(fsPath, 'a path argument must be provided');
            yield ioUtil.mkdir(fsPath, {
                recursive: true
            });
        });
    }
    exports.mkdirP = mkdirP;
    /**
 * Returns path of a tool had the tool actually been invoked.  Resolves via paths.
 * If you check and the tool does not exist, it will throw.
 *
 * @param     tool              name of the tool
 * @param     check             whether to check if tool exists
 * @returns   Promise<string>   path to tool
 */ function which(tool, check) {
        return __awaiter(this, void 0, void 0, function*() {
            if (!tool) throw new Error("parameter 'tool' is required");
            // recursive when check=true
            if (check) {
                const result = yield which(tool, false);
                if (!result) {
                    if (ioUtil.IS_WINDOWS) throw new Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also verify the file has a valid extension for an executable file.`);
                    else throw new Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`);
                }
                return result;
            }
            const matches = yield findInPath(tool);
            if (matches && matches.length > 0) return matches[0];
            return '';
        });
    }
    exports.which = which;
    /**
 * Returns a list of all occurrences of the given tool on the system path.
 *
 * @returns   Promise<string[]>  the paths of the tool
 */ function findInPath(tool) {
        return __awaiter(this, void 0, void 0, function*() {
            if (!tool) throw new Error("parameter 'tool' is required");
            // build the list of extensions to try
            const extensions = [];
            if (ioUtil.IS_WINDOWS && process.env['PATHEXT']) {
                for (const extension of process.env['PATHEXT'].split(path.delimiter))if (extension) extensions.push(extension);
            }
            // if it's rooted, return it if exists. otherwise return empty.
            if (ioUtil.isRooted(tool)) {
                const filePath = yield ioUtil.tryGetExecutablePath(tool, extensions);
                if (filePath) return [
                    filePath
                ];
                return [];
            }
            // if any path separators, return empty
            if (tool.includes(path.sep)) return [];
            // build the list of directories
            //
            // Note, technically "where" checks the current directory on Windows. From a toolkit perspective,
            // it feels like we should not do this. Checking the current directory seems like more of a use
            // case of a shell, and the which() function exposed by the toolkit should strive for consistency
            // across platforms.
            const directories = [];
            if (process.env.PATH) {
                for (const p of process.env.PATH.split(path.delimiter))if (p) directories.push(p);
            }
            // find all matches
            const matches = [];
            for (const directory of directories){
                const filePath = yield ioUtil.tryGetExecutablePath(path.join(directory, tool), extensions);
                if (filePath) matches.push(filePath);
            }
            return matches;
        });
    }
    exports.findInPath = findInPath;
    function readCopyOptions(options) {
        const force = options.force == null ? true : options.force;
        const recursive = Boolean(options.recursive);
        const copySourceDirectory = options.copySourceDirectory == null ? true : Boolean(options.copySourceDirectory);
        return {
            force,
            recursive,
            copySourceDirectory
        };
    }
    function cpDirRecursive(sourceDir, destDir, currentDepth, force) {
        return __awaiter(this, void 0, void 0, function*() {
            // Ensure there is not a run away recursive copy
            if (currentDepth >= 255) return;
            currentDepth++;
            yield mkdirP(destDir);
            const files = yield ioUtil.readdir(sourceDir);
            for (const fileName of files){
                const srcFile = `${sourceDir}/${fileName}`;
                const destFile = `${destDir}/${fileName}`;
                const srcFileStat = yield ioUtil.lstat(srcFile);
                if (srcFileStat.isDirectory()) // Recurse
                yield cpDirRecursive(srcFile, destFile, currentDepth, force);
                else yield copyFile(srcFile, destFile, force);
            }
            // Change the mode for the newly created directory
            yield ioUtil.chmod(destDir, (yield ioUtil.stat(sourceDir)).mode);
        });
    }
    // Buffered file copy
    function copyFile(srcFile, destFile, force) {
        return __awaiter(this, void 0, void 0, function*() {
            if ((yield ioUtil.lstat(srcFile)).isSymbolicLink()) {
                // unlink/re-link it
                try {
                    yield ioUtil.lstat(destFile);
                    yield ioUtil.unlink(destFile);
                } catch (e) {
                    // Try to override file permission
                    if (e.code === 'EPERM') {
                        yield ioUtil.chmod(destFile, '0666');
                        yield ioUtil.unlink(destFile);
                    }
                // other errors = it doesn't exist, no work to do
                }
                // Copy over symlink
                const symlinkFull = yield ioUtil.readlink(srcFile);
                yield ioUtil.symlink(symlinkFull, destFile, ioUtil.IS_WINDOWS ? 'junction' : null);
            } else if (!(yield ioUtil.exists(destFile)) || force) yield ioUtil.copyFile(srcFile, destFile);
        });
    } //# sourceMappingURL=io.js.map
});
var load12 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.argStringToArray = exports.ToolRunner = void 0;
    const os = __importStar(require("os"));
    const events = __importStar(require("events"));
    const child = __importStar(require("child_process"));
    const path = __importStar(require("path"));
    const io = __importStar(load11());
    const ioUtil = __importStar(load10());
    const timers_1 = require("timers");
    /* eslint-disable @typescript-eslint/unbound-method */ const IS_WINDOWS = process.platform === 'win32';
    /*
 * Class for running command line tools. Handles quoting and arg parsing in a platform agnostic way.
 */ class ToolRunner extends events.EventEmitter {
        constructor(toolPath, args, options){
            super();
            if (!toolPath) throw new Error("Parameter 'toolPath' cannot be null or empty.");
            this.toolPath = toolPath;
            this.args = args || [];
            this.options = options || {};
        }
        _debug(message) {
            if (this.options.listeners && this.options.listeners.debug) this.options.listeners.debug(message);
        }
        _getCommandString(options, noPrefix) {
            const toolPath = this._getSpawnFileName();
            const args = this._getSpawnArgs(options);
            let cmd = noPrefix ? '' : '[command]'; // omit prefix when piped to a second tool
            if (IS_WINDOWS) {
                // Windows + cmd file
                if (this._isCmdFile()) {
                    cmd += toolPath;
                    for (const a of args)cmd += ` ${a}`;
                } else if (options.windowsVerbatimArguments) {
                    cmd += `"${toolPath}"`;
                    for (const a of args)cmd += ` ${a}`;
                } else {
                    cmd += this._windowsQuoteCmdArg(toolPath);
                    for (const a of args)cmd += ` ${this._windowsQuoteCmdArg(a)}`;
                }
            } else {
                // OSX/Linux - this can likely be improved with some form of quoting.
                // creating processes on Unix is fundamentally different than Windows.
                // on Unix, execvp() takes an arg array.
                cmd += toolPath;
                for (const a of args)cmd += ` ${a}`;
            }
            return cmd;
        }
        _processLineBuffer(data, strBuffer, onLine) {
            try {
                let s = strBuffer + data.toString();
                let n = s.indexOf(os.EOL);
                while(n > -1){
                    const line = s.substring(0, n);
                    onLine(line);
                    // the rest of the string ...
                    s = s.substring(n + os.EOL.length);
                    n = s.indexOf(os.EOL);
                }
                return s;
            } catch (err) {
                // streaming lines to console is best effort.  Don't fail a build.
                this._debug(`error processing line. Failed with error ${err}`);
                return '';
            }
        }
        _getSpawnFileName() {
            if (IS_WINDOWS) {
                if (this._isCmdFile()) return process.env['COMSPEC'] || 'cmd.exe';
            }
            return this.toolPath;
        }
        _getSpawnArgs(options) {
            if (IS_WINDOWS) {
                if (this._isCmdFile()) {
                    let argline = `/D /S /C "${this._windowsQuoteCmdArg(this.toolPath)}`;
                    for (const a of this.args){
                        argline += ' ';
                        argline += options.windowsVerbatimArguments ? a : this._windowsQuoteCmdArg(a);
                    }
                    argline += '"';
                    return [
                        argline
                    ];
                }
            }
            return this.args;
        }
        _endsWith(str, end) {
            return str.endsWith(end);
        }
        _isCmdFile() {
            const upperToolPath = this.toolPath.toUpperCase();
            return this._endsWith(upperToolPath, '.CMD') || this._endsWith(upperToolPath, '.BAT');
        }
        _windowsQuoteCmdArg(arg) {
            // for .exe, apply the normal quoting rules that libuv applies
            if (!this._isCmdFile()) return this._uvQuoteCmdArg(arg);
            // otherwise apply quoting rules specific to the cmd.exe command line parser.
            // the libuv rules are generic and are not designed specifically for cmd.exe
            // command line parser.
            //
            // for a detailed description of the cmd.exe command line parser, refer to
            // http://stackoverflow.com/questions/4094699/how-does-the-windows-command-interpreter-cmd-exe-parse-scripts/7970912#7970912
            // need quotes for empty arg
            if (!arg) return '""';
            // determine whether the arg needs to be quoted
            const cmdSpecialChars = [
                ' ',
                '\t',
                '&',
                '(',
                ')',
                '[',
                ']',
                '{',
                '}',
                '^',
                '=',
                ';',
                '!',
                "'",
                '+',
                ',',
                '`',
                '~',
                '|',
                '<',
                '>',
                '"'
            ];
            let needsQuotes = false;
            for (const __char of arg)if (cmdSpecialChars.some((x)=>x === __char
            )) {
                needsQuotes = true;
                break;
            }
            // short-circuit if quotes not needed
            if (!needsQuotes) return arg;
            // the following quoting rules are very similar to the rules that by libuv applies.
            //
            // 1) wrap the string in quotes
            //
            // 2) double-up quotes - i.e. " => ""
            //
            //    this is different from the libuv quoting rules. libuv replaces " with \", which unfortunately
            //    doesn't work well with a cmd.exe command line.
            //
            //    note, replacing " with "" also works well if the arg is passed to a downstream .NET console app.
            //    for example, the command line:
            //          foo.exe "myarg:""my val"""
            //    is parsed by a .NET console app into an arg array:
            //          [ "myarg:\"my val\"" ]
            //    which is the same end result when applying libuv quoting rules. although the actual
            //    command line from libuv quoting rules would look like:
            //          foo.exe "myarg:\"my val\""
            //
            // 3) double-up slashes that precede a quote,
            //    e.g.  hello \world    => "hello \world"
            //          hello\"world    => "hello\\""world"
            //          hello\\"world   => "hello\\\\""world"
            //          hello world\    => "hello world\\"
            //
            //    technically this is not required for a cmd.exe command line, or the batch argument parser.
            //    the reasons for including this as a .cmd quoting rule are:
            //
            //    a) this is optimized for the scenario where the argument is passed from the .cmd file to an
            //       external program. many programs (e.g. .NET console apps) rely on the slash-doubling rule.
            //
            //    b) it's what we've been doing previously (by deferring to node default behavior) and we
            //       haven't heard any complaints about that aspect.
            //
            // note, a weakness of the quoting rules chosen here, is that % is not escaped. in fact, % cannot be
            // escaped when used on the command line directly - even though within a .cmd file % can be escaped
            // by using %%.
            //
            // the saving grace is, on the command line, %var% is left as-is if var is not defined. this contrasts
            // the line parsing rules within a .cmd file, where if var is not defined it is replaced with nothing.
            //
            // one option that was explored was replacing % with ^% - i.e. %var% => ^%var^%. this hack would
            // often work, since it is unlikely that var^ would exist, and the ^ character is removed when the
            // variable is used. the problem, however, is that ^ is not removed when %* is used to pass the args
            // to an external program.
            //
            // an unexplored potential solution for the % escaping problem, is to create a wrapper .cmd file.
            // % can be escaped within a .cmd file.
            let reverse = '"';
            let quoteHit = true;
            for(let i = arg.length; i > 0; i--){
                // walk the string in reverse
                reverse += arg[i - 1];
                if (quoteHit && arg[i - 1] === '\\') reverse += '\\'; // double the slash
                else if (arg[i - 1] === '"') {
                    quoteHit = true;
                    reverse += '"'; // double the quote
                } else quoteHit = false;
            }
            reverse += '"';
            return reverse.split('').reverse().join('');
        }
        _uvQuoteCmdArg(arg) {
            // Tool runner wraps child_process.spawn() and needs to apply the same quoting as
            // Node in certain cases where the undocumented spawn option windowsVerbatimArguments
            // is used.
            //
            // Since this function is a port of quote_cmd_arg from Node 4.x (technically, lib UV,
            // see https://github.com/nodejs/node/blob/v4.x/deps/uv/src/win/process.c for details),
            // pasting copyright notice from Node within this function:
            //
            //      Copyright Joyent, Inc. and other Node contributors. All rights reserved.
            //
            //      Permission is hereby granted, free of charge, to any person obtaining a copy
            //      of this software and associated documentation files (the "Software"), to
            //      deal in the Software without restriction, including without limitation the
            //      rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
            //      sell copies of the Software, and to permit persons to whom the Software is
            //      furnished to do so, subject to the following conditions:
            //
            //      The above copyright notice and this permission notice shall be included in
            //      all copies or substantial portions of the Software.
            //
            //      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
            //      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
            //      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
            //      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
            //      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
            //      FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
            //      IN THE SOFTWARE.
            if (!arg) // Need double quotation for empty argument
            return '""';
            if (!arg.includes(' ') && !arg.includes('\t') && !arg.includes('"')) // No quotation needed
            return arg;
            if (!arg.includes('"') && !arg.includes('\\')) // No embedded double quotes or backslashes, so I can just wrap
            // quote marks around the whole thing.
            return `"${arg}"`;
            // Expected input/output:
            //   input : hello"world
            //   output: "hello\"world"
            //   input : hello""world
            //   output: "hello\"\"world"
            //   input : hello\world
            //   output: hello\world
            //   input : hello\\world
            //   output: hello\\world
            //   input : hello\"world
            //   output: "hello\\\"world"
            //   input : hello\\"world
            //   output: "hello\\\\\"world"
            //   input : hello world\
            //   output: "hello world\\" - note the comment in libuv actually reads "hello world\"
            //                             but it appears the comment is wrong, it should be "hello world\\"
            let reverse = '"';
            let quoteHit = true;
            for(let i = arg.length; i > 0; i--){
                // walk the string in reverse
                reverse += arg[i - 1];
                if (quoteHit && arg[i - 1] === '\\') reverse += '\\';
                else if (arg[i - 1] === '"') {
                    quoteHit = true;
                    reverse += '\\';
                } else quoteHit = false;
            }
            reverse += '"';
            return reverse.split('').reverse().join('');
        }
        _cloneExecOptions(options) {
            options = options || {};
            const result = {
                cwd: options.cwd || process.cwd(),
                env: options.env || process.env,
                silent: options.silent || false,
                windowsVerbatimArguments: options.windowsVerbatimArguments || false,
                failOnStdErr: options.failOnStdErr || false,
                ignoreReturnCode: options.ignoreReturnCode || false,
                delay: options.delay || 10000
            };
            result.outStream = options.outStream || process.stdout;
            result.errStream = options.errStream || process.stderr;
            return result;
        }
        _getSpawnOptions(options, toolPath) {
            options = options || {};
            const result = {};
            result.cwd = options.cwd;
            result.env = options.env;
            result['windowsVerbatimArguments'] = options.windowsVerbatimArguments || this._isCmdFile();
            if (options.windowsVerbatimArguments) result.argv0 = `"${toolPath}"`;
            return result;
        }
        /**
     * Exec a tool.
     * Output will be streamed to the live console.
     * Returns promise with return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See ExecOptions
     * @returns   number
     */ exec() {
            return __awaiter(this, void 0, void 0, function*() {
                // root the tool path if it is unrooted and contains relative pathing
                if (!ioUtil.isRooted(this.toolPath) && (this.toolPath.includes('/') || IS_WINDOWS && this.toolPath.includes('\\'))) // prefer options.cwd if it is specified, however options.cwd may also need to be rooted
                this.toolPath = path.resolve(process.cwd(), this.options.cwd || process.cwd(), this.toolPath);
                // if the tool is only a file name, then resolve it from the PATH
                // otherwise verify it exists (add extension on Windows if necessary)
                this.toolPath = yield io.which(this.toolPath, true);
                return new Promise((resolve, reject)=>__awaiter(this, void 0, void 0, function*() {
                        this._debug(`exec tool: ${this.toolPath}`);
                        this._debug('arguments:');
                        for (const arg of this.args)this._debug(`   ${arg}`);
                        const optionsNonNull = this._cloneExecOptions(this.options);
                        if (!optionsNonNull.silent && optionsNonNull.outStream) optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
                        const state = new ExecState(optionsNonNull, this.toolPath);
                        state.on('debug', (message)=>{
                            this._debug(message);
                        });
                        if (this.options.cwd && !(yield ioUtil.exists(this.options.cwd))) return reject(new Error(`The cwd: ${this.options.cwd} does not exist!`));
                        const fileName = this._getSpawnFileName();
                        const cp = child.spawn(fileName, this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(this.options, fileName));
                        let stdbuffer = '';
                        if (cp.stdout) cp.stdout.on('data', (data)=>{
                            if (this.options.listeners && this.options.listeners.stdout) this.options.listeners.stdout(data);
                            if (!optionsNonNull.silent && optionsNonNull.outStream) optionsNonNull.outStream.write(data);
                            stdbuffer = this._processLineBuffer(data, stdbuffer, (line)=>{
                                if (this.options.listeners && this.options.listeners.stdline) this.options.listeners.stdline(line);
                            });
                        });
                        let errbuffer = '';
                        if (cp.stderr) cp.stderr.on('data', (data)=>{
                            state.processStderr = true;
                            if (this.options.listeners && this.options.listeners.stderr) this.options.listeners.stderr(data);
                            if (!optionsNonNull.silent && optionsNonNull.errStream && optionsNonNull.outStream) {
                                const s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                                s.write(data);
                            }
                            errbuffer = this._processLineBuffer(data, errbuffer, (line)=>{
                                if (this.options.listeners && this.options.listeners.errline) this.options.listeners.errline(line);
                            });
                        });
                        cp.on('error', (err)=>{
                            state.processError = err.message;
                            state.processExited = true;
                            state.processClosed = true;
                            state.CheckComplete();
                        });
                        cp.on('exit', (code)=>{
                            state.processExitCode = code;
                            state.processExited = true;
                            this._debug(`Exit code ${code} received from tool '${this.toolPath}'`);
                            state.CheckComplete();
                        });
                        cp.on('close', (code)=>{
                            state.processExitCode = code;
                            state.processExited = true;
                            state.processClosed = true;
                            this._debug(`STDIO streams have closed for tool '${this.toolPath}'`);
                            state.CheckComplete();
                        });
                        state.on('done', (error, exitCode)=>{
                            if (stdbuffer.length > 0) this.emit('stdline', stdbuffer);
                            if (errbuffer.length > 0) this.emit('errline', errbuffer);
                            cp.removeAllListeners();
                            if (error) reject(error);
                            else resolve(exitCode);
                        });
                        if (this.options.input) {
                            if (!cp.stdin) throw new Error('child process missing stdin');
                            cp.stdin.end(this.options.input);
                        }
                    })
                );
            });
        }
    }
    exports.ToolRunner = ToolRunner;
    /**
 * Convert an arg string to an array of args. Handles escaping
 *
 * @param    argString   string of arguments
 * @returns  string[]    array of arguments
 */ function argStringToArray(argString) {
        const args = [];
        let inQuotes = false;
        let escaped = false;
        let arg = '';
        function append(c) {
            // we only escape double quotes.
            if (escaped && c !== '"') arg += '\\';
            arg += c;
            escaped = false;
        }
        for(let i = 0; i < argString.length; i++){
            const c = argString.charAt(i);
            if (c === '"') {
                if (!escaped) inQuotes = !inQuotes;
                else append(c);
                continue;
            }
            if (c === '\\' && escaped) {
                append(c);
                continue;
            }
            if (c === '\\' && inQuotes) {
                escaped = true;
                continue;
            }
            if (c === ' ' && !inQuotes) {
                if (arg.length > 0) {
                    args.push(arg);
                    arg = '';
                }
                continue;
            }
            append(c);
        }
        if (arg.length > 0) args.push(arg.trim());
        return args;
    }
    exports.argStringToArray = argStringToArray;
    class ExecState extends events.EventEmitter {
        constructor(options, toolPath){
            super();
            this.processClosed = false; // tracks whether the process has exited and stdio is closed
            this.processError = '';
            this.processExitCode = 0;
            this.processExited = false; // tracks whether the process has exited
            this.processStderr = false; // tracks whether stderr was written to
            this.delay = 10000; // 10 seconds
            this.done = false;
            this.timeout = null;
            if (!toolPath) throw new Error('toolPath must not be empty');
            this.options = options;
            this.toolPath = toolPath;
            if (options.delay) this.delay = options.delay;
        }
        CheckComplete() {
            if (this.done) return;
            if (this.processClosed) this._setResult();
            else if (this.processExited) this.timeout = timers_1.setTimeout(ExecState.HandleTimeout, this.delay, this);
        }
        _debug(message) {
            this.emit('debug', message);
        }
        _setResult() {
            // determine whether there is an error
            let error;
            if (this.processExited) {
                if (this.processError) error = new Error(`There was an error when attempting to execute the process '${this.toolPath}'. This may indicate the process failed to start. Error: ${this.processError}`);
                else if (this.processExitCode !== 0 && !this.options.ignoreReturnCode) error = new Error(`The process '${this.toolPath}' failed with exit code ${this.processExitCode}`);
                else if (this.processStderr && this.options.failOnStdErr) error = new Error(`The process '${this.toolPath}' failed because one or more lines were written to the STDERR stream`);
            }
            // clear the timeout
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            this.done = true;
            this.emit('done', error, this.processExitCode);
        }
        static HandleTimeout(state) {
            if (state.done) return;
            if (!state.processClosed && state.processExited) {
                const message = `The STDIO streams did not close within ${state.delay / 1000} seconds of the exit event from process '${state.toolPath}'. This may indicate a child process inherited the STDIO streams and has not yet exited.`;
                state._debug(message);
            }
            state._setResult();
        }
    } //# sourceMappingURL=toolrunner.js.map
});
var load13 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getExecOutput = exports.exec = void 0;
    const string_decoder_1 = require("string_decoder");
    const tr = __importStar(load12());
    /**
 * Exec a command.
 * Output will be streamed to the live console.
 * Returns promise with return code
 *
 * @param     commandLine        command to execute (can include additional args). Must be correctly escaped.
 * @param     args               optional arguments for tool. Escaping is handled by the lib.
 * @param     options            optional exec options.  See ExecOptions
 * @returns   Promise<number>    exit code
 */ function exec(commandLine, args, options) {
        return __awaiter(this, void 0, void 0, function*() {
            const commandArgs = tr.argStringToArray(commandLine);
            if (commandArgs.length === 0) throw new Error(`Parameter 'commandLine' cannot be null or empty.`);
            // Path to tool to execute should be first arg
            const toolPath = commandArgs[0];
            args = commandArgs.slice(1).concat(args || []);
            const runner = new tr.ToolRunner(toolPath, args, options);
            return runner.exec();
        });
    }
    exports.exec = exec;
    /**
 * Exec a command and get the output.
 * Output will be streamed to the live console.
 * Returns promise with the exit code and collected stdout and stderr
 *
 * @param     commandLine           command to execute (can include additional args). Must be correctly escaped.
 * @param     args                  optional arguments for tool. Escaping is handled by the lib.
 * @param     options               optional exec options.  See ExecOptions
 * @returns   Promise<ExecOutput>   exit code, stdout, and stderr
 */ function getExecOutput(commandLine, args, options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function*() {
            let stdout = '';
            let stderr = '';
            //Using string decoder covers the case where a mult-byte character is split
            const stdoutDecoder = new string_decoder_1.StringDecoder('utf8');
            const stderrDecoder = new string_decoder_1.StringDecoder('utf8');
            const originalStdoutListener = (_a = options === null || options === void 0 ? void 0 : options.listeners) === null || _a === void 0 ? void 0 : _a.stdout;
            const originalStdErrListener = (_b = options === null || options === void 0 ? void 0 : options.listeners) === null || _b === void 0 ? void 0 : _b.stderr;
            const stdErrListener = (data)=>{
                stderr += stderrDecoder.write(data);
                if (originalStdErrListener) originalStdErrListener(data);
            };
            const stdOutListener = (data)=>{
                stdout += stdoutDecoder.write(data);
                if (originalStdoutListener) originalStdoutListener(data);
            };
            const listeners = Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.listeners), {
                stdout: stdOutListener,
                stderr: stdErrListener
            });
            const exitCode = yield exec(commandLine, args, Object.assign(Object.assign({}, options), {
                listeners
            }));
            //flush any remaining characters
            stdout += stdoutDecoder.end();
            stderr += stderrDecoder.end();
            return {
                exitCode,
                stdout,
                stderr
            };
        });
    }
    exports.getExecOutput = getExecOutput; //# sourceMappingURL=exec.js.map
});
var load14 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.toCommandValue = void 0;
    /**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */ function toCommandValue(input) {
        if (input === null || input === undefined) return '';
        else if (typeof input === 'string' || input instanceof String) return input;
        return JSON.stringify(input);
    }
    exports.toCommandValue = toCommandValue; //# sourceMappingURL=utils.js.map
});
var load15 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issue = exports.issueCommand = void 0;
    const os = __importStar(require("os"));
    const utils_1 = load14();
    /**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */ function issueCommand(command, properties, message) {
        const cmd = new Command(command, properties, message);
        process.stdout.write(cmd.toString() + os.EOL);
    }
    exports.issueCommand = issueCommand;
    function issue(name, message = '') {
        issueCommand(name, {}, message);
    }
    exports.issue = issue;
    const CMD_STRING = '::';
    class Command {
        constructor(command, properties, message){
            if (!command) command = 'missing.command';
            this.command = command;
            this.properties = properties;
            this.message = message;
        }
        toString() {
            let cmdStr = CMD_STRING + this.command;
            if (this.properties && Object.keys(this.properties).length > 0) {
                cmdStr += ' ';
                let first = true;
                for(const key in this.properties)if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) first = false;
                        else cmdStr += ',';
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
            cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
            return cmdStr;
        }
    }
    function escapeData(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    }
    function escapeProperty(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
    } //# sourceMappingURL=command.js.map
});
var load16 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // For internal use, subject to change.
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issueCommand = void 0;
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ const fs = __importStar(require("fs"));
    const os = __importStar(require("os"));
    const utils_1 = load14();
    function issueCommand(command, message) {
        const filePath = process.env[`GITHUB_${command}`];
        if (!filePath) throw new Error(`Unable to find environment variable for file command ${command}`);
        if (!fs.existsSync(filePath)) throw new Error(`Missing file at path: ${filePath}`);
        fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
            encoding: 'utf8'
        });
    }
    exports.issueCommand = issueCommand; //# sourceMappingURL=file-command.js.map
});
var load17 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
    const command_1 = load15();
    const file_command_1 = load16();
    const utils_1 = load14();
    const os = __importStar(require("os"));
    const path = __importStar(require("path"));
    /**
 * The code to exit an action
 */ var ExitCode2;
    (function(ExitCode) {
        /**
     * A code indicating that the action was successful
     */ ExitCode[ExitCode["Success"] = 0] = "Success";
        /**
     * A code indicating that the action was a failure
     */ ExitCode[ExitCode["Failure"] = 1] = "Failure";
    })(ExitCode2 = exports.ExitCode || (exports.ExitCode = {}));
    //-----------------------------------------------------------------------
    // Variables
    //-----------------------------------------------------------------------
    /**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function exportVariable(name, val) {
        const convertedVal = utils_1.toCommandValue(val);
        process.env[name] = convertedVal;
        const filePath = process.env['GITHUB_ENV'] || '';
        if (filePath) {
            const delimiter = '_GitHubActionsFileCommandDelimeter_';
            const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
            file_command_1.issueCommand('ENV', commandValue);
        } else command_1.issueCommand('set-env', {
            name
        }, convertedVal);
    }
    exports.exportVariable = exportVariable;
    /**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */ function setSecret(secret) {
        command_1.issueCommand('add-mask', {}, secret);
    }
    exports.setSecret = setSecret;
    /**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */ function addPath(inputPath) {
        const filePath = process.env['GITHUB_PATH'] || '';
        if (filePath) file_command_1.issueCommand('PATH', inputPath);
        else command_1.issueCommand('add-path', {}, inputPath);
        process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
    }
    exports.addPath = addPath;
    /**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */ function getInput(name, options) {
        const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
        if (options && options.required && !val) throw new Error(`Input required and not supplied: ${name}`);
        if (options && options.trimWhitespace === false) return val;
        return val.trim();
    }
    exports.getInput = getInput;
    /**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */ function getMultilineInput(name, options) {
        const inputs = getInput(name, options).split('\n').filter((x)=>x !== ''
        );
        return inputs;
    }
    exports.getMultilineInput = getMultilineInput;
    /**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */ function getBooleanInput(name, options) {
        const trueValue = [
            'true',
            'True',
            'TRUE'
        ];
        const falseValue = [
            'false',
            'False',
            'FALSE'
        ];
        const val = getInput(name, options);
        if (trueValue.includes(val)) return true;
        if (falseValue.includes(val)) return false;
        throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` + `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
    }
    exports.getBooleanInput = getBooleanInput;
    /**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setOutput(name, value) {
        process.stdout.write(os.EOL);
        command_1.issueCommand('set-output', {
            name
        }, value);
    }
    exports.setOutput = setOutput;
    /**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */ function setCommandEcho(enabled) {
        command_1.issue('echo', enabled ? 'on' : 'off');
    }
    exports.setCommandEcho = setCommandEcho;
    //-----------------------------------------------------------------------
    // Results
    //-----------------------------------------------------------------------
    /**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */ function setFailed(message) {
        process.exitCode = ExitCode2.Failure;
        error(message);
    }
    exports.setFailed = setFailed;
    //-----------------------------------------------------------------------
    // Logging Commands
    //-----------------------------------------------------------------------
    /**
 * Gets whether Actions Step Debug is on or not
 */ function isDebug() {
        return process.env['RUNNER_DEBUG'] === '1';
    }
    exports.isDebug = isDebug;
    /**
 * Writes debug message to user log
 * @param message debug message
 */ function debug(message) {
        command_1.issueCommand('debug', {}, message);
    }
    exports.debug = debug;
    /**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */ function error(message) {
        command_1.issue('error', message instanceof Error ? message.toString() : message);
    }
    exports.error = error;
    /**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */ function warning(message) {
        command_1.issue('warning', message instanceof Error ? message.toString() : message);
    }
    exports.warning = warning;
    /**
 * Writes info to log with console.log.
 * @param message info message
 */ function info(message) {
        process.stdout.write(message + os.EOL);
    }
    exports.info = info;
    /**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */ function startGroup(name) {
        command_1.issue('group', name);
    }
    exports.startGroup = startGroup;
    /**
 * End an output group.
 */ function endGroup() {
        command_1.issue('endgroup');
    }
    exports.endGroup = endGroup;
    /**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */ function group(name, fn) {
        return __awaiter(this, void 0, void 0, function*() {
            startGroup(name);
            let result;
            try {
                result = yield fn();
            } finally{
                endGroup();
            }
            return result;
        });
    }
    exports.group = group;
    //-----------------------------------------------------------------------
    // Wrapper action state
    //-----------------------------------------------------------------------
    /**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function saveState(name, value) {
        command_1.issueCommand('save-state', {
            name
        }, value);
    }
    exports.saveState = saveState;
    /**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */ function getState(name) {
        return process.env[`STATE_${name}`] || '';
    }
    exports.getState = getState; //# sourceMappingURL=core.js.map
});
var load18 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.toCommandValue = void 0;
    /**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */ function toCommandValue(input) {
        if (input === null || input === undefined) return '';
        else if (typeof input === 'string' || input instanceof String) return input;
        return JSON.stringify(input);
    }
    exports.toCommandValue = toCommandValue; //# sourceMappingURL=utils.js.map
});
var load19 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issue = exports.issueCommand = void 0;
    const os = __importStar(require("os"));
    const utils_1 = load18();
    /**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */ function issueCommand(command, properties, message) {
        const cmd = new Command(command, properties, message);
        process.stdout.write(cmd.toString() + os.EOL);
    }
    exports.issueCommand = issueCommand;
    function issue(name, message = '') {
        issueCommand(name, {}, message);
    }
    exports.issue = issue;
    const CMD_STRING = '::';
    class Command {
        constructor(command, properties, message){
            if (!command) command = 'missing.command';
            this.command = command;
            this.properties = properties;
            this.message = message;
        }
        toString() {
            let cmdStr = CMD_STRING + this.command;
            if (this.properties && Object.keys(this.properties).length > 0) {
                cmdStr += ' ';
                let first = true;
                for(const key in this.properties)if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) first = false;
                        else cmdStr += ',';
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
            cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
            return cmdStr;
        }
    }
    function escapeData(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    }
    function escapeProperty(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
    } //# sourceMappingURL=command.js.map
});
var load20 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // For internal use, subject to change.
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issueCommand = void 0;
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ const fs = __importStar(require("fs"));
    const os = __importStar(require("os"));
    const utils_1 = load18();
    function issueCommand(command, message) {
        const filePath = process.env[`GITHUB_${command}`];
        if (!filePath) throw new Error(`Unable to find environment variable for file command ${command}`);
        if (!fs.existsSync(filePath)) throw new Error(`Missing file at path: ${filePath}`);
        fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
            encoding: 'utf8'
        });
    }
    exports.issueCommand = issueCommand; //# sourceMappingURL=file-command.js.map
});
var load21 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
    const command_1 = load19();
    const file_command_1 = load20();
    const utils_1 = load18();
    const os = __importStar(require("os"));
    const path = __importStar(require("path"));
    /**
 * The code to exit an action
 */ var ExitCode3;
    (function(ExitCode) {
        /**
     * A code indicating that the action was successful
     */ ExitCode[ExitCode["Success"] = 0] = "Success";
        /**
     * A code indicating that the action was a failure
     */ ExitCode[ExitCode["Failure"] = 1] = "Failure";
    })(ExitCode3 = exports.ExitCode || (exports.ExitCode = {}));
    //-----------------------------------------------------------------------
    // Variables
    //-----------------------------------------------------------------------
    /**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function exportVariable(name, val) {
        const convertedVal = utils_1.toCommandValue(val);
        process.env[name] = convertedVal;
        const filePath = process.env['GITHUB_ENV'] || '';
        if (filePath) {
            const delimiter = '_GitHubActionsFileCommandDelimeter_';
            const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
            file_command_1.issueCommand('ENV', commandValue);
        } else command_1.issueCommand('set-env', {
            name
        }, convertedVal);
    }
    exports.exportVariable = exportVariable;
    /**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */ function setSecret(secret) {
        command_1.issueCommand('add-mask', {}, secret);
    }
    exports.setSecret = setSecret;
    /**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */ function addPath(inputPath) {
        const filePath = process.env['GITHUB_PATH'] || '';
        if (filePath) file_command_1.issueCommand('PATH', inputPath);
        else command_1.issueCommand('add-path', {}, inputPath);
        process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
    }
    exports.addPath = addPath;
    /**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */ function getInput(name, options) {
        const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
        if (options && options.required && !val) throw new Error(`Input required and not supplied: ${name}`);
        if (options && options.trimWhitespace === false) return val;
        return val.trim();
    }
    exports.getInput = getInput;
    /**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */ function getMultilineInput(name, options) {
        const inputs = getInput(name, options).split('\n').filter((x)=>x !== ''
        );
        return inputs;
    }
    exports.getMultilineInput = getMultilineInput;
    /**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */ function getBooleanInput(name, options) {
        const trueValue = [
            'true',
            'True',
            'TRUE'
        ];
        const falseValue = [
            'false',
            'False',
            'FALSE'
        ];
        const val = getInput(name, options);
        if (trueValue.includes(val)) return true;
        if (falseValue.includes(val)) return false;
        throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` + `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
    }
    exports.getBooleanInput = getBooleanInput;
    /**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setOutput(name, value) {
        process.stdout.write(os.EOL);
        command_1.issueCommand('set-output', {
            name
        }, value);
    }
    exports.setOutput = setOutput;
    /**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */ function setCommandEcho(enabled) {
        command_1.issue('echo', enabled ? 'on' : 'off');
    }
    exports.setCommandEcho = setCommandEcho;
    //-----------------------------------------------------------------------
    // Results
    //-----------------------------------------------------------------------
    /**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */ function setFailed(message) {
        process.exitCode = ExitCode3.Failure;
        error(message);
    }
    exports.setFailed = setFailed;
    //-----------------------------------------------------------------------
    // Logging Commands
    //-----------------------------------------------------------------------
    /**
 * Gets whether Actions Step Debug is on or not
 */ function isDebug() {
        return process.env['RUNNER_DEBUG'] === '1';
    }
    exports.isDebug = isDebug;
    /**
 * Writes debug message to user log
 * @param message debug message
 */ function debug(message) {
        command_1.issueCommand('debug', {}, message);
    }
    exports.debug = debug;
    /**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */ function error(message) {
        command_1.issue('error', message instanceof Error ? message.toString() : message);
    }
    exports.error = error;
    /**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */ function warning(message) {
        command_1.issue('warning', message instanceof Error ? message.toString() : message);
    }
    exports.warning = warning;
    /**
 * Writes info to log with console.log.
 * @param message info message
 */ function info(message) {
        process.stdout.write(message + os.EOL);
    }
    exports.info = info;
    /**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */ function startGroup(name) {
        command_1.issue('group', name);
    }
    exports.startGroup = startGroup;
    /**
 * End an output group.
 */ function endGroup() {
        command_1.issue('endgroup');
    }
    exports.endGroup = endGroup;
    /**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */ function group(name, fn) {
        return __awaiter(this, void 0, void 0, function*() {
            startGroup(name);
            let result;
            try {
                result = yield fn();
            } finally{
                endGroup();
            }
            return result;
        });
    }
    exports.group = group;
    //-----------------------------------------------------------------------
    // Wrapper action state
    //-----------------------------------------------------------------------
    /**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function saveState(name, value) {
        command_1.issueCommand('save-state', {
            name
        }, value);
    }
    exports.saveState = saveState;
    /**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */ function getState(name) {
        return process.env[`STATE_${name}`] || '';
    }
    exports.getState = getState; //# sourceMappingURL=core.js.map
});
var load22 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getOptions = void 0;
    const core = __importStar(load21());
    /**
 * Returns a copy with defaults filled in.
 */ function getOptions(copy) {
        const result = {
            followSymbolicLinks: true,
            implicitDescendants: true,
            omitBrokenSymbolicLinks: true
        };
        if (copy) {
            if (typeof copy.followSymbolicLinks === 'boolean') {
                result.followSymbolicLinks = copy.followSymbolicLinks;
                core.debug(`followSymbolicLinks '${result.followSymbolicLinks}'`);
            }
            if (typeof copy.implicitDescendants === 'boolean') {
                result.implicitDescendants = copy.implicitDescendants;
                core.debug(`implicitDescendants '${result.implicitDescendants}'`);
            }
            if (typeof copy.omitBrokenSymbolicLinks === 'boolean') {
                result.omitBrokenSymbolicLinks = copy.omitBrokenSymbolicLinks;
                core.debug(`omitBrokenSymbolicLinks '${result.omitBrokenSymbolicLinks}'`);
            }
        }
        return result;
    }
    exports.getOptions = getOptions; //# sourceMappingURL=internal-glob-options-helper.js.map
});
var load23 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __importDefault = this && this.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : {
            "default": mod
        };
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.safeTrimTrailingSeparator = exports.normalizeSeparators = exports.hasRoot = exports.hasAbsoluteRoot = exports.ensureAbsoluteRoot = exports.dirname = void 0;
    const path = __importStar(require("path"));
    const assert_1 = __importDefault(require("assert"));
    const IS_WINDOWS = process.platform === 'win32';
    /**
 * Similar to path.dirname except normalizes the path separators and slightly better handling for Windows UNC paths.
 *
 * For example, on Linux/macOS:
 * - `/               => /`
 * - `/hello          => /`
 *
 * For example, on Windows:
 * - `C:\             => C:\`
 * - `C:\hello        => C:\`
 * - `C:              => C:`
 * - `C:hello         => C:`
 * - `\               => \`
 * - `\hello          => \`
 * - `\\hello         => \\hello`
 * - `\\hello\world   => \\hello\world`
 */ function dirname(p) {
        // Normalize slashes and trim unnecessary trailing slash
        p = safeTrimTrailingSeparator(p);
        // Windows UNC root, e.g. \\hello or \\hello\world
        if (IS_WINDOWS && /^\\\\[^\\]+(\\[^\\]+)?$/.test(p)) return p;
        // Get dirname
        let result = path.dirname(p);
        // Trim trailing slash for Windows UNC root, e.g. \\hello\world\
        if (IS_WINDOWS && /^\\\\[^\\]+\\[^\\]+\\$/.test(result)) result = safeTrimTrailingSeparator(result);
        return result;
    }
    exports.dirname = dirname;
    /**
 * Roots the path if not already rooted. On Windows, relative roots like `\`
 * or `C:` are expanded based on the current working directory.
 */ function ensureAbsoluteRoot(root, itemPath) {
        assert_1.default(root, `ensureAbsoluteRoot parameter 'root' must not be empty`);
        assert_1.default(itemPath, `ensureAbsoluteRoot parameter 'itemPath' must not be empty`);
        // Already rooted
        if (hasAbsoluteRoot(itemPath)) return itemPath;
        // Windows
        if (IS_WINDOWS) {
            // Check for itemPath like C: or C:foo
            if (itemPath.match(/^[A-Z]:[^\\/]|^[A-Z]:$/i)) {
                let cwd = process.cwd();
                assert_1.default(cwd.match(/^[A-Z]:\\/i), `Expected current directory to start with an absolute drive root. Actual '${cwd}'`);
                // Drive letter matches cwd? Expand to cwd
                if (itemPath[0].toUpperCase() === cwd[0].toUpperCase()) {
                    // Drive only, e.g. C:
                    if (itemPath.length === 2) // Preserve specified drive letter case (upper or lower)
                    return `${itemPath[0]}:\\${cwd.substr(3)}`;
                    else {
                        if (!cwd.endsWith('\\')) cwd += '\\';
                        // Preserve specified drive letter case (upper or lower)
                        return `${itemPath[0]}:\\${cwd.substr(3)}${itemPath.substr(2)}`;
                    }
                } else return `${itemPath[0]}:\\${itemPath.substr(2)}`;
            } else if (normalizeSeparators(itemPath).match(/^\\$|^\\[^\\]/)) {
                const cwd = process.cwd();
                assert_1.default(cwd.match(/^[A-Z]:\\/i), `Expected current directory to start with an absolute drive root. Actual '${cwd}'`);
                return `${cwd[0]}:\\${itemPath.substr(1)}`;
            }
        }
        assert_1.default(hasAbsoluteRoot(root), `ensureAbsoluteRoot parameter 'root' must have an absolute root`);
        // Otherwise ensure root ends with a separator
        if (root.endsWith('/') || IS_WINDOWS && root.endsWith('\\')) ;
        else // Append separator
        root += path.sep;
        return root + itemPath;
    }
    exports.ensureAbsoluteRoot = ensureAbsoluteRoot;
    /**
 * On Linux/macOS, true if path starts with `/`. On Windows, true for paths like:
 * `\\hello\share` and `C:\hello` (and using alternate separator).
 */ function hasAbsoluteRoot(itemPath) {
        assert_1.default(itemPath, `hasAbsoluteRoot parameter 'itemPath' must not be empty`);
        // Normalize separators
        itemPath = normalizeSeparators(itemPath);
        // Windows
        if (IS_WINDOWS) // E.g. \\hello\share or C:\hello
        return itemPath.startsWith('\\\\') || /^[A-Z]:\\/i.test(itemPath);
        // E.g. /hello
        return itemPath.startsWith('/');
    }
    exports.hasAbsoluteRoot = hasAbsoluteRoot;
    /**
 * On Linux/macOS, true if path starts with `/`. On Windows, true for paths like:
 * `\`, `\hello`, `\\hello\share`, `C:`, and `C:\hello` (and using alternate separator).
 */ function hasRoot(itemPath) {
        assert_1.default(itemPath, `isRooted parameter 'itemPath' must not be empty`);
        // Normalize separators
        itemPath = normalizeSeparators(itemPath);
        // Windows
        if (IS_WINDOWS) // E.g. \ or \hello or \\hello
        // E.g. C: or C:\hello
        return itemPath.startsWith('\\') || /^[A-Z]:/i.test(itemPath);
        // E.g. /hello
        return itemPath.startsWith('/');
    }
    exports.hasRoot = hasRoot;
    /**
 * Removes redundant slashes and converts `/` to `\` on Windows
 */ function normalizeSeparators(p) {
        p = p || '';
        // Windows
        if (IS_WINDOWS) {
            // Convert slashes on Windows
            p = p.replace(/\//g, '\\');
            // Remove redundant slashes
            const isUnc = /^\\\\+[^\\]/.test(p); // e.g. \\hello
            return (isUnc ? '\\' : '') + p.replace(/\\\\+/g, '\\'); // preserve leading \\ for UNC
        }
        // Remove redundant slashes
        return p.replace(/\/\/+/g, '/');
    }
    exports.normalizeSeparators = normalizeSeparators;
    /**
 * Normalizes the path separators and trims the trailing separator (when safe).
 * For example, `/foo/ => /foo` but `/ => /`
 */ function safeTrimTrailingSeparator(p) {
        // Short-circuit if empty
        if (!p) return '';
        // Normalize separators
        p = normalizeSeparators(p);
        // No trailing slash
        if (!p.endsWith(path.sep)) return p;
        // Check '/' on Linux/macOS and '\' on Windows
        if (p === path.sep) return p;
        // On Windows check if drive root. E.g. C:\
        if (IS_WINDOWS && /^[A-Z]:\\$/i.test(p)) return p;
        // Otherwise trim trailing slash
        return p.substr(0, p.length - 1);
    }
    exports.safeTrimTrailingSeparator = safeTrimTrailingSeparator; //# sourceMappingURL=internal-path-helper.js.map
});
var load24 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.MatchKind = void 0;
    /**
 * Indicates whether a pattern matches a path
 */ var MatchKind1;
    (function(MatchKind) {
        /** Not matched */ MatchKind[MatchKind["None"] = 0] = "None";
        /** Matched if the path is a directory */ MatchKind[MatchKind["Directory"] = 1] = "Directory";
        /** Matched if the path is a regular file */ MatchKind[MatchKind["File"] = 2] = "File";
        /** Matched */ MatchKind[MatchKind["All"] = 3] = "All";
    })(MatchKind1 = exports.MatchKind || (exports.MatchKind = {})); //# sourceMappingURL=internal-match-kind.js.map
});
var load25 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.partialMatch = exports.match = exports.getSearchPaths = void 0;
    const pathHelper = __importStar(load23());
    const internal_match_kind_1 = load24();
    const IS_WINDOWS = process.platform === 'win32';
    /**
 * Given an array of patterns, returns an array of paths to search.
 * Duplicates and paths under other included paths are filtered out.
 */ function getSearchPaths(patterns) {
        // Ignore negate patterns
        patterns = patterns.filter((x)=>!x.negate
        );
        // Create a map of all search paths
        const searchPathMap = {};
        for (const pattern of patterns){
            const key = IS_WINDOWS ? pattern.searchPath.toUpperCase() : pattern.searchPath;
            searchPathMap[key] = 'candidate';
        }
        const result = [];
        for (const pattern1 of patterns){
            // Check if already included
            const key = IS_WINDOWS ? pattern1.searchPath.toUpperCase() : pattern1.searchPath;
            if (searchPathMap[key] === 'included') continue;
            // Check for an ancestor search path
            let foundAncestor = false;
            let tempKey = key;
            let parent = pathHelper.dirname(tempKey);
            while(parent !== tempKey){
                if (searchPathMap[parent]) {
                    foundAncestor = true;
                    break;
                }
                tempKey = parent;
                parent = pathHelper.dirname(tempKey);
            }
            // Include the search pattern in the result
            if (!foundAncestor) {
                result.push(pattern1.searchPath);
                searchPathMap[key] = 'included';
            }
        }
        return result;
    }
    exports.getSearchPaths = getSearchPaths;
    /**
 * Matches the patterns against the path
 */ function match(patterns, itemPath) {
        let result = internal_match_kind_1.MatchKind.None;
        for (const pattern of patterns)if (pattern.negate) result &= ~pattern.match(itemPath);
        else result |= pattern.match(itemPath);
        return result;
    }
    exports.match = match;
    /**
 * Checks whether to descend further into the directory
 */ function partialMatch(patterns, itemPath) {
        return patterns.some((x)=>!x.negate && x.partialMatch(itemPath)
        );
    }
    exports.partialMatch = partialMatch; //# sourceMappingURL=internal-pattern-helper.js.map
});
var load26 = __swcpack_require__.bind(void 0, function(module, exports) {
    module.exports = function(xs, fn) {
        var res = [];
        for(var i = 0; i < xs.length; i++){
            var x = fn(xs[i], i);
            if (isArray(x)) res.push.apply(res, x);
            else res.push(x);
        }
        return res;
    };
    var isArray = Array.isArray || function(xs) {
        return Object.prototype.toString.call(xs) === '[object Array]';
    };
});
var load27 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    module.exports = balanced;
    function balanced(a, b, str) {
        if (a instanceof RegExp) a = maybeMatch(a, str);
        if (b instanceof RegExp) b = maybeMatch(b, str);
        var r = range(a, b, str);
        return r && {
            start: r[0],
            end: r[1],
            pre: str.slice(0, r[0]),
            body: str.slice(r[0] + a.length, r[1]),
            post: str.slice(r[1] + b.length)
        };
    }
    function maybeMatch(reg, str) {
        var m = str.match(reg);
        return m ? m[0] : null;
    }
    balanced.range = range;
    function range(a, b, str) {
        var begs, beg, left, right, result;
        var ai = str.indexOf(a);
        var bi = str.indexOf(b, ai + 1);
        var i = ai;
        if (ai >= 0 && bi > 0) {
            if (a === b) return [
                ai,
                bi
            ];
            begs = [];
            left = str.length;
            while(i >= 0 && !result){
                if (i == ai) {
                    begs.push(i);
                    ai = str.indexOf(a, i + 1);
                } else if (begs.length == 1) result = [
                    begs.pop(),
                    bi
                ];
                else {
                    beg = begs.pop();
                    if (beg < left) {
                        left = beg;
                        right = bi;
                    }
                    bi = str.indexOf(b, i + 1);
                }
                i = ai < bi && ai >= 0 ? ai : bi;
            }
            if (begs.length) result = [
                left,
                right
            ];
        }
        return result;
    }
});
var load28 = __swcpack_require__.bind(void 0, function(module, exports) {
    var concatMap = load26();
    var balanced = load27();
    module.exports = expandTop;
    var escSlash = '\x00SLASH' + Math.random() + '\x00';
    var escOpen = '\x00OPEN' + Math.random() + '\x00';
    var escClose = '\x00CLOSE' + Math.random() + '\x00';
    var escComma = '\x00COMMA' + Math.random() + '\x00';
    var escPeriod = '\x00PERIOD' + Math.random() + '\x00';
    function numeric(str) {
        return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
    }
    function escapeBraces(str) {
        return str.split('\\\\').join(escSlash).split('\\{').join(escOpen).split('\\}').join(escClose).split('\\,').join(escComma).split('\\.').join(escPeriod);
    }
    function unescapeBraces(str) {
        return str.split(escSlash).join('\\').split(escOpen).join('{').split(escClose).join('}').split(escComma).join(',').split(escPeriod).join('.');
    }
    // Basically just str.split(","), but handling cases
    // where we have nested braced sections, which should be
    // treated as individual members, like {a,{b,c},d}
    function parseCommaParts(str) {
        if (!str) return [
            ''
        ];
        var parts = [];
        var m = balanced('{', '}', str);
        if (!m) return str.split(',');
        var pre = m.pre;
        var body = m.body;
        var post = m.post;
        var p = pre.split(',');
        p[p.length - 1] += '{' + body + '}';
        var postParts = parseCommaParts(post);
        if (post.length) {
            p[p.length - 1] += postParts.shift();
            p.push.apply(p, postParts);
        }
        parts.push.apply(parts, p);
        return parts;
    }
    function expandTop(str) {
        if (!str) return [];
        // I don't know why Bash 4.3 does this, but it does.
        // Anything starting with {} will have the first two bytes preserved
        // but *only* at the top level, so {},a}b will not expand to anything,
        // but a{},b}c will be expanded to [a}c,abc].
        // One could argue that this is a bug in Bash, but since the goal of
        // this module is to match Bash's rules, we escape a leading {}
        if (str.substr(0, 2) === '{}') str = '\\{\\}' + str.substr(2);
        return expand(escapeBraces(str), true).map(unescapeBraces);
    }
    function embrace(str) {
        return '{' + str + '}';
    }
    function isPadded(el) {
        return /^-?0\d/.test(el);
    }
    function lte(i, y) {
        return i <= y;
    }
    function gte(i, y) {
        return i >= y;
    }
    function expand(str, isTop) {
        var expansions = [];
        var m = balanced('{', '}', str);
        if (!m || /\$$/.test(m.pre)) return [
            str
        ];
        var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
        var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
        var isSequence = isNumericSequence || isAlphaSequence;
        var isOptions = m.body.indexOf(',') >= 0;
        if (!isSequence && !isOptions) {
            // {a},b}
            if (m.post.match(/,.*\}/)) {
                str = m.pre + '{' + m.body + escClose + m.post;
                return expand(str);
            }
            return [
                str
            ];
        }
        var n;
        if (isSequence) n = m.body.split(/\.\./);
        else {
            n = parseCommaParts(m.body);
            if (n.length === 1) {
                // x{{a,b}}y ==> x{a}y x{b}y
                n = expand(n[0], false).map(embrace);
                if (n.length === 1) {
                    var post = m.post.length ? expand(m.post, false) : [
                        ''
                    ];
                    return post.map(function(p) {
                        return m.pre + n[0] + p;
                    });
                }
            }
        }
        // at this point, n is the parts, and we know it's not a comma set
        // with a single entry.
        // no need to expand pre, since it is guaranteed to be free of brace-sets
        var pre = m.pre;
        var post = m.post.length ? expand(m.post, false) : [
            ''
        ];
        var N;
        if (isSequence) {
            var x = numeric(n[0]);
            var y = numeric(n[1]);
            var width = Math.max(n[0].length, n[1].length);
            var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
            var test = lte;
            var reverse = y < x;
            if (reverse) {
                incr *= -1;
                test = gte;
            }
            var pad = n.some(isPadded);
            N = [];
            for(var i = x; test(i, y); i += incr){
                var c;
                if (isAlphaSequence) {
                    c = String.fromCharCode(i);
                    if (c === '\\') c = '';
                } else {
                    c = String(i);
                    if (pad) {
                        var need = width - c.length;
                        if (need > 0) {
                            var z = new Array(need + 1).join('0');
                            if (i < 0) c = '-' + z + c.slice(1);
                            else c = z + c;
                        }
                    }
                }
                N.push(c);
            }
        } else N = concatMap(n, function(el) {
            return expand(el, false);
        });
        for(var j = 0; j < N.length; j++)for(var k = 0; k < post.length; k++){
            var expansion = pre + N[j] + post[k];
            if (!isTop || isSequence || expansion) expansions.push(expansion);
        }
        return expansions;
    }
});
var load29 = __swcpack_require__.bind(void 0, function(module, exports) {
    module.exports = minimatch;
    minimatch.Minimatch = Minimatch;
    var path = {
        sep: '/'
    };
    try {
        path = require('path');
    } catch (er) {}
    var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};
    var expand = load28();
    var plTypes = {
        '!': {
            open: '(?:(?!(?:',
            close: '))[^/]*?)'
        },
        '?': {
            open: '(?:',
            close: ')?'
        },
        '+': {
            open: '(?:',
            close: ')+'
        },
        '*': {
            open: '(?:',
            close: ')*'
        },
        '@': {
            open: '(?:',
            close: ')'
        }
    };
    // any single thing other than /
    // don't need to escape / when using new RegExp()
    var qmark = '[^/]';
    // * => any number of characters
    var star = qmark + '*?';
    // ** when dots are allowed.  Anything goes, except .. and .
    // not (^ or / followed by one or two dots followed by $ or /),
    // followed by anything, any number of times.
    var twoStarDot = '(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?';
    // not a ^ or / followed by a dot,
    // followed by anything, any number of times.
    var twoStarNoDot = '(?:(?!(?:\\/|^)\\.).)*?';
    // characters that need to be escaped in RegExp.
    var reSpecials = charSet('().*{}+?[]^$\\!');
    // "abc" -> { a:true, b:true, c:true }
    function charSet(s) {
        return s.split('').reduce(function(set, c) {
            set[c] = true;
            return set;
        }, {});
    }
    // normalizes slashes.
    var slashSplit = /\/+/;
    minimatch.filter = filter;
    function filter(pattern, options) {
        options = options || {};
        return function(p, i, list) {
            return minimatch(p, pattern, options);
        };
    }
    function ext(a, b) {
        a = a || {};
        b = b || {};
        var t = {};
        Object.keys(b).forEach(function(k) {
            t[k] = b[k];
        });
        Object.keys(a).forEach(function(k) {
            t[k] = a[k];
        });
        return t;
    }
    minimatch.defaults = function(def) {
        if (!def || !Object.keys(def).length) return minimatch;
        var orig = minimatch;
        var m = function minimatch(p, pattern, options) {
            return orig.minimatch(p, pattern, ext(def, options));
        };
        m.Minimatch = function Minimatch(pattern, options) {
            return new orig.Minimatch(pattern, ext(def, options));
        };
        return m;
    };
    Minimatch.defaults = function(def) {
        if (!def || !Object.keys(def).length) return Minimatch;
        return minimatch.defaults(def).Minimatch;
    };
    function minimatch(p, pattern, options) {
        if (typeof pattern !== 'string') throw new TypeError('glob pattern string required');
        if (!options) options = {};
        // shortcut: comments match nothing.
        if (!options.nocomment && pattern.charAt(0) === '#') return false;
        // "" only matches ""
        if (pattern.trim() === '') return p === '';
        return new Minimatch(pattern, options).match(p);
    }
    function Minimatch(pattern, options) {
        if (!(this instanceof Minimatch)) return new Minimatch(pattern, options);
        if (typeof pattern !== 'string') throw new TypeError('glob pattern string required');
        if (!options) options = {};
        pattern = pattern.trim();
        // windows support: need to use /, not \
        if (path.sep !== '/') pattern = pattern.split(path.sep).join('/');
        this.options = options;
        this.set = [];
        this.pattern = pattern;
        this.regexp = null;
        this.negate = false;
        this.comment = false;
        this.empty = false;
        // make the set of regexps etc.
        this.make();
    }
    Minimatch.prototype.debug = function() {};
    Minimatch.prototype.make = make;
    function make() {
        // don't do it more than once.
        if (this._made) return;
        var pattern = this.pattern;
        var options = this.options;
        // empty patterns and comments match nothing.
        if (!options.nocomment && pattern.charAt(0) === '#') {
            this.comment = true;
            return;
        }
        if (!pattern) {
            this.empty = true;
            return;
        }
        // step 1: figure out negation, etc.
        this.parseNegate();
        // step 2: expand braces
        var set = this.globSet = this.braceExpand();
        if (options.debug) this.debug = console.error;
        this.debug(this.pattern, set);
        // step 3: now we have a set, so turn each one into a series of path-portion
        // matching patterns.
        // These will be regexps, except in the case of "**", which is
        // set to the GLOBSTAR object for globstar behavior,
        // and will not contain any / characters
        set = this.globParts = set.map(function(s) {
            return s.split(slashSplit);
        });
        this.debug(this.pattern, set);
        // glob --> regexps
        set = set.map(function(s, si, set) {
            return s.map(this.parse, this);
        }, this);
        this.debug(this.pattern, set);
        // filter out everything that didn't compile properly.
        set = set.filter(function(s) {
            return s.indexOf(false) === -1;
        });
        this.debug(this.pattern, set);
        this.set = set;
    }
    Minimatch.prototype.parseNegate = parseNegate;
    function parseNegate() {
        var pattern = this.pattern;
        var negate = false;
        var options = this.options;
        var negateOffset = 0;
        if (options.nonegate) return;
        for(var i = 0, l = pattern.length; i < l && pattern.charAt(i) === '!'; i++){
            negate = !negate;
            negateOffset++;
        }
        if (negateOffset) this.pattern = pattern.substr(negateOffset);
        this.negate = negate;
    }
    // Brace expansion:
    // a{b,c}d -> abd acd
    // a{b,}c -> abc ac
    // a{0..3}d -> a0d a1d a2d a3d
    // a{b,c{d,e}f}g -> abg acdfg acefg
    // a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
    //
    // Invalid sets are not expanded.
    // a{2..}b -> a{2..}b
    // a{b}c -> a{b}c
    minimatch.braceExpand = function(pattern, options) {
        return braceExpand(pattern, options);
    };
    Minimatch.prototype.braceExpand = braceExpand;
    function braceExpand(pattern, options) {
        if (!options) {
            if (this instanceof Minimatch) options = this.options;
            else options = {};
        }
        pattern = typeof pattern === 'undefined' ? this.pattern : pattern;
        if (typeof pattern === 'undefined') throw new TypeError('undefined pattern');
        if (options.nobrace || !pattern.match(/\{.*\}/)) // shortcut. no need to expand.
        return [
            pattern
        ];
        return expand(pattern);
    }
    // parse a component of the expanded set.
    // At this point, no pattern may contain "/" in it
    // so we're going to return a 2d array, where each entry is the full
    // pattern, split on '/', and then turned into a regular expression.
    // A regexp is made at the end which joins each array with an
    // escaped /, and another full one which joins each regexp with |.
    //
    // Following the lead of Bash 4.1, note that "**" only has special meaning
    // when it is the *only* thing in a path portion.  Otherwise, any series
    // of * is equivalent to a single *.  Globstar behavior is enabled by
    // default, and can be disabled by setting options.noglobstar.
    Minimatch.prototype.parse = parse;
    var SUBPARSE = {};
    function parse(pattern, isSub) {
        if (pattern.length > 65536) throw new TypeError('pattern is too long');
        var options = this.options;
        // shortcuts
        if (!options.noglobstar && pattern === '**') return GLOBSTAR;
        if (pattern === '') return '';
        var re = '';
        var hasMagic = !!options.nocase;
        var escaping = false;
        // ? => one single character
        var patternListStack = [];
        var negativeLists = [];
        var stateChar;
        var inClass = false;
        var reClassStart = -1;
        var classStart = -1;
        // . and .. never match anything that doesn't start with .,
        // even when options.dot is set.
        var patternStart = pattern.charAt(0) === '.' ? '' // anything
         : options.dot ? '(?!(?:^|\\/)\\.{1,2}(?:$|\\/))' : '(?!\\.)';
        var self = this;
        function clearStateChar() {
            if (stateChar) {
                // we had some state-tracking character
                // that wasn't consumed by this pass.
                switch(stateChar){
                    case '*':
                        re += star;
                        hasMagic = true;
                        break;
                    case '?':
                        re += qmark;
                        hasMagic = true;
                        break;
                    default:
                        re += '\\' + stateChar;
                        break;
                }
                self.debug('clearStateChar %j %j', stateChar, re);
                stateChar = false;
            }
        }
        for(var i = 0, len = pattern.length, c; i < len && (c = pattern.charAt(i)); i++){
            this.debug('%s\t%s %s %j', pattern, i, re, c);
            // skip over any that are escaped.
            if (escaping && reSpecials[c]) {
                re += '\\' + c;
                escaping = false;
                continue;
            }
            switch(c){
                case '/':
                    // completely not allowed, even escaped.
                    // Should already be path-split by now.
                    return false;
                case '\\':
                    clearStateChar();
                    escaping = true;
                    continue;
                // the various stateChar values
                // for the "extglob" stuff.
                case '?':
                case '*':
                case '+':
                case '@':
                case '!':
                    this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c);
                    // all of those are literals inside a class, except that
                    // the glob [!a] means [^a] in regexp
                    if (inClass) {
                        this.debug('  in class');
                        if (c === '!' && i === classStart + 1) c = '^';
                        re += c;
                        continue;
                    }
                    // if we already have a stateChar, then it means
                    // that there was something like ** or +? in there.
                    // Handle the stateChar, then proceed with this one.
                    self.debug('call clearStateChar %j', stateChar);
                    clearStateChar();
                    stateChar = c;
                    // if extglob is disabled, then +(asdf|foo) isn't a thing.
                    // just clear the statechar *now*, rather than even diving into
                    // the patternList stuff.
                    if (options.noext) clearStateChar();
                    continue;
                case '(':
                    if (inClass) {
                        re += '(';
                        continue;
                    }
                    if (!stateChar) {
                        re += '\\(';
                        continue;
                    }
                    patternListStack.push({
                        type: stateChar,
                        start: i - 1,
                        reStart: re.length,
                        open: plTypes[stateChar].open,
                        close: plTypes[stateChar].close
                    });
                    // negation is (?:(?!js)[^/]*)
                    re += stateChar === '!' ? '(?:(?!(?:' : '(?:';
                    this.debug('plType %j %j', stateChar, re);
                    stateChar = false;
                    continue;
                case ')':
                    if (inClass || !patternListStack.length) {
                        re += '\\)';
                        continue;
                    }
                    clearStateChar();
                    hasMagic = true;
                    var pl = patternListStack.pop();
                    // negation is (?:(?!js)[^/]*)
                    // The others are (?:<pattern>)<type>
                    re += pl.close;
                    if (pl.type === '!') negativeLists.push(pl);
                    pl.reEnd = re.length;
                    continue;
                case '|':
                    if (inClass || !patternListStack.length || escaping) {
                        re += '\\|';
                        escaping = false;
                        continue;
                    }
                    clearStateChar();
                    re += '|';
                    continue;
                // these are mostly the same in regexp and glob
                case '[':
                    // swallow any state-tracking char before the [
                    clearStateChar();
                    if (inClass) {
                        re += '\\' + c;
                        continue;
                    }
                    inClass = true;
                    classStart = i;
                    reClassStart = re.length;
                    re += c;
                    continue;
                case ']':
                    //  a right bracket shall lose its special
                    //  meaning and represent itself in
                    //  a bracket expression if it occurs
                    //  first in the list.  -- POSIX.2 2.8.3.2
                    if (i === classStart + 1 || !inClass) {
                        re += '\\' + c;
                        escaping = false;
                        continue;
                    }
                    // handle the case where we left a class open.
                    // "[z-a]" is valid, equivalent to "\[z-a\]"
                    if (inClass) {
                        // split where the last [ was, make sure we don't have
                        // an invalid re. if so, re-walk the contents of the
                        // would-be class to re-translate any characters that
                        // were passed through as-is
                        // TODO: It would probably be faster to determine this
                        // without a try/catch and a new RegExp, but it's tricky
                        // to do safely.  For now, this is safe and works.
                        var cs = pattern.substring(classStart + 1, i);
                        try {
                            RegExp('[' + cs + ']');
                        } catch (er) {
                            // not a valid class!
                            var sp = this.parse(cs, SUBPARSE);
                            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]';
                            hasMagic = hasMagic || sp[1];
                            inClass = false;
                            continue;
                        }
                    }
                    // finish up the class.
                    hasMagic = true;
                    inClass = false;
                    re += c;
                    continue;
                default:
                    // swallow any state char that wasn't consumed
                    clearStateChar();
                    if (escaping) // no need
                    escaping = false;
                    else if (reSpecials[c] && !(c === '^' && inClass)) re += '\\';
                    re += c;
            } // switch
        } // for
        // handle the case where we left a class open.
        // "[abc" is valid, equivalent to "\[abc"
        if (inClass) {
            // split where the last [ was, and escape it
            // this is a huge pita.  We now have to re-walk
            // the contents of the would-be class to re-translate
            // any characters that were passed through as-is
            cs = pattern.substr(classStart + 1);
            sp = this.parse(cs, SUBPARSE);
            re = re.substr(0, reClassStart) + '\\[' + sp[0];
            hasMagic = hasMagic || sp[1];
        }
        // handle the case where we had a +( thing at the *end*
        // of the pattern.
        // each pattern list stack adds 3 chars, and we need to go through
        // and escape any | chars that were passed through as-is for the regexp.
        // Go through and escape them, taking care not to double-escape any
        // | chars that were already escaped.
        for(pl = patternListStack.pop(); pl; pl = patternListStack.pop()){
            var tail = re.slice(pl.reStart + pl.open.length);
            this.debug('setting tail', re, pl);
            // maybe some even number of \, then maybe 1 \, followed by a |
            tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(_, $1, $2) {
                if (!$2) // the | isn't already escaped, so escape it.
                $2 = '\\';
                // need to escape all those slashes *again*, without escaping the
                // one that we need for escaping the | character.  As it works out,
                // escaping an even number of slashes can be done by simply repeating
                // it exactly after itself.  That's why this trick works.
                //
                // I am sorry that you have to see this.
                return $1 + $1 + $2 + '|';
            });
            this.debug('tail=%j\n   %s', tail, tail, pl, re);
            var t = pl.type === '*' ? star : pl.type === '?' ? qmark : '\\' + pl.type;
            hasMagic = true;
            re = re.slice(0, pl.reStart) + t + '\\(' + tail;
        }
        // handle trailing things that only matter at the very end.
        clearStateChar();
        if (escaping) // trailing \\
        re += '\\\\';
        // only need to apply the nodot start if the re starts with
        // something that could conceivably capture a dot
        var addPatternStart = false;
        switch(re.charAt(0)){
            case '.':
            case '[':
            case '(':
                addPatternStart = true;
        }
        // Hack to work around lack of negative lookbehind in JS
        // A pattern like: *.!(x).!(y|z) needs to ensure that a name
        // like 'a.xyz.yz' doesn't match.  So, the first negative
        // lookahead, has to look ALL the way ahead, to the end of
        // the pattern.
        for(var n = negativeLists.length - 1; n > -1; n--){
            var nl = negativeLists[n];
            var nlBefore = re.slice(0, nl.reStart);
            var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
            var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
            var nlAfter = re.slice(nl.reEnd);
            nlLast += nlAfter;
            // Handle nested stuff like *(*.js|!(*.json)), where open parens
            // mean that we should *not* include the ) in the bit that is considered
            // "after" the negated section.
            var openParensBefore = nlBefore.split('(').length - 1;
            var cleanAfter = nlAfter;
            for(i = 0; i < openParensBefore; i++)cleanAfter = cleanAfter.replace(/\)[+*?]?/, '');
            nlAfter = cleanAfter;
            var dollar = '';
            if (nlAfter === '' && isSub !== SUBPARSE) dollar = '$';
            var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
            re = newRe;
        }
        // if the re is not "" at this point, then we need to make sure
        // it doesn't match against an empty path part.
        // Otherwise a/* will match a/, which it should not.
        if (re !== '' && hasMagic) re = '(?=.)' + re;
        if (addPatternStart) re = patternStart + re;
        // parsing just a piece of a larger pattern.
        if (isSub === SUBPARSE) return [
            re,
            hasMagic
        ];
        // skip the regexp for non-magical patterns
        // unescape anything in it, though, so that it'll be
        // an exact match against a file etc.
        if (!hasMagic) return globUnescape(pattern);
        var flags = options.nocase ? 'i' : '';
        try {
            var regExp = new RegExp('^' + re + '$', flags);
        } catch (er) {
            // If it was an invalid regular expression, then it can't match
            // anything.  This trick looks for a character after the end of
            // the string, which is of course impossible, except in multi-line
            // mode, but it's not a /m regex.
            return new RegExp('$.');
        }
        regExp._glob = pattern;
        regExp._src = re;
        return regExp;
    }
    minimatch.makeRe = function(pattern, options) {
        return new Minimatch(pattern, options || {}).makeRe();
    };
    Minimatch.prototype.makeRe = makeRe;
    function makeRe() {
        if (this.regexp || this.regexp === false) return this.regexp;
        // at this point, this.set is a 2d array of partial
        // pattern strings, or "**".
        //
        // It's better to use .match().  This function shouldn't
        // be used, really, but it's pretty convenient sometimes,
        // when you just want to work with a regex.
        var set = this.set;
        if (!set.length) {
            this.regexp = false;
            return this.regexp;
        }
        var options = this.options;
        var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
        var flags = options.nocase ? 'i' : '';
        var re = set.map(function(pattern) {
            return pattern.map(function(p) {
                return p === GLOBSTAR ? twoStar : typeof p === 'string' ? regExpEscape(p) : p._src;
            }).join('\\/');
        }).join('|');
        // must match entire pattern
        // ending in a * or ** will make it less strict.
        re = '^(?:' + re + ')$';
        // can match anything, as long as it's not this.
        if (this.negate) re = '^(?!' + re + ').*$';
        try {
            this.regexp = new RegExp(re, flags);
        } catch (ex) {
            this.regexp = false;
        }
        return this.regexp;
    }
    minimatch.match = function(list, pattern, options) {
        options = options || {};
        var mm = new Minimatch(pattern, options);
        list = list.filter(function(f) {
            return mm.match(f);
        });
        if (mm.options.nonull && !list.length) list.push(pattern);
        return list;
    };
    Minimatch.prototype.match = match;
    function match(f, partial) {
        this.debug('match', f, this.pattern);
        // short-circuit in the case of busted things.
        // comments, etc.
        if (this.comment) return false;
        if (this.empty) return f === '';
        if (f === '/' && partial) return true;
        var options = this.options;
        // windows: need to use /, not \
        if (path.sep !== '/') f = f.split(path.sep).join('/');
        // treat the test path as a set of pathparts.
        f = f.split(slashSplit);
        this.debug(this.pattern, 'split', f);
        // just ONE of the pattern sets in this.set needs to match
        // in order for it to be valid.  If negating, then just one
        // match means that we have failed.
        // Either way, return on the first hit.
        var set = this.set;
        this.debug(this.pattern, 'set', set);
        // Find the basename of the path by looking for the last non-empty segment
        var filename;
        var i;
        for(i = f.length - 1; i >= 0; i--){
            filename = f[i];
            if (filename) break;
        }
        for(i = 0; i < set.length; i++){
            var pattern = set[i];
            var file = f;
            if (options.matchBase && pattern.length === 1) file = [
                filename
            ];
            var hit = this.matchOne(file, pattern, partial);
            if (hit) {
                if (options.flipNegate) return true;
                return !this.negate;
            }
        }
        // didn't get any hits.  this is success if it's a negative
        // pattern, failure otherwise.
        if (options.flipNegate) return false;
        return this.negate;
    }
    // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.
    Minimatch.prototype.matchOne = function(file, pattern, partial) {
        var options = this.options;
        this.debug('matchOne', {
            'this': this,
            file: file,
            pattern: pattern
        });
        this.debug('matchOne', file.length, pattern.length);
        for(var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++){
            this.debug('matchOne loop');
            var p = pattern[pi];
            var f = file[fi];
            this.debug(pattern, p, f);
            // should be impossible.
            // some invalid regexp stuff in the set.
            if (p === false) return false;
            if (p === GLOBSTAR) {
                this.debug('GLOBSTAR', [
                    pattern,
                    p,
                    f
                ]);
                // "**"
                // a/**/b/**/c would match the following:
                // a/b/x/y/z/c
                // a/x/y/z/b/c
                // a/b/x/b/x/c
                // a/b/c
                // To do this, take the rest of the pattern after
                // the **, and see if it would match the file remainder.
                // If so, return success.
                // If not, the ** "swallows" a segment, and try again.
                // This is recursively awful.
                //
                // a/**/b/**/c matching a/b/x/y/z/c
                // - a matches a
                // - doublestar
                //   - matchOne(b/x/y/z/c, b/**/c)
                //     - b matches b
                //     - doublestar
                //       - matchOne(x/y/z/c, c) -> no
                //       - matchOne(y/z/c, c) -> no
                //       - matchOne(z/c, c) -> no
                //       - matchOne(c, c) yes, hit
                var fr = fi;
                var pr = pi + 1;
                if (pr === pl) {
                    this.debug('** at the end');
                    // a ** at the end will just swallow the rest.
                    // We have found a match.
                    // however, it will not swallow /.x, unless
                    // options.dot is set.
                    // . and .. are *never* matched by **, for explosively
                    // exponential reasons.
                    for(; fi < fl; fi++){
                        if (file[fi] === '.' || file[fi] === '..' || !options.dot && file[fi].charAt(0) === '.') return false;
                    }
                    return true;
                }
                // ok, let's see if we can swallow whatever we can.
                while(fr < fl){
                    var swallowee = file[fr];
                    this.debug('\nglobstar while', file, fr, pattern, pr, swallowee);
                    // XXX remove this slice.  Just pass the start index.
                    if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
                        this.debug('globstar found match!', fr, fl, swallowee);
                        // found a match.
                        return true;
                    } else {
                        // can't swallow "." or ".." ever.
                        // can only swallow ".foo" when explicitly asked.
                        if (swallowee === '.' || swallowee === '..' || !options.dot && swallowee.charAt(0) === '.') {
                            this.debug('dot detected!', file, fr, pattern, pr);
                            break;
                        }
                        // ** swallows a segment, and continue.
                        this.debug('globstar swallow a segment, and continue');
                        fr++;
                    }
                }
                // no match was found.
                // However, in partial mode, we can't say this is necessarily over.
                // If there's more *pattern* left, then
                if (partial) {
                    // ran out of file
                    this.debug('\n>>> no match, partial?', file, fr, pattern, pr);
                    if (fr === fl) return true;
                }
                return false;
            }
            // something other than **
            // non-magic patterns just have to match exactly
            // patterns with magic have been turned into regexps.
            var hit;
            if (typeof p === 'string') {
                if (options.nocase) hit = f.toLowerCase() === p.toLowerCase();
                else hit = f === p;
                this.debug('string match', p, f, hit);
            } else {
                hit = f.match(p);
                this.debug('pattern match', p, f, hit);
            }
            if (!hit) return false;
        }
        // Note: ending in / means that we'll get a final ""
        // at the end of the pattern.  This can only match a
        // corresponding "" at the end of the file.
        // If the file ends in /, then it can only match a
        // a pattern that ends in /, unless the pattern just
        // doesn't have any more for it. But, a/b/ should *not*
        // match "a/b/*", even though "" matches against the
        // [^/]*? pattern, except in partial mode, where it might
        // simply not be reached yet.
        // However, a/b/ should still satisfy a/*
        // now either we fell off the end of the pattern, or we're done.
        if (fi === fl && pi === pl) // ran out of pattern and filename at the same time.
        // an exact hit!
        return true;
        else if (fi === fl) // ran out of file, but still had pattern left.
        // this is ok if we're doing the match as part of
        // a glob fs traversal.
        return partial;
        else if (pi === pl) {
            // ran out of pattern, still have file left.
            // this is only acceptable if we're on the very last
            // empty segment of a file with a trailing slash.
            // a/* should match a/b/
            var emptyFileEnd = fi === fl - 1 && file[fi] === '';
            return emptyFileEnd;
        }
        // should be unreachable.
        throw new Error('wtf?');
    };
    // replace stuff like \* with *
    function globUnescape(s) {
        return s.replace(/\\(.)/g, '$1');
    }
    function regExpEscape(s) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
});
var load30 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __importDefault = this && this.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : {
            "default": mod
        };
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.Path = void 0;
    const path = __importStar(require("path"));
    const pathHelper = __importStar(load23());
    const assert_1 = __importDefault(require("assert"));
    const IS_WINDOWS = process.platform === 'win32';
    /**
 * Helper class for parsing paths into segments
 */ class Path {
        /**
     * Constructs a Path
     * @param itemPath Path or array of segments
     */ constructor(itemPath){
            this.segments = [];
            // String
            if (typeof itemPath === 'string') {
                assert_1.default(itemPath, `Parameter 'itemPath' must not be empty`);
                // Normalize slashes and trim unnecessary trailing slash
                itemPath = pathHelper.safeTrimTrailingSeparator(itemPath);
                // Not rooted
                if (!pathHelper.hasRoot(itemPath)) this.segments = itemPath.split(path.sep);
                else {
                    // Add all segments, while not at the root
                    let remaining = itemPath;
                    let dir = pathHelper.dirname(remaining);
                    while(dir !== remaining){
                        // Add the segment
                        const basename = path.basename(remaining);
                        this.segments.unshift(basename);
                        // Truncate the last segment
                        remaining = dir;
                        dir = pathHelper.dirname(remaining);
                    }
                    // Remainder is the root
                    this.segments.unshift(remaining);
                }
            } else {
                // Must not be empty
                assert_1.default(itemPath.length > 0, `Parameter 'itemPath' must not be an empty array`);
                // Each segment
                for(let i = 0; i < itemPath.length; i++){
                    let segment = itemPath[i];
                    // Must not be empty
                    assert_1.default(segment, `Parameter 'itemPath' must not contain any empty segments`);
                    // Normalize slashes
                    segment = pathHelper.normalizeSeparators(itemPath[i]);
                    // Root segment
                    if (i === 0 && pathHelper.hasRoot(segment)) {
                        segment = pathHelper.safeTrimTrailingSeparator(segment);
                        assert_1.default(segment === pathHelper.dirname(segment), `Parameter 'itemPath' root segment contains information for multiple segments`);
                        this.segments.push(segment);
                    } else {
                        // Must not contain slash
                        assert_1.default(!segment.includes(path.sep), `Parameter 'itemPath' contains unexpected path separators`);
                        this.segments.push(segment);
                    }
                }
            }
        }
        /**
     * Converts the path to it's string representation
     */ toString() {
            // First segment
            let result = this.segments[0];
            // All others
            let skipSlash = result.endsWith(path.sep) || IS_WINDOWS && /^[A-Z]:$/i.test(result);
            for(let i = 1; i < this.segments.length; i++){
                if (skipSlash) skipSlash = false;
                else result += path.sep;
                result += this.segments[i];
            }
            return result;
        }
    }
    exports.Path = Path; //# sourceMappingURL=internal-path.js.map
});
var load31 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __importDefault = this && this.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : {
            "default": mod
        };
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.Pattern = void 0;
    const os = __importStar(require("os"));
    const path = __importStar(require("path"));
    const pathHelper = __importStar(load23());
    const assert_1 = __importDefault(require("assert"));
    const minimatch_1 = load29();
    const internal_match_kind_1 = load24();
    const internal_path_1 = load30();
    const IS_WINDOWS = process.platform === 'win32';
    class Pattern {
        constructor(patternOrNegate, isImplicitPattern = false, segments, homedir){
            /**
         * Indicates whether matches should be excluded from the result set
         */ this.negate = false;
            // Pattern overload
            let pattern;
            if (typeof patternOrNegate === 'string') pattern = patternOrNegate.trim();
            else {
                // Convert to pattern
                segments = segments || [];
                assert_1.default(segments.length, `Parameter 'segments' must not empty`);
                const root = Pattern.getLiteral(segments[0]);
                assert_1.default(root && pathHelper.hasAbsoluteRoot(root), `Parameter 'segments' first element must be a root path`);
                pattern = new internal_path_1.Path(segments).toString().trim();
                if (patternOrNegate) pattern = `!${pattern}`;
            }
            // Negate
            while(pattern.startsWith('!')){
                this.negate = !this.negate;
                pattern = pattern.substr(1).trim();
            }
            // Normalize slashes and ensures absolute root
            pattern = Pattern.fixupPattern(pattern, homedir);
            // Segments
            this.segments = new internal_path_1.Path(pattern).segments;
            // Trailing slash indicates the pattern should only match directories, not regular files
            this.trailingSeparator = pathHelper.normalizeSeparators(pattern).endsWith(path.sep);
            pattern = pathHelper.safeTrimTrailingSeparator(pattern);
            // Search path (literal path prior to the first glob segment)
            let foundGlob = false;
            const searchSegments = this.segments.map((x)=>Pattern.getLiteral(x)
            ).filter((x)=>!foundGlob && !(foundGlob = x === '')
            );
            this.searchPath = new internal_path_1.Path(searchSegments).toString();
            // Root RegExp (required when determining partial match)
            this.rootRegExp = new RegExp(Pattern.regExpEscape(searchSegments[0]), IS_WINDOWS ? 'i' : '');
            this.isImplicitPattern = isImplicitPattern;
            // Create minimatch
            const minimatchOptions = {
                dot: true,
                nobrace: true,
                nocase: IS_WINDOWS,
                nocomment: true,
                noext: true,
                nonegate: true
            };
            pattern = IS_WINDOWS ? pattern.replace(/\\/g, '/') : pattern;
            this.minimatch = new minimatch_1.Minimatch(pattern, minimatchOptions);
        }
        /**
     * Matches the pattern against the specified path
     */ match(itemPath) {
            // Last segment is globstar?
            if (this.segments[this.segments.length - 1] === '**') {
                // Normalize slashes
                itemPath = pathHelper.normalizeSeparators(itemPath);
                // Append a trailing slash. Otherwise Minimatch will not match the directory immediately
                // preceding the globstar. For example, given the pattern `/foo/**`, Minimatch returns
                // false for `/foo` but returns true for `/foo/`. Append a trailing slash to handle that quirk.
                if (!itemPath.endsWith(path.sep) && this.isImplicitPattern === false) // Note, this is safe because the constructor ensures the pattern has an absolute root.
                // For example, formats like C: and C:foo on Windows are resolved to an absolute root.
                itemPath = `${itemPath}${path.sep}`;
            } else // Normalize slashes and trim unnecessary trailing slash
            itemPath = pathHelper.safeTrimTrailingSeparator(itemPath);
            // Match
            if (this.minimatch.match(itemPath)) return this.trailingSeparator ? internal_match_kind_1.MatchKind.Directory : internal_match_kind_1.MatchKind.All;
            return internal_match_kind_1.MatchKind.None;
        }
        /**
     * Indicates whether the pattern may match descendants of the specified path
     */ partialMatch(itemPath) {
            // Normalize slashes and trim unnecessary trailing slash
            itemPath = pathHelper.safeTrimTrailingSeparator(itemPath);
            // matchOne does not handle root path correctly
            if (pathHelper.dirname(itemPath) === itemPath) return this.rootRegExp.test(itemPath);
            return this.minimatch.matchOne(itemPath.split(IS_WINDOWS ? /\\+/ : /\/+/), this.minimatch.set[0], true);
        }
        /**
     * Escapes glob patterns within a path
     */ static globEscape(s) {
            return (IS_WINDOWS ? s : s.replace(/\\/g, '\\\\')).replace(/(\[)(?=[^/]+\])/g, '[[]') // escape '[' when ']' follows within the path segment
            .replace(/\?/g, '[?]') // escape '?'
            .replace(/\*/g, '[*]'); // escape '*'
        }
        /**
     * Normalizes slashes and ensures absolute root
     */ static fixupPattern(pattern, homedir) {
            // Empty
            assert_1.default(pattern, 'pattern cannot be empty');
            // Must not contain `.` segment, unless first segment
            // Must not contain `..` segment
            const literalSegments = new internal_path_1.Path(pattern).segments.map((x)=>Pattern.getLiteral(x)
            );
            assert_1.default(literalSegments.every((x, i)=>(x !== '.' || i === 0) && x !== '..'
            ), `Invalid pattern '${pattern}'. Relative pathing '.' and '..' is not allowed.`);
            // Must not contain globs in root, e.g. Windows UNC path \\foo\b*r
            assert_1.default(!pathHelper.hasRoot(pattern) || literalSegments[0], `Invalid pattern '${pattern}'. Root segment must not contain globs.`);
            // Normalize slashes
            pattern = pathHelper.normalizeSeparators(pattern);
            // Replace leading `.` segment
            if (pattern === '.' || pattern.startsWith(`.${path.sep}`)) pattern = Pattern.globEscape(process.cwd()) + pattern.substr(1);
            else if (pattern === '~' || pattern.startsWith(`~${path.sep}`)) {
                homedir = homedir || os.homedir();
                assert_1.default(homedir, 'Unable to determine HOME directory');
                assert_1.default(pathHelper.hasAbsoluteRoot(homedir), `Expected HOME directory to be a rooted path. Actual '${homedir}'`);
                pattern = Pattern.globEscape(homedir) + pattern.substr(1);
            } else if (IS_WINDOWS && (pattern.match(/^[A-Z]:$/i) || pattern.match(/^[A-Z]:[^\\]/i))) {
                let root = pathHelper.ensureAbsoluteRoot('C:\\dummy-root', pattern.substr(0, 2));
                if (pattern.length > 2 && !root.endsWith('\\')) root += '\\';
                pattern = Pattern.globEscape(root) + pattern.substr(2);
            } else if (IS_WINDOWS && (pattern === '\\' || pattern.match(/^\\[^\\]/))) {
                let root = pathHelper.ensureAbsoluteRoot('C:\\dummy-root', '\\');
                if (!root.endsWith('\\')) root += '\\';
                pattern = Pattern.globEscape(root) + pattern.substr(1);
            } else pattern = pathHelper.ensureAbsoluteRoot(Pattern.globEscape(process.cwd()), pattern);
            return pathHelper.normalizeSeparators(pattern);
        }
        /**
     * Attempts to unescape a pattern segment to create a literal path segment.
     * Otherwise returns empty string.
     */ static getLiteral(segment) {
            let literal = '';
            for(let i = 0; i < segment.length; i++){
                const c = segment[i];
                // Escape
                if (c === '\\' && !IS_WINDOWS && i + 1 < segment.length) {
                    literal += segment[++i];
                    continue;
                } else if (c === '*' || c === '?') return '';
                else if (c === '[' && i + 1 < segment.length) {
                    let set = '';
                    let closed = -1;
                    for(let i2 = i + 1; i2 < segment.length; i2++){
                        const c2 = segment[i2];
                        // Escape
                        if (c2 === '\\' && !IS_WINDOWS && i2 + 1 < segment.length) {
                            set += segment[++i2];
                            continue;
                        } else if (c2 === ']') {
                            closed = i2;
                            break;
                        } else set += c2;
                    }
                    // Closed?
                    if (closed >= 0) {
                        // Cannot convert
                        if (set.length > 1) return '';
                        // Convert to literal
                        if (set) {
                            literal += set;
                            i = closed;
                            continue;
                        }
                    }
                // Otherwise fall thru
                }
                // Append
                literal += c;
            }
            return literal;
        }
        /**
     * Escapes regexp special characters
     * https://javascript.info/regexp-escaping
     */ static regExpEscape(s) {
            return s.replace(/[[\\^$.|?*+()]/g, '\\$&');
        }
    }
    exports.Pattern = Pattern; //# sourceMappingURL=internal-pattern.js.map
});
var load32 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.SearchState = void 0;
    class SearchState {
        constructor(path, level){
            this.path = path;
            this.level = level;
        }
    }
    exports.SearchState = SearchState; //# sourceMappingURL=internal-search-state.js.map
});
var load33 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __asyncValues = this && this.__asyncValues || function(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        function verb(n) {
            i[n] = o[n] && function(v) {
                return new Promise(function(resolve, reject) {
                    v = o[n](v), settle(resolve, reject, v.done, v.value);
                });
            };
        }
        function settle(resolve, reject, d, v1) {
            Promise.resolve(v1).then(function(v) {
                resolve({
                    value: v,
                    done: d
                });
            }, reject);
        }
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
        }, i);
    };
    var __await = this && this.__await || function(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };
    var __asyncGenerator = this && this.__asyncGenerator || function(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        function verb(n) {
            if (g[n]) i[n] = function(v) {
                return new Promise(function(a, b) {
                    q.push([
                        n,
                        v,
                        a,
                        b
                    ]) > 1 || resume(n, v);
                });
            };
        }
        function resume(n, v) {
            try {
                step(g[n](v));
            } catch (e) {
                settle(q[0][3], e);
            }
        }
        function step(r) {
            r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
        }
        function fulfill(value) {
            resume("next", value);
        }
        function reject(value) {
            resume("throw", value);
        }
        function settle(f, v) {
            if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
        }
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
        }, i;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.DefaultGlobber = void 0;
    const core = __importStar(load21());
    const fs = __importStar(require("fs"));
    const globOptionsHelper = __importStar(load22());
    const path = __importStar(require("path"));
    const patternHelper = __importStar(load25());
    const internal_match_kind_1 = load24();
    const internal_pattern_1 = load31();
    const internal_search_state_1 = load32();
    const IS_WINDOWS = process.platform === 'win32';
    class DefaultGlobber {
        constructor(options){
            this.patterns = [];
            this.searchPaths = [];
            this.options = globOptionsHelper.getOptions(options);
        }
        getSearchPaths() {
            // Return a copy
            return this.searchPaths.slice();
        }
        glob() {
            var e_1, _a;
            return __awaiter(this, void 0, void 0, function*() {
                const result = [];
                try {
                    for(var _b = __asyncValues(this.globGenerator()), _c; _c = yield _b.next(), !_c.done;){
                        const itemPath = _c.value;
                        result.push(itemPath);
                    }
                } catch (e_1_1) {
                    e_1 = {
                        error: e_1_1
                    };
                } finally{
                    try {
                        if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                    } finally{
                        if (e_1) throw e_1.error;
                    }
                }
                return result;
            });
        }
        globGenerator() {
            return __asyncGenerator(this, arguments, function* globGenerator_1() {
                // Fill in defaults options
                const options = globOptionsHelper.getOptions(this.options);
                // Implicit descendants?
                const patterns = [];
                for (const pattern of this.patterns){
                    patterns.push(pattern);
                    if (options.implicitDescendants && (pattern.trailingSeparator || pattern.segments[pattern.segments.length - 1] !== '**')) patterns.push(new internal_pattern_1.Pattern(pattern.negate, true, pattern.segments.concat('**')));
                }
                // Push the search paths
                const stack = [];
                for (const searchPath of patternHelper.getSearchPaths(patterns)){
                    core.debug(`Search path '${searchPath}'`);
                    // Exists?
                    try {
                        // Intentionally using lstat. Detection for broken symlink
                        // will be performed later (if following symlinks).
                        yield __await(fs.promises.lstat(searchPath));
                    } catch (err) {
                        if (err.code === 'ENOENT') continue;
                        throw err;
                    }
                    stack.unshift(new internal_search_state_1.SearchState(searchPath, 1));
                }
                // Search
                const traversalChain = []; // used to detect cycles
                while(stack.length){
                    // Pop
                    const item = stack.pop();
                    // Match?
                    const match = patternHelper.match(patterns, item.path);
                    const partialMatch = !!match || patternHelper.partialMatch(patterns, item.path);
                    if (!match && !partialMatch) continue;
                    // Stat
                    const stats = yield __await(DefaultGlobber.stat(item, options, traversalChain));
                    // Broken symlink, or symlink cycle detected, or no longer exists
                    if (!stats) continue;
                    // Directory
                    if (stats.isDirectory()) {
                        // Matched
                        if (match & internal_match_kind_1.MatchKind.Directory) yield yield __await(item.path);
                        else if (!partialMatch) continue;
                        // Push the child items in reverse
                        const childLevel = item.level + 1;
                        const childItems = (yield __await(fs.promises.readdir(item.path))).map((x)=>new internal_search_state_1.SearchState(path.join(item.path, x), childLevel)
                        );
                        stack.push(...childItems.reverse());
                    } else if (match & internal_match_kind_1.MatchKind.File) yield yield __await(item.path);
                }
            });
        }
        /**
     * Constructs a DefaultGlobber
     */ static create(patterns, options) {
            return __awaiter(this, void 0, void 0, function*() {
                const result = new DefaultGlobber(options);
                if (IS_WINDOWS) {
                    patterns = patterns.replace(/\r\n/g, '\n');
                    patterns = patterns.replace(/\r/g, '\n');
                }
                const lines = patterns.split('\n').map((x)=>x.trim()
                );
                for (const line of lines){
                    // Empty or comment
                    if (!line || line.startsWith('#')) continue;
                    else result.patterns.push(new internal_pattern_1.Pattern(line));
                }
                result.searchPaths.push(...patternHelper.getSearchPaths(result.patterns));
                return result;
            });
        }
        static stat(item, options, traversalChain) {
            return __awaiter(this, void 0, void 0, function*() {
                // Note:
                // `stat` returns info about the target of a symlink (or symlink chain)
                // `lstat` returns info about a symlink itself
                let stats;
                if (options.followSymbolicLinks) try {
                    // Use `stat` (following symlinks)
                    stats = yield fs.promises.stat(item.path);
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        if (options.omitBrokenSymbolicLinks) {
                            core.debug(`Broken symlink '${item.path}'`);
                            return undefined;
                        }
                        throw new Error(`No information found for the path '${item.path}'. This may indicate a broken symbolic link.`);
                    }
                    throw err;
                }
                else // Use `lstat` (not following symlinks)
                stats = yield fs.promises.lstat(item.path);
                // Note, isDirectory() returns false for the lstat of a symlink
                if (stats.isDirectory() && options.followSymbolicLinks) {
                    // Get the realpath
                    const realPath = yield fs.promises.realpath(item.path);
                    // Fixup the traversal chain to match the item level
                    while(traversalChain.length >= item.level)traversalChain.pop();
                    // Test for a cycle
                    if (traversalChain.some((x)=>x === realPath
                    )) {
                        core.debug(`Symlink cycle detected for path '${item.path}' and realpath '${realPath}'`);
                        return undefined;
                    }
                    // Update the traversal chain
                    traversalChain.push(realPath);
                }
                return stats;
            });
        }
    }
    exports.DefaultGlobber = DefaultGlobber; //# sourceMappingURL=internal-globber.js.map
});
var load34 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.create = void 0;
    const internal_globber_1 = load33();
    /**
 * Constructs a globber
 *
 * @param patterns  Patterns separated by newlines
 * @param options   Glob options
 */ function create(patterns, options) {
        return __awaiter(this, void 0, void 0, function*() {
            return yield internal_globber_1.DefaultGlobber.create(patterns, options);
        });
    }
    exports.create = create; //# sourceMappingURL=glob.js.map
});
var load35 = __swcpack_require__.bind(void 0, function(module, exports) {
    exports = module.exports = SemVer;
    var debug;
    /* istanbul ignore next */ if (typeof process === 'object' && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG)) debug = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift('SEMVER');
        console.log.apply(console, args);
    };
    else debug = function() {};
    // Note: this is the semver.org version of the spec that it implements
    // Not necessarily the package version of this code.
    exports.SEMVER_SPEC_VERSION = '2.0.0';
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */ 9007199254740991;
    // Max safe segment length for coercion.
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    // The actual regexps go on exports.re
    var re = exports.re = [];
    var src = exports.src = [];
    var t = exports.tokens = {};
    var R = 0;
    function tok(n) {
        t[n] = R++;
    }
    // The following Regular Expressions can be used for tokenizing,
    // validating, and parsing SemVer version strings.
    // ## Numeric Identifier
    // A single `0`, or a non-zero digit followed by zero or more digits.
    tok('NUMERICIDENTIFIER');
    src[t.NUMERICIDENTIFIER] = '0|[1-9]\\d*';
    tok('NUMERICIDENTIFIERLOOSE');
    src[t.NUMERICIDENTIFIERLOOSE] = '[0-9]+';
    // ## Non-numeric Identifier
    // Zero or more digits, followed by a letter or hyphen, and then zero or
    // more letters, digits, or hyphens.
    tok('NONNUMERICIDENTIFIER');
    src[t.NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';
    // ## Main Version
    // Three dot-separated numeric identifiers.
    tok('MAINVERSION');
    src[t.MAINVERSION] = '(' + src[t.NUMERICIDENTIFIER] + ')\\.' + '(' + src[t.NUMERICIDENTIFIER] + ')\\.' + '(' + src[t.NUMERICIDENTIFIER] + ')';
    tok('MAINVERSIONLOOSE');
    src[t.MAINVERSIONLOOSE] = '(' + src[t.NUMERICIDENTIFIERLOOSE] + ')\\.' + '(' + src[t.NUMERICIDENTIFIERLOOSE] + ')\\.' + '(' + src[t.NUMERICIDENTIFIERLOOSE] + ')';
    // ## Pre-release Version Identifier
    // A numeric identifier, or a non-numeric identifier.
    tok('PRERELEASEIDENTIFIER');
    src[t.PRERELEASEIDENTIFIER] = '(?:' + src[t.NUMERICIDENTIFIER] + '|' + src[t.NONNUMERICIDENTIFIER] + ')';
    tok('PRERELEASEIDENTIFIERLOOSE');
    src[t.PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[t.NUMERICIDENTIFIERLOOSE] + '|' + src[t.NONNUMERICIDENTIFIER] + ')';
    // ## Pre-release Version
    // Hyphen, followed by one or more dot-separated pre-release version
    // identifiers.
    tok('PRERELEASE');
    src[t.PRERELEASE] = '(?:-(' + src[t.PRERELEASEIDENTIFIER] + '(?:\\.' + src[t.PRERELEASEIDENTIFIER] + ')*))';
    tok('PRERELEASELOOSE');
    src[t.PRERELEASELOOSE] = '(?:-?(' + src[t.PRERELEASEIDENTIFIERLOOSE] + '(?:\\.' + src[t.PRERELEASEIDENTIFIERLOOSE] + ')*))';
    // ## Build Metadata Identifier
    // Any combination of digits, letters, or hyphens.
    tok('BUILDIDENTIFIER');
    src[t.BUILDIDENTIFIER] = '[0-9A-Za-z-]+';
    // ## Build Metadata
    // Plus sign, followed by one or more period-separated build metadata
    // identifiers.
    tok('BUILD');
    src[t.BUILD] = '(?:\\+(' + src[t.BUILDIDENTIFIER] + '(?:\\.' + src[t.BUILDIDENTIFIER] + ')*))';
    // ## Full Version String
    // A main version, followed optionally by a pre-release version and
    // build metadata.
    // Note that the only major, minor, patch, and pre-release sections of
    // the version string are capturing groups.  The build metadata is not a
    // capturing group, because it should not ever be used in version
    // comparison.
    tok('FULL');
    tok('FULLPLAIN');
    src[t.FULLPLAIN] = 'v?' + src[t.MAINVERSION] + src[t.PRERELEASE] + '?' + src[t.BUILD] + '?';
    src[t.FULL] = '^' + src[t.FULLPLAIN] + '$';
    // like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
    // also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
    // common in the npm registry.
    tok('LOOSEPLAIN');
    src[t.LOOSEPLAIN] = '[v=\\s]*' + src[t.MAINVERSIONLOOSE] + src[t.PRERELEASELOOSE] + '?' + src[t.BUILD] + '?';
    tok('LOOSE');
    src[t.LOOSE] = '^' + src[t.LOOSEPLAIN] + '$';
    tok('GTLT');
    src[t.GTLT] = '((?:<|>)?=?)';
    // Something like "2.*" or "1.2.x".
    // Note that "x.x" is a valid xRange identifer, meaning "any version"
    // Only the first item is strictly required.
    tok('XRANGEIDENTIFIERLOOSE');
    src[t.XRANGEIDENTIFIERLOOSE] = src[t.NUMERICIDENTIFIERLOOSE] + '|x|X|\\*';
    tok('XRANGEIDENTIFIER');
    src[t.XRANGEIDENTIFIER] = src[t.NUMERICIDENTIFIER] + '|x|X|\\*';
    tok('XRANGEPLAIN');
    src[t.XRANGEPLAIN] = '[v=\\s]*(' + src[t.XRANGEIDENTIFIER] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIER] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIER] + ')' + '(?:' + src[t.PRERELEASE] + ')?' + src[t.BUILD] + '?' + ')?)?';
    tok('XRANGEPLAINLOOSE');
    src[t.XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[t.XRANGEIDENTIFIERLOOSE] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIERLOOSE] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIERLOOSE] + ')' + '(?:' + src[t.PRERELEASELOOSE] + ')?' + src[t.BUILD] + '?' + ')?)?';
    tok('XRANGE');
    src[t.XRANGE] = '^' + src[t.GTLT] + '\\s*' + src[t.XRANGEPLAIN] + '$';
    tok('XRANGELOOSE');
    src[t.XRANGELOOSE] = '^' + src[t.GTLT] + '\\s*' + src[t.XRANGEPLAINLOOSE] + '$';
    // Coercion.
    // Extract anything that could conceivably be a part of a valid semver
    tok('COERCE');
    src[t.COERCE] = "(^|[^\\d])(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + '})' + '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' + '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' + '(?:$|[^\\d])';
    tok('COERCERTL');
    re[t.COERCERTL] = new RegExp(src[t.COERCE], 'g');
    // Tilde ranges.
    // Meaning is "reasonably at or greater than"
    tok('LONETILDE');
    src[t.LONETILDE] = '(?:~>?)';
    tok('TILDETRIM');
    src[t.TILDETRIM] = '(\\s*)' + src[t.LONETILDE] + '\\s+';
    re[t.TILDETRIM] = new RegExp(src[t.TILDETRIM], 'g');
    var tildeTrimReplace = '$1~';
    tok('TILDE');
    src[t.TILDE] = '^' + src[t.LONETILDE] + src[t.XRANGEPLAIN] + '$';
    tok('TILDELOOSE');
    src[t.TILDELOOSE] = '^' + src[t.LONETILDE] + src[t.XRANGEPLAINLOOSE] + '$';
    // Caret ranges.
    // Meaning is "at least and backwards compatible with"
    tok('LONECARET');
    src[t.LONECARET] = '(?:\\^)';
    tok('CARETTRIM');
    src[t.CARETTRIM] = '(\\s*)' + src[t.LONECARET] + '\\s+';
    re[t.CARETTRIM] = new RegExp(src[t.CARETTRIM], 'g');
    var caretTrimReplace = '$1^';
    tok('CARET');
    src[t.CARET] = '^' + src[t.LONECARET] + src[t.XRANGEPLAIN] + '$';
    tok('CARETLOOSE');
    src[t.CARETLOOSE] = '^' + src[t.LONECARET] + src[t.XRANGEPLAINLOOSE] + '$';
    // A simple gt/lt/eq thing, or just "" to indicate "any version"
    tok('COMPARATORLOOSE');
    src[t.COMPARATORLOOSE] = '^' + src[t.GTLT] + '\\s*(' + src[t.LOOSEPLAIN] + ')$|^$';
    tok('COMPARATOR');
    src[t.COMPARATOR] = '^' + src[t.GTLT] + '\\s*(' + src[t.FULLPLAIN] + ')$|^$';
    // An expression to strip any whitespace between the gtlt and the thing
    // it modifies, so that `> 1.2.3` ==> `>1.2.3`
    tok('COMPARATORTRIM');
    src[t.COMPARATORTRIM] = '(\\s*)' + src[t.GTLT] + '\\s*(' + src[t.LOOSEPLAIN] + '|' + src[t.XRANGEPLAIN] + ')';
    // this one has to use the /g flag
    re[t.COMPARATORTRIM] = new RegExp(src[t.COMPARATORTRIM], 'g');
    var comparatorTrimReplace = '$1$2$3';
    // Something like `1.2.3 - 1.2.4`
    // Note that these all use the loose form, because they'll be
    // checked against either the strict or loose comparator form
    // later.
    tok('HYPHENRANGE');
    src[t.HYPHENRANGE] = '^\\s*(' + src[t.XRANGEPLAIN] + ')' + '\\s+-\\s+' + '(' + src[t.XRANGEPLAIN] + ')' + '\\s*$';
    tok('HYPHENRANGELOOSE');
    src[t.HYPHENRANGELOOSE] = '^\\s*(' + src[t.XRANGEPLAINLOOSE] + ')' + '\\s+-\\s+' + '(' + src[t.XRANGEPLAINLOOSE] + ')' + '\\s*$';
    // Star ranges basically just allow anything at all.
    tok('STAR');
    src[t.STAR] = '(<|>)?=?\\s*\\*';
    // Compile to actual regexp objects.
    // All are flag-free, unless they were created above with a flag.
    for(var i1 = 0; i1 < R; i1++){
        debug(i1, src[i1]);
        if (!re[i1]) re[i1] = new RegExp(src[i1]);
    }
    exports.parse = parse;
    function parse(version, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (version instanceof SemVer) return version;
        if (typeof version !== 'string') return null;
        if (version.length > MAX_LENGTH) return null;
        var r = options.loose ? re[t.LOOSE] : re[t.FULL];
        if (!r.test(version)) return null;
        try {
            return new SemVer(version, options);
        } catch (er) {
            return null;
        }
    }
    exports.valid = valid;
    function valid(version, options) {
        var v = parse(version, options);
        return v ? v.version : null;
    }
    exports.clean = clean;
    function clean(version, options) {
        var s = parse(version.trim().replace(/^[=v]+/, ''), options);
        return s ? s.version : null;
    }
    exports.SemVer = SemVer;
    function SemVer(version, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (version instanceof SemVer) {
            if (version.loose === options.loose) return version;
            else version = version.version;
        } else if (typeof version !== 'string') throw new TypeError('Invalid Version: ' + version);
        if (version.length > MAX_LENGTH) throw new TypeError('version is longer than ' + MAX_LENGTH + ' characters');
        if (!(this instanceof SemVer)) return new SemVer(version, options);
        debug('SemVer', version, options);
        this.options = options;
        this.loose = !!options.loose;
        var m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) throw new TypeError('Invalid Version: ' + version);
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
        else this.prerelease = m[4].split('.').map(function(id) {
            if (/^[0-9]+$/.test(id)) {
                var num = +id;
                if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
            }
            return id;
        });
        this.build = m[5] ? m[5].split('.') : [];
        this.format();
    }
    SemVer.prototype.format = function() {
        this.version = this.major + '.' + this.minor + '.' + this.patch;
        if (this.prerelease.length) this.version += '-' + this.prerelease.join('.');
        return this.version;
    };
    SemVer.prototype.toString = function() {
        return this.version;
    };
    SemVer.prototype.compare = function(other) {
        debug('SemVer.compare', this.version, this.options, other);
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        return this.compareMain(other) || this.comparePre(other);
    };
    SemVer.prototype.compareMain = function(other) {
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    };
    SemVer.prototype.comparePre = function(other) {
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        // NOT having a prerelease is > having one
        if (this.prerelease.length && !other.prerelease.length) return -1;
        else if (!this.prerelease.length && other.prerelease.length) return 1;
        else if (!this.prerelease.length && !other.prerelease.length) return 0;
        var i = 0;
        do {
            var a = this.prerelease[i];
            var b = other.prerelease[i];
            debug('prerelease compare', i, a, b);
            if (a === undefined && b === undefined) return 0;
            else if (b === undefined) return 1;
            else if (a === undefined) return -1;
            else if (a === b) continue;
            else return compareIdentifiers(a, b);
        }while (++i)
    };
    SemVer.prototype.compareBuild = function(other) {
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        var i = 0;
        do {
            var a = this.build[i];
            var b = other.build[i];
            debug('prerelease compare', i, a, b);
            if (a === undefined && b === undefined) return 0;
            else if (b === undefined) return 1;
            else if (a === undefined) return -1;
            else if (a === b) continue;
            else return compareIdentifiers(a, b);
        }while (++i)
    };
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    SemVer.prototype.inc = function(release, identifier) {
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
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case 'pre':
                if (this.prerelease.length === 0) this.prerelease = [
                    0
                ];
                else {
                    var i = this.prerelease.length;
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
                throw new Error('invalid increment argument: ' + release);
        }
        this.format();
        this.raw = this.version;
        return this;
    };
    exports.inc = inc;
    function inc(version, release, loose, identifier) {
        if (typeof loose === 'string') {
            identifier = loose;
            loose = undefined;
        }
        try {
            return new SemVer(version, loose).inc(release, identifier).version;
        } catch (er) {
            return null;
        }
    }
    exports.diff = diff;
    function diff(version1, version2) {
        if (eq(version1, version2)) return null;
        else {
            var v1 = parse(version1);
            var v2 = parse(version2);
            var prefix = '';
            if (v1.prerelease.length || v2.prerelease.length) {
                prefix = 'pre';
                var defaultResult = 'prerelease';
            }
            for(var key in v1)if (key === 'major' || key === 'minor' || key === 'patch') {
                if (v1[key] !== v2[key]) return prefix + key;
            }
            return defaultResult // may be undefined
            ;
        }
    }
    exports.compareIdentifiers = compareIdentifiers;
    var numeric = /^[0-9]+$/;
    function compareIdentifiers(a, b) {
        var anum = numeric.test(a);
        var bnum = numeric.test(b);
        if (anum && bnum) {
            a = +a;
            b = +b;
        }
        return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    }
    exports.rcompareIdentifiers = rcompareIdentifiers;
    function rcompareIdentifiers(a, b) {
        return compareIdentifiers(b, a);
    }
    exports.major = major;
    function major(a, loose) {
        return new SemVer(a, loose).major;
    }
    exports.minor = minor;
    function minor(a, loose) {
        return new SemVer(a, loose).minor;
    }
    exports.patch = patch;
    function patch(a, loose) {
        return new SemVer(a, loose).patch;
    }
    exports.compare = compare;
    function compare(a, b, loose) {
        return new SemVer(a, loose).compare(new SemVer(b, loose));
    }
    exports.compareLoose = compareLoose;
    function compareLoose(a, b) {
        return compare(a, b, true);
    }
    exports.compareBuild = compareBuild;
    function compareBuild(a, b, loose) {
        var versionA = new SemVer(a, loose);
        var versionB = new SemVer(b, loose);
        return versionA.compare(versionB) || versionA.compareBuild(versionB);
    }
    exports.rcompare = rcompare;
    function rcompare(a, b, loose) {
        return compare(b, a, loose);
    }
    exports.sort = sort;
    function sort(list, loose) {
        return list.sort(function(a, b) {
            return exports.compareBuild(a, b, loose);
        });
    }
    exports.rsort = rsort;
    function rsort(list, loose) {
        return list.sort(function(a, b) {
            return exports.compareBuild(b, a, loose);
        });
    }
    exports.gt = gt;
    function gt(a, b, loose) {
        return compare(a, b, loose) > 0;
    }
    exports.lt = lt;
    function lt(a, b, loose) {
        return compare(a, b, loose) < 0;
    }
    exports.eq = eq;
    function eq(a, b, loose) {
        return compare(a, b, loose) === 0;
    }
    exports.neq = neq;
    function neq(a, b, loose) {
        return compare(a, b, loose) !== 0;
    }
    exports.gte = gte;
    function gte(a, b, loose) {
        return compare(a, b, loose) >= 0;
    }
    exports.lte = lte;
    function lte(a, b, loose) {
        return compare(a, b, loose) <= 0;
    }
    exports.cmp = cmp;
    function cmp(a, op, b, loose) {
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
                throw new TypeError('Invalid operator: ' + op);
        }
    }
    exports.Comparator = Comparator;
    function Comparator(comp, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (comp instanceof Comparator) {
            if (comp.loose === !!options.loose) return comp;
            else comp = comp.value;
        }
        if (!(this instanceof Comparator)) return new Comparator(comp, options);
        debug('comparator', comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) this.value = '';
        else this.value = this.operator + this.semver.version;
        debug('comp', this);
    }
    var ANY = {};
    Comparator.prototype.parse = function(comp) {
        var r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        var m = comp.match(r);
        if (!m) throw new TypeError('Invalid comparator: ' + comp);
        this.operator = m[1] !== undefined ? m[1] : '';
        if (this.operator === '=') this.operator = '';
        // if it literally is just '>' or '' then allow anything.
        if (!m[2]) this.semver = ANY;
        else this.semver = new SemVer(m[2], this.options.loose);
    };
    Comparator.prototype.toString = function() {
        return this.value;
    };
    Comparator.prototype.test = function(version) {
        debug('Comparator.test', version, this.options.loose);
        if (this.semver === ANY || version === ANY) return true;
        if (typeof version === 'string') try {
            version = new SemVer(version, this.options);
        } catch (er) {
            return false;
        }
        return cmp(version, this.operator, this.semver, this.options);
    };
    Comparator.prototype.intersects = function(comp, options) {
        if (!(comp instanceof Comparator)) throw new TypeError('a Comparator is required');
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        var rangeTmp;
        if (this.operator === '') {
            if (this.value === '') return true;
            rangeTmp = new Range(comp.value, options);
            return satisfies(this.value, rangeTmp, options);
        } else if (comp.operator === '') {
            if (comp.value === '') return true;
            rangeTmp = new Range(this.value, options);
            return satisfies(comp.semver, rangeTmp, options);
        }
        var sameDirectionIncreasing = (this.operator === '>=' || this.operator === '>') && (comp.operator === '>=' || comp.operator === '>');
        var sameDirectionDecreasing = (this.operator === '<=' || this.operator === '<') && (comp.operator === '<=' || comp.operator === '<');
        var sameSemVer = this.semver.version === comp.semver.version;
        var differentDirectionsInclusive = (this.operator === '>=' || this.operator === '<=') && (comp.operator === '>=' || comp.operator === '<=');
        var oppositeDirectionsLessThan = cmp(this.semver, '<', comp.semver, options) && (this.operator === '>=' || this.operator === '>') && (comp.operator === '<=' || comp.operator === '<');
        var oppositeDirectionsGreaterThan = cmp(this.semver, '>', comp.semver, options) && (this.operator === '<=' || this.operator === '<') && (comp.operator === '>=' || comp.operator === '>');
        return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    };
    exports.Range = Range;
    function Range(range1, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (range1 instanceof Range) {
            if (range1.loose === !!options.loose && range1.includePrerelease === !!options.includePrerelease) return range1;
            else return new Range(range1.raw, options);
        }
        if (range1 instanceof Comparator) return new Range(range1.value, options);
        if (!(this instanceof Range)) return new Range(range1, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        // First, split based on boolean or ||
        this.raw = range1;
        this.set = range1.split(/\s*\|\|\s*/).map(function(range) {
            return this.parseRange(range.trim());
        }, this).filter(function(c) {
            // throw out any that are not relevant for whatever reason
            return c.length;
        });
        if (!this.set.length) throw new TypeError('Invalid SemVer Range: ' + range1);
        this.format();
    }
    Range.prototype.format = function() {
        this.range = this.set.map(function(comps) {
            return comps.join(' ').trim();
        }).join('||').trim();
        return this.range;
    };
    Range.prototype.toString = function() {
        return this.range;
    };
    Range.prototype.parseRange = function(range) {
        var loose = this.options.loose;
        range = range.trim();
        // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
        var hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
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
        var compRe = loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        var set = range.split(' ').map(function(comp) {
            return parseComparator(comp, this.options);
        }, this).join(' ').split(/\s+/);
        if (this.options.loose) // in loose mode, throw out any that are not valid comparators
        set = set.filter(function(comp) {
            return !!comp.match(compRe);
        });
        set = set.map(function(comp) {
            return new Comparator(comp, this.options);
        }, this);
        return set;
    };
    Range.prototype.intersects = function(range, options) {
        if (!(range instanceof Range)) throw new TypeError('a Range is required');
        return this.set.some(function(thisComparators) {
            return isSatisfiable(thisComparators, options) && range.set.some(function(rangeComparators) {
                return isSatisfiable(rangeComparators, options) && thisComparators.every(function(thisComparator) {
                    return rangeComparators.every(function(rangeComparator) {
                        return thisComparator.intersects(rangeComparator, options);
                    });
                });
            });
        });
    };
    // take a set of comparators and determine whether there
    // exists a version which can satisfy it
    function isSatisfiable(comparators, options) {
        var result = true;
        var remainingComparators = comparators.slice();
        var testComparator = remainingComparators.pop();
        while(result && remainingComparators.length){
            result = remainingComparators.every(function(otherComparator) {
                return testComparator.intersects(otherComparator, options);
            });
            testComparator = remainingComparators.pop();
        }
        return result;
    }
    // Mostly just for testing and legacy API reasons
    exports.toComparators = toComparators;
    function toComparators(range, options) {
        return new Range(range, options).set.map(function(comp) {
            return comp.map(function(c) {
                return c.value;
            }).join(' ').trim().split(' ');
        });
    }
    // comprised of xranges, tildes, stars, and gtlt's at this point.
    // already replaced the hyphen ranges
    // turn into a set of JUST comparators.
    function parseComparator(comp, options) {
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
    }
    function isX(id) {
        return !id || id.toLowerCase() === 'x' || id === '*';
    }
    // ~, ~> --> * (any, kinda silly)
    // ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
    // ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
    // ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
    // ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
    // ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
    function replaceTildes(comp1, options) {
        return comp1.trim().split(/\s+/).map(function(comp) {
            return replaceTilde(comp, options);
        }).join(' ');
    }
    function replaceTilde(comp, options) {
        var r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
        return comp.replace(r, function(_, M, m, p, pr) {
            debug('tilde', comp, _, M, m, p, pr);
            var ret;
            if (isX(M)) ret = '';
            else if (isX(m)) ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
            else if (isX(p)) // ~1.2 == >=1.2.0 <1.3.0
            ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
            else if (pr) {
                debug('replaceTilde pr', pr);
                ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + (+m + 1) + '.0';
            } else // ~1.2.3 == >=1.2.3 <1.3.0
            ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + (+m + 1) + '.0';
            debug('tilde return', ret);
            return ret;
        });
    }
    // ^ --> * (any, kinda silly)
    // ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
    // ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
    // ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
    // ^1.2.3 --> >=1.2.3 <2.0.0
    // ^1.2.0 --> >=1.2.0 <2.0.0
    function replaceCarets(comp2, options) {
        return comp2.trim().split(/\s+/).map(function(comp) {
            return replaceCaret(comp, options);
        }).join(' ');
    }
    function replaceCaret(comp, options) {
        debug('caret', comp, options);
        var r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
        return comp.replace(r, function(_, M, m, p, pr) {
            debug('caret', comp, _, M, m, p, pr);
            var ret;
            if (isX(M)) ret = '';
            else if (isX(m)) ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
            else if (isX(p)) {
                if (M === '0') ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
                else ret = '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0';
            } else if (pr) {
                debug('replaceCaret pr', pr);
                if (M === '0') {
                    if (m === '0') ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + m + '.' + (+p + 1);
                    else ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + (+m + 1) + '.0';
                } else ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + (+M + 1) + '.0.0';
            } else {
                debug('no pr');
                if (M === '0') {
                    if (m === '0') ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + m + '.' + (+p + 1);
                    else ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + (+m + 1) + '.0';
                } else ret = '>=' + M + '.' + m + '.' + p + ' <' + (+M + 1) + '.0.0';
            }
            debug('caret return', ret);
            return ret;
        });
    }
    function replaceXRanges(comp3, options) {
        debug('replaceXRanges', comp3, options);
        return comp3.split(/\s+/).map(function(comp) {
            return replaceXRange(comp, options);
        }).join(' ');
    }
    function replaceXRange(comp, options) {
        comp = comp.trim();
        var r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
        return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
            debug('xRange', comp, ret, gtlt, M, m, p, pr);
            var xM = isX(M);
            var xm = xM || isX(m);
            var xp = xm || isX(p);
            var anyX = xp;
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
                    // >1.2.3 => >= 1.2.4
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
                ret = gtlt + M + '.' + m + '.' + p + pr;
            } else if (xm) ret = '>=' + M + '.0.0' + pr + ' <' + (+M + 1) + '.0.0' + pr;
            else if (xp) ret = '>=' + M + '.' + m + '.0' + pr + ' <' + M + '.' + (+m + 1) + '.0' + pr;
            debug('xRange return', ret);
            return ret;
        });
    }
    // Because * is AND-ed with everything else in the comparator,
    // and '' means "any version", just remove the *s entirely.
    function replaceStars(comp, options) {
        debug('replaceStars', comp, options);
        // Looseness is ignored here.  star is always as loose as it gets!
        return comp.trim().replace(re[t.STAR], '');
    }
    // This function is passed to string.replace(re[t.HYPHENRANGE])
    // M, m, patch, prerelease, build
    // 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
    // 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
    // 1.2 - 3.4 => >=1.2.0 <3.5.0
    function hyphenReplace($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) {
        if (isX(fM)) from = '';
        else if (isX(fm)) from = '>=' + fM + '.0.0';
        else if (isX(fp)) from = '>=' + fM + '.' + fm + '.0';
        else from = '>=' + from;
        if (isX(tM)) to = '';
        else if (isX(tm)) to = '<' + (+tM + 1) + '.0.0';
        else if (isX(tp)) to = '<' + tM + '.' + (+tm + 1) + '.0';
        else if (tpr) to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr;
        else to = '<=' + to;
        return (from + ' ' + to).trim();
    }
    // if ANY of the sets match ALL of its comparators, then pass
    Range.prototype.test = function(version) {
        if (!version) return false;
        if (typeof version === 'string') try {
            version = new SemVer(version, this.options);
        } catch (er) {
            return false;
        }
        for(var i = 0; i < this.set.length; i++){
            if (testSet(this.set[i], version, this.options)) return true;
        }
        return false;
    };
    function testSet(set, version, options) {
        for(var i = 0; i < set.length; i++){
            if (!set[i].test(version)) return false;
        }
        if (version.prerelease.length && !options.includePrerelease) {
            // Find the set of versions that are allowed to have prereleases
            // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
            // That should allow `1.2.3-pr.2` to pass.
            // However, `1.2.4-alpha.notready` should NOT be allowed,
            // even though it's within the range set by the comparators.
            for(i = 0; i < set.length; i++){
                debug(set[i].semver);
                if (set[i].semver === ANY) continue;
                if (set[i].semver.prerelease.length > 0) {
                    var allowed = set[i].semver;
                    if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
                }
            }
            // Version has a -pre, but it's not one of the ones we like.
            return false;
        }
        return true;
    }
    exports.satisfies = satisfies;
    function satisfies(version, range, options) {
        try {
            range = new Range(range, options);
        } catch (er) {
            return false;
        }
        return range.test(version);
    }
    exports.maxSatisfying = maxSatisfying;
    function maxSatisfying(versions, range, options) {
        var max = null;
        var maxSV = null;
        try {
            var rangeObj = new Range(range, options);
        } catch (er) {
            return null;
        }
        versions.forEach(function(v) {
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
    }
    exports.minSatisfying = minSatisfying;
    function minSatisfying(versions, range, options) {
        var min = null;
        var minSV = null;
        try {
            var rangeObj = new Range(range, options);
        } catch (er) {
            return null;
        }
        versions.forEach(function(v) {
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
    }
    exports.minVersion = minVersion;
    function minVersion(range, loose) {
        range = new Range(range, loose);
        var minver = new SemVer('0.0.0');
        if (range.test(minver)) return minver;
        minver = new SemVer('0.0.0-0');
        if (range.test(minver)) return minver;
        minver = null;
        for(var i = 0; i < range.set.length; ++i){
            var comparators = range.set[i];
            comparators.forEach(function(comparator) {
                // Clone to avoid manipulating the comparator's semver object.
                var compver = new SemVer(comparator.semver.version);
                switch(comparator.operator){
                    case '>':
                        if (compver.prerelease.length === 0) compver.patch++;
                        else compver.prerelease.push(0);
                        compver.raw = compver.format();
                    /* fallthrough */ case '':
                    case '>=':
                        if (!minver || gt(minver, compver)) minver = compver;
                        break;
                    case '<':
                    case '<=':
                        break;
                    /* istanbul ignore next */ default:
                        throw new Error('Unexpected operation: ' + comparator.operator);
                }
            });
        }
        if (minver && range.test(minver)) return minver;
        return null;
    }
    exports.validRange = validRange;
    function validRange(range, options) {
        try {
            // Return '*' instead of '' so that truthiness works.
            // This will throw if it's invalid anyway
            return new Range(range, options).range || '*';
        } catch (er) {
            return null;
        }
    }
    // Determine if version is less than all the versions possible in the range
    exports.ltr = ltr;
    function ltr(version, range, options) {
        return outside(version, range, '<', options);
    }
    // Determine if version is greater than all the versions possible in the range.
    exports.gtr = gtr;
    function gtr(version, range, options) {
        return outside(version, range, '>', options);
    }
    exports.outside = outside;
    function outside(version, range, hilo, options) {
        version = new SemVer(version, options);
        range = new Range(range, options);
        var gtfn, ltefn, ltfn, comp, ecomp;
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
        // If it satisifes the range it is not outside
        if (satisfies(version, range, options)) return false;
        // From now on, variable terms are as if we're in "gtr" mode.
        // but note that everything is flipped for the "ltr" function.
        for(var i = 0; i < range.set.length; ++i){
            var comparators = range.set[i];
            var high = null;
            var low = null;
            comparators.forEach(function(comparator) {
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
    }
    exports.prerelease = prerelease;
    function prerelease(version, options) {
        var parsed = parse(version, options);
        return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    }
    exports.intersects = intersects;
    function intersects(r1, r2, options) {
        r1 = new Range(r1, options);
        r2 = new Range(r2, options);
        return r1.intersects(r2);
    }
    exports.coerce = coerce;
    function coerce(version, options) {
        if (version instanceof SemVer) return version;
        if (typeof version === 'number') version = String(version);
        if (typeof version !== 'string') return null;
        options = options || {};
        var match = null;
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
            var next;
            while((next = re[t.COERCERTL].exec(version)) && (!match || match.index + match[0].length !== version.length)){
                if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
                re[t.COERCERTL].lastIndex = next.index + next[1].length + next[2].length;
            }
            // leave it in a clean state
            re[t.COERCERTL].lastIndex = -1;
        }
        if (match === null) return null;
        return parse(match[2] + '.' + (match[3] || '0') + '.' + (match[4] || '0'), options);
    }
});
var load36 = __swcpack_require__.bind(void 0, function(module, exports) {
    // Unique ID creation requires a high quality random # generator.  In node.js
    // this is pretty straight-forward - we use the crypto API.
    var crypto = require('crypto');
    module.exports = function nodeRNG() {
        return crypto.randomBytes(16);
    };
});
var load37 = __swcpack_require__.bind(void 0, function(module, exports) {
    /**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */ var byteToHex = [];
    for(var i2 = 0; i2 < 256; ++i2)byteToHex[i2] = (i2 + 256).toString(16).substr(1);
    function bytesToUuid(buf, offset) {
        var i = offset || 0;
        var bth = byteToHex;
        // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
        return [
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]]
        ].join('');
    }
    module.exports = bytesToUuid;
});
var load38 = __swcpack_require__.bind(void 0, function(module, exports) {
    var rng = load36();
    var bytesToUuid = load37();
    // **`v1()` - Generate time-based UUID**
    //
    // Inspired by https://github.com/LiosK/UUID.js
    // and http://docs.python.org/library/uuid.html
    var _nodeId;
    var _clockseq;
    // Previous uuid creation time
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    // See https://github.com/uuidjs/uuid for API details
    function v1(options, buf, offset) {
        var i = buf && offset || 0;
        var b = buf || [];
        options = options || {};
        var node = options.node || _nodeId;
        var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;
        // node and clockseq need to be initialized to random values if they're not
        // specified.  We do this lazily to minimize issues related to insufficient
        // system entropy.  See #189
        if (node == null || clockseq == null) {
            var seedBytes = rng();
            if (node == null) // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
            node = _nodeId = [
                seedBytes[0] | 1,
                seedBytes[1],
                seedBytes[2],
                seedBytes[3],
                seedBytes[4],
                seedBytes[5]
            ];
            if (clockseq == null) // Per 4.2.2, randomize (14 bit) clockseq
            clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
        // UUID timestamps are 100 nano-second units since the Gregorian epoch,
        // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
        // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
        // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
        var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();
        // Per 4.2.1.2, use count of uuid's generated during the current clock
        // cycle to simulate higher resolution clock
        var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;
        // Time since last uuid creation (in msecs)
        var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000;
        // Per 4.2.1.2, Bump clockseq on clock regression
        if (dt < 0 && options.clockseq === undefined) clockseq = clockseq + 1 & 16383;
        // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
        // time interval
        if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) nsecs = 0;
        // Per 4.2.1.2 Throw error if too many uuids are requested
        if (nsecs >= 10000) throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
        _lastMSecs = msecs;
        _lastNSecs = nsecs;
        _clockseq = clockseq;
        // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
        msecs += 12219292800000;
        // `time_low`
        var tl = ((msecs & 268435455) * 10000 + nsecs) % 4294967296;
        b[i++] = tl >>> 24 & 255;
        b[i++] = tl >>> 16 & 255;
        b[i++] = tl >>> 8 & 255;
        b[i++] = tl & 255;
        // `time_mid`
        var tmh = msecs / 4294967296 * 10000 & 268435455;
        b[i++] = tmh >>> 8 & 255;
        b[i++] = tmh & 255;
        // `time_high_and_version`
        b[i++] = tmh >>> 24 & 15 | 16; // include version
        b[i++] = tmh >>> 16 & 255;
        // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
        b[i++] = clockseq >>> 8 | 128;
        // `clock_seq_low`
        b[i++] = clockseq & 255;
        // `node`
        for(var n = 0; n < 6; ++n)b[i + n] = node[n];
        return buf ? buf : bytesToUuid(b);
    }
    module.exports = v1;
});
var load39 = __swcpack_require__.bind(void 0, function(module, exports) {
    var rng = load36();
    var bytesToUuid = load37();
    function v4(options, buf, offset) {
        var i = buf && offset || 0;
        if (typeof options == 'string') {
            buf = options === 'binary' ? new Array(16) : null;
            options = null;
        }
        options = options || {};
        var rnds = options.random || (options.rng || rng)();
        // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
        rnds[6] = rnds[6] & 15 | 64;
        rnds[8] = rnds[8] & 63 | 128;
        // Copy bytes to buffer, if provided
        if (buf) for(var ii = 0; ii < 16; ++ii)buf[i + ii] = rnds[ii];
        return buf || bytesToUuid(rnds);
    }
    module.exports = v4;
});
var load40 = __swcpack_require__.bind(void 0, function(module, exports) {
    var v1 = load38();
    var v4 = load39();
    var uuid = v4;
    uuid.v1 = v1;
    uuid.v4 = v4;
    module.exports = uuid;
});
var load41 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    var CacheFilename1;
    (function(CacheFilename) {
        CacheFilename["Gzip"] = "cache.tgz";
        CacheFilename["Zstd"] = "cache.tzst";
    })(CacheFilename1 = exports.CacheFilename || (exports.CacheFilename = {}));
    var CompressionMethod1;
    (function(CompressionMethod) {
        CompressionMethod["Gzip"] = "gzip";
        // Long range mode was added to zstd in v1.3.2.
        // This enum is for earlier version of zstd that does not have --long support
        CompressionMethod["ZstdWithoutLong"] = "zstd-without-long";
        CompressionMethod["Zstd"] = "zstd";
    })(CompressionMethod1 = exports.CompressionMethod || (exports.CompressionMethod = {}));
    // The default number of retry attempts.
    exports.DefaultRetryAttempts = 2;
    // The default delay in milliseconds between retry attempts.
    exports.DefaultRetryDelay = 5000;
    // Socket timeout in milliseconds during download.  If no traffic is received
    // over the socket during this period, the socket is destroyed and the download
    // is aborted.
    exports.SocketTimeout = 5000; //# sourceMappingURL=constants.js.map
});
var load42 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __asyncValues = this && this.__asyncValues || function(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        function verb(n) {
            i[n] = o[n] && function(v) {
                return new Promise(function(resolve, reject) {
                    v = o[n](v), settle(resolve, reject, v.done, v.value);
                });
            };
        }
        function settle(resolve, reject, d, v2) {
            Promise.resolve(v2).then(function(v) {
                resolve({
                    value: v,
                    done: d
                });
            }, reject);
        }
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
        }, i);
    };
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const core = __importStar(load17());
    const exec = __importStar(load13());
    const glob = __importStar(load34());
    const io = __importStar(load11());
    const fs = __importStar(require("fs"));
    const path = __importStar(require("path"));
    const semver = __importStar(load35());
    const util = __importStar(require("util"));
    const uuid_1 = load40();
    const constants_1 = load41();
    // From https://github.com/actions/toolkit/blob/main/packages/tool-cache/src/tool-cache.ts#L23
    function createTempDirectory() {
        return __awaiter(this, void 0, void 0, function*() {
            const IS_WINDOWS = process.platform === 'win32';
            let tempDirectory = process.env['RUNNER_TEMP'] || '';
            if (!tempDirectory) {
                let baseLocation;
                if (IS_WINDOWS) // On Windows use the USERPROFILE env variable
                baseLocation = process.env['USERPROFILE'] || 'C:\\';
                else if (process.platform === 'darwin') baseLocation = '/Users';
                else baseLocation = '/home';
                tempDirectory = path.join(baseLocation, 'actions', 'temp');
            }
            const dest = path.join(tempDirectory, uuid_1.v4());
            yield io.mkdirP(dest);
            return dest;
        });
    }
    exports.createTempDirectory = createTempDirectory;
    function getArchiveFileSizeIsBytes(filePath) {
        return fs.statSync(filePath).size;
    }
    exports.getArchiveFileSizeIsBytes = getArchiveFileSizeIsBytes;
    function resolvePaths(patterns) {
        var e_1, _a;
        var _b;
        return __awaiter(this, void 0, void 0, function*() {
            const paths = [];
            const workspace = (_b = process.env['GITHUB_WORKSPACE']) !== null && _b !== void 0 ? _b : process.cwd();
            const globber = yield glob.create(patterns.join('\n'), {
                implicitDescendants: false
            });
            try {
                for(var _c = __asyncValues(globber.globGenerator()), _d; _d = yield _c.next(), !_d.done;){
                    const file = _d.value;
                    const relativeFile = path.relative(workspace, file).replace(new RegExp(`\\${path.sep}`, 'g'), '/');
                    core.debug(`Matched: ${relativeFile}`);
                    // Paths are made relative so the tar entries are all relative to the root of the workspace.
                    paths.push(`${relativeFile}`);
                }
            } catch (e_1_1) {
                e_1 = {
                    error: e_1_1
                };
            } finally{
                try {
                    if (_d && !_d.done && (_a = _c.return)) yield _a.call(_c);
                } finally{
                    if (e_1) throw e_1.error;
                }
            }
            return paths;
        });
    }
    exports.resolvePaths = resolvePaths;
    function unlinkFile(filePath) {
        return __awaiter(this, void 0, void 0, function*() {
            return util.promisify(fs.unlink)(filePath);
        });
    }
    exports.unlinkFile = unlinkFile;
    function getVersion(app) {
        return __awaiter(this, void 0, void 0, function*() {
            core.debug(`Checking ${app} --version`);
            let versionOutput = '';
            try {
                yield exec.exec(`${app} --version`, [], {
                    ignoreReturnCode: true,
                    silent: true,
                    listeners: {
                        stdout: (data)=>versionOutput += data.toString()
                        ,
                        stderr: (data)=>versionOutput += data.toString()
                    }
                });
            } catch (err) {
                core.debug(err.message);
            }
            versionOutput = versionOutput.trim();
            core.debug(versionOutput);
            return versionOutput;
        });
    }
    // Use zstandard if possible to maximize cache performance
    function getCompressionMethod() {
        return __awaiter(this, void 0, void 0, function*() {
            if (process.platform === 'win32' && !(yield isGnuTarInstalled())) // Disable zstd due to bug https://github.com/actions/cache/issues/301
            return constants_1.CompressionMethod.Gzip;
            const versionOutput = yield getVersion('zstd');
            const version = semver.clean(versionOutput);
            if (!versionOutput.toLowerCase().includes('zstd command line interface')) // zstd is not installed
            return constants_1.CompressionMethod.Gzip;
            else if (!version || semver.lt(version, 'v1.3.2')) // zstd is installed but using a version earlier than v1.3.2
            // v1.3.2 is required to use the `--long` options in zstd
            return constants_1.CompressionMethod.ZstdWithoutLong;
            else return constants_1.CompressionMethod.Zstd;
        });
    }
    exports.getCompressionMethod = getCompressionMethod;
    function getCacheFileName(compressionMethod) {
        return compressionMethod === constants_1.CompressionMethod.Gzip ? constants_1.CacheFilename.Gzip : constants_1.CacheFilename.Zstd;
    }
    exports.getCacheFileName = getCacheFileName;
    function isGnuTarInstalled() {
        return __awaiter(this, void 0, void 0, function*() {
            const versionOutput = yield getVersion('tar');
            return versionOutput.toLowerCase().includes('gnu tar');
        });
    }
    exports.isGnuTarInstalled = isGnuTarInstalled;
    function assertDefined(name, value) {
        if (value === undefined) throw Error(`Expected ${name} but value was undefiend`);
        return value;
    }
    exports.assertDefined = assertDefined; //# sourceMappingURL=cacheUtils.js.map
});
var load43 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const core = __importStar(load17());
    const http_client_1 = load3();
    const constants_1 = load41();
    function isSuccessStatusCode(statusCode) {
        if (!statusCode) return false;
        return statusCode >= 200 && statusCode < 300;
    }
    exports.isSuccessStatusCode = isSuccessStatusCode;
    function isServerErrorStatusCode(statusCode) {
        if (!statusCode) return true;
        return statusCode >= 500;
    }
    exports.isServerErrorStatusCode = isServerErrorStatusCode;
    function isRetryableStatusCode(statusCode) {
        if (!statusCode) return false;
        const retryableStatusCodes = [
            http_client_1.HttpCodes.BadGateway,
            http_client_1.HttpCodes.ServiceUnavailable,
            http_client_1.HttpCodes.GatewayTimeout
        ];
        return retryableStatusCodes.includes(statusCode);
    }
    exports.isRetryableStatusCode = isRetryableStatusCode;
    function sleep(milliseconds) {
        return __awaiter(this, void 0, void 0, function*() {
            return new Promise((resolve)=>setTimeout(resolve, milliseconds)
            );
        });
    }
    function retry(name, method, getStatusCode, maxAttempts = constants_1.DefaultRetryAttempts, delay = constants_1.DefaultRetryDelay, onError) {
        return __awaiter(this, void 0, void 0, function*() {
            let errorMessage = '';
            let attempt = 1;
            while(attempt <= maxAttempts){
                let response = undefined;
                let statusCode = undefined;
                let isRetryable = false;
                try {
                    response = yield method();
                } catch (error) {
                    if (onError) response = onError(error);
                    isRetryable = true;
                    errorMessage = error.message;
                }
                if (response) {
                    statusCode = getStatusCode(response);
                    if (!isServerErrorStatusCode(statusCode)) return response;
                }
                if (statusCode) {
                    isRetryable = isRetryableStatusCode(statusCode);
                    errorMessage = `Cache service responded with ${statusCode}`;
                }
                core.debug(`${name} - Attempt ${attempt} of ${maxAttempts} failed with error: ${errorMessage}`);
                if (!isRetryable) {
                    core.debug(`${name} - Error is not retryable`);
                    break;
                }
                yield sleep(delay);
                attempt++;
            }
            throw Error(`${name} failed: ${errorMessage}`);
        });
    }
    exports.retry = retry;
    function retryTypedResponse(name, method, maxAttempts = constants_1.DefaultRetryAttempts, delay = constants_1.DefaultRetryDelay) {
        return __awaiter(this, void 0, void 0, function*() {
            return yield retry(name, method, (response)=>response.statusCode
            , maxAttempts, delay, // If the error object contains the statusCode property, extract it and return
            // an ITypedResponse<T> so it can be processed by the retry logic.
            (error)=>{
                if (error instanceof http_client_1.HttpClientError) return {
                    statusCode: error.statusCode,
                    result: null,
                    headers: {}
                };
                else return undefined;
            });
        });
    }
    exports.retryTypedResponse = retryTypedResponse;
    function retryHttpClientResponse(name, method, maxAttempts = constants_1.DefaultRetryAttempts, delay = constants_1.DefaultRetryDelay) {
        return __awaiter(this, void 0, void 0, function*() {
            return yield retry(name, method, (response)=>response.message.statusCode
            , maxAttempts, delay);
        });
    }
    exports.retryHttpClientResponse = retryHttpClientResponse; //# sourceMappingURL=requestUtils.js.map
});
var load44 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const core = __importStar(load17());
    const http_client_1 = load3();
    const storage_blob_1 = require("@azure/storage-blob");
    const buffer = __importStar(require("buffer"));
    const fs = __importStar(require("fs"));
    const stream = __importStar(require("stream"));
    const util = __importStar(require("util"));
    const utils = __importStar(load42());
    const constants_1 = load41();
    const requestUtils_1 = load43();
    /**
 * Pipes the body of a HTTP response to a stream
 *
 * @param response the HTTP response
 * @param output the writable stream
 */ function pipeResponseToStream(response, output) {
        return __awaiter(this, void 0, void 0, function*() {
            const pipeline = util.promisify(stream.pipeline);
            yield pipeline(response.message, output);
        });
    }
    /**
 * Class for tracking the download state and displaying stats.
 */ class DownloadProgress {
        constructor(contentLength){
            this.contentLength = contentLength;
            this.segmentIndex = 0;
            this.segmentSize = 0;
            this.segmentOffset = 0;
            this.receivedBytes = 0;
            this.displayedComplete = false;
            this.startTime = Date.now();
        }
        /**
     * Progress to the next segment. Only call this method when the previous segment
     * is complete.
     *
     * @param segmentSize the length of the next segment
     */ nextSegment(segmentSize) {
            this.segmentOffset = this.segmentOffset + this.segmentSize;
            this.segmentIndex = this.segmentIndex + 1;
            this.segmentSize = segmentSize;
            this.receivedBytes = 0;
            core.debug(`Downloading segment at offset ${this.segmentOffset} with length ${this.segmentSize}...`);
        }
        /**
     * Sets the number of bytes received for the current segment.
     *
     * @param receivedBytes the number of bytes received
     */ setReceivedBytes(receivedBytes) {
            this.receivedBytes = receivedBytes;
        }
        /**
     * Returns the total number of bytes transferred.
     */ getTransferredBytes() {
            return this.segmentOffset + this.receivedBytes;
        }
        /**
     * Returns true if the download is complete.
     */ isDone() {
            return this.getTransferredBytes() === this.contentLength;
        }
        /**
     * Prints the current download stats. Once the download completes, this will print one
     * last line and then stop.
     */ display() {
            if (this.displayedComplete) return;
            const transferredBytes = this.segmentOffset + this.receivedBytes;
            const percentage = (100 * (transferredBytes / this.contentLength)).toFixed(1);
            const elapsedTime = Date.now() - this.startTime;
            const downloadSpeed = (transferredBytes / 1048576 / (elapsedTime / 1000)).toFixed(1);
            core.info(`Received ${transferredBytes} of ${this.contentLength} (${percentage}%), ${downloadSpeed} MBs/sec`);
            if (this.isDone()) this.displayedComplete = true;
        }
        /**
     * Returns a function used to handle TransferProgressEvents.
     */ onProgress() {
            return (progress)=>{
                this.setReceivedBytes(progress.loadedBytes);
            };
        }
        /**
     * Starts the timer that displays the stats.
     *
     * @param delayInMs the delay between each write
     */ startDisplayTimer(delayInMs = 1000) {
            const displayCallback = ()=>{
                this.display();
                if (!this.isDone()) this.timeoutHandle = setTimeout(displayCallback, delayInMs);
            };
            this.timeoutHandle = setTimeout(displayCallback, delayInMs);
        }
        /**
     * Stops the timer that displays the stats. As this typically indicates the download
     * is complete, this will display one last line, unless the last line has already
     * been written.
     */ stopDisplayTimer() {
            if (this.timeoutHandle) {
                clearTimeout(this.timeoutHandle);
                this.timeoutHandle = undefined;
            }
            this.display();
        }
    }
    exports.DownloadProgress = DownloadProgress;
    /**
 * Download the cache using the Actions toolkit http-client
 *
 * @param archiveLocation the URL for the cache
 * @param archivePath the local path where the cache is saved
 */ function downloadCacheHttpClient(archiveLocation, archivePath) {
        return __awaiter(this, void 0, void 0, function*() {
            const writeStream = fs.createWriteStream(archivePath);
            const httpClient = new http_client_1.HttpClient('actions/cache');
            const downloadResponse = yield requestUtils_1.retryHttpClientResponse('downloadCache', ()=>__awaiter(this, void 0, void 0, function*() {
                    return httpClient.get(archiveLocation);
                })
            );
            // Abort download if no traffic received over the socket.
            downloadResponse.message.socket.setTimeout(constants_1.SocketTimeout, ()=>{
                downloadResponse.message.destroy();
                core.debug(`Aborting download, socket timed out after ${constants_1.SocketTimeout} ms`);
            });
            yield pipeResponseToStream(downloadResponse, writeStream);
            // Validate download size.
            const contentLengthHeader = downloadResponse.message.headers['content-length'];
            if (contentLengthHeader) {
                const expectedLength = parseInt(contentLengthHeader);
                const actualLength = utils.getArchiveFileSizeIsBytes(archivePath);
                if (actualLength !== expectedLength) throw new Error(`Incomplete download. Expected file size: ${expectedLength}, actual file size: ${actualLength}`);
            } else core.debug('Unable to validate download, no Content-Length header');
        });
    }
    exports.downloadCacheHttpClient = downloadCacheHttpClient;
    /**
 * Download the cache using the Azure Storage SDK.  Only call this method if the
 * URL points to an Azure Storage endpoint.
 *
 * @param archiveLocation the URL for the cache
 * @param archivePath the local path where the cache is saved
 * @param options the download options with the defaults set
 */ function downloadCacheStorageSDK(archiveLocation, archivePath, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function*() {
            const client = new storage_blob_1.BlockBlobClient(archiveLocation, undefined, {
                retryOptions: {
                    // Override the timeout used when downloading each 4 MB chunk
                    // The default is 2 min / MB, which is way too slow
                    tryTimeoutInMs: options.timeoutInMs
                }
            });
            const properties = yield client.getProperties();
            const contentLength = (_a = properties.contentLength) !== null && _a !== void 0 ? _a : -1;
            if (contentLength < 0) {
                // We should never hit this condition, but just in case fall back to downloading the
                // file as one large stream
                core.debug('Unable to determine content length, downloading file with http-client...');
                yield downloadCacheHttpClient(archiveLocation, archivePath);
            } else {
                // Use downloadToBuffer for faster downloads, since internally it splits the
                // file into 4 MB chunks which can then be parallelized and retried independently
                //
                // If the file exceeds the buffer maximum length (~1 GB on 32-bit systems and ~2 GB
                // on 64-bit systems), split the download into multiple segments
                const maxSegmentSize = buffer.constants.MAX_LENGTH;
                const downloadProgress = new DownloadProgress(contentLength);
                const fd = fs.openSync(archivePath, 'w');
                try {
                    downloadProgress.startDisplayTimer();
                    while(!downloadProgress.isDone()){
                        const segmentStart = downloadProgress.segmentOffset + downloadProgress.segmentSize;
                        const segmentSize = Math.min(maxSegmentSize, contentLength - segmentStart);
                        downloadProgress.nextSegment(segmentSize);
                        const result = yield client.downloadToBuffer(segmentStart, segmentSize, {
                            concurrency: options.downloadConcurrency,
                            onProgress: downloadProgress.onProgress()
                        });
                        fs.writeFileSync(fd, result);
                    }
                } finally{
                    downloadProgress.stopDisplayTimer();
                    fs.closeSync(fd);
                }
            }
        });
    }
    exports.downloadCacheStorageSDK = downloadCacheStorageSDK; //# sourceMappingURL=downloadUtils.js.map
});
var load45 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const core = __importStar(load17());
    /**
 * Returns a copy of the upload options with defaults filled in.
 *
 * @param copy the original upload options
 */ function getUploadOptions(copy) {
        const result = {
            uploadConcurrency: 4,
            uploadChunkSize: 33554432
        };
        if (copy) {
            if (typeof copy.uploadConcurrency === 'number') result.uploadConcurrency = copy.uploadConcurrency;
            if (typeof copy.uploadChunkSize === 'number') result.uploadChunkSize = copy.uploadChunkSize;
        }
        core.debug(`Upload concurrency: ${result.uploadConcurrency}`);
        core.debug(`Upload chunk size: ${result.uploadChunkSize}`);
        return result;
    }
    exports.getUploadOptions = getUploadOptions;
    /**
 * Returns a copy of the download options with defaults filled in.
 *
 * @param copy the original download options
 */ function getDownloadOptions(copy) {
        const result = {
            useAzureSdk: true,
            downloadConcurrency: 8,
            timeoutInMs: 30000
        };
        if (copy) {
            if (typeof copy.useAzureSdk === 'boolean') result.useAzureSdk = copy.useAzureSdk;
            if (typeof copy.downloadConcurrency === 'number') result.downloadConcurrency = copy.downloadConcurrency;
            if (typeof copy.timeoutInMs === 'number') result.timeoutInMs = copy.timeoutInMs;
        }
        core.debug(`Use Azure SDK: ${result.useAzureSdk}`);
        core.debug(`Download concurrency: ${result.downloadConcurrency}`);
        core.debug(`Request timeout (ms): ${result.timeoutInMs}`);
        return result;
    }
    exports.getDownloadOptions = getDownloadOptions; //# sourceMappingURL=options.js.map
});
var load46 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const core = __importStar(load17());
    const http_client_1 = load3();
    const auth_1 = load4();
    const crypto = __importStar(require("crypto"));
    const fs = __importStar(require("fs"));
    const url_1 = require("url");
    const utils = __importStar(load42());
    const constants_1 = load41();
    const downloadUtils_1 = load44();
    const options_1 = load45();
    const requestUtils_1 = load43();
    const versionSalt = '1.0';
    function getCacheApiUrl(resource) {
        // Ideally we just use ACTIONS_CACHE_URL
        const baseUrl = (process.env['ACTIONS_CACHE_URL'] || process.env['ACTIONS_RUNTIME_URL'] || '').replace('pipelines', 'artifactcache');
        if (!baseUrl) throw new Error('Cache Service Url not found, unable to restore cache.');
        const url = `${baseUrl}_apis/artifactcache/${resource}`;
        core.debug(`Resource Url: ${url}`);
        return url;
    }
    function createAcceptHeader(type, apiVersion) {
        return `${type};api-version=${apiVersion}`;
    }
    function getRequestOptions() {
        const requestOptions = {
            headers: {
                Accept: createAcceptHeader('application/json', '6.0-preview.1')
            }
        };
        return requestOptions;
    }
    function createHttpClient() {
        const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';
        const bearerCredentialHandler = new auth_1.BearerCredentialHandler(token);
        return new http_client_1.HttpClient('actions/cache', [
            bearerCredentialHandler
        ], getRequestOptions());
    }
    function getCacheVersion(paths, compressionMethod) {
        const components = paths.concat(!compressionMethod || compressionMethod === constants_1.CompressionMethod.Gzip ? [] : [
            compressionMethod
        ]);
        // Add salt to cache version to support breaking changes in cache entry
        components.push(versionSalt);
        return crypto.createHash('sha256').update(components.join('|')).digest('hex');
    }
    exports.getCacheVersion = getCacheVersion;
    function getCacheEntry(keys, paths, options) {
        return __awaiter(this, void 0, void 0, function*() {
            const httpClient = createHttpClient();
            const version = getCacheVersion(paths, options === null || options === void 0 ? void 0 : options.compressionMethod);
            const resource = `cache?keys=${encodeURIComponent(keys.join(','))}&version=${version}`;
            const response = yield requestUtils_1.retryTypedResponse('getCacheEntry', ()=>__awaiter(this, void 0, void 0, function*() {
                    return httpClient.getJson(getCacheApiUrl(resource));
                })
            );
            if (response.statusCode === 204) return null;
            if (!requestUtils_1.isSuccessStatusCode(response.statusCode)) throw new Error(`Cache service responded with ${response.statusCode}`);
            const cacheResult = response.result;
            const cacheDownloadUrl = cacheResult === null || cacheResult === void 0 ? void 0 : cacheResult.archiveLocation;
            if (!cacheDownloadUrl) throw new Error('Cache not found.');
            core.setSecret(cacheDownloadUrl);
            core.debug(`Cache Result:`);
            core.debug(JSON.stringify(cacheResult));
            return cacheResult;
        });
    }
    exports.getCacheEntry = getCacheEntry;
    function downloadCache(archiveLocation, archivePath, options) {
        return __awaiter(this, void 0, void 0, function*() {
            const archiveUrl = new url_1.URL(archiveLocation);
            const downloadOptions = options_1.getDownloadOptions(options);
            if (downloadOptions.useAzureSdk && archiveUrl.hostname.endsWith('.blob.core.windows.net')) // Use Azure storage SDK to download caches hosted on Azure to improve speed and reliability.
            yield downloadUtils_1.downloadCacheStorageSDK(archiveLocation, archivePath, downloadOptions);
            else // Otherwise, download using the Actions http-client.
            yield downloadUtils_1.downloadCacheHttpClient(archiveLocation, archivePath);
        });
    }
    exports.downloadCache = downloadCache;
    // Reserve Cache
    function reserveCache(key, paths, options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function*() {
            const httpClient = createHttpClient();
            const version = getCacheVersion(paths, options === null || options === void 0 ? void 0 : options.compressionMethod);
            const reserveCacheRequest = {
                key,
                version
            };
            const response = yield requestUtils_1.retryTypedResponse('reserveCache', ()=>__awaiter(this, void 0, void 0, function*() {
                    return httpClient.postJson(getCacheApiUrl('caches'), reserveCacheRequest);
                })
            );
            return (_b = (_a = response === null || response === void 0 ? void 0 : response.result) === null || _a === void 0 ? void 0 : _a.cacheId) !== null && _b !== void 0 ? _b : -1;
        });
    }
    exports.reserveCache = reserveCache;
    function getContentRange(start, end) {
        // Format: `bytes start-end/filesize
        // start and end are inclusive
        // filesize can be *
        // For a 200 byte chunk starting at byte 0:
        // Content-Range: bytes 0-199/*
        return `bytes ${start}-${end}/*`;
    }
    function uploadChunk(httpClient, resourceUrl, openStream, start, end) {
        return __awaiter(this, void 0, void 0, function*() {
            core.debug(`Uploading chunk of size ${end - start + 1} bytes at offset ${start} with content range: ${getContentRange(start, end)}`);
            const additionalHeaders = {
                'Content-Type': 'application/octet-stream',
                'Content-Range': getContentRange(start, end)
            };
            const uploadChunkResponse = yield requestUtils_1.retryHttpClientResponse(`uploadChunk (start: ${start}, end: ${end})`, ()=>__awaiter(this, void 0, void 0, function*() {
                    return httpClient.sendStream('PATCH', resourceUrl, openStream(), additionalHeaders);
                })
            );
            if (!requestUtils_1.isSuccessStatusCode(uploadChunkResponse.message.statusCode)) throw new Error(`Cache service responded with ${uploadChunkResponse.message.statusCode} during upload chunk.`);
        });
    }
    function uploadFile(httpClient, cacheId, archivePath, options) {
        return __awaiter(this, void 0, void 0, function*() {
            // Upload Chunks
            const fileSize = fs.statSync(archivePath).size;
            const resourceUrl = getCacheApiUrl(`caches/${cacheId.toString()}`);
            const fd = fs.openSync(archivePath, 'r');
            const uploadOptions = options_1.getUploadOptions(options);
            const concurrency = utils.assertDefined('uploadConcurrency', uploadOptions.uploadConcurrency);
            const maxChunkSize = utils.assertDefined('uploadChunkSize', uploadOptions.uploadChunkSize);
            const parallelUploads = [
                ...new Array(concurrency).keys()
            ];
            core.debug('Awaiting all uploads');
            let offset = 0;
            try {
                yield Promise.all(parallelUploads.map(()=>__awaiter(this, void 0, void 0, function*() {
                        while(offset < fileSize){
                            const chunkSize = Math.min(fileSize - offset, maxChunkSize);
                            const start = offset;
                            const end = offset + chunkSize - 1;
                            offset += maxChunkSize;
                            yield uploadChunk(httpClient, resourceUrl, ()=>fs.createReadStream(archivePath, {
                                    fd,
                                    start,
                                    end,
                                    autoClose: false
                                }).on('error', (error)=>{
                                    throw new Error(`Cache upload failed because file read failed with ${error.message}`);
                                })
                            , start, end);
                        }
                    })
                ));
            } finally{
                fs.closeSync(fd);
            }
            return;
        });
    }
    function commitCache(httpClient, cacheId, filesize) {
        return __awaiter(this, void 0, void 0, function*() {
            const commitCacheRequest = {
                size: filesize
            };
            return yield requestUtils_1.retryTypedResponse('commitCache', ()=>__awaiter(this, void 0, void 0, function*() {
                    return httpClient.postJson(getCacheApiUrl(`caches/${cacheId.toString()}`), commitCacheRequest);
                })
            );
        });
    }
    function saveCache(cacheId, archivePath, options) {
        return __awaiter(this, void 0, void 0, function*() {
            const httpClient = createHttpClient();
            core.debug('Upload cache');
            yield uploadFile(httpClient, cacheId, archivePath, options);
            // Commit Cache
            core.debug('Commiting cache');
            const cacheSize = utils.getArchiveFileSizeIsBytes(archivePath);
            core.info(`Cache Size: ~${Math.round(cacheSize / 1048576)} MB (${cacheSize} B)`);
            const commitCacheResponse = yield commitCache(httpClient, cacheId, cacheSize);
            if (!requestUtils_1.isSuccessStatusCode(commitCacheResponse.statusCode)) throw new Error(`Cache service responded with ${commitCacheResponse.statusCode} during commit cache.`);
            core.info('Cache saved successfully');
        });
    }
    exports.saveCache = saveCache; //# sourceMappingURL=cacheHttpClient.js.map
});
var load47 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const exec_1 = load13();
    const io = __importStar(load11());
    const fs_1 = require("fs");
    const path = __importStar(require("path"));
    const utils = __importStar(load42());
    const constants_1 = load41();
    function getTarPath(args, compressionMethod) {
        return __awaiter(this, void 0, void 0, function*() {
            switch(process.platform){
                case 'win32':
                    {
                        const systemTar = `${process.env['windir']}\\System32\\tar.exe`;
                        if (compressionMethod !== constants_1.CompressionMethod.Gzip) // We only use zstandard compression on windows when gnu tar is installed due to
                        // a bug with compressing large files with bsdtar + zstd
                        args.push('--force-local');
                        else if (fs_1.existsSync(systemTar)) return systemTar;
                        else if (yield utils.isGnuTarInstalled()) args.push('--force-local');
                        break;
                    }
                case 'darwin':
                    {
                        const gnuTar = yield io.which('gtar', false);
                        if (gnuTar) {
                            // fix permission denied errors when extracting BSD tar archive with GNU tar - https://github.com/actions/cache/issues/527
                            args.push('--delay-directory-restore');
                            return gnuTar;
                        }
                        break;
                    }
                default:
                    break;
            }
            return yield io.which('tar', true);
        });
    }
    function execTar(args, compressionMethod, cwd) {
        return __awaiter(this, void 0, void 0, function*() {
            try {
                yield exec_1.exec(`"${yield getTarPath(args, compressionMethod)}"`, args, {
                    cwd
                });
            } catch (error) {
                throw new Error(`Tar failed with error: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
        });
    }
    function getWorkingDirectory() {
        var _a;
        return (_a = process.env['GITHUB_WORKSPACE']) !== null && _a !== void 0 ? _a : process.cwd();
    }
    function extractTar(archivePath, compressionMethod) {
        return __awaiter(this, void 0, void 0, function*() {
            // Create directory to extract tar into
            const workingDirectory = getWorkingDirectory();
            yield io.mkdirP(workingDirectory);
            // --d: Decompress.
            // --long=#: Enables long distance matching with # bits. Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
            // Using 30 here because we also support 32-bit self-hosted runners.
            function getCompressionProgram() {
                switch(compressionMethod){
                    case constants_1.CompressionMethod.Zstd:
                        return [
                            '--use-compress-program',
                            'zstd -d --long=30'
                        ];
                    case constants_1.CompressionMethod.ZstdWithoutLong:
                        return [
                            '--use-compress-program',
                            'zstd -d'
                        ];
                    default:
                        return [
                            '-z'
                        ];
                }
            }
            const args = [
                ...getCompressionProgram(),
                '-xf',
                archivePath.replace(new RegExp(`\\${path.sep}`, 'g'), '/'),
                '-P',
                '-C',
                workingDirectory.replace(new RegExp(`\\${path.sep}`, 'g'), '/')
            ];
            yield execTar(args, compressionMethod);
        });
    }
    exports.extractTar = extractTar;
    function createTar(archiveFolder, sourceDirectories, compressionMethod) {
        return __awaiter(this, void 0, void 0, function*() {
            // Write source directories to manifest.txt to avoid command length limits
            const manifestFilename = 'manifest.txt';
            const cacheFileName = utils.getCacheFileName(compressionMethod);
            fs_1.writeFileSync(path.join(archiveFolder, manifestFilename), sourceDirectories.join('\n'));
            const workingDirectory = getWorkingDirectory();
            // -T#: Compress using # working thread. If # is 0, attempt to detect and use the number of physical CPU cores.
            // --long=#: Enables long distance matching with # bits. Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
            // Using 30 here because we also support 32-bit self-hosted runners.
            // Long range mode is added to zstd in v1.3.2 release, so we will not use --long in older version of zstd.
            function getCompressionProgram() {
                switch(compressionMethod){
                    case constants_1.CompressionMethod.Zstd:
                        return [
                            '--use-compress-program',
                            'zstd -T0 --long=30'
                        ];
                    case constants_1.CompressionMethod.ZstdWithoutLong:
                        return [
                            '--use-compress-program',
                            'zstd -T0'
                        ];
                    default:
                        return [
                            '-z'
                        ];
                }
            }
            const args = [
                '--posix',
                ...getCompressionProgram(),
                '-cf',
                cacheFileName.replace(new RegExp(`\\${path.sep}`, 'g'), '/'),
                '-P',
                '-C',
                workingDirectory.replace(new RegExp(`\\${path.sep}`, 'g'), '/'),
                '--files-from',
                manifestFilename
            ];
            yield execTar(args, compressionMethod, archiveFolder);
        });
    }
    exports.createTar = createTar;
    function listTar(archivePath, compressionMethod) {
        return __awaiter(this, void 0, void 0, function*() {
            // --d: Decompress.
            // --long=#: Enables long distance matching with # bits.
            // Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
            // Using 30 here because we also support 32-bit self-hosted runners.
            function getCompressionProgram() {
                switch(compressionMethod){
                    case constants_1.CompressionMethod.Zstd:
                        return [
                            '--use-compress-program',
                            'zstd -d --long=30'
                        ];
                    case constants_1.CompressionMethod.ZstdWithoutLong:
                        return [
                            '--use-compress-program',
                            'zstd -d'
                        ];
                    default:
                        return [
                            '-z'
                        ];
                }
            }
            const args = [
                ...getCompressionProgram(),
                '-tf',
                archivePath.replace(new RegExp(`\\${path.sep}`, 'g'), '/'),
                '-P'
            ];
            yield execTar(args, compressionMethod);
        });
    }
    exports.listTar = listTar; //# sourceMappingURL=tar.js.map
});
var load48 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        }
        result["default"] = mod;
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    const core = __importStar(load17());
    const path = __importStar(require("path"));
    const utils = __importStar(load42());
    const cacheHttpClient = __importStar(load46());
    const tar_1 = load47();
    class ValidationError extends Error {
        constructor(message){
            super(message);
            this.name = 'ValidationError';
            Object.setPrototypeOf(this, ValidationError.prototype);
        }
    }
    exports.ValidationError = ValidationError;
    class ReserveCacheError extends Error {
        constructor(message){
            super(message);
            this.name = 'ReserveCacheError';
            Object.setPrototypeOf(this, ReserveCacheError.prototype);
        }
    }
    exports.ReserveCacheError = ReserveCacheError;
    function checkPaths(paths) {
        if (!paths || paths.length === 0) throw new ValidationError(`Path Validation Error: At least one directory or file path is required`);
    }
    function checkKey(key) {
        if (key.length > 512) throw new ValidationError(`Key Validation Error: ${key} cannot be larger than 512 characters.`);
        const regex = /^[^,]*$/;
        if (!regex.test(key)) throw new ValidationError(`Key Validation Error: ${key} cannot contain commas.`);
    }
    /**
 * Restores cache from keys
 *
 * @param paths a list of file paths to restore from the cache
 * @param primaryKey an explicit key for restoring the cache
 * @param restoreKeys an optional ordered list of keys to use for restoring the cache if no cache hit occurred for key
 * @param downloadOptions cache download options
 * @returns string returns the key for the cache hit, otherwise returns undefined
 */ function restoreCache(paths, primaryKey, restoreKeys, options) {
        return __awaiter(this, void 0, void 0, function*() {
            checkPaths(paths);
            restoreKeys = restoreKeys || [];
            const keys = [
                primaryKey,
                ...restoreKeys
            ];
            core.debug('Resolved Keys:');
            core.debug(JSON.stringify(keys));
            if (keys.length > 10) throw new ValidationError(`Key Validation Error: Keys are limited to a maximum of 10.`);
            for (const key of keys)checkKey(key);
            const compressionMethod = yield utils.getCompressionMethod();
            // path are needed to compute version
            const cacheEntry = yield cacheHttpClient.getCacheEntry(keys, paths, {
                compressionMethod
            });
            if (!(cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.archiveLocation)) // Cache not found
            return undefined;
            const archivePath = path.join((yield utils.createTempDirectory()), utils.getCacheFileName(compressionMethod));
            core.debug(`Archive Path: ${archivePath}`);
            try {
                // Download the cache from the cache entry
                yield cacheHttpClient.downloadCache(cacheEntry.archiveLocation, archivePath, options);
                if (core.isDebug()) yield tar_1.listTar(archivePath, compressionMethod);
                const archiveFileSize = utils.getArchiveFileSizeIsBytes(archivePath);
                core.info(`Cache Size: ~${Math.round(archiveFileSize / 1048576)} MB (${archiveFileSize} B)`);
                yield tar_1.extractTar(archivePath, compressionMethod);
                core.info('Cache restored successfully');
            } finally{
                // Try to delete the archive to save space
                try {
                    yield utils.unlinkFile(archivePath);
                } catch (error) {
                    core.debug(`Failed to delete archive: ${error}`);
                }
            }
            return cacheEntry.cacheKey;
        });
    }
    exports.restoreCache = restoreCache;
    /**
 * Saves a list of files with the specified key
 *
 * @param paths a list of file paths to be cached
 * @param key an explicit key for restoring the cache
 * @param options cache upload options
 * @returns number returns cacheId if the cache was saved successfully and throws an error if save fails
 */ function saveCache(paths, key, options) {
        return __awaiter(this, void 0, void 0, function*() {
            checkPaths(paths);
            checkKey(key);
            const compressionMethod = yield utils.getCompressionMethod();
            core.debug('Reserving Cache');
            const cacheId = yield cacheHttpClient.reserveCache(key, paths, {
                compressionMethod
            });
            if (cacheId === -1) throw new ReserveCacheError(`Unable to reserve cache with key ${key}, another job may be creating this cache.`);
            core.debug(`Cache ID: ${cacheId}`);
            const cachePaths = yield utils.resolvePaths(paths);
            core.debug('Cache Paths:');
            core.debug(`${JSON.stringify(cachePaths)}`);
            const archiveFolder = yield utils.createTempDirectory();
            const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod));
            core.debug(`Archive Path: ${archivePath}`);
            yield tar_1.createTar(archiveFolder, cachePaths, compressionMethod);
            if (core.isDebug()) yield tar_1.listTar(archivePath, compressionMethod);
            const archiveFileSize = utils.getArchiveFileSizeIsBytes(archivePath);
            core.debug(`File Size: ${archiveFileSize}`);
            if (archiveFileSize > 5368709120) throw new Error(`Cache size of ~${Math.round(archiveFileSize / 1048576)} MB (${archiveFileSize} B) is over the 5GB limit, not saving cache.`);
            core.debug(`Saving Cache (ID: ${cacheId})`);
            yield cacheHttpClient.saveCache(cacheId, archivePath, options);
            return cacheId;
        });
    }
    exports.saveCache = saveCache; //# sourceMappingURL=cache.js.map
});
var load49 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.toCommandValue = void 0;
    /**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */ function toCommandValue(input) {
        if (input === null || input === undefined) return '';
        else if (typeof input === 'string' || input instanceof String) return input;
        return JSON.stringify(input);
    }
    exports.toCommandValue = toCommandValue; //# sourceMappingURL=utils.js.map
});
var load50 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issue = exports.issueCommand = void 0;
    const os = __importStar(require("os"));
    const utils_1 = load49();
    /**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */ function issueCommand(command, properties, message) {
        const cmd = new Command(command, properties, message);
        process.stdout.write(cmd.toString() + os.EOL);
    }
    exports.issueCommand = issueCommand;
    function issue(name, message = '') {
        issueCommand(name, {}, message);
    }
    exports.issue = issue;
    const CMD_STRING = '::';
    class Command {
        constructor(command, properties, message){
            if (!command) command = 'missing.command';
            this.command = command;
            this.properties = properties;
            this.message = message;
        }
        toString() {
            let cmdStr = CMD_STRING + this.command;
            if (this.properties && Object.keys(this.properties).length > 0) {
                cmdStr += ' ';
                let first = true;
                for(const key in this.properties)if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) first = false;
                        else cmdStr += ',';
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
            cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
            return cmdStr;
        }
    }
    function escapeData(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    }
    function escapeProperty(s) {
        return utils_1.toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
    } //# sourceMappingURL=command.js.map
});
var load51 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    // For internal use, subject to change.
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.issueCommand = void 0;
    // We use any as a valid input type
    /* eslint-disable @typescript-eslint/no-explicit-any */ const fs = __importStar(require("fs"));
    const os = __importStar(require("os"));
    const utils_1 = load49();
    function issueCommand(command, message) {
        const filePath = process.env[`GITHUB_${command}`];
        if (!filePath) throw new Error(`Unable to find environment variable for file command ${command}`);
        if (!fs.existsSync(filePath)) throw new Error(`Missing file at path: ${filePath}`);
        fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
            encoding: 'utf8'
        });
    }
    exports.issueCommand = issueCommand; //# sourceMappingURL=file-command.js.map
});
var load52 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
    const command_1 = load50();
    const file_command_1 = load51();
    const utils_1 = load49();
    const os = __importStar(require("os"));
    const path = __importStar(require("path"));
    /**
 * The code to exit an action
 */ var ExitCode4;
    (function(ExitCode) {
        /**
     * A code indicating that the action was successful
     */ ExitCode[ExitCode["Success"] = 0] = "Success";
        /**
     * A code indicating that the action was a failure
     */ ExitCode[ExitCode["Failure"] = 1] = "Failure";
    })(ExitCode4 = exports.ExitCode || (exports.ExitCode = {}));
    //-----------------------------------------------------------------------
    // Variables
    //-----------------------------------------------------------------------
    /**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function exportVariable(name, val) {
        const convertedVal = utils_1.toCommandValue(val);
        process.env[name] = convertedVal;
        const filePath = process.env['GITHUB_ENV'] || '';
        if (filePath) {
            const delimiter = '_GitHubActionsFileCommandDelimeter_';
            const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
            file_command_1.issueCommand('ENV', commandValue);
        } else command_1.issueCommand('set-env', {
            name
        }, convertedVal);
    }
    exports.exportVariable = exportVariable;
    /**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */ function setSecret(secret) {
        command_1.issueCommand('add-mask', {}, secret);
    }
    exports.setSecret = setSecret;
    /**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */ function addPath(inputPath) {
        const filePath = process.env['GITHUB_PATH'] || '';
        if (filePath) file_command_1.issueCommand('PATH', inputPath);
        else command_1.issueCommand('add-path', {}, inputPath);
        process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
    }
    exports.addPath = addPath;
    /**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */ function getInput(name, options) {
        const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
        if (options && options.required && !val) throw new Error(`Input required and not supplied: ${name}`);
        if (options && options.trimWhitespace === false) return val;
        return val.trim();
    }
    exports.getInput = getInput;
    /**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */ function getMultilineInput(name, options) {
        const inputs = getInput(name, options).split('\n').filter((x)=>x !== ''
        );
        return inputs;
    }
    exports.getMultilineInput = getMultilineInput;
    /**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */ function getBooleanInput(name, options) {
        const trueValue = [
            'true',
            'True',
            'TRUE'
        ];
        const falseValue = [
            'false',
            'False',
            'FALSE'
        ];
        const val = getInput(name, options);
        if (trueValue.includes(val)) return true;
        if (falseValue.includes(val)) return false;
        throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` + `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
    }
    exports.getBooleanInput = getBooleanInput;
    /**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setOutput(name, value) {
        process.stdout.write(os.EOL);
        command_1.issueCommand('set-output', {
            name
        }, value);
    }
    exports.setOutput = setOutput;
    /**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */ function setCommandEcho(enabled) {
        command_1.issue('echo', enabled ? 'on' : 'off');
    }
    exports.setCommandEcho = setCommandEcho;
    //-----------------------------------------------------------------------
    // Results
    //-----------------------------------------------------------------------
    /**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */ function setFailed(message) {
        process.exitCode = ExitCode4.Failure;
        error(message);
    }
    exports.setFailed = setFailed;
    //-----------------------------------------------------------------------
    // Logging Commands
    //-----------------------------------------------------------------------
    /**
 * Gets whether Actions Step Debug is on or not
 */ function isDebug() {
        return process.env['RUNNER_DEBUG'] === '1';
    }
    exports.isDebug = isDebug;
    /**
 * Writes debug message to user log
 * @param message debug message
 */ function debug(message) {
        command_1.issueCommand('debug', {}, message);
    }
    exports.debug = debug;
    /**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */ function error(message) {
        command_1.issue('error', message instanceof Error ? message.toString() : message);
    }
    exports.error = error;
    /**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */ function warning(message) {
        command_1.issue('warning', message instanceof Error ? message.toString() : message);
    }
    exports.warning = warning;
    /**
 * Writes info to log with console.log.
 * @param message info message
 */ function info(message) {
        process.stdout.write(message + os.EOL);
    }
    exports.info = info;
    /**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */ function startGroup(name) {
        command_1.issue('group', name);
    }
    exports.startGroup = startGroup;
    /**
 * End an output group.
 */ function endGroup() {
        command_1.issue('endgroup');
    }
    exports.endGroup = endGroup;
    /**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */ function group(name, fn) {
        return __awaiter(this, void 0, void 0, function*() {
            startGroup(name);
            let result;
            try {
                result = yield fn();
            } finally{
                endGroup();
            }
            return result;
        });
    }
    exports.group = group;
    //-----------------------------------------------------------------------
    // Wrapper action state
    //-----------------------------------------------------------------------
    /**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function saveState(name, value) {
        command_1.issueCommand('save-state', {
            name
        }, value);
    }
    exports.saveState = saveState;
    /**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */ function getState(name) {
        return process.env[`STATE_${name}`] || '';
    }
    exports.getState = getState; //# sourceMappingURL=core.js.map
});
var load53 = __swcpack_require__.bind(void 0, function(module, exports) {
    exports = module.exports = SemVer;
    var debug;
    /* istanbul ignore next */ if (typeof process === 'object' && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG)) debug = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift('SEMVER');
        console.log.apply(console, args);
    };
    else debug = function() {};
    // Note: this is the semver.org version of the spec that it implements
    // Not necessarily the package version of this code.
    exports.SEMVER_SPEC_VERSION = '2.0.0';
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */ 9007199254740991;
    // Max safe segment length for coercion.
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    // The actual regexps go on exports.re
    var re = exports.re = [];
    var src = exports.src = [];
    var t = exports.tokens = {};
    var R = 0;
    function tok(n) {
        t[n] = R++;
    }
    // The following Regular Expressions can be used for tokenizing,
    // validating, and parsing SemVer version strings.
    // ## Numeric Identifier
    // A single `0`, or a non-zero digit followed by zero or more digits.
    tok('NUMERICIDENTIFIER');
    src[t.NUMERICIDENTIFIER] = '0|[1-9]\\d*';
    tok('NUMERICIDENTIFIERLOOSE');
    src[t.NUMERICIDENTIFIERLOOSE] = '[0-9]+';
    // ## Non-numeric Identifier
    // Zero or more digits, followed by a letter or hyphen, and then zero or
    // more letters, digits, or hyphens.
    tok('NONNUMERICIDENTIFIER');
    src[t.NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';
    // ## Main Version
    // Three dot-separated numeric identifiers.
    tok('MAINVERSION');
    src[t.MAINVERSION] = '(' + src[t.NUMERICIDENTIFIER] + ')\\.' + '(' + src[t.NUMERICIDENTIFIER] + ')\\.' + '(' + src[t.NUMERICIDENTIFIER] + ')';
    tok('MAINVERSIONLOOSE');
    src[t.MAINVERSIONLOOSE] = '(' + src[t.NUMERICIDENTIFIERLOOSE] + ')\\.' + '(' + src[t.NUMERICIDENTIFIERLOOSE] + ')\\.' + '(' + src[t.NUMERICIDENTIFIERLOOSE] + ')';
    // ## Pre-release Version Identifier
    // A numeric identifier, or a non-numeric identifier.
    tok('PRERELEASEIDENTIFIER');
    src[t.PRERELEASEIDENTIFIER] = '(?:' + src[t.NUMERICIDENTIFIER] + '|' + src[t.NONNUMERICIDENTIFIER] + ')';
    tok('PRERELEASEIDENTIFIERLOOSE');
    src[t.PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[t.NUMERICIDENTIFIERLOOSE] + '|' + src[t.NONNUMERICIDENTIFIER] + ')';
    // ## Pre-release Version
    // Hyphen, followed by one or more dot-separated pre-release version
    // identifiers.
    tok('PRERELEASE');
    src[t.PRERELEASE] = '(?:-(' + src[t.PRERELEASEIDENTIFIER] + '(?:\\.' + src[t.PRERELEASEIDENTIFIER] + ')*))';
    tok('PRERELEASELOOSE');
    src[t.PRERELEASELOOSE] = '(?:-?(' + src[t.PRERELEASEIDENTIFIERLOOSE] + '(?:\\.' + src[t.PRERELEASEIDENTIFIERLOOSE] + ')*))';
    // ## Build Metadata Identifier
    // Any combination of digits, letters, or hyphens.
    tok('BUILDIDENTIFIER');
    src[t.BUILDIDENTIFIER] = '[0-9A-Za-z-]+';
    // ## Build Metadata
    // Plus sign, followed by one or more period-separated build metadata
    // identifiers.
    tok('BUILD');
    src[t.BUILD] = '(?:\\+(' + src[t.BUILDIDENTIFIER] + '(?:\\.' + src[t.BUILDIDENTIFIER] + ')*))';
    // ## Full Version String
    // A main version, followed optionally by a pre-release version and
    // build metadata.
    // Note that the only major, minor, patch, and pre-release sections of
    // the version string are capturing groups.  The build metadata is not a
    // capturing group, because it should not ever be used in version
    // comparison.
    tok('FULL');
    tok('FULLPLAIN');
    src[t.FULLPLAIN] = 'v?' + src[t.MAINVERSION] + src[t.PRERELEASE] + '?' + src[t.BUILD] + '?';
    src[t.FULL] = '^' + src[t.FULLPLAIN] + '$';
    // like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
    // also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
    // common in the npm registry.
    tok('LOOSEPLAIN');
    src[t.LOOSEPLAIN] = '[v=\\s]*' + src[t.MAINVERSIONLOOSE] + src[t.PRERELEASELOOSE] + '?' + src[t.BUILD] + '?';
    tok('LOOSE');
    src[t.LOOSE] = '^' + src[t.LOOSEPLAIN] + '$';
    tok('GTLT');
    src[t.GTLT] = '((?:<|>)?=?)';
    // Something like "2.*" or "1.2.x".
    // Note that "x.x" is a valid xRange identifer, meaning "any version"
    // Only the first item is strictly required.
    tok('XRANGEIDENTIFIERLOOSE');
    src[t.XRANGEIDENTIFIERLOOSE] = src[t.NUMERICIDENTIFIERLOOSE] + '|x|X|\\*';
    tok('XRANGEIDENTIFIER');
    src[t.XRANGEIDENTIFIER] = src[t.NUMERICIDENTIFIER] + '|x|X|\\*';
    tok('XRANGEPLAIN');
    src[t.XRANGEPLAIN] = '[v=\\s]*(' + src[t.XRANGEIDENTIFIER] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIER] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIER] + ')' + '(?:' + src[t.PRERELEASE] + ')?' + src[t.BUILD] + '?' + ')?)?';
    tok('XRANGEPLAINLOOSE');
    src[t.XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[t.XRANGEIDENTIFIERLOOSE] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIERLOOSE] + ')' + '(?:\\.(' + src[t.XRANGEIDENTIFIERLOOSE] + ')' + '(?:' + src[t.PRERELEASELOOSE] + ')?' + src[t.BUILD] + '?' + ')?)?';
    tok('XRANGE');
    src[t.XRANGE] = '^' + src[t.GTLT] + '\\s*' + src[t.XRANGEPLAIN] + '$';
    tok('XRANGELOOSE');
    src[t.XRANGELOOSE] = '^' + src[t.GTLT] + '\\s*' + src[t.XRANGEPLAINLOOSE] + '$';
    // Coercion.
    // Extract anything that could conceivably be a part of a valid semver
    tok('COERCE');
    src[t.COERCE] = "(^|[^\\d])(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + '})' + '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' + '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' + '(?:$|[^\\d])';
    tok('COERCERTL');
    re[t.COERCERTL] = new RegExp(src[t.COERCE], 'g');
    // Tilde ranges.
    // Meaning is "reasonably at or greater than"
    tok('LONETILDE');
    src[t.LONETILDE] = '(?:~>?)';
    tok('TILDETRIM');
    src[t.TILDETRIM] = '(\\s*)' + src[t.LONETILDE] + '\\s+';
    re[t.TILDETRIM] = new RegExp(src[t.TILDETRIM], 'g');
    var tildeTrimReplace = '$1~';
    tok('TILDE');
    src[t.TILDE] = '^' + src[t.LONETILDE] + src[t.XRANGEPLAIN] + '$';
    tok('TILDELOOSE');
    src[t.TILDELOOSE] = '^' + src[t.LONETILDE] + src[t.XRANGEPLAINLOOSE] + '$';
    // Caret ranges.
    // Meaning is "at least and backwards compatible with"
    tok('LONECARET');
    src[t.LONECARET] = '(?:\\^)';
    tok('CARETTRIM');
    src[t.CARETTRIM] = '(\\s*)' + src[t.LONECARET] + '\\s+';
    re[t.CARETTRIM] = new RegExp(src[t.CARETTRIM], 'g');
    var caretTrimReplace = '$1^';
    tok('CARET');
    src[t.CARET] = '^' + src[t.LONECARET] + src[t.XRANGEPLAIN] + '$';
    tok('CARETLOOSE');
    src[t.CARETLOOSE] = '^' + src[t.LONECARET] + src[t.XRANGEPLAINLOOSE] + '$';
    // A simple gt/lt/eq thing, or just "" to indicate "any version"
    tok('COMPARATORLOOSE');
    src[t.COMPARATORLOOSE] = '^' + src[t.GTLT] + '\\s*(' + src[t.LOOSEPLAIN] + ')$|^$';
    tok('COMPARATOR');
    src[t.COMPARATOR] = '^' + src[t.GTLT] + '\\s*(' + src[t.FULLPLAIN] + ')$|^$';
    // An expression to strip any whitespace between the gtlt and the thing
    // it modifies, so that `> 1.2.3` ==> `>1.2.3`
    tok('COMPARATORTRIM');
    src[t.COMPARATORTRIM] = '(\\s*)' + src[t.GTLT] + '\\s*(' + src[t.LOOSEPLAIN] + '|' + src[t.XRANGEPLAIN] + ')';
    // this one has to use the /g flag
    re[t.COMPARATORTRIM] = new RegExp(src[t.COMPARATORTRIM], 'g');
    var comparatorTrimReplace = '$1$2$3';
    // Something like `1.2.3 - 1.2.4`
    // Note that these all use the loose form, because they'll be
    // checked against either the strict or loose comparator form
    // later.
    tok('HYPHENRANGE');
    src[t.HYPHENRANGE] = '^\\s*(' + src[t.XRANGEPLAIN] + ')' + '\\s+-\\s+' + '(' + src[t.XRANGEPLAIN] + ')' + '\\s*$';
    tok('HYPHENRANGELOOSE');
    src[t.HYPHENRANGELOOSE] = '^\\s*(' + src[t.XRANGEPLAINLOOSE] + ')' + '\\s+-\\s+' + '(' + src[t.XRANGEPLAINLOOSE] + ')' + '\\s*$';
    // Star ranges basically just allow anything at all.
    tok('STAR');
    src[t.STAR] = '(<|>)?=?\\s*\\*';
    // Compile to actual regexp objects.
    // All are flag-free, unless they were created above with a flag.
    for(var i3 = 0; i3 < R; i3++){
        debug(i3, src[i3]);
        if (!re[i3]) re[i3] = new RegExp(src[i3]);
    }
    exports.parse = parse;
    function parse(version, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (version instanceof SemVer) return version;
        if (typeof version !== 'string') return null;
        if (version.length > MAX_LENGTH) return null;
        var r = options.loose ? re[t.LOOSE] : re[t.FULL];
        if (!r.test(version)) return null;
        try {
            return new SemVer(version, options);
        } catch (er) {
            return null;
        }
    }
    exports.valid = valid;
    function valid(version, options) {
        var v = parse(version, options);
        return v ? v.version : null;
    }
    exports.clean = clean;
    function clean(version, options) {
        var s = parse(version.trim().replace(/^[=v]+/, ''), options);
        return s ? s.version : null;
    }
    exports.SemVer = SemVer;
    function SemVer(version, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (version instanceof SemVer) {
            if (version.loose === options.loose) return version;
            else version = version.version;
        } else if (typeof version !== 'string') throw new TypeError('Invalid Version: ' + version);
        if (version.length > MAX_LENGTH) throw new TypeError('version is longer than ' + MAX_LENGTH + ' characters');
        if (!(this instanceof SemVer)) return new SemVer(version, options);
        debug('SemVer', version, options);
        this.options = options;
        this.loose = !!options.loose;
        var m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) throw new TypeError('Invalid Version: ' + version);
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
        else this.prerelease = m[4].split('.').map(function(id) {
            if (/^[0-9]+$/.test(id)) {
                var num = +id;
                if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
            }
            return id;
        });
        this.build = m[5] ? m[5].split('.') : [];
        this.format();
    }
    SemVer.prototype.format = function() {
        this.version = this.major + '.' + this.minor + '.' + this.patch;
        if (this.prerelease.length) this.version += '-' + this.prerelease.join('.');
        return this.version;
    };
    SemVer.prototype.toString = function() {
        return this.version;
    };
    SemVer.prototype.compare = function(other) {
        debug('SemVer.compare', this.version, this.options, other);
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        return this.compareMain(other) || this.comparePre(other);
    };
    SemVer.prototype.compareMain = function(other) {
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    };
    SemVer.prototype.comparePre = function(other) {
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        // NOT having a prerelease is > having one
        if (this.prerelease.length && !other.prerelease.length) return -1;
        else if (!this.prerelease.length && other.prerelease.length) return 1;
        else if (!this.prerelease.length && !other.prerelease.length) return 0;
        var i = 0;
        do {
            var a = this.prerelease[i];
            var b = other.prerelease[i];
            debug('prerelease compare', i, a, b);
            if (a === undefined && b === undefined) return 0;
            else if (b === undefined) return 1;
            else if (a === undefined) return -1;
            else if (a === b) continue;
            else return compareIdentifiers(a, b);
        }while (++i)
    };
    SemVer.prototype.compareBuild = function(other) {
        if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
        var i = 0;
        do {
            var a = this.build[i];
            var b = other.build[i];
            debug('prerelease compare', i, a, b);
            if (a === undefined && b === undefined) return 0;
            else if (b === undefined) return 1;
            else if (a === undefined) return -1;
            else if (a === b) continue;
            else return compareIdentifiers(a, b);
        }while (++i)
    };
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    SemVer.prototype.inc = function(release, identifier) {
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
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case 'pre':
                if (this.prerelease.length === 0) this.prerelease = [
                    0
                ];
                else {
                    var i = this.prerelease.length;
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
                throw new Error('invalid increment argument: ' + release);
        }
        this.format();
        this.raw = this.version;
        return this;
    };
    exports.inc = inc;
    function inc(version, release, loose, identifier) {
        if (typeof loose === 'string') {
            identifier = loose;
            loose = undefined;
        }
        try {
            return new SemVer(version, loose).inc(release, identifier).version;
        } catch (er) {
            return null;
        }
    }
    exports.diff = diff;
    function diff(version1, version2) {
        if (eq(version1, version2)) return null;
        else {
            var v1 = parse(version1);
            var v2 = parse(version2);
            var prefix = '';
            if (v1.prerelease.length || v2.prerelease.length) {
                prefix = 'pre';
                var defaultResult = 'prerelease';
            }
            for(var key in v1)if (key === 'major' || key === 'minor' || key === 'patch') {
                if (v1[key] !== v2[key]) return prefix + key;
            }
            return defaultResult // may be undefined
            ;
        }
    }
    exports.compareIdentifiers = compareIdentifiers;
    var numeric = /^[0-9]+$/;
    function compareIdentifiers(a, b) {
        var anum = numeric.test(a);
        var bnum = numeric.test(b);
        if (anum && bnum) {
            a = +a;
            b = +b;
        }
        return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    }
    exports.rcompareIdentifiers = rcompareIdentifiers;
    function rcompareIdentifiers(a, b) {
        return compareIdentifiers(b, a);
    }
    exports.major = major;
    function major(a, loose) {
        return new SemVer(a, loose).major;
    }
    exports.minor = minor;
    function minor(a, loose) {
        return new SemVer(a, loose).minor;
    }
    exports.patch = patch;
    function patch(a, loose) {
        return new SemVer(a, loose).patch;
    }
    exports.compare = compare;
    function compare(a, b, loose) {
        return new SemVer(a, loose).compare(new SemVer(b, loose));
    }
    exports.compareLoose = compareLoose;
    function compareLoose(a, b) {
        return compare(a, b, true);
    }
    exports.compareBuild = compareBuild;
    function compareBuild(a, b, loose) {
        var versionA = new SemVer(a, loose);
        var versionB = new SemVer(b, loose);
        return versionA.compare(versionB) || versionA.compareBuild(versionB);
    }
    exports.rcompare = rcompare;
    function rcompare(a, b, loose) {
        return compare(b, a, loose);
    }
    exports.sort = sort;
    function sort(list, loose) {
        return list.sort(function(a, b) {
            return exports.compareBuild(a, b, loose);
        });
    }
    exports.rsort = rsort;
    function rsort(list, loose) {
        return list.sort(function(a, b) {
            return exports.compareBuild(b, a, loose);
        });
    }
    exports.gt = gt;
    function gt(a, b, loose) {
        return compare(a, b, loose) > 0;
    }
    exports.lt = lt;
    function lt(a, b, loose) {
        return compare(a, b, loose) < 0;
    }
    exports.eq = eq;
    function eq(a, b, loose) {
        return compare(a, b, loose) === 0;
    }
    exports.neq = neq;
    function neq(a, b, loose) {
        return compare(a, b, loose) !== 0;
    }
    exports.gte = gte;
    function gte(a, b, loose) {
        return compare(a, b, loose) >= 0;
    }
    exports.lte = lte;
    function lte(a, b, loose) {
        return compare(a, b, loose) <= 0;
    }
    exports.cmp = cmp;
    function cmp(a, op, b, loose) {
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
                throw new TypeError('Invalid operator: ' + op);
        }
    }
    exports.Comparator = Comparator;
    function Comparator(comp, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (comp instanceof Comparator) {
            if (comp.loose === !!options.loose) return comp;
            else comp = comp.value;
        }
        if (!(this instanceof Comparator)) return new Comparator(comp, options);
        debug('comparator', comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) this.value = '';
        else this.value = this.operator + this.semver.version;
        debug('comp', this);
    }
    var ANY = {};
    Comparator.prototype.parse = function(comp) {
        var r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        var m = comp.match(r);
        if (!m) throw new TypeError('Invalid comparator: ' + comp);
        this.operator = m[1] !== undefined ? m[1] : '';
        if (this.operator === '=') this.operator = '';
        // if it literally is just '>' or '' then allow anything.
        if (!m[2]) this.semver = ANY;
        else this.semver = new SemVer(m[2], this.options.loose);
    };
    Comparator.prototype.toString = function() {
        return this.value;
    };
    Comparator.prototype.test = function(version) {
        debug('Comparator.test', version, this.options.loose);
        if (this.semver === ANY || version === ANY) return true;
        if (typeof version === 'string') try {
            version = new SemVer(version, this.options);
        } catch (er) {
            return false;
        }
        return cmp(version, this.operator, this.semver, this.options);
    };
    Comparator.prototype.intersects = function(comp, options) {
        if (!(comp instanceof Comparator)) throw new TypeError('a Comparator is required');
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        var rangeTmp;
        if (this.operator === '') {
            if (this.value === '') return true;
            rangeTmp = new Range(comp.value, options);
            return satisfies(this.value, rangeTmp, options);
        } else if (comp.operator === '') {
            if (comp.value === '') return true;
            rangeTmp = new Range(this.value, options);
            return satisfies(comp.semver, rangeTmp, options);
        }
        var sameDirectionIncreasing = (this.operator === '>=' || this.operator === '>') && (comp.operator === '>=' || comp.operator === '>');
        var sameDirectionDecreasing = (this.operator === '<=' || this.operator === '<') && (comp.operator === '<=' || comp.operator === '<');
        var sameSemVer = this.semver.version === comp.semver.version;
        var differentDirectionsInclusive = (this.operator === '>=' || this.operator === '<=') && (comp.operator === '>=' || comp.operator === '<=');
        var oppositeDirectionsLessThan = cmp(this.semver, '<', comp.semver, options) && (this.operator === '>=' || this.operator === '>') && (comp.operator === '<=' || comp.operator === '<');
        var oppositeDirectionsGreaterThan = cmp(this.semver, '>', comp.semver, options) && (this.operator === '<=' || this.operator === '<') && (comp.operator === '>=' || comp.operator === '>');
        return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    };
    exports.Range = Range;
    function Range(range2, options) {
        if (!options || typeof options !== 'object') options = {
            loose: !!options,
            includePrerelease: false
        };
        if (range2 instanceof Range) {
            if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) return range2;
            else return new Range(range2.raw, options);
        }
        if (range2 instanceof Comparator) return new Range(range2.value, options);
        if (!(this instanceof Range)) return new Range(range2, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        // First, split based on boolean or ||
        this.raw = range2;
        this.set = range2.split(/\s*\|\|\s*/).map(function(range) {
            return this.parseRange(range.trim());
        }, this).filter(function(c) {
            // throw out any that are not relevant for whatever reason
            return c.length;
        });
        if (!this.set.length) throw new TypeError('Invalid SemVer Range: ' + range2);
        this.format();
    }
    Range.prototype.format = function() {
        this.range = this.set.map(function(comps) {
            return comps.join(' ').trim();
        }).join('||').trim();
        return this.range;
    };
    Range.prototype.toString = function() {
        return this.range;
    };
    Range.prototype.parseRange = function(range) {
        var loose = this.options.loose;
        range = range.trim();
        // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
        var hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
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
        var compRe = loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        var set = range.split(' ').map(function(comp) {
            return parseComparator(comp, this.options);
        }, this).join(' ').split(/\s+/);
        if (this.options.loose) // in loose mode, throw out any that are not valid comparators
        set = set.filter(function(comp) {
            return !!comp.match(compRe);
        });
        set = set.map(function(comp) {
            return new Comparator(comp, this.options);
        }, this);
        return set;
    };
    Range.prototype.intersects = function(range, options) {
        if (!(range instanceof Range)) throw new TypeError('a Range is required');
        return this.set.some(function(thisComparators) {
            return isSatisfiable(thisComparators, options) && range.set.some(function(rangeComparators) {
                return isSatisfiable(rangeComparators, options) && thisComparators.every(function(thisComparator) {
                    return rangeComparators.every(function(rangeComparator) {
                        return thisComparator.intersects(rangeComparator, options);
                    });
                });
            });
        });
    };
    // take a set of comparators and determine whether there
    // exists a version which can satisfy it
    function isSatisfiable(comparators, options) {
        var result = true;
        var remainingComparators = comparators.slice();
        var testComparator = remainingComparators.pop();
        while(result && remainingComparators.length){
            result = remainingComparators.every(function(otherComparator) {
                return testComparator.intersects(otherComparator, options);
            });
            testComparator = remainingComparators.pop();
        }
        return result;
    }
    // Mostly just for testing and legacy API reasons
    exports.toComparators = toComparators;
    function toComparators(range, options) {
        return new Range(range, options).set.map(function(comp) {
            return comp.map(function(c) {
                return c.value;
            }).join(' ').trim().split(' ');
        });
    }
    // comprised of xranges, tildes, stars, and gtlt's at this point.
    // already replaced the hyphen ranges
    // turn into a set of JUST comparators.
    function parseComparator(comp, options) {
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
    }
    function isX(id) {
        return !id || id.toLowerCase() === 'x' || id === '*';
    }
    // ~, ~> --> * (any, kinda silly)
    // ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
    // ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
    // ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
    // ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
    // ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
    function replaceTildes(comp4, options) {
        return comp4.trim().split(/\s+/).map(function(comp) {
            return replaceTilde(comp, options);
        }).join(' ');
    }
    function replaceTilde(comp, options) {
        var r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
        return comp.replace(r, function(_, M, m, p, pr) {
            debug('tilde', comp, _, M, m, p, pr);
            var ret;
            if (isX(M)) ret = '';
            else if (isX(m)) ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
            else if (isX(p)) // ~1.2 == >=1.2.0 <1.3.0
            ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
            else if (pr) {
                debug('replaceTilde pr', pr);
                ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + (+m + 1) + '.0';
            } else // ~1.2.3 == >=1.2.3 <1.3.0
            ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + (+m + 1) + '.0';
            debug('tilde return', ret);
            return ret;
        });
    }
    // ^ --> * (any, kinda silly)
    // ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
    // ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
    // ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
    // ^1.2.3 --> >=1.2.3 <2.0.0
    // ^1.2.0 --> >=1.2.0 <2.0.0
    function replaceCarets(comp5, options) {
        return comp5.trim().split(/\s+/).map(function(comp) {
            return replaceCaret(comp, options);
        }).join(' ');
    }
    function replaceCaret(comp, options) {
        debug('caret', comp, options);
        var r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
        return comp.replace(r, function(_, M, m, p, pr) {
            debug('caret', comp, _, M, m, p, pr);
            var ret;
            if (isX(M)) ret = '';
            else if (isX(m)) ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
            else if (isX(p)) {
                if (M === '0') ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
                else ret = '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0';
            } else if (pr) {
                debug('replaceCaret pr', pr);
                if (M === '0') {
                    if (m === '0') ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + m + '.' + (+p + 1);
                    else ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + (+m + 1) + '.0';
                } else ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + (+M + 1) + '.0.0';
            } else {
                debug('no pr');
                if (M === '0') {
                    if (m === '0') ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + m + '.' + (+p + 1);
                    else ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + (+m + 1) + '.0';
                } else ret = '>=' + M + '.' + m + '.' + p + ' <' + (+M + 1) + '.0.0';
            }
            debug('caret return', ret);
            return ret;
        });
    }
    function replaceXRanges(comp6, options) {
        debug('replaceXRanges', comp6, options);
        return comp6.split(/\s+/).map(function(comp) {
            return replaceXRange(comp, options);
        }).join(' ');
    }
    function replaceXRange(comp, options) {
        comp = comp.trim();
        var r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
        return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
            debug('xRange', comp, ret, gtlt, M, m, p, pr);
            var xM = isX(M);
            var xm = xM || isX(m);
            var xp = xm || isX(p);
            var anyX = xp;
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
                    // >1.2.3 => >= 1.2.4
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
                ret = gtlt + M + '.' + m + '.' + p + pr;
            } else if (xm) ret = '>=' + M + '.0.0' + pr + ' <' + (+M + 1) + '.0.0' + pr;
            else if (xp) ret = '>=' + M + '.' + m + '.0' + pr + ' <' + M + '.' + (+m + 1) + '.0' + pr;
            debug('xRange return', ret);
            return ret;
        });
    }
    // Because * is AND-ed with everything else in the comparator,
    // and '' means "any version", just remove the *s entirely.
    function replaceStars(comp, options) {
        debug('replaceStars', comp, options);
        // Looseness is ignored here.  star is always as loose as it gets!
        return comp.trim().replace(re[t.STAR], '');
    }
    // This function is passed to string.replace(re[t.HYPHENRANGE])
    // M, m, patch, prerelease, build
    // 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
    // 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
    // 1.2 - 3.4 => >=1.2.0 <3.5.0
    function hyphenReplace($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) {
        if (isX(fM)) from = '';
        else if (isX(fm)) from = '>=' + fM + '.0.0';
        else if (isX(fp)) from = '>=' + fM + '.' + fm + '.0';
        else from = '>=' + from;
        if (isX(tM)) to = '';
        else if (isX(tm)) to = '<' + (+tM + 1) + '.0.0';
        else if (isX(tp)) to = '<' + tM + '.' + (+tm + 1) + '.0';
        else if (tpr) to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr;
        else to = '<=' + to;
        return (from + ' ' + to).trim();
    }
    // if ANY of the sets match ALL of its comparators, then pass
    Range.prototype.test = function(version) {
        if (!version) return false;
        if (typeof version === 'string') try {
            version = new SemVer(version, this.options);
        } catch (er) {
            return false;
        }
        for(var i = 0; i < this.set.length; i++){
            if (testSet(this.set[i], version, this.options)) return true;
        }
        return false;
    };
    function testSet(set, version, options) {
        for(var i = 0; i < set.length; i++){
            if (!set[i].test(version)) return false;
        }
        if (version.prerelease.length && !options.includePrerelease) {
            // Find the set of versions that are allowed to have prereleases
            // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
            // That should allow `1.2.3-pr.2` to pass.
            // However, `1.2.4-alpha.notready` should NOT be allowed,
            // even though it's within the range set by the comparators.
            for(i = 0; i < set.length; i++){
                debug(set[i].semver);
                if (set[i].semver === ANY) continue;
                if (set[i].semver.prerelease.length > 0) {
                    var allowed = set[i].semver;
                    if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
                }
            }
            // Version has a -pre, but it's not one of the ones we like.
            return false;
        }
        return true;
    }
    exports.satisfies = satisfies;
    function satisfies(version, range, options) {
        try {
            range = new Range(range, options);
        } catch (er) {
            return false;
        }
        return range.test(version);
    }
    exports.maxSatisfying = maxSatisfying;
    function maxSatisfying(versions, range, options) {
        var max = null;
        var maxSV = null;
        try {
            var rangeObj = new Range(range, options);
        } catch (er) {
            return null;
        }
        versions.forEach(function(v) {
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
    }
    exports.minSatisfying = minSatisfying;
    function minSatisfying(versions, range, options) {
        var min = null;
        var minSV = null;
        try {
            var rangeObj = new Range(range, options);
        } catch (er) {
            return null;
        }
        versions.forEach(function(v) {
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
    }
    exports.minVersion = minVersion;
    function minVersion(range, loose) {
        range = new Range(range, loose);
        var minver = new SemVer('0.0.0');
        if (range.test(minver)) return minver;
        minver = new SemVer('0.0.0-0');
        if (range.test(minver)) return minver;
        minver = null;
        for(var i = 0; i < range.set.length; ++i){
            var comparators = range.set[i];
            comparators.forEach(function(comparator) {
                // Clone to avoid manipulating the comparator's semver object.
                var compver = new SemVer(comparator.semver.version);
                switch(comparator.operator){
                    case '>':
                        if (compver.prerelease.length === 0) compver.patch++;
                        else compver.prerelease.push(0);
                        compver.raw = compver.format();
                    /* fallthrough */ case '':
                    case '>=':
                        if (!minver || gt(minver, compver)) minver = compver;
                        break;
                    case '<':
                    case '<=':
                        break;
                    /* istanbul ignore next */ default:
                        throw new Error('Unexpected operation: ' + comparator.operator);
                }
            });
        }
        if (minver && range.test(minver)) return minver;
        return null;
    }
    exports.validRange = validRange;
    function validRange(range, options) {
        try {
            // Return '*' instead of '' so that truthiness works.
            // This will throw if it's invalid anyway
            return new Range(range, options).range || '*';
        } catch (er) {
            return null;
        }
    }
    // Determine if version is less than all the versions possible in the range
    exports.ltr = ltr;
    function ltr(version, range, options) {
        return outside(version, range, '<', options);
    }
    // Determine if version is greater than all the versions possible in the range.
    exports.gtr = gtr;
    function gtr(version, range, options) {
        return outside(version, range, '>', options);
    }
    exports.outside = outside;
    function outside(version, range, hilo, options) {
        version = new SemVer(version, options);
        range = new Range(range, options);
        var gtfn, ltefn, ltfn, comp, ecomp;
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
        // If it satisifes the range it is not outside
        if (satisfies(version, range, options)) return false;
        // From now on, variable terms are as if we're in "gtr" mode.
        // but note that everything is flipped for the "ltr" function.
        for(var i = 0; i < range.set.length; ++i){
            var comparators = range.set[i];
            var high = null;
            var low = null;
            comparators.forEach(function(comparator) {
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
    }
    exports.prerelease = prerelease;
    function prerelease(version, options) {
        var parsed = parse(version, options);
        return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    }
    exports.intersects = intersects;
    function intersects(r1, r2, options) {
        r1 = new Range(r1, options);
        r2 = new Range(r2, options);
        return r1.intersects(r2);
    }
    exports.coerce = coerce;
    function coerce(version, options) {
        if (version instanceof SemVer) return version;
        if (typeof version === 'number') version = String(version);
        if (typeof version !== 'string') return null;
        options = options || {};
        var match = null;
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
            var next;
            while((next = re[t.COERCERTL].exec(version)) && (!match || match.index + match[0].length !== version.length)){
                if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
                re[t.COERCERTL].lastIndex = next.index + next[1].length + next[2].length;
            }
            // leave it in a clean state
            re[t.COERCERTL].lastIndex = -1;
        }
        if (match === null) return null;
        return parse(match[2] + '.' + (match[3] || '0') + '.' + (match[4] || '0'), options);
    }
});
var load54 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports._readLinuxVersionFile = exports._getOsVersion = exports._findMatch = void 0;
    const semver = __importStar(load53());
    const core_1 = load52();
    // needs to be require for core node modules to be mocked
    /* eslint @typescript-eslint/no-require-imports: 0 */ const os = require("os");
    const cp = require("child_process");
    const fs = require("fs");
    function _findMatch(versionSpec, stable, candidates, archFilter) {
        return __awaiter(this, void 0, void 0, function*() {
            const platFilter = os.platform();
            let result;
            let match;
            let file;
            for (const candidate of candidates){
                const version = candidate.version;
                core_1.debug(`check ${version} satisfies ${versionSpec}`);
                if (semver.satisfies(version, versionSpec) && (!stable || candidate.stable === stable)) {
                    file = candidate.files.find((item)=>{
                        core_1.debug(`${item.arch}===${archFilter} && ${item.platform}===${platFilter}`);
                        let chk = item.arch === archFilter && item.platform === platFilter;
                        if (chk && item.platform_version) {
                            const osVersion = module.exports._getOsVersion();
                            if (osVersion === item.platform_version) chk = true;
                            else chk = semver.satisfies(osVersion, item.platform_version);
                        }
                        return chk;
                    });
                    if (file) {
                        core_1.debug(`matched ${candidate.version}`);
                        match = candidate;
                        break;
                    }
                }
            }
            if (match && file) {
                // clone since we're mutating the file list to be only the file that matches
                result = Object.assign({}, match);
                result.files = [
                    file
                ];
            }
            return result;
        });
    }
    exports._findMatch = _findMatch;
    function _getOsVersion() {
        // TODO: add windows and other linux, arm variants
        // right now filtering on version is only an ubuntu and macos scenario for tools we build for hosted (python)
        const plat = os.platform();
        let version = '';
        if (plat === 'darwin') version = cp.execSync('sw_vers -productVersion').toString();
        else if (plat === 'linux') {
            // lsb_release process not in some containers, readfile
            // Run cat /etc/lsb-release
            // DISTRIB_ID=Ubuntu
            // DISTRIB_RELEASE=18.04
            // DISTRIB_CODENAME=bionic
            // DISTRIB_DESCRIPTION="Ubuntu 18.04.4 LTS"
            const lsbContents = module.exports._readLinuxVersionFile();
            if (lsbContents) {
                const lines = lsbContents.split('\n');
                for (const line of lines){
                    const parts = line.split('=');
                    if (parts.length === 2 && (parts[0].trim() === 'VERSION_ID' || parts[0].trim() === 'DISTRIB_RELEASE')) {
                        version = parts[1].trim().replace(/^"/, '').replace(/"$/, '');
                        break;
                    }
                }
            }
        }
        return version;
    }
    exports._getOsVersion = _getOsVersion;
    function _readLinuxVersionFile() {
        const lsbReleaseFile = '/etc/lsb-release';
        const osReleaseFile = '/etc/os-release';
        let contents = '';
        if (fs.existsSync(lsbReleaseFile)) contents = fs.readFileSync(lsbReleaseFile).toString();
        else if (fs.existsSync(osReleaseFile)) contents = fs.readFileSync(osReleaseFile).toString();
        return contents;
    }
    exports._readLinuxVersionFile = _readLinuxVersionFile; //# sourceMappingURL=manifest.js.map
});
var load55 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.RetryHelper = void 0;
    const core = __importStar(load52());
    /**
 * Internal class for retries
 */ class RetryHelper {
        constructor(maxAttempts, minSeconds, maxSeconds){
            if (maxAttempts < 1) throw new Error('max attempts should be greater than or equal to 1');
            this.maxAttempts = maxAttempts;
            this.minSeconds = Math.floor(minSeconds);
            this.maxSeconds = Math.floor(maxSeconds);
            if (this.minSeconds > this.maxSeconds) throw new Error('min seconds should be less than or equal to max seconds');
        }
        execute(action, isRetryable) {
            return __awaiter(this, void 0, void 0, function*() {
                let attempt = 1;
                while(attempt < this.maxAttempts){
                    // Try
                    try {
                        return yield action();
                    } catch (err) {
                        if (isRetryable && !isRetryable(err)) throw err;
                        core.info(err.message);
                    }
                    // Sleep
                    const seconds = this.getSleepAmount();
                    core.info(`Waiting ${seconds} seconds before trying again`);
                    yield this.sleep(seconds);
                    attempt++;
                }
                // Last attempt
                return yield action();
            });
        }
        getSleepAmount() {
            return Math.floor(Math.random() * (this.maxSeconds - this.minSeconds + 1)) + this.minSeconds;
        }
        sleep(seconds) {
            return __awaiter(this, void 0, void 0, function*() {
                return new Promise((resolve)=>setTimeout(resolve, seconds * 1000)
                );
            });
        }
    }
    exports.RetryHelper = RetryHelper; //# sourceMappingURL=retry-helper.js.map
});
var load56 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true,
            get: function() {
                return m[k];
            }
        });
    } : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });
    var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", {
            enumerable: true,
            value: v
        });
    } : function(o, v) {
        o["default"] = v;
    });
    var __importStar = this && this.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
            for(var k in mod)if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
    };
    var __awaiter = this && this.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
                resolve(value);
            });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __importDefault = this && this.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : {
            "default": mod
        };
    };
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.evaluateVersions = exports.isExplicitVersion = exports.findFromManifest = exports.getManifestFromRepo = exports.findAllVersions = exports.find = exports.cacheFile = exports.cacheDir = exports.extractZip = exports.extractXar = exports.extractTar = exports.extract7z = exports.downloadTool = exports.HTTPError = void 0;
    const core = __importStar(load52());
    const io = __importStar(load11());
    const fs = __importStar(require("fs"));
    const mm = __importStar(load54());
    const os = __importStar(require("os"));
    const path = __importStar(require("path"));
    const httpm = __importStar(load3());
    const semver = __importStar(load53());
    const stream = __importStar(require("stream"));
    const util = __importStar(require("util"));
    const v4_1 = __importDefault(load39());
    const exec_1 = load13();
    const assert_1 = require("assert");
    const retry_helper_1 = load55();
    class HTTPError extends Error {
        constructor(httpStatusCode){
            super(`Unexpected HTTP response: ${httpStatusCode}`);
            this.httpStatusCode = httpStatusCode;
            Object.setPrototypeOf(this, new.target.prototype);
        }
    }
    exports.HTTPError = HTTPError;
    const IS_WINDOWS = process.platform === 'win32';
    const IS_MAC = process.platform === 'darwin';
    const userAgent = 'actions/tool-cache';
    /**
 * Download a tool from an url and stream it into a file
 *
 * @param url       url of tool to download
 * @param dest      path to download tool
 * @param auth      authorization header
 * @param headers   other headers
 * @returns         path to downloaded tool
 */ function downloadTool(url, dest, auth, headers) {
        return __awaiter(this, void 0, void 0, function*() {
            dest = dest || path.join(_getTempDirectory(), v4_1.default());
            yield io.mkdirP(path.dirname(dest));
            core.debug(`Downloading ${url}`);
            core.debug(`Destination ${dest}`);
            const minSeconds = _getGlobal('TEST_DOWNLOAD_TOOL_RETRY_MIN_SECONDS', 10);
            const maxSeconds = _getGlobal('TEST_DOWNLOAD_TOOL_RETRY_MAX_SECONDS', 20);
            const retryHelper = new retry_helper_1.RetryHelper(3, minSeconds, maxSeconds);
            return yield retryHelper.execute(()=>__awaiter(this, void 0, void 0, function*() {
                    return yield downloadToolAttempt(url, dest || '', auth, headers);
                })
            , (err)=>{
                if (err instanceof HTTPError && err.httpStatusCode) {
                    // Don't retry anything less than 500, except 408 Request Timeout and 429 Too Many Requests
                    if (err.httpStatusCode < 500 && err.httpStatusCode !== 408 && err.httpStatusCode !== 429) return false;
                }
                // Otherwise retry
                return true;
            });
        });
    }
    exports.downloadTool = downloadTool;
    function downloadToolAttempt(url, dest, auth, headers) {
        return __awaiter(this, void 0, void 0, function*() {
            if (fs.existsSync(dest)) throw new Error(`Destination file path ${dest} already exists`);
            // Get the response headers
            const http = new httpm.HttpClient(userAgent, [], {
                allowRetries: false
            });
            if (auth) {
                core.debug('set auth');
                if (headers === undefined) headers = {};
                headers.authorization = auth;
            }
            const response = yield http.get(url, headers);
            if (response.message.statusCode !== 200) {
                const err = new HTTPError(response.message.statusCode);
                core.debug(`Failed to download from "${url}". Code(${response.message.statusCode}) Message(${response.message.statusMessage})`);
                throw err;
            }
            // Download the response body
            const pipeline = util.promisify(stream.pipeline);
            const responseMessageFactory = _getGlobal('TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY', ()=>response.message
            );
            const readStream = responseMessageFactory();
            let succeeded = false;
            try {
                yield pipeline(readStream, fs.createWriteStream(dest));
                core.debug('download complete');
                succeeded = true;
                return dest;
            } finally{
                // Error, delete dest before retry
                if (!succeeded) {
                    core.debug('download failed');
                    try {
                        yield io.rmRF(dest);
                    } catch (err) {
                        core.debug(`Failed to delete '${dest}'. ${err.message}`);
                    }
                }
            }
        });
    }
    /**
 * Extract a .7z file
 *
 * @param file     path to the .7z file
 * @param dest     destination directory. Optional.
 * @param _7zPath  path to 7zr.exe. Optional, for long path support. Most .7z archives do not have this
 * problem. If your .7z archive contains very long paths, you can pass the path to 7zr.exe which will
 * gracefully handle long paths. By default 7zdec.exe is used because it is a very small program and is
 * bundled with the tool lib. However it does not support long paths. 7zr.exe is the reduced command line
 * interface, it is smaller than the full command line interface, and it does support long paths. At the
 * time of this writing, it is freely available from the LZMA SDK that is available on the 7zip website.
 * Be sure to check the current license agreement. If 7zr.exe is bundled with your action, then the path
 * to 7zr.exe can be pass to this function.
 * @returns        path to the destination directory
 */ function extract7z(file, dest, _7zPath) {
        return __awaiter(this, void 0, void 0, function*() {
            assert_1.ok(IS_WINDOWS, 'extract7z() not supported on current OS');
            assert_1.ok(file, 'parameter "file" is required');
            dest = yield _createExtractFolder(dest);
            const originalCwd = process.cwd();
            process.chdir(dest);
            if (_7zPath) try {
                const logLevel = core.isDebug() ? '-bb1' : '-bb0';
                const args = [
                    'x',
                    logLevel,
                    '-bd',
                    '-sccUTF-8',
                    file
                ];
                const options = {
                    silent: true
                };
                yield exec_1.exec(`"${_7zPath}"`, args, options);
            } finally{
                process.chdir(originalCwd);
            }
            else {
                const escapedScript = path.join(__dirname, '..', 'scripts', 'Invoke-7zdec.ps1').replace(/'/g, "''").replace(/"|\n|\r/g, ''); // double-up single quotes, remove double quotes and newlines
                const escapedFile = file.replace(/'/g, "''").replace(/"|\n|\r/g, '');
                const escapedTarget = dest.replace(/'/g, "''").replace(/"|\n|\r/g, '');
                const command = `& '${escapedScript}' -Source '${escapedFile}' -Target '${escapedTarget}'`;
                const args = [
                    '-NoLogo',
                    '-Sta',
                    '-NoProfile',
                    '-NonInteractive',
                    '-ExecutionPolicy',
                    'Unrestricted',
                    '-Command',
                    command
                ];
                const options = {
                    silent: true
                };
                try {
                    const powershellPath = yield io.which('powershell', true);
                    yield exec_1.exec(`"${powershellPath}"`, args, options);
                } finally{
                    process.chdir(originalCwd);
                }
            }
            return dest;
        });
    }
    exports.extract7z = extract7z;
    /**
 * Extract a compressed tar archive
 *
 * @param file     path to the tar
 * @param dest     destination directory. Optional.
 * @param flags    flags for the tar command to use for extraction. Defaults to 'xz' (extracting gzipped tars). Optional.
 * @returns        path to the destination directory
 */ function extractTar(file, dest, flags = 'xz') {
        return __awaiter(this, void 0, void 0, function*() {
            if (!file) throw new Error("parameter 'file' is required");
            // Create dest
            dest = yield _createExtractFolder(dest);
            // Determine whether GNU tar
            core.debug('Checking tar --version');
            let versionOutput = '';
            yield exec_1.exec('tar --version', [], {
                ignoreReturnCode: true,
                silent: true,
                listeners: {
                    stdout: (data)=>versionOutput += data.toString()
                    ,
                    stderr: (data)=>versionOutput += data.toString()
                }
            });
            core.debug(versionOutput.trim());
            const isGnuTar = versionOutput.toUpperCase().includes('GNU TAR');
            // Initialize args
            let args;
            if (flags instanceof Array) args = flags;
            else args = [
                flags
            ];
            if (core.isDebug() && !flags.includes('v')) args.push('-v');
            let destArg = dest;
            let fileArg = file;
            if (IS_WINDOWS && isGnuTar) {
                args.push('--force-local');
                destArg = dest.replace(/\\/g, '/');
                // Technically only the dest needs to have `/` but for aesthetic consistency
                // convert slashes in the file arg too.
                fileArg = file.replace(/\\/g, '/');
            }
            if (isGnuTar) {
                // Suppress warnings when using GNU tar to extract archives created by BSD tar
                args.push('--warning=no-unknown-keyword');
                args.push('--overwrite');
            }
            args.push('-C', destArg, '-f', fileArg);
            yield exec_1.exec(`tar`, args);
            return dest;
        });
    }
    exports.extractTar = extractTar;
    /**
 * Extract a xar compatible archive
 *
 * @param file     path to the archive
 * @param dest     destination directory. Optional.
 * @param flags    flags for the xar. Optional.
 * @returns        path to the destination directory
 */ function extractXar(file, dest, flags = []) {
        return __awaiter(this, void 0, void 0, function*() {
            assert_1.ok(IS_MAC, 'extractXar() not supported on current OS');
            assert_1.ok(file, 'parameter "file" is required');
            dest = yield _createExtractFolder(dest);
            let args;
            if (flags instanceof Array) args = flags;
            else args = [
                flags
            ];
            args.push('-x', '-C', dest, '-f', file);
            if (core.isDebug()) args.push('-v');
            const xarPath = yield io.which('xar', true);
            yield exec_1.exec(`"${xarPath}"`, _unique(args));
            return dest;
        });
    }
    exports.extractXar = extractXar;
    /**
 * Extract a zip
 *
 * @param file     path to the zip
 * @param dest     destination directory. Optional.
 * @returns        path to the destination directory
 */ function extractZip(file, dest) {
        return __awaiter(this, void 0, void 0, function*() {
            if (!file) throw new Error("parameter 'file' is required");
            dest = yield _createExtractFolder(dest);
            if (IS_WINDOWS) yield extractZipWin(file, dest);
            else yield extractZipNix(file, dest);
            return dest;
        });
    }
    exports.extractZip = extractZip;
    function extractZipWin(file, dest) {
        return __awaiter(this, void 0, void 0, function*() {
            // build the powershell command
            const escapedFile = file.replace(/'/g, "''").replace(/"|\n|\r/g, ''); // double-up single quotes, remove double quotes and newlines
            const escapedDest = dest.replace(/'/g, "''").replace(/"|\n|\r/g, '');
            const pwshPath = yield io.which('pwsh', false);
            //To match the file overwrite behavior on nix systems, we use the overwrite = true flag for ExtractToDirectory
            //and the -Force flag for Expand-Archive as a fallback
            if (pwshPath) {
                //attempt to use pwsh with ExtractToDirectory, if this fails attempt Expand-Archive
                const pwshCommand = [
                    `$ErrorActionPreference = 'Stop' ;`,
                    `try { Add-Type -AssemblyName System.IO.Compression.ZipFile } catch { } ;`,
                    `try { [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}', $true) }`,
                    `catch { if (($_.Exception.GetType().FullName -eq 'System.Management.Automation.MethodException') -or ($_.Exception.GetType().FullName -eq 'System.Management.Automation.RuntimeException') ){ Expand-Archive -LiteralPath '${escapedFile}' -DestinationPath '${escapedDest}' -Force } else { throw $_ } } ;`
                ].join(' ');
                const args = [
                    '-NoLogo',
                    '-NoProfile',
                    '-NonInteractive',
                    '-ExecutionPolicy',
                    'Unrestricted',
                    '-Command',
                    pwshCommand
                ];
                core.debug(`Using pwsh at path: ${pwshPath}`);
                yield exec_1.exec(`"${pwshPath}"`, args);
            } else {
                const powershellCommand = [
                    `$ErrorActionPreference = 'Stop' ;`,
                    `try { Add-Type -AssemblyName System.IO.Compression.FileSystem } catch { } ;`,
                    `if ((Get-Command -Name Expand-Archive -Module Microsoft.PowerShell.Archive -ErrorAction Ignore)) { Expand-Archive -LiteralPath '${escapedFile}' -DestinationPath '${escapedDest}' -Force }`,
                    `else {[System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}', $true) }`
                ].join(' ');
                const args = [
                    '-NoLogo',
                    '-Sta',
                    '-NoProfile',
                    '-NonInteractive',
                    '-ExecutionPolicy',
                    'Unrestricted',
                    '-Command',
                    powershellCommand
                ];
                const powershellPath = yield io.which('powershell', true);
                core.debug(`Using powershell at path: ${powershellPath}`);
                yield exec_1.exec(`"${powershellPath}"`, args);
            }
        });
    }
    function extractZipNix(file, dest) {
        return __awaiter(this, void 0, void 0, function*() {
            const unzipPath = yield io.which('unzip', true);
            const args = [
                file
            ];
            if (!core.isDebug()) args.unshift('-q');
            args.unshift('-o'); //overwrite with -o, otherwise a prompt is shown which freezes the run
            yield exec_1.exec(`"${unzipPath}"`, args, {
                cwd: dest
            });
        });
    }
    /**
 * Caches a directory and installs it into the tool cacheDir
 *
 * @param sourceDir    the directory to cache into tools
 * @param tool          tool name
 * @param version       version of the tool.  semver format
 * @param arch          architecture of the tool.  Optional.  Defaults to machine architecture
 */ function cacheDir(sourceDir, tool, version, arch) {
        return __awaiter(this, void 0, void 0, function*() {
            version = semver.clean(version) || version;
            arch = arch || os.arch();
            core.debug(`Caching tool ${tool} ${version} ${arch}`);
            core.debug(`source dir: ${sourceDir}`);
            if (!fs.statSync(sourceDir).isDirectory()) throw new Error('sourceDir is not a directory');
            // Create the tool dir
            const destPath = yield _createToolPath(tool, version, arch);
            // copy each child item. do not move. move can fail on Windows
            // due to anti-virus software having an open handle on a file.
            for (const itemName of fs.readdirSync(sourceDir)){
                const s = path.join(sourceDir, itemName);
                yield io.cp(s, destPath, {
                    recursive: true
                });
            }
            // write .complete
            _completeToolPath(tool, version, arch);
            return destPath;
        });
    }
    exports.cacheDir = cacheDir;
    /**
 * Caches a downloaded file (GUID) and installs it
 * into the tool cache with a given targetName
 *
 * @param sourceFile    the file to cache into tools.  Typically a result of downloadTool which is a guid.
 * @param targetFile    the name of the file name in the tools directory
 * @param tool          tool name
 * @param version       version of the tool.  semver format
 * @param arch          architecture of the tool.  Optional.  Defaults to machine architecture
 */ function cacheFile(sourceFile, targetFile, tool, version, arch) {
        return __awaiter(this, void 0, void 0, function*() {
            version = semver.clean(version) || version;
            arch = arch || os.arch();
            core.debug(`Caching tool ${tool} ${version} ${arch}`);
            core.debug(`source file: ${sourceFile}`);
            if (!fs.statSync(sourceFile).isFile()) throw new Error('sourceFile is not a file');
            // create the tool dir
            const destFolder = yield _createToolPath(tool, version, arch);
            // copy instead of move. move can fail on Windows due to
            // anti-virus software having an open handle on a file.
            const destPath = path.join(destFolder, targetFile);
            core.debug(`destination file ${destPath}`);
            yield io.cp(sourceFile, destPath);
            // write .complete
            _completeToolPath(tool, version, arch);
            return destFolder;
        });
    }
    exports.cacheFile = cacheFile;
    /**
 * Finds the path to a tool version in the local installed tool cache
 *
 * @param toolName      name of the tool
 * @param versionSpec   version of the tool
 * @param arch          optional arch.  defaults to arch of computer
 */ function find(toolName, versionSpec, arch) {
        if (!toolName) throw new Error('toolName parameter is required');
        if (!versionSpec) throw new Error('versionSpec parameter is required');
        arch = arch || os.arch();
        // attempt to resolve an explicit version
        if (!isExplicitVersion(versionSpec)) {
            const localVersions = findAllVersions(toolName, arch);
            const match = evaluateVersions(localVersions, versionSpec);
            versionSpec = match;
        }
        // check for the explicit version in the cache
        let toolPath = '';
        if (versionSpec) {
            versionSpec = semver.clean(versionSpec) || '';
            const cachePath = path.join(_getCacheDirectory(), toolName, versionSpec, arch);
            core.debug(`checking cache: ${cachePath}`);
            if (fs.existsSync(cachePath) && fs.existsSync(`${cachePath}.complete`)) {
                core.debug(`Found tool in cache ${toolName} ${versionSpec} ${arch}`);
                toolPath = cachePath;
            } else core.debug('not found');
        }
        return toolPath;
    }
    exports.find = find;
    /**
 * Finds the paths to all versions of a tool that are installed in the local tool cache
 *
 * @param toolName  name of the tool
 * @param arch      optional arch.  defaults to arch of computer
 */ function findAllVersions(toolName, arch) {
        const versions = [];
        arch = arch || os.arch();
        const toolPath = path.join(_getCacheDirectory(), toolName);
        if (fs.existsSync(toolPath)) {
            const children = fs.readdirSync(toolPath);
            for (const child of children)if (isExplicitVersion(child)) {
                const fullPath = path.join(toolPath, child, arch || '');
                if (fs.existsSync(fullPath) && fs.existsSync(`${fullPath}.complete`)) versions.push(child);
            }
        }
        return versions;
    }
    exports.findAllVersions = findAllVersions;
    function getManifestFromRepo(owner, repo, auth, branch = 'master') {
        return __awaiter(this, void 0, void 0, function*() {
            let releases = [];
            const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}`;
            const http = new httpm.HttpClient('tool-cache');
            const headers = {};
            if (auth) {
                core.debug('set auth');
                headers.authorization = auth;
            }
            const response = yield http.getJson(treeUrl, headers);
            if (!response.result) return releases;
            let manifestUrl = '';
            for (const item of response.result.tree)if (item.path === 'versions-manifest.json') {
                manifestUrl = item.url;
                break;
            }
            headers['accept'] = 'application/vnd.github.VERSION.raw';
            let versionsRaw = yield (yield http.get(manifestUrl, headers)).readBody();
            if (versionsRaw) {
                // shouldn't be needed but protects against invalid json saved with BOM
                versionsRaw = versionsRaw.replace(/^\uFEFF/, '');
                try {
                    releases = JSON.parse(versionsRaw);
                } catch (_a) {
                    core.debug('Invalid json');
                }
            }
            return releases;
        });
    }
    exports.getManifestFromRepo = getManifestFromRepo;
    function findFromManifest(versionSpec, stable, manifest, archFilter = os.arch()) {
        return __awaiter(this, void 0, void 0, function*() {
            // wrap the internal impl
            const match = yield mm._findMatch(versionSpec, stable, manifest, archFilter);
            return match;
        });
    }
    exports.findFromManifest = findFromManifest;
    function _createExtractFolder(dest) {
        return __awaiter(this, void 0, void 0, function*() {
            if (!dest) // create a temp dir
            dest = path.join(_getTempDirectory(), v4_1.default());
            yield io.mkdirP(dest);
            return dest;
        });
    }
    function _createToolPath(tool, version, arch) {
        return __awaiter(this, void 0, void 0, function*() {
            const folderPath = path.join(_getCacheDirectory(), tool, semver.clean(version) || version, arch || '');
            core.debug(`destination ${folderPath}`);
            const markerPath = `${folderPath}.complete`;
            yield io.rmRF(folderPath);
            yield io.rmRF(markerPath);
            yield io.mkdirP(folderPath);
            return folderPath;
        });
    }
    function _completeToolPath(tool, version, arch) {
        const folderPath = path.join(_getCacheDirectory(), tool, semver.clean(version) || version, arch || '');
        const markerPath = `${folderPath}.complete`;
        fs.writeFileSync(markerPath, '');
        core.debug('finished caching tool');
    }
    /**
 * Check if version string is explicit
 *
 * @param versionSpec      version string to check
 */ function isExplicitVersion(versionSpec) {
        const c = semver.clean(versionSpec) || '';
        core.debug(`isExplicit: ${c}`);
        const valid = semver.valid(c) != null;
        core.debug(`explicit? ${valid}`);
        return valid;
    }
    exports.isExplicitVersion = isExplicitVersion;
    /**
 * Get the highest satisfiying semantic version in `versions` which satisfies `versionSpec`
 *
 * @param versions        array of versions to evaluate
 * @param versionSpec     semantic version spec to satisfy
 */ function evaluateVersions(versions, versionSpec) {
        let version = '';
        core.debug(`evaluating ${versions.length} versions`);
        versions = versions.sort((a, b)=>{
            if (semver.gt(a, b)) return 1;
            return -1;
        });
        for(let i = versions.length - 1; i >= 0; i--){
            const potential = versions[i];
            const satisfied = semver.satisfies(potential, versionSpec);
            if (satisfied) {
                version = potential;
                break;
            }
        }
        if (version) core.debug(`matched: ${version}`);
        else core.debug('match not found');
        return version;
    }
    exports.evaluateVersions = evaluateVersions;
    /**
 * Gets RUNNER_TOOL_CACHE
 */ function _getCacheDirectory() {
        const cacheDirectory = process.env['RUNNER_TOOL_CACHE'] || '';
        assert_1.ok(cacheDirectory, 'Expected RUNNER_TOOL_CACHE to be defined');
        return cacheDirectory;
    }
    /**
 * Gets RUNNER_TEMP
 */ function _getTempDirectory() {
        const tempDirectory = process.env['RUNNER_TEMP'] || '';
        assert_1.ok(tempDirectory, 'Expected RUNNER_TEMP to be defined');
        return tempDirectory;
    }
    /**
 * Gets a global variable
 */ function _getGlobal(key, defaultValue) {
        /* eslint-disable @typescript-eslint/no-explicit-any */ const value = global[key];
        /* eslint-enable @typescript-eslint/no-explicit-any */ return value !== undefined ? value : defaultValue;
    }
    /**
 * Returns an array of unique values.
 * @param values Values to make unique.
 */ function _unique(values) {
        return Array.from(new Set(values));
    } //# sourceMappingURL=tool-cache.js.map
});
var load57 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.fromLocalCache = fromLocalCache;
    exports.toLocalCache = toLocalCache;
    exports.fromRemoteCache = fromRemoteCache;
    exports.toRemoteCache = toRemoteCache;
    var _cache = load48();
    var core = _interopRequireWildcard(load8());
    var toolCache = _interopRequireWildcard(load56());
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
var load58 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.install = install;
    exports.fromPackager = fromPackager;
    var core = _interopRequireWildcard(load8());
    var cli = _interopRequireWildcard(load13());
    var io = _interopRequireWildcard(load11());
    var path = _interopRequireWildcard(require("path"));
    var _cache = load57();
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
var load59 = __swcpack_require__.bind(void 0, function(module, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.resolveVersion = resolveVersion;
    var _exec = load13();
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
var load60 = __swcpack_require__.bind(void 0, function(module, exports) {
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
var load61 = __swcpack_require__.bind(void 0, function(module, exports) {
    const debug = typeof process === 'object' && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args)=>console.error('SEMVER', ...args)
     : ()=>{};
    module.exports = debug;
});
var load62 = __swcpack_require__.bind(void 0, function(module, exports) {
    const { MAX_SAFE_COMPONENT_LENGTH  } = load60();
    const debug = load61();
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
var load63 = __swcpack_require__.bind(void 0, function(module, exports) {
    // parse out just the options we care about so we always get a consistent
    // obj with keys in a consistent order.
    const opts = [
        'includePrerelease',
        'loose',
        'rtl'
    ];
    const parseOptions = (options2)=>!options2 ? {} : typeof options2 !== 'object' ? {
            loose: true
        } : opts.filter((k)=>options2[k]
        ).reduce((options, k)=>{
            options[k] = true;
            return options;
        }, {})
    ;
    module.exports = parseOptions;
});
var load64 = __swcpack_require__.bind(void 0, function(module, exports) {
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
var load65 = __swcpack_require__.bind(void 0, function(module, exports) {
    const debug = load61();
    const { MAX_LENGTH , MAX_SAFE_INTEGER  } = load60();
    const { re , t  } = load62();
    const parseOptions = load63();
    const { compareIdentifiers  } = load64();
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
var load66 = __swcpack_require__.bind(void 0, function(module, exports) {
    const { MAX_LENGTH  } = load60();
    const { re , t  } = load62();
    const SemVer = load65();
    const parseOptions = load63();
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
var load67 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load66();
    const valid = (version, options)=>{
        const v = parse(version, options);
        return v ? v.version : null;
    };
    module.exports = valid;
});
var load68 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load66();
    const clean = (version, options)=>{
        const s = parse(version.trim().replace(/^[=v]+/, ''), options);
        return s ? s.version : null;
    };
    module.exports = clean;
});
var load69 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
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
var load70 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const compare = (a, b, loose)=>new SemVer(a, loose).compare(new SemVer(b, loose))
    ;
    module.exports = compare;
});
var load71 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const eq = (a, b, loose)=>compare(a, b, loose) === 0
    ;
    module.exports = eq;
});
var load72 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load66();
    const eq = load71();
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
var load73 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const major = (a, loose)=>new SemVer(a, loose).major
    ;
    module.exports = major;
});
var load74 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const minor = (a, loose)=>new SemVer(a, loose).minor
    ;
    module.exports = minor;
});
var load75 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const patch = (a, loose)=>new SemVer(a, loose).patch
    ;
    module.exports = patch;
});
var load76 = __swcpack_require__.bind(void 0, function(module, exports) {
    const parse = load66();
    const prerelease = (version, options)=>{
        const parsed = parse(version, options);
        return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
});
var load77 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const rcompare = (a, b, loose)=>compare(b, a, loose)
    ;
    module.exports = rcompare;
});
var load78 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const compareLoose = (a, b)=>compare(a, b, true)
    ;
    module.exports = compareLoose;
});
var load79 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const compareBuild = (a, b, loose)=>{
        const versionA = new SemVer(a, loose);
        const versionB = new SemVer(b, loose);
        return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
});
var load80 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compareBuild = load79();
    const sort = (list, loose)=>list.sort((a, b)=>compareBuild(a, b, loose)
        )
    ;
    module.exports = sort;
});
var load81 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compareBuild = load79();
    const rsort = (list, loose)=>list.sort((a, b)=>compareBuild(b, a, loose)
        )
    ;
    module.exports = rsort;
});
var load82 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const gt = (a, b, loose)=>compare(a, b, loose) > 0
    ;
    module.exports = gt;
});
var load83 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const lt = (a, b, loose)=>compare(a, b, loose) < 0
    ;
    module.exports = lt;
});
var load84 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const neq = (a, b, loose)=>compare(a, b, loose) !== 0
    ;
    module.exports = neq;
});
var load85 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const gte = (a, b, loose)=>compare(a, b, loose) >= 0
    ;
    module.exports = gte;
});
var load86 = __swcpack_require__.bind(void 0, function(module, exports) {
    const compare = load70();
    const lte = (a, b, loose)=>compare(a, b, loose) <= 0
    ;
    module.exports = lte;
});
var load87 = __swcpack_require__.bind(void 0, function(module, exports) {
    const eq = load71();
    const neq = load84();
    const gt = load82();
    const gte = load85();
    const lt = load83();
    const lte = load86();
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
var load88 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const parse = load66();
    const { re , t  } = load62();
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
var load89 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    module.exports = function(Yallist) {
        Yallist.prototype[Symbol.iterator] = function*() {
            for(let walker = this.head; walker; walker = walker.next)yield walker.value;
        };
    };
});
var load90 = __swcpack_require__.bind(void 0, function(module, exports) {
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
        load89()(Yallist);
    } catch (er) {}
});
var load91 = __swcpack_require__.bind(void 0, function(module, exports) {
    'use strict';
    // A linked list to keep track of recently-used-ness
    const Yallist = load90();
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
var load92 = __swcpack_require__.bind(void 0, function(module, exports) {
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
    const parseOptions = load63();
    const { re , t  } = load62();
    const cmp = load87();
    const debug = load61();
    const SemVer = load65();
    const Range = load93();
});
var load93 = __swcpack_require__.bind(void 0, function(module, exports) {
    // hoisted class for cyclic dependency
    class Range {
        constructor(range3, options){
            options = parseOptions(options);
            if (range3 instanceof Range) {
                if (range3.loose === !!options.loose && range3.includePrerelease === !!options.includePrerelease) return range3;
                else return new Range(range3.raw, options);
            }
            if (range3 instanceof Comparator) {
                // just put it in the set and return
                this.raw = range3.value;
                this.set = [
                    [
                        range3
                    ]
                ];
                this.format();
                return this;
            }
            this.options = options;
            this.loose = !!options.loose;
            this.includePrerelease = !!options.includePrerelease;
            // First, split based on boolean or ||
            this.raw = range3;
            this.set = range3.split(/\s*\|\|\s*/)// map the range to a 2d array of comparators
            .map((range)=>this.parseRange(range.trim())
            )// throw out any comparator lists that are empty
            // this generally means that it was not a valid range, which is allowed
            // in loose mode, but will still throw if the WHOLE range is invalid.
            .filter((c)=>c.length
            );
            if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${range3}`);
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
            for (const comp7 of rangeList){
                if (isNullSet(comp7)) return [
                    comp7
                ];
                rangeMap.set(comp7.value, comp7);
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
    const LRU = load91();
    const cache = new LRU({
        max: 1000
    });
    const parseOptions = load63();
    const Comparator = load92();
    const debug = load61();
    const SemVer = load65();
    const { re , t , comparatorTrimReplace , tildeTrimReplace , caretTrimReplace  } = load62();
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
    const replaceTildes = (comp8, options)=>comp8.trim().split(/\s+/).map((comp)=>{
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
    const replaceCarets = (comp9, options)=>comp9.trim().split(/\s+/).map((comp)=>{
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
    const replaceXRanges = (comp10, options)=>{
        debug('replaceXRanges', comp10, options);
        return comp10.split(/\s+/).map((comp)=>{
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
var load94 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load93();
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
var load95 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load93();
    // Mostly just for testing and legacy API reasons
    const toComparators = (range, options)=>new Range(range, options).set.map((comp)=>comp.map((c)=>c.value
            ).join(' ').trim().split(' ')
        )
    ;
    module.exports = toComparators;
});
var load96 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const Range = load93();
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
var load97 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const Range = load93();
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
var load98 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const Range = load93();
    const gt = load82();
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
var load99 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load93();
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
var load100 = __swcpack_require__.bind(void 0, function(module, exports) {
    const SemVer = load65();
    const Comparator = load92();
    const { ANY  } = Comparator;
    const Range = load93();
    const satisfies = load94();
    const gt = load82();
    const lt = load83();
    const lte = load86();
    const gte = load85();
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
var load101 = __swcpack_require__.bind(void 0, function(module, exports) {
    // Determine if version is greater than all the versions possible in the range.
    const outside = load100();
    const gtr = (version, range, options)=>outside(version, range, '>', options)
    ;
    module.exports = gtr;
});
var load102 = __swcpack_require__.bind(void 0, function(module, exports) {
    const outside = load100();
    // Determine if version is less than all the versions possible in the range
    const ltr = (version, range, options)=>outside(version, range, '<', options)
    ;
    module.exports = ltr;
});
var load103 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load93();
    const intersects = (r1, r2, options)=>{
        r1 = new Range(r1, options);
        r2 = new Range(r2, options);
        return r1.intersects(r2);
    };
    module.exports = intersects;
});
var load104 = __swcpack_require__.bind(void 0, function(module, exports) {
    // given a set of versions and a range, create a "simplified" range
    // that includes the same versions that the original range does
    // If the original range is shorter than the simplified one, return that.
    const satisfies = load94();
    const compare = load70();
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
var load105 = __swcpack_require__.bind(void 0, function(module, exports) {
    const Range = load93();
    const Comparator = load92();
    const { ANY  } = Comparator;
    const satisfies = load94();
    const compare = load70();
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
var load106 = __swcpack_require__.bind(void 0, function(module, exports) {
    // just pre-load all the stuff that index.js lazily exports
    const internalRe = load62();
    module.exports = {
        re: internalRe.re,
        src: internalRe.src,
        tokens: internalRe.t,
        SEMVER_SPEC_VERSION: load60().SEMVER_SPEC_VERSION,
        SemVer: load65(),
        compareIdentifiers: load64().compareIdentifiers,
        rcompareIdentifiers: load64().rcompareIdentifiers,
        parse: load66(),
        valid: load67(),
        clean: load68(),
        inc: load69(),
        diff: load72(),
        major: load73(),
        minor: load74(),
        patch: load75(),
        prerelease: load76(),
        compare: load70(),
        rcompare: load77(),
        compareLoose: load78(),
        compareBuild: load79(),
        sort: load80(),
        rsort: load81(),
        gt: load82(),
        lt: load83(),
        eq: load71(),
        neq: load84(),
        gte: load85(),
        lte: load86(),
        cmp: load87(),
        coerce: load88(),
        Comparator: load92(),
        Range: load93(),
        satisfies: load94(),
        toComparators: load95(),
        maxSatisfying: load96(),
        minSatisfying: load97(),
        minVersion: load98(),
        validRange: load99(),
        outside: load100(),
        gtr: load101(),
        ltr: load102(),
        intersects: load103(),
        simplifyRange: load104(),
        subset: load105()
    };
});
var load107 = __swcpack_require__.bind(void 0, function(module, exports) {
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
    var core = _interopRequireWildcard(load8());
    var cli = _interopRequireWildcard(load13());
    var _semver = _interopRequireDefault(load106());
    var _packager1 = load59();
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
var _core = load8();
var _install = load58();
var _packager = load59();
var tools = _interopRequireWildcard(load107());
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
