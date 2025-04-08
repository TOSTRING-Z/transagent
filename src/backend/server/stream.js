"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamResponse = streamResponse;
exports.streamSse = streamSse;
exports.streamJSON = streamJSON;
function toAsyncIterable(nodeReadable) {
    return __asyncGenerator(this, arguments, function toAsyncIterable_1() {
        var _a, nodeReadable_1, nodeReadable_1_1, chunk, e_1_1;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 7, 8, 13]);
                    _a = true, nodeReadable_1 = __asyncValues(nodeReadable);
                    _e.label = 1;
                case 1: return [4 /*yield*/, __await(nodeReadable_1.next())];
                case 2:
                    if (!(nodeReadable_1_1 = _e.sent(), _b = nodeReadable_1_1.done, !_b)) return [3 /*break*/, 6];
                    _d = nodeReadable_1_1.value;
                    _a = false;
                    chunk = _d;
                    return [4 /*yield*/, __await(chunk)];
                case 3: 
                // @ts-ignore
                return [4 /*yield*/, _e.sent()];
                case 4:
                    // @ts-ignore
                    _e.sent();
                    _e.label = 5;
                case 5:
                    _a = true;
                    return [3 /*break*/, 1];
                case 6: return [3 /*break*/, 13];
                case 7:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 13];
                case 8:
                    _e.trys.push([8, , 11, 12]);
                    if (!(!_a && !_b && (_c = nodeReadable_1.return))) return [3 /*break*/, 10];
                    return [4 /*yield*/, __await(_c.call(nodeReadable_1))];
                case 9:
                    _e.sent();
                    _e.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 12: return [7 /*endfinally*/];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function streamResponse(response) {
    return __asyncGenerator(this, arguments, function streamResponse_1() {
        var _a, nodeMajorVersion, stream, _b, _c, _d, chunk, e_2_1, decoder, nodeStream, _e, _f, _g, chunk, e_3_1;
        var _h, e_2, _j, _k, _l, e_3, _m, _o;
        return __generator(this, function (_p) {
            switch (_p.label) {
                case 0:
                    if (!(response.status !== 200)) return [3 /*break*/, 2];
                    _a = Error.bind;
                    return [4 /*yield*/, __await(response.text())];
                case 1: throw new (_a.apply(Error, [void 0, _p.sent()]))();
                case 2:
                    if (!response.body) {
                        throw new Error("No response body returned.");
                    }
                    nodeMajorVersion = parseInt(process.versions.node.split(".")[0], 10);
                    if (!(nodeMajorVersion >= 20)) return [3 /*break*/, 17];
                    stream = ReadableStream.from(response.body);
                    _p.label = 3;
                case 3:
                    _p.trys.push([3, 10, 11, 16]);
                    _b = true, _c = __asyncValues(stream.pipeThrough(new TextDecoderStream("utf-8")));
                    _p.label = 4;
                case 4: return [4 /*yield*/, __await(_c.next())];
                case 5:
                    if (!(_d = _p.sent(), _h = _d.done, !_h)) return [3 /*break*/, 9];
                    _k = _d.value;
                    _b = false;
                    chunk = _k;
                    return [4 /*yield*/, __await(chunk)];
                case 6: return [4 /*yield*/, _p.sent()];
                case 7:
                    _p.sent();
                    _p.label = 8;
                case 8:
                    _b = true;
                    return [3 /*break*/, 4];
                case 9: return [3 /*break*/, 16];
                case 10:
                    e_2_1 = _p.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 16];
                case 11:
                    _p.trys.push([11, , 14, 15]);
                    if (!(!_b && !_h && (_j = _c.return))) return [3 /*break*/, 13];
                    return [4 /*yield*/, __await(_j.call(_c))];
                case 12:
                    _p.sent();
                    _p.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    if (e_2) throw e_2.error;
                    return [7 /*endfinally*/];
                case 15: return [7 /*endfinally*/];
                case 16: return [3 /*break*/, 31];
                case 17:
                    decoder = new TextDecoder("utf-8");
                    nodeStream = response.body;
                    _p.label = 18;
                case 18:
                    _p.trys.push([18, 25, 26, 31]);
                    _e = true, _f = __asyncValues(toAsyncIterable(nodeStream));
                    _p.label = 19;
                case 19: return [4 /*yield*/, __await(_f.next())];
                case 20:
                    if (!(_g = _p.sent(), _l = _g.done, !_l)) return [3 /*break*/, 24];
                    _o = _g.value;
                    _e = false;
                    chunk = _o;
                    return [4 /*yield*/, __await(decoder.decode(chunk, { stream: true }))];
                case 21: return [4 /*yield*/, _p.sent()];
                case 22:
                    _p.sent();
                    _p.label = 23;
                case 23:
                    _e = true;
                    return [3 /*break*/, 19];
                case 24: return [3 /*break*/, 31];
                case 25:
                    e_3_1 = _p.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 31];
                case 26:
                    _p.trys.push([26, , 29, 30]);
                    if (!(!_e && !_l && (_m = _f.return))) return [3 /*break*/, 28];
                    return [4 /*yield*/, __await(_m.call(_f))];
                case 27:
                    _p.sent();
                    _p.label = 28;
                case 28: return [3 /*break*/, 30];
                case 29:
                    if (e_3) throw e_3.error;
                    return [7 /*endfinally*/];
                case 30: return [7 /*endfinally*/];
                case 31: return [2 /*return*/];
            }
        });
    });
}
function parseDataLine(line) {
    var json = line.startsWith("data: ")
        ? line.slice("data: ".length)
        : line.slice("data:".length);
    try {
        var data = JSON.parse(json);
        if (data.error) {
            throw new Error("Error streaming response: ".concat(data.error));
        }
        return data;
    }
    catch (e) {
        throw new Error("Malformed JSON sent from server: ".concat(json));
    }
}
function parseSseLine(line) {
    if (line.startsWith("data: [DONE]")) {
        return { done: true, data: undefined };
    }
    if (line.startsWith("data:")) {
        return { done: false, data: parseDataLine(line) };
    }
    if (line.startsWith(": ping")) {
        return { done: true, data: undefined };
    }
    return { done: false, data: undefined };
}
function streamSse(response) {
    return __asyncGenerator(this, arguments, function streamSse_1() {
        var buffer, _a, _b, _c, value, position, line, _d, done, data, e_4_1, _e, done, data;
        var _f, e_4, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    buffer = "";
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 10, 11, 16]);
                    _a = true, _b = __asyncValues(streamResponse(response));
                    _j.label = 2;
                case 2: return [4 /*yield*/, __await(_b.next())];
                case 3:
                    if (!(_c = _j.sent(), _f = _c.done, !_f)) return [3 /*break*/, 9];
                    _h = _c.value;
                    _a = false;
                    value = _h;
                    buffer += value;
                    position = void 0;
                    _j.label = 4;
                case 4:
                    if (!((position = buffer.indexOf("\n")) >= 0)) return [3 /*break*/, 8];
                    line = buffer.slice(0, position);
                    buffer = buffer.slice(position + 1);
                    _d = parseSseLine(line), done = _d.done, data = _d.data;
                    if (done) {
                        return [3 /*break*/, 8];
                    }
                    if (!data) return [3 /*break*/, 7];
                    return [4 /*yield*/, __await(data)];
                case 5: return [4 /*yield*/, _j.sent()];
                case 6:
                    _j.sent();
                    _j.label = 7;
                case 7: return [3 /*break*/, 4];
                case 8:
                    _a = true;
                    return [3 /*break*/, 2];
                case 9: return [3 /*break*/, 16];
                case 10:
                    e_4_1 = _j.sent();
                    e_4 = { error: e_4_1 };
                    return [3 /*break*/, 16];
                case 11:
                    _j.trys.push([11, , 14, 15]);
                    if (!(!_a && !_f && (_g = _b.return))) return [3 /*break*/, 13];
                    return [4 /*yield*/, __await(_g.call(_b))];
                case 12:
                    _j.sent();
                    _j.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    if (e_4) throw e_4.error;
                    return [7 /*endfinally*/];
                case 15: return [7 /*endfinally*/];
                case 16:
                    if (!(buffer.length > 0)) return [3 /*break*/, 19];
                    _e = parseSseLine(buffer), done = _e.done, data = _e.data;
                    if (!(!done && data)) return [3 /*break*/, 19];
                    return [4 /*yield*/, __await(data)];
                case 17: return [4 /*yield*/, _j.sent()];
                case 18:
                    _j.sent();
                    _j.label = 19;
                case 19: return [2 /*return*/];
            }
        });
    });
}
function streamJSON(response) {
    return __asyncGenerator(this, arguments, function streamJSON_1() {
        var buffer, _a, _b, _c, value, position, line, data, e_5_1;
        var _d, e_5, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    buffer = "";
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 9, 10, 15]);
                    _a = true, _b = __asyncValues(streamResponse(response));
                    _g.label = 2;
                case 2: return [4 /*yield*/, __await(_b.next())];
                case 3:
                    if (!(_c = _g.sent(), _d = _c.done, !_d)) return [3 /*break*/, 8];
                    _f = _c.value;
                    _a = false;
                    value = _f;
                    buffer += value;
                    position = void 0;
                    _g.label = 4;
                case 4:
                    if (!((position = buffer.indexOf("\n")) >= 0)) return [3 /*break*/, 7];
                    line = buffer.slice(0, position);
                    data = JSON.parse(line);
                    return [4 /*yield*/, __await(data)];
                case 5: return [4 /*yield*/, _g.sent()];
                case 6:
                    _g.sent();
                    buffer = buffer.slice(position + 1);
                    return [3 /*break*/, 4];
                case 7:
                    _a = true;
                    return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 15];
                case 9:
                    e_5_1 = _g.sent();
                    e_5 = { error: e_5_1 };
                    return [3 /*break*/, 15];
                case 10:
                    _g.trys.push([10, , 13, 14]);
                    if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 12];
                    return [4 /*yield*/, __await(_e.call(_b))];
                case 11:
                    _g.sent();
                    _g.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    if (e_5) throw e_5.error;
                    return [7 /*endfinally*/];
                case 14: return [7 /*endfinally*/];
                case 15: return [2 /*return*/];
            }
        });
    });
}
