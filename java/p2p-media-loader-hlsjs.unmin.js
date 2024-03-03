require = (function t(e, s, i) {
    function n(r, o) {
        if (!s[r]) {
            if (!e[r]) {
                var u = "function" == typeof require && require;
                if (!o && u) return u(r, !0);
                if (a) return a(r, !0);
                var l = new Error("Cannot find module '" + r + "'");
                throw ((l.code = "MODULE_NOT_FOUND"), l);
            }
            var g = (s[r] = { exports: {} });
            e[r][0].call(
                g.exports,
                function (t) {
                    return n(e[r][1][t] || t);
                },
                g,
                g.exports,
                t,
                e,
                s,
                i
            );
        }
        return s[r].exports;
    }
    for (var a = "function" == typeof require && require, r = 0; r < i.length; r++) n(i[r]);
    return n;
})(
    {
        1: [
            function (t, e, s) {
                window.p2pml || (window.p2pml = {}), (window.p2pml.hlsjs = t("p2p-media-loader-hlsjs"));
            },
            { "p2p-media-loader-hlsjs": "p2p-media-loader-hlsjs" },
        ],
        2: [
            function (t, e, s) {
                "use strict";
                Object.defineProperty(s, "__esModule", { value: !0 });
                const i = t("events"),
                    n = t("p2p-media-loader-core"),
                    a = t("./segment-manager"),
                    r = t("./hlsjs-loader"),
                    o = t("./hlsjs-loader-class");
                s.Engine = class extends i.EventEmitter {
                    constructor(t = {}) {
                        super(),
                            (this.loader = new n.HybridLoader(t.loader)),
                            (this.segmentManager = new a.SegmentManager(this.loader, t.segments)),
                            Object.keys(n.Events)
                                .map((t) => n.Events[t])
                                .forEach((t) => this.loader.on(t, (...e) => this.emit(t, ...e)));
                    }
                    static isSupported() {
                        return n.HybridLoader.isSupported();
                    }
                    createLoaderClass() {
                        return o.createHlsJsLoaderClass(r.HlsJsLoader, this);
                    }
                    async destroy() {
                        await this.segmentManager.destroy();
                    }
                    getSettings() {
                        return { segments: this.segmentManager.getSettings(), loader: this.loader.getSettings() };
                    }
                    getDetails() {
                        return { loader: this.loader.getDetails() };
                    }
                    setPlayingSegment(t, e, s, i) {
                        this.segmentManager.setPlayingSegment(t, e, s, i);
                    }
                    setPlayingSegmentByCurrentTime(t) {
                        this.segmentManager.setPlayingSegmentByCurrentTime(t);
                    }
                };
            },
            { "./hlsjs-loader": 4, "./hlsjs-loader-class": 3, "./segment-manager": 5, events: "events", "p2p-media-loader-core": "p2p-media-loader-core" },
        ],
        3: [
            function (t, e, s) {
                e.exports.createHlsJsLoaderClass = function (t, e) {
                    function s() {
                        (this.impl = new t(e.segmentManager)), (this.stats = this.impl.stats);
                    }
                    return (
                        (s.prototype.load = function (t, e, s) {
                            (this.context = t), this.impl.load(t, e, s);
                        }),
                        (s.prototype.abort = function () {
                            this.impl.abort(this.context);
                        }),
                        (s.prototype.destroy = function () {
                            this.context && this.impl.abort(this.context);
                        }),
                        (s.getEngine = function () {
                            return e;
                        }),
                        s
                    );
                };
            },
            {},
        ],
        4: [
            function (t, e, s) {
                "use strict";
                Object.defineProperty(s, "__esModule", { value: !0 });
                const i = 1,
                    n = 12500;
                s.HlsJsLoader = class {
                    constructor(t) {
                        (this.stats = {}), (this.segmentManager = t);
                    }
                    async load(t, e, s) {
                        if (t.type)
                            try {
                                const e = await this.segmentManager.loadPlaylist(t.url);
                                this.successPlaylist(e, t, s);
                            } catch (e) {
                                this.error(e, t, s);
                            }
                        else if (t.frag)
                            try {
                                const e = await this.segmentManager.loadSegment(t.url, null == t.rangeStart || null == t.rangeEnd ? void 0 : { offset: t.rangeStart, length: t.rangeEnd - t.rangeStart });
                                void 0 !== e.content && setTimeout(() => this.successSegment(e.content, e.downloadBandwidth, t, s), 0);
                            } catch (e) {
                                setTimeout(() => this.error(e, t, s), 0);
                            }
                        else console.warn("Unknown load request", t);
                    }
                    abort(t) {
                        this.segmentManager.abortSegment(t.url, null == t.rangeStart || null == t.rangeEnd ? void 0 : { offset: t.rangeStart, length: t.rangeEnd - t.rangeStart });
                    }
                    successPlaylist(t, e, s) {
                        const i = performance.now();
                        (this.stats.trequest = i - 300), (this.stats.tfirst = i - 200), (this.stats.tload = i), (this.stats.loaded = t.response.length), s.onSuccess({ url: t.responseURL, data: t.response }, this.stats, e);
                    }
                    successSegment(t, e, s, a) {
                        const r = performance.now(),
                            o = t.byteLength / (void 0 === e || e <= 0 ? n : e);
                        (this.stats.trequest = r - i - o), (this.stats.tfirst = r - o), (this.stats.tload = r), (this.stats.loaded = t.byteLength), a.onSuccess({ url: s.url, data: t }, this.stats, s);
                    }
                    error(t, e, s) {
                        s.onError(t, e);
                    }
                };
            },
            {},
        ],
        5: [
            function (t, e, s) {
                "use strict";
                Object.defineProperty(s, "__esModule", { value: !0 });
                const i = t("p2p-media-loader-core"),
                    n = t("m3u8-parser"),
                    a = { forwardSegmentCount: 20, swarmId: void 0, assetsStorage: void 0 };
                s.SegmentManager = class {
                    constructor(t, e = {}) {
                        (this.masterPlaylist = null),
                            (this.variantPlaylists = new Map()),
                            (this.segmentRequest = null),
                            (this.playQueue = []),
                            (this.onSegmentLoaded = (t) => {
                                this.segmentRequest &&
                                    this.segmentRequest.segmentUrl === t.url &&
                                    l(this.segmentRequest.segmentByterange) === t.range &&
                                    (this.segmentRequest.onSuccess(t.data.slice(0), t.downloadBandwidth), (this.segmentRequest = null));
                            }),
                            (this.onSegmentError = (t, e) => {
                                this.segmentRequest && this.segmentRequest.segmentUrl === t.url && l(this.segmentRequest.segmentByterange) === t.range && (this.segmentRequest.onError(e), (this.segmentRequest = null));
                            }),
                            (this.onSegmentAbort = (t) => {
                                this.segmentRequest &&
                                    this.segmentRequest.segmentUrl === t.url &&
                                    l(this.segmentRequest.segmentByterange) === t.range &&
                                    (this.segmentRequest.onError("Loading aborted: internal abort"), (this.segmentRequest = null));
                            }),
                            (this.settings = Object.assign(Object.assign({}, a), e)),
                            (this.loader = t),
                            this.loader.on(i.Events.SegmentLoaded, this.onSegmentLoaded),
                            this.loader.on(i.Events.SegmentError, this.onSegmentError),
                            this.loader.on(i.Events.SegmentAbort, this.onSegmentAbort);
                    }
                    getSettings() {
                        return this.settings;
                    }
                    processPlaylist(t, e, s) {
                        const i = new n.Parser();
                        i.push(e), i.end();
                        const a = new r(t, s, i.manifest);
                        if (a.manifest.playlists) {
                            this.masterPlaylist = a;
                            for (const [t, e] of this.variantPlaylists) {
                                const { streamSwarmId: s, found: i, index: n } = this.getStreamSwarmId(e.requestUrl);
                                i ? ((e.streamSwarmId = s), (e.streamId = "V" + n.toString())) : this.variantPlaylists.delete(t);
                            }
                        } else {
                            const { streamSwarmId: e, found: s, index: i } = this.getStreamSwarmId(t);
                            (s || null === this.masterPlaylist) && ((a.streamSwarmId = e), (a.streamId = null === this.masterPlaylist ? void 0 : "V" + i.toString()), this.variantPlaylists.set(t, a), this.updateSegments());
                        }
                    }
                    async loadPlaylist(t) {
                        const e = this.settings.assetsStorage;
                        let s;
                        if (void 0 !== e) {
                            let i;
                            void 0 === (i = this.getMasterSwarmId()) && (i = t.split("?")[0]);
                            const n = await e.getAsset(t, void 0, i);
                            void 0 !== n
                                ? (s = { responseURL: n.responseUri, response: n.data })
                                : ((s = await this.loadContent(t, "text")),
                                  e.storeAsset({ masterManifestUri: null !== this.masterPlaylist ? this.masterPlaylist.requestUrl : t, masterSwarmId: i, requestUri: t, responseUri: s.responseURL, data: s.response }));
                        } else s = await this.loadContent(t, "text");
                        return this.processPlaylist(t, s.response, s.responseURL), s;
                    }
                    async loadSegment(t, e) {
                        const s = this.getSegmentLocation(t, e),
                            i = l(e);
                        if (!s) {
                            let e;
                            const s = this.settings.assetsStorage;
                            if (void 0 !== s) {
                                let n,
                                    a = null !== this.masterPlaylist ? this.masterPlaylist.requestUrl : void 0;
                                if (
                                    (void 0 === (n = this.getMasterSwarmId()) && 1 === this.variantPlaylists.size && (n = this.variantPlaylists.values().next().value.requestUrl.split("?")[0]),
                                    void 0 === a && 1 === this.variantPlaylists.size && (a = this.variantPlaylists.values().next().value.requestUrl),
                                    void 0 !== n && void 0 !== a)
                                ) {
                                    const r = await s.getAsset(t, i, n);
                                    if (void 0 !== r) e = r.data;
                                    else {
                                        const r = await this.loadContent(t, "arraybuffer", i);
                                        (e = r.response), s.storeAsset({ masterManifestUri: a, masterSwarmId: n, requestUri: t, requestRange: i, responseUri: r.responseURL, data: e });
                                    }
                                }
                            }
                            if (void 0 === e) {
                                e = (await this.loadContent(t, "arraybuffer", i)).response;
                            }
                            return { content: e, downloadBandwidth: 0 };
                        }
                        const n = (s.playlist.manifest.mediaSequence ? s.playlist.manifest.mediaSequence : 0) + s.segmentIndex;
                        if (this.playQueue.length > 0) {
                            this.playQueue[this.playQueue.length - 1].segmentSequence !== n - 1 && (this.playQueue = []);
                        }
                        this.segmentRequest && this.segmentRequest.onError("Cancel segment request: simultaneous segment requests are not supported");
                        const a = new Promise((i, a) => {
                            this.segmentRequest = new o(
                                t,
                                e,
                                n,
                                s.playlist.requestUrl,
                                (t, e) => i({ content: t, downloadBandwidth: e }),
                                (t) => a(t)
                            );
                        });
                        return this.playQueue.push({ segmentUrl: t, segmentByterange: e, segmentSequence: n }), this.loadSegments(s.playlist, s.segmentIndex, !0), a;
                    }
                    setPlayingSegment(t, e, s, i) {
                        const n = this.playQueue.findIndex((s) => s.segmentUrl == t && u(s.segmentByterange, e));
                        n >= 0 && ((this.playQueue = this.playQueue.slice(n)), (this.playQueue[0].playPosition = { start: s, duration: i }), this.updateSegments());
                    }
                    setPlayingSegmentByCurrentTime(t) {
                        if (0 === this.playQueue.length || !this.playQueue[0].playPosition) return;
                        const e = this.playQueue[0].playPosition;
                        e.start + e.duration - t < 0.2 && ((this.playQueue = this.playQueue.slice(1)), this.updateSegments());
                    }
                    abortSegment(t, e) {
                        this.segmentRequest && this.segmentRequest.segmentUrl === t && u(this.segmentRequest.segmentByterange, e) && (this.segmentRequest.onSuccess(void 0, 0), (this.segmentRequest = null));
                    }
                    async destroy() {
                        this.segmentRequest && (this.segmentRequest.onError("Loading aborted: object destroyed"), (this.segmentRequest = null)),
                            (this.masterPlaylist = null),
                            this.variantPlaylists.clear(),
                            (this.playQueue = []),
                            void 0 !== this.settings.assetsStorage && (await this.settings.assetsStorage.destroy()),
                            await this.loader.destroy();
                    }
                    updateSegments() {
                        if (!this.segmentRequest) return;
                        const t = this.getSegmentLocation(this.segmentRequest.segmentUrl, this.segmentRequest.segmentByterange);
                        t && this.loadSegments(t.playlist, t.segmentIndex, !1);
                    }
                    getSegmentLocation(t, e) {
                        for (const s of this.variantPlaylists.values()) {
                            const i = s.getSegmentIndex(t, e);
                            if (i >= 0) return { playlist: s, segmentIndex: i };
                        }
                    }
                    async loadSegments(t, e, s) {
                        const i = [],
                            n = t.manifest.segments,
                            a = t.manifest.mediaSequence ? t.manifest.mediaSequence : 0;
                        let r = null,
                            o = Math.max(0, this.playQueue.length - 1);
                        const u = this.getMasterSwarmId();
                        for (let g = e; g < n.length && i.length < this.settings.forwardSegmentCount; ++g) {
                            const e = t.manifest.segments[g],
                                n = t.getSegmentAbsoluteUrl(e.uri),
                                d = e.byterange,
                                c = this.getSegmentId(t, a + g);
                            i.push({
                                id: c,
                                url: n,
                                masterSwarmId: void 0 !== u ? u : t.streamSwarmId,
                                masterManifestUri: null !== this.masterPlaylist ? this.masterPlaylist.requestUrl : t.requestUrl,
                                streamId: t.streamId,
                                sequence: (a + g).toString(),
                                range: l(d),
                                priority: o++,
                            }),
                                s && !r && (r = c);
                        }
                        if ((this.loader.load(i, t.streamSwarmId), r)) {
                            const t = await this.loader.getSegment(r);
                            t && this.onSegmentLoaded(t);
                        }
                    }
                    getSegmentId(t, e) {
                        return `${t.streamSwarmId}+${e}`;
                    }
                    getMasterSwarmId() {
                        const t = this.settings.swarmId && 0 !== this.settings.swarmId.length ? this.settings.swarmId : void 0;
                        return void 0 !== t ? t : null !== this.masterPlaylist ? this.masterPlaylist.requestUrl.split("?")[0] : void 0;
                    }
                    getStreamSwarmId(t) {
                        const e = this.getMasterSwarmId();
                        if (null !== this.masterPlaylist)
                            for (let s = 0; s < this.masterPlaylist.manifest.playlists.length; ++s) {
                                if (new URL(this.masterPlaylist.manifest.playlists[s].uri, this.masterPlaylist.responseUrl).toString() === t) return { streamSwarmId: `${e}+V${s}`, found: !0, index: s };
                            }
                        return { streamSwarmId: void 0 !== e ? e : t.split("?")[0], found: !1, index: -1 };
                    }
                    async loadContent(t, e, s) {
                        return new Promise((i, n) => {
                            const a = new XMLHttpRequest();
                            a.open("GET", t, !0),
                                (a.responseType = e),
                                s && a.setRequestHeader("Range", s),
                                a.addEventListener("readystatechange", () => {
                                    4 === a.readyState && (a.status >= 200 && a.status < 300 ? i(a) : n(a.statusText));
                                });
                            const r = this.loader.getSettings().xhrSetup;
                            r && r(a, t), a.send();
                        });
                    }
                };
                class r {
                    constructor(t, e, s) {
                        (this.requestUrl = t), (this.responseUrl = e), (this.manifest = s), (this.streamSwarmId = "");
                    }
                    getSegmentIndex(t, e) {
                        for (let s = 0; s < this.manifest.segments.length; ++s) {
                            const i = this.manifest.segments[s];
                            if (t === this.getSegmentAbsoluteUrl(i.uri) && u(i.byterange, e)) return s;
                        }
                        return -1;
                    }
                    getSegmentAbsoluteUrl(t) {
                        return new URL(t, this.responseUrl).toString();
                    }
                }
                class o {
                    constructor(t, e, s, i, n, a) {
                        (this.segmentUrl = t), (this.segmentByterange = e), (this.segmentSequence = s), (this.playlistRequestUrl = i), (this.onSuccess = n), (this.onError = a);
                    }
                }
                function u(t, e) {
                    return void 0 === t ? void 0 === e : void 0 !== e && t.length === e.length && t.offset === e.offset;
                }
                function l(t) {
                    if (void 0 === t) return;
                    const e = t.offset + t.length - 1;
                    return `bytes=${t.offset}-${e}`;
                }
            },
            { "m3u8-parser": 7, "p2p-media-loader-core": "p2p-media-loader-core" },
        ],
        6: [
            function (t, e, s) {
                (function (t) {
                    var s;
                    (s = "undefined" != typeof window ? window : void 0 !== t ? t : "undefined" != typeof self ? self : {}), (e.exports = s);
                }.call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {}));
            },
            {},
        ],
        7: [
            function (t, e, s) {
                "use strict";
                Object.defineProperty(s, "__esModule", { value: !0 });
                var i,
                    n = (i = t("global/window")) && "object" == typeof i && "default" in i ? i.default : i;
                function a() {
                    return (a =
                        Object.assign ||
                        function (t) {
                            for (var e = 1; e < arguments.length; e++) {
                                var s = arguments[e];
                                for (var i in s) Object.prototype.hasOwnProperty.call(s, i) && (t[i] = s[i]);
                            }
                            return t;
                        }).apply(this, arguments);
                }
                function r(t, e) {
                    (t.prototype = Object.create(e.prototype)), (t.prototype.constructor = t), (t.__proto__ = e);
                }
                var o = (function () {
                        function t() {
                            this.listeners = {};
                        }
                        var e = t.prototype;
                        return (
                            (e.on = function (t, e) {
                                this.listeners[t] || (this.listeners[t] = []), this.listeners[t].push(e);
                            }),
                            (e.off = function (t, e) {
                                if (!this.listeners[t]) return !1;
                                var s = this.listeners[t].indexOf(e);
                                return this.listeners[t].splice(s, 1), s > -1;
                            }),
                            (e.trigger = function (t) {
                                var e,
                                    s,
                                    i,
                                    n = this.listeners[t];
                                if (n)
                                    if (2 === arguments.length) for (s = n.length, e = 0; e < s; ++e) n[e].call(this, arguments[1]);
                                    else for (i = Array.prototype.slice.call(arguments, 1), s = n.length, e = 0; e < s; ++e) n[e].apply(this, i);
                            }),
                            (e.dispose = function () {
                                this.listeners = {};
                            }),
                            (e.pipe = function (t) {
                                this.on("data", function (e) {
                                    t.push(e);
                                });
                            }),
                            t
                        );
                    })(),
                    u = (function (t) {
                        function e() {
                            var e;
                            return ((e = t.call(this) || this).buffer = ""), e;
                        }
                        return (
                            r(e, t),
                            (e.prototype.push = function (t) {
                                var e;
                                for (this.buffer += t, e = this.buffer.indexOf("\n"); e > -1; e = this.buffer.indexOf("\n")) this.trigger("data", this.buffer.substring(0, e)), (this.buffer = this.buffer.substring(e + 1));
                            }),
                            e
                        );
                    })(o),
                    l = function (t) {
                        for (var e, s = t.split(new RegExp('(?:^|,)((?:[^=]*)=(?:"[^"]*"|[^,]*))')), i = {}, n = s.length; n--; )
                            "" !== s[n] && (((e = /([^=]*)=(.*)/.exec(s[n]).slice(1))[0] = e[0].replace(/^\s+|\s+$/g, "")), (e[1] = e[1].replace(/^\s+|\s+$/g, "")), (e[1] = e[1].replace(/^['"](.*)['"]$/g, "$1")), (i[e[0]] = e[1]));
                        return i;
                    },
                    g = (function (t) {
                        function e() {
                            var e;
                            return ((e = t.call(this) || this).customParsers = []), (e.tagMappers = []), e;
                        }
                        r(e, t);
                        var s = e.prototype;
                        return (
                            (s.push = function (t) {
                                var e,
                                    s,
                                    i = this;
                                0 !== (t = t.trim()).length &&
                                    ("#" === t[0]
                                        ? this.tagMappers
                                              .reduce(
                                                  function (e, s) {
                                                      var i = s(t);
                                                      return i === t ? e : e.concat([i]);
                                                  },
                                                  [t]
                                              )
                                              .forEach(function (t) {
                                                  for (var n = 0; n < i.customParsers.length; n++) if (i.customParsers[n].call(i, t)) return;
                                                  if (0 === t.indexOf("#EXT"))
                                                      if (((t = t.replace("\r", "")), (e = /^#EXTM3U/.exec(t)))) i.trigger("data", { type: "tag", tagType: "m3u" });
                                                      else {
                                                          if ((e = /^#EXTINF:?([0-9\.]*)?,?(.*)?$/.exec(t)))
                                                              return (s = { type: "tag", tagType: "inf" }), e[1] && (s.duration = parseFloat(e[1])), e[2] && (s.title = e[2]), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-TARGETDURATION:?([0-9.]*)?/.exec(t))) return (s = { type: "tag", tagType: "targetduration" }), e[1] && (s.duration = parseInt(e[1], 10)), void i.trigger("data", s);
                                                          if ((e = /^#ZEN-TOTAL-DURATION:?([0-9.]*)?/.exec(t))) return (s = { type: "tag", tagType: "totalduration" }), e[1] && (s.duration = parseInt(e[1], 10)), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-VERSION:?([0-9.]*)?/.exec(t))) return (s = { type: "tag", tagType: "version" }), e[1] && (s.version = parseInt(e[1], 10)), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-MEDIA-SEQUENCE:?(\-?[0-9.]*)?/.exec(t)))
                                                              return (s = { type: "tag", tagType: "media-sequence" }), e[1] && (s.number = parseInt(e[1], 10)), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-DISCONTINUITY-SEQUENCE:?(\-?[0-9.]*)?/.exec(t)))
                                                              return (s = { type: "tag", tagType: "discontinuity-sequence" }), e[1] && (s.number = parseInt(e[1], 10)), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-PLAYLIST-TYPE:?(.*)?$/.exec(t))) return (s = { type: "tag", tagType: "playlist-type" }), e[1] && (s.playlistType = e[1]), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-BYTERANGE:?([0-9.]*)?@?([0-9.]*)?/.exec(t)))
                                                              return (s = { type: "tag", tagType: "byterange" }), e[1] && (s.length = parseInt(e[1], 10)), e[2] && (s.offset = parseInt(e[2], 10)), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-ALLOW-CACHE:?(YES|NO)?/.exec(t))) return (s = { type: "tag", tagType: "allow-cache" }), e[1] && (s.allowed = !/NO/.test(e[1])), void i.trigger("data", s);
                                                          if ((e = /^#EXT-X-MAP:?(.*)$/.exec(t))) {
                                                              if (((s = { type: "tag", tagType: "map" }), e[1])) {
                                                                  var a = l(e[1]);
                                                                  if ((a.URI && (s.uri = a.URI), a.BYTERANGE)) {
                                                                      var r = a.BYTERANGE.split("@"),
                                                                          o = r[0],
                                                                          u = r[1];
                                                                      (s.byterange = {}), o && (s.byterange.length = parseInt(o, 10)), u && (s.byterange.offset = parseInt(u, 10));
                                                                  }
                                                              }
                                                              i.trigger("data", s);
                                                          } else if ((e = /^#EXT-X-STREAM-INF:?(.*)$/.exec(t))) {
                                                              if (((s = { type: "tag", tagType: "stream-inf" }), e[1])) {
                                                                  if (((s.attributes = l(e[1])), s.attributes.RESOLUTION)) {
                                                                      var g = s.attributes.RESOLUTION.split("x"),
                                                                          d = {};
                                                                      g[0] && (d.width = parseInt(g[0], 10)), g[1] && (d.height = parseInt(g[1], 10)), (s.attributes.RESOLUTION = d);
                                                                  }
                                                                  s.attributes.BANDWIDTH && (s.attributes.BANDWIDTH = parseInt(s.attributes.BANDWIDTH, 10)),
                                                                      s.attributes["PROGRAM-ID"] && (s.attributes["PROGRAM-ID"] = parseInt(s.attributes["PROGRAM-ID"], 10));
                                                              }
                                                              i.trigger("data", s);
                                                          } else {
                                                              if ((e = /^#EXT-X-MEDIA:?(.*)$/.exec(t))) return (s = { type: "tag", tagType: "media" }), e[1] && (s.attributes = l(e[1])), void i.trigger("data", s);
                                                              if ((e = /^#EXT-X-ENDLIST/.exec(t))) i.trigger("data", { type: "tag", tagType: "endlist" });
                                                              else if ((e = /^#EXT-X-DISCONTINUITY/.exec(t))) i.trigger("data", { type: "tag", tagType: "discontinuity" });
                                                              else {
                                                                  if ((e = /^#EXT-X-PROGRAM-DATE-TIME:?(.*)$/.exec(t)))
                                                                      return (s = { type: "tag", tagType: "program-date-time" }), e[1] && ((s.dateTimeString = e[1]), (s.dateTimeObject = new Date(e[1]))), void i.trigger("data", s);
                                                                  if ((e = /^#EXT-X-KEY:?(.*)$/.exec(t)))
                                                                      return (
                                                                          (s = { type: "tag", tagType: "key" }),
                                                                          e[1] &&
                                                                              ((s.attributes = l(e[1])),
                                                                              s.attributes.IV &&
                                                                                  ("0x" === s.attributes.IV.substring(0, 2).toLowerCase() && (s.attributes.IV = s.attributes.IV.substring(2)),
                                                                                  (s.attributes.IV = s.attributes.IV.match(/.{8}/g)),
                                                                                  (s.attributes.IV[0] = parseInt(s.attributes.IV[0], 16)),
                                                                                  (s.attributes.IV[1] = parseInt(s.attributes.IV[1], 16)),
                                                                                  (s.attributes.IV[2] = parseInt(s.attributes.IV[2], 16)),
                                                                                  (s.attributes.IV[3] = parseInt(s.attributes.IV[3], 16)),
                                                                                  (s.attributes.IV = new Uint32Array(s.attributes.IV)))),
                                                                          void i.trigger("data", s)
                                                                      );
                                                                  if ((e = /^#EXT-X-START:?(.*)$/.exec(t)))
                                                                      return (
                                                                          (s = { type: "tag", tagType: "start" }),
                                                                          e[1] &&
                                                                              ((s.attributes = l(e[1])), (s.attributes["TIME-OFFSET"] = parseFloat(s.attributes["TIME-OFFSET"])), (s.attributes.PRECISE = /YES/.test(s.attributes.PRECISE))),
                                                                          void i.trigger("data", s)
                                                                      );
                                                                  if ((e = /^#EXT-X-CUE-OUT-CONT:?(.*)?$/.exec(t))) return (s = { type: "tag", tagType: "cue-out-cont" }), e[1] ? (s.data = e[1]) : (s.data = ""), void i.trigger("data", s);
                                                                  if ((e = /^#EXT-X-CUE-OUT:?(.*)?$/.exec(t))) return (s = { type: "tag", tagType: "cue-out" }), e[1] ? (s.data = e[1]) : (s.data = ""), void i.trigger("data", s);
                                                                  if ((e = /^#EXT-X-CUE-IN:?(.*)?$/.exec(t))) return (s = { type: "tag", tagType: "cue-in" }), e[1] ? (s.data = e[1]) : (s.data = ""), void i.trigger("data", s);
                                                                  i.trigger("data", { type: "tag", data: t.slice(4) });
                                                              }
                                                          }
                                                      }
                                                  else i.trigger("data", { type: "comment", text: t.slice(1) });
                                              })
                                        : this.trigger("data", { type: "uri", uri: t }));
                            }),
                            (s.addParser = function (t) {
                                var e = this,
                                    s = t.expression,
                                    i = t.customType,
                                    n = t.dataParser,
                                    a = t.segment;
                                "function" != typeof n &&
                                    (n = function (t) {
                                        return t;
                                    }),
                                    this.customParsers.push(function (t) {
                                        if (s.exec(t)) return e.trigger("data", { type: "custom", data: n(t), customType: i, segment: a }), !0;
                                    });
                            }),
                            (s.addTagMapper = function (t) {
                                var e = t.expression,
                                    s = t.map;
                                this.tagMappers.push(function (t) {
                                    return e.test(t) ? s(t) : t;
                                });
                            }),
                            e
                        );
                    })(o);
                function d(t) {
                    for (var e = n.atob(t || ""), s = new Uint8Array(e.length), i = 0; i < e.length; i++) s[i] = e.charCodeAt(i);
                    return s;
                }
                var c = (function (t) {
                    function e() {
                        var e;
                        ((e = t.call(this) || this).lineStream = new u()), (e.parseStream = new g()), e.lineStream.pipe(e.parseStream);
                        var s,
                            i,
                            n = (function (t) {
                                if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                                return t;
                            })(e),
                            r = [],
                            o = {},
                            l = function () {},
                            c = { AUDIO: {}, VIDEO: {}, "CLOSED-CAPTIONS": {}, SUBTITLES: {} },
                            m = 0;
                        return (
                            (e.manifest = { allowCache: !0, discontinuityStarts: [], segments: [] }),
                            e.parseStream.on("data", function (t) {
                                var e, u;
                                ({
                                    tag: function () {
                                        ((
                                            {
                                                "allow-cache": function () {
                                                    (this.manifest.allowCache = t.allowed), "allowed" in t || (this.trigger("info", { message: "defaulting allowCache to YES" }), (this.manifest.allowCache = !0));
                                                },
                                                byterange: function () {
                                                    var e = {};
                                                    "length" in t && ((o.byterange = e), (e.length = t.length), "offset" in t || (this.trigger("info", { message: "defaulting offset to zero" }), (t.offset = 0))),
                                                        "offset" in t && ((o.byterange = e), (e.offset = t.offset));
                                                },
                                                endlist: function () {
                                                    this.manifest.endList = !0;
                                                },
                                                inf: function () {
                                                    "mediaSequence" in this.manifest || ((this.manifest.mediaSequence = 0), this.trigger("info", { message: "defaulting media sequence to zero" })),
                                                        "discontinuitySequence" in this.manifest || ((this.manifest.discontinuitySequence = 0), this.trigger("info", { message: "defaulting discontinuity sequence to zero" })),
                                                        t.duration > 0 && (o.duration = t.duration),
                                                        0 === t.duration && ((o.duration = 0.01), this.trigger("info", { message: "updating zero segment duration to a small value" })),
                                                        (this.manifest.segments = r);
                                                },
                                                key: function () {
                                                    if (t.attributes)
                                                        if ("NONE" !== t.attributes.METHOD)
                                                            if (t.attributes.URI) {
                                                                if ("urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed" === t.attributes.KEYFORMAT) {
                                                                    return -1 === ["SAMPLE-AES", "SAMPLE-AES-CTR", "SAMPLE-AES-CENC"].indexOf(t.attributes.METHOD)
                                                                        ? void this.trigger("warn", { message: "invalid key method provided for Widevine" })
                                                                        : ("SAMPLE-AES-CENC" === t.attributes.METHOD && this.trigger("warn", { message: "SAMPLE-AES-CENC is deprecated, please use SAMPLE-AES-CTR instead" }),
                                                                          "data:text/plain;base64," !== t.attributes.URI.substring(0, 23)
                                                                              ? void this.trigger("warn", { message: "invalid key URI provided for Widevine" })
                                                                              : t.attributes.KEYID && "0x" === t.attributes.KEYID.substring(0, 2)
                                                                              ? void (this.manifest.contentProtection = {
                                                                                    "com.widevine.alpha": {
                                                                                        attributes: { schemeIdUri: t.attributes.KEYFORMAT, keyId: t.attributes.KEYID.substring(2) },
                                                                                        pssh: d(t.attributes.URI.split(",")[1]),
                                                                                    },
                                                                                })
                                                                              : void this.trigger("warn", { message: "invalid key ID provided for Widevine" }));
                                                                }
                                                                t.attributes.METHOD || this.trigger("warn", { message: "defaulting key method to AES-128" }),
                                                                    (i = { method: t.attributes.METHOD || "AES-128", uri: t.attributes.URI }),
                                                                    void 0 !== t.attributes.IV && (i.iv = t.attributes.IV);
                                                            } else this.trigger("warn", { message: "ignoring key declaration without URI" });
                                                        else i = null;
                                                    else this.trigger("warn", { message: "ignoring key declaration without attribute list" });
                                                },
                                                "media-sequence": function () {
                                                    isFinite(t.number) ? (this.manifest.mediaSequence = t.number) : this.trigger("warn", { message: "ignoring invalid media sequence: " + t.number });
                                                },
                                                "discontinuity-sequence": function () {
                                                    isFinite(t.number) ? ((this.manifest.discontinuitySequence = t.number), (m = t.number)) : this.trigger("warn", { message: "ignoring invalid discontinuity sequence: " + t.number });
                                                },
                                                "playlist-type": function () {
                                                    /VOD|EVENT/.test(t.playlistType) ? (this.manifest.playlistType = t.playlistType) : this.trigger("warn", { message: "ignoring unknown playlist type: " + t.playlist });
                                                },
                                                map: function () {
                                                    (s = {}), t.uri && (s.uri = t.uri), t.byterange && (s.byterange = t.byterange);
                                                },
                                                "stream-inf": function () {
                                                    (this.manifest.playlists = r),
                                                        (this.manifest.mediaGroups = this.manifest.mediaGroups || c),
                                                        t.attributes ? (o.attributes || (o.attributes = {}), a(o.attributes, t.attributes)) : this.trigger("warn", { message: "ignoring empty stream-inf attributes" });
                                                },
                                                media: function () {
                                                    if (((this.manifest.mediaGroups = this.manifest.mediaGroups || c), t.attributes && t.attributes.TYPE && t.attributes["GROUP-ID"] && t.attributes.NAME)) {
                                                        var s = this.manifest.mediaGroups[t.attributes.TYPE];
                                                        (s[t.attributes["GROUP-ID"]] = s[t.attributes["GROUP-ID"]] || {}),
                                                            (e = s[t.attributes["GROUP-ID"]]),
                                                            (u = { default: /yes/i.test(t.attributes.DEFAULT) }).default ? (u.autoselect = !0) : (u.autoselect = /yes/i.test(t.attributes.AUTOSELECT)),
                                                            t.attributes.LANGUAGE && (u.language = t.attributes.LANGUAGE),
                                                            t.attributes.URI && (u.uri = t.attributes.URI),
                                                            t.attributes["INSTREAM-ID"] && (u.instreamId = t.attributes["INSTREAM-ID"]),
                                                            t.attributes.CHARACTERISTICS && (u.characteristics = t.attributes.CHARACTERISTICS),
                                                            t.attributes.FORCED && (u.forced = /yes/i.test(t.attributes.FORCED)),
                                                            (e[t.attributes.NAME] = u);
                                                    } else this.trigger("warn", { message: "ignoring incomplete or missing media group" });
                                                },
                                                discontinuity: function () {
                                                    (m += 1), (o.discontinuity = !0), this.manifest.discontinuityStarts.push(r.length);
                                                },
                                                "program-date-time": function () {
                                                    void 0 === this.manifest.dateTimeString && ((this.manifest.dateTimeString = t.dateTimeString), (this.manifest.dateTimeObject = t.dateTimeObject)),
                                                        (o.dateTimeString = t.dateTimeString),
                                                        (o.dateTimeObject = t.dateTimeObject);
                                                },
                                                targetduration: function () {
                                                    !isFinite(t.duration) || t.duration < 0 ? this.trigger("warn", { message: "ignoring invalid target duration: " + t.duration }) : (this.manifest.targetDuration = t.duration);
                                                },
                                                totalduration: function () {
                                                    !isFinite(t.duration) || t.duration < 0 ? this.trigger("warn", { message: "ignoring invalid total duration: " + t.duration }) : (this.manifest.totalDuration = t.duration);
                                                },
                                                start: function () {
                                                    t.attributes && !isNaN(t.attributes["TIME-OFFSET"])
                                                        ? (this.manifest.start = { timeOffset: t.attributes["TIME-OFFSET"], precise: t.attributes.PRECISE })
                                                        : this.trigger("warn", { message: "ignoring start declaration without appropriate attribute list" });
                                                },
                                                "cue-out": function () {
                                                    o.cueOut = t.data;
                                                },
                                                "cue-out-cont": function () {
                                                    o.cueOutCont = t.data;
                                                },
                                                "cue-in": function () {
                                                    o.cueIn = t.data;
                                                },
                                            }[t.tagType] || l
                                        ).call(n));
                                    },
                                    uri: function () {
                                        (o.uri = t.uri),
                                            r.push(o),
                                            !this.manifest.targetDuration || "duration" in o || (this.trigger("warn", { message: "defaulting segment duration to the target duration" }), (o.duration = this.manifest.targetDuration)),
                                            i && (o.key = i),
                                            (o.timeline = m),
                                            s && (o.map = s),
                                            (o = {});
                                    },
                                    comment: function () {},
                                    custom: function () {
                                        t.segment ? ((o.custom = o.custom || {}), (o.custom[t.customType] = t.data)) : ((this.manifest.custom = this.manifest.custom || {}), (this.manifest.custom[t.customType] = t.data));
                                    },
                                }[t.type].call(n));
                            }),
                            e
                        );
                    }
                    r(e, t);
                    var s = e.prototype;
                    return (
                        (s.push = function (t) {
                            this.lineStream.push(t);
                        }),
                        (s.end = function () {
                            this.lineStream.push("\n");
                        }),
                        (s.addParser = function (t) {
                            this.parseStream.addParser(t);
                        }),
                        (s.addTagMapper = function (t) {
                            this.parseStream.addTagMapper(t);
                        }),
                        e
                    );
                })(o);
                (s.LineStream = u), (s.ParseStream = g), (s.Parser = c);
            },
            { "global/window": 6 },
        ],
        "p2p-media-loader-hlsjs": [
            function (t, e, s) {
                "use strict";
                function i(t) {
                    for (var e in t) s.hasOwnProperty(e) || (s[e] = t[e]);
                }
                function n(t) {
                    t && t.config && t.config.loader && "function" == typeof t.config.loader.getEngine && a(t, t.config.loader.getEngine());
                }
                function a(t, e) {
                    t.on("hlsFragChanged", (t, s) => {
                        const i = s.frag,
                            n = 2 !== i.byteRange.length ? void 0 : { offset: i.byteRange[0], length: i.byteRange[1] - i.byteRange[0] };
                        e.setPlayingSegment(i.url, n, i.start, i.duration);
                    }),
                        t.on("hlsDestroying", async () => {
                            await e.destroy();
                        }),
                        t.on("hlsError", (s, i) => {
                            if ("bufferStalledError" === i.details) {
                                const s = void 0 === t.media ? t.el_ : t.media;
                                if (void 0 === s) return;
                                e.setPlayingSegmentByCurrentTime(s.currentTime);
                            }
                        });
                }
                Object.defineProperty(s, "__esModule", { value: !0 }),
                    (s.version = "0.6.2"),
                    i(t("./engine")),
                    i(t("./segment-manager")),
                    (s.initHlsJsPlayer = n),
                    (s.initClapprPlayer = function (t) {
                        t.on("play", () => {
                            const e = t.core.getCurrentPlayback();
                            e._hls && !e._hls._p2pm_linitialized && ((e._hls._p2pm_linitialized = !0), n(t.core.getCurrentPlayback()._hls));
                        });
                    }),
                    (s.initFlowplayerHlsJsPlayer = function (t) {
                        t.on("ready", () => n(t.engine.hlsjs ? t.engine.hlsjs : t.engine.hls));
                    }),
                    (s.initVideoJsContribHlsJsPlayer = function (t) {
                        t.ready(() => {
                            const e = t.tech_.options_;
                            e && e.hlsjsConfig && e.hlsjsConfig.loader && "function" == typeof e.hlsjsConfig.loader.getEngine && a(t.tech_, e.hlsjsConfig.loader.getEngine());
                        });
                    }),
                    (s.initVideoJsHlsJsPlugin = function () {
                        null != videojs &&
                            null != videojs.Html5Hlsjs &&
                            videojs.Html5Hlsjs.addHook("beforeinitialize", (t, e) => {
                                e.config && e.config.loader && "function" == typeof e.config.loader.getEngine && a(e, e.config.loader.getEngine());
                            });
                    }),
                    (s.initMediaElementJsPlayer = function (t) {
                        t.addEventListener("hlsFragChanged", (e) => {
                            const s = t.hlsPlayer;
                            if (s && s.config && s.config.loader && "function" == typeof s.config.loader.getEngine) {
                                const t = s.config.loader.getEngine();
                                if (e.data && e.data.length > 1) {
                                    const s = e.data[1].frag,
                                        i = 2 !== s.byteRange.length ? void 0 : { offset: s.byteRange[0], length: s.byteRange[1] - s.byteRange[0] };
                                    t.setPlayingSegment(s.url, i, s.start, s.duration);
                                }
                            }
                        }),
                            t.addEventListener("hlsDestroying", async () => {
                                const e = t.hlsPlayer;
                                if (e && e.config && e.config.loader && "function" == typeof e.config.loader.getEngine) {
                                    const t = e.config.loader.getEngine();
                                    await t.destroy();
                                }
                            }),
                            t.addEventListener("hlsError", (e) => {
                                const s = t.hlsPlayer;
                                if (s && s.config && s.config.loader && "function" == typeof s.config.loader.getEngine && void 0 !== e.data && "bufferStalledError" === e.data.details) {
                                    s.config.loader.getEngine().setPlayingSegmentByCurrentTime(s.media.currentTime);
                                }
                            });
                    }),
                    (s.initJwPlayer = function (t, e) {
                        const s = setInterval(() => {
                            t.hls && t.hls.config && (clearInterval(s), Object.assign(t.hls.config, e), n(t.hls));
                        }, 200);
                    });
            },
            { "./engine": 2, "./segment-manager": 5 },
        ],
    },
    {},
    [1]
);
