/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/common/webviewEvents.ts":
/*!*************************************!*\
  !*** ./src/common/webviewEvents.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, exports) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encodeMessageForChannel = exports.parseMessageFromChannel = exports.webSocketEventNames = exports.FrameToolsEventNames = exports.webviewEventNames = void 0;
exports.webviewEventNames = [
    'getState',
    'getUrl',
    'openInEditor',
    'cssMirrorContent',
    'ready',
    'setState',
    'telemetry',
    'websocket',
    'getVscodeSettings',
    'copyText',
    'focusEditor',
    'focusEditorGroup',
    'openUrl',
    'toggleScreencast',
    'toggleInspect',
    'replayConsoleMessages',
    'devtoolsConnection',
    'toggleCSSMirrorContent',
    'writeToClipboard',
    'readClipboard',
];
exports.FrameToolsEventNames = [
    'sendMessageToBackend',
    'openInNewTab',
    'openInEditor',
    'cssMirrorContent',
    'recordEnumeratedHistogram',
    'recordPerformanceHistogram',
    'reportError',
    'toggleScreencast',
    'replayConsoleMessages',
    'toggleCSSMirrorContent',
];
exports.webSocketEventNames = [
    'open',
    'close',
    'error',
    'message',
];
/**
 * Parse out the WebviewEvents type from a message and call the appropriate emit event
 *
 * @param message The message to parse
 * @param emit The emit callback to invoke with the event and args
 */
function parseMessageFromChannel(message, emit) {
    for (const e of exports.webviewEventNames) {
        if (message.substr(0, e.length) === e && message[e.length] === ':') {
            emit(e, message.substr(e.length + 1));
            return true;
        }
    }
    return false;
}
exports.parseMessageFromChannel = parseMessageFromChannel;
/**
 * Encode an event and arguments into a string and then post that message across via the
 * supplied object containing the postMessage function.
 * The message can be parsed on the other side using parseMessageFromChannel
 *
 * @param postMessageObject The object which contains the postMessage function
 * @param eventType The type of the message to post
 * @param args The argument object to encode and post
 * @param origin The origin (if any) to use with the postMessage call
 */
function encodeMessageForChannel(postMessageCallback, eventType, args) {
    const message = `${eventType}:${JSON.stringify(args)}`;
    postMessageCallback(message);
}
exports.encodeMessageForChannel = encodeMessageForChannel;


/***/ }),

/***/ "./src/screencast/cdp.ts":
/*!*******************************!*\
  !*** ./src/screencast/cdp.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScreencastCDPConnection = exports.vscode = void 0;
const webviewEvents_1 = __webpack_require__(/*! ../common/webviewEvents */ "./src/common/webviewEvents.ts");
exports.vscode = acquireVsCodeApi();
class ScreencastCDPConnection {
    constructor() {
        this.nextId = 0;
        this.eventCallbackMap = new Map();
        this.methodCallbackMap = new Map();
        this.clipboardRequests = new Set();
        // Handle CDP messages/events routed from the extension through post message
        window.addEventListener('message', e => {
            (0, webviewEvents_1.parseMessageFromChannel)(e.data, (eventName, args) => {
                if (eventName === 'websocket') {
                    const { message } = JSON.parse(args);
                    if (message) {
                        // Handle event responses
                        const messageObj = JSON.parse(message);
                        for (const callback of this.eventCallbackMap.get(messageObj.method) || []) {
                            callback(messageObj.params);
                        }
                        // Handle method responses
                        const methodCallback = this.methodCallbackMap.get(messageObj.id);
                        if (methodCallback) {
                            methodCallback(messageObj.result);
                            this.methodCallbackMap.delete(messageObj.id);
                        }
                        if (this.clipboardRequests.has(messageObj.id) && this.saveToClipboard) {
                            this.saveToClipboard(messageObj.result.result.value);
                            this.clipboardRequests.delete(messageObj.id);
                        }
                    }
                    return true;
                }
                if (eventName === 'toggleInspect') {
                    const { enabled } = JSON.parse(args);
                    for (const callback of this.eventCallbackMap.get('DevTools.toggleInspect') || []) {
                        callback(enabled);
                    }
                }
                if (eventName === 'readClipboard') {
                    const { clipboardText } = JSON.parse(args);
                    for (const callback of this.eventCallbackMap.get('readClipboard') || []) {
                        callback(clipboardText);
                    }
                }
                return false;
            });
        });
    }
    sendMessageToBackend(method, params, callback, isCutOrCopy) {
        const id = this.nextId++;
        const cdpMessage = {
            id: id,
            method,
            params,
        };
        if (callback) {
            this.methodCallbackMap.set(id, callback);
        }
        if (isCutOrCopy) {
            this.clipboardRequests.add(id);
        }
        (0, webviewEvents_1.encodeMessageForChannel)(msg => exports.vscode.postMessage(msg, '*'), 'websocket', { message: JSON.stringify(cdpMessage) });
    }
    registerForEvent(method, callback) {
        var _a;
        if (this.eventCallbackMap.has(method)) {
            (_a = this.eventCallbackMap.get(method)) === null || _a === void 0 ? void 0 : _a.push(callback);
        }
        this.eventCallbackMap.set(method, [callback]);
    }
    registerWriteToClipboardFunction(saveToClipboard) {
        this.saveToClipboard = saveToClipboard;
    }
    registerReadClipboardAndPasteFunction(readClipboardAndPaste) {
        this.readClipboardAndPaste = readClipboardAndPaste;
    }
    readClipboardAndPasteRequest() {
        this.readClipboardAndPaste && this.readClipboardAndPaste();
    }
}
exports.ScreencastCDPConnection = ScreencastCDPConnection;


/***/ }),

/***/ "./src/screencast/dimensionComponent.ts":
/*!**********************************************!*\
  !*** ./src/screencast/dimensionComponent.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DimensionComponent_instances, _DimensionComponent_onKeyDown, _DimensionComponent_onBlur, _DimensionComponent_onResize, _DimensionComponent_onRotate, _DimensionComponent_setDimensionState;
Object.defineProperty(exports, "__esModule", ({ value: true }));
const lit_html_1 = __webpack_require__(/*! lit-html */ "./node_modules/lit-html/development/lit-html.js");
const ref_js_1 = __webpack_require__(/*! lit-html/directives/ref.js */ "./node_modules/lit-html/development/directives/ref.js");
let component;
class DimensionComponent {
    constructor(props, container) {
        _DimensionComponent_instances.add(this);
        this.textInputWidth = (0, ref_js_1.createRef)();
        this.textInputHeight = (0, ref_js_1.createRef)();
        this.updateOnResize = true;
        this.disableUserDimensionInputs = false;
        // sampling the canvas element doesn't consistently fire `resize` event
        this.screenCastView = document.getElementById('main');
        _DimensionComponent_onKeyDown.set(this, (e) => {
            if (e.code !== 'Enter') {
                return;
            }
            __classPrivateFieldGet(this, _DimensionComponent_onBlur, "f").call(this, e);
        });
        _DimensionComponent_onBlur.set(this, (e) => {
            if (!e.target) {
                return;
            }
            const oldWidth = this.width;
            const oldHeight = this.height;
            if (e.target === this.textInputWidth.value) {
                this.width = parseInt(this.textInputWidth.value.value);
            }
            else if (e.target === this.textInputHeight.value) {
                this.height = parseInt(this.textInputHeight.value.value);
            }
            if (this.width === oldWidth && this.height === oldHeight) {
                return;
            }
            this.update();
            this.onUpdateDimensions(this.width, this.height);
        });
        _DimensionComponent_onResize.set(this, () => {
            if (!this.screenCastView || !this.updateOnResize) {
                return;
            }
            this.width = this.screenCastView.offsetWidth;
            this.height = this.screenCastView.offsetHeight - this.heightOffset;
            this.update();
            this.onUpdateDimensions(this.width, this.height);
        });
        _DimensionComponent_onRotate.set(this, () => {
            const temp = this.width;
            this.width = this.height;
            this.height = temp;
            this.update();
            this.onUpdateDimensions(this.width, this.height);
        });
        this.heightOffset = props.heightOffset || 0;
        this.width = props.width;
        this.height = props.height - this.heightOffset;
        this.onUpdateDimensions = props.onUpdateDimensions;
        this.container = container;
        window.addEventListener('resize', __classPrivateFieldGet(this, _DimensionComponent_onResize, "f"));
        this.update();
        this.onUpdateDimensions(this.width, this.height);
    }
    template() {
        return (0, lit_html_1.html) `
            <input
                ${(0, ref_js_1.ref)(this.textInputWidth)}
                type="number"
                title="Width"
                @blur=${__classPrivateFieldGet(this, _DimensionComponent_onBlur, "f")}
                @keydown=${__classPrivateFieldGet(this, _DimensionComponent_onKeyDown, "f")}
                .disabled=${this.disableUserDimensionInputs}
                .value=${this.width.toString()} /> 
            <i class="codicon codicon-close"></i>
            <input
                ${(0, ref_js_1.ref)(this.textInputHeight)}
                type="number"
                title="Height"
                @blur=${__classPrivateFieldGet(this, _DimensionComponent_onBlur, "f")}
                @keydown=${__classPrivateFieldGet(this, _DimensionComponent_onKeyDown, "f")}
                .disabled=${this.disableUserDimensionInputs}
                .value=${this.height.toString()} /> 
            <button title="Rotate" @click=${__classPrivateFieldGet(this, _DimensionComponent_onRotate, "f")}>
                <i class="codicon codicon-arrow-swap"></i>
            </button>
        `;
    }
    update() {
        if (!this.container) {
            return;
        }
        (0, lit_html_1.render)(this.template(), this.container);
    }
    static render(props, elementId) {
        const dimensionContainer = document.getElementById(elementId);
        if (dimensionContainer) {
            component = new DimensionComponent(props, dimensionContainer);
        }
    }
    static setDimensionState(width, height, updateOnResize, disableInputs) {
        __classPrivateFieldGet(component, _DimensionComponent_instances, "m", _DimensionComponent_setDimensionState).call(component, width, height, updateOnResize, disableInputs);
    }
}
exports["default"] = DimensionComponent;
_DimensionComponent_onKeyDown = new WeakMap(), _DimensionComponent_onBlur = new WeakMap(), _DimensionComponent_onResize = new WeakMap(), _DimensionComponent_onRotate = new WeakMap(), _DimensionComponent_instances = new WeakSet(), _DimensionComponent_setDimensionState = function _DimensionComponent_setDimensionState(width, height, updateOnResize, disableInputs) {
    this.width = width;
    this.height = height;
    this.updateOnResize = updateOnResize;
    this.disableUserDimensionInputs = disableInputs;
    this.update();
};


/***/ }),

/***/ "./src/screencast/emulatedDeviceHelpers.ts":
/*!*************************************************!*\
  !*** ./src/screencast/emulatedDeviceHelpers.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getEmulatedDeviceDetails = exports.groupEmulatedDevicesByType = void 0;
const emulatedDevices_1 = __webpack_require__(/*! ./emulatedDevices */ "./src/screencast/emulatedDevices.ts");
function groupEmulatedDevicesByType() {
    const groupedDevices = new Map();
    for (const device of emulatedDevices_1.emulatedDevices) {
        const deviceEntry = {
            name: device.title,
            value: device.title
        };
        const groupedDeviceList = groupedDevices.get(device.type);
        if (!groupedDeviceList) {
            groupedDevices.set(device.type, [deviceEntry]);
            continue;
        }
        let shouldAdd = true;
        for (const entry of groupedDeviceList) {
            if (entry.name === device.title) {
                shouldAdd = false;
                break;
            }
        }
        if (!shouldAdd) {
            continue;
        }
        groupedDeviceList === null || groupedDeviceList === void 0 ? void 0 : groupedDeviceList.push(deviceEntry);
    }
    return groupedDevices;
}
exports.groupEmulatedDevicesByType = groupEmulatedDevicesByType;
function getEmulatedDeviceDetails(deviceName) {
    return emulatedDevices_1.emulatedDevices.find((device) => {
        return device.title === deviceName;
    });
}
exports.getEmulatedDeviceDetails = getEmulatedDeviceDetails;


/***/ }),

/***/ "./src/screencast/emulatedDevices.ts":
/*!*******************************************!*\
  !*** ./src/screencast/emulatedDevices.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.emulatedDevices = void 0;
// Taken from
// devtools-frontend/src/front_end/models/emulation/EmulatedDevices.ts
exports.emulatedDevices = [
    {
        'order': 10,
        'show-by-default': true,
        'title': 'iPhone SE',
        'screen': {
            'horizontal': {
                'width': 667,
                'height': 375,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 375,
                'height': 667,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        'type': 'phone',
    },
    {
        'order': 12,
        'show-by-default': true,
        'title': 'iPhone XR',
        'screen': {
            'horizontal': {
                'width': 896,
                'height': 414,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 414,
                'height': 896,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        'type': 'phone',
    },
    {
        'order': 14,
        'show-by-default': true,
        'title': 'iPhone 12 Pro',
        'screen': {
            'horizontal': {
                'width': 844,
                'height': 390,
            },
            'device-pixel-ratio': 3,
            'vertical': {
                'width': 390,
                'height': 844,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        'type': 'phone',
    },
    {
        'order': 16,
        'show-by-default': false,
        'title': 'Pixel 3 XL',
        'screen': {
            'horizontal': {
                'width': 786,
                'height': 393,
            },
            'device-pixel-ratio': 2.75,
            'vertical': {
                'width': 393,
                'height': 786,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36',
        'type': 'phone',
    },
    {
        'order': 18,
        'show-by-default': true,
        'title': 'Pixel 5',
        'screen': {
            'horizontal': {
                'width': 851,
                'height': 393,
            },
            'device-pixel-ratio': 2.75,
            'vertical': {
                'width': 393,
                'height': 851,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
        'type': 'phone',
    },
    {
        'order': 20,
        'show-by-default': true,
        'title': 'Samsung Galaxy S8+',
        'screen': {
            'horizontal': {
                'width': 740,
                'height': 360,
            },
            'device-pixel-ratio': 4,
            'vertical': {
                'width': 360,
                'height': 740,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
        'type': 'phone',
    },
    {
        'order': 24,
        'show-by-default': true,
        'title': 'Samsung Galaxy S20 Ultra',
        'screen': {
            'horizontal': {
                'width': 915,
                'height': 412,
            },
            'device-pixel-ratio': 3.5,
            'vertical': {
                'width': 412,
                'height': 915,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
        'type': 'phone',
    },
    {
        'order': 26,
        'show-by-default': true,
        'title': 'iPad Air',
        'screen': {
            'horizontal': {
                'width': 1180,
                'height': 820,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 820,
                'height': 1180,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
        'type': 'tablet',
    },
    {
        'order': 28,
        'show-by-default': true,
        'title': 'iPad Mini',
        'screen': {
            'horizontal': {
                'width': 1024,
                'height': 768,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 768,
                'height': 1024,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
        'type': 'tablet',
    },
    {
        'order': 30,
        'show-by-default': true,
        'title': 'Surface Pro 7',
        'screen': {
            'horizontal': {
                'width': 1368,
                'height': 912,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 912,
                'height': 1368,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
        'type': 'tablet',
    },
    {
        'order': 32,
        'show-by-default': true,
        'dual-screen': true,
        'title': 'Surface Duo',
        'screen': {
            'horizontal': { 'width': 720, 'height': 540 },
            'device-pixel-ratio': 2.5,
            'vertical': { 'width': 540, 'height': 720 },
            'vertical-spanned': {
                'width': 1114,
                'height': 720,
                'hinge': { 'width': 34, 'height': 720, 'x': 540, 'y': 0, 'contentColor': { 'r': 38, 'g': 38, 'b': 38, 'a': 1 } },
            },
            'horizontal-spanned': {
                'width': 720,
                'height': 1114,
                'hinge': { 'width': 720, 'height': 34, 'x': 0, 'y': 540, 'contentColor': { 'r': 38, 'g': 38, 'b': 38, 'a': 1 } },
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'type': 'phone',
        'modes': [
            { 'title': 'default', 'orientation': 'vertical', 'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 } },
            { 'title': 'default', 'orientation': 'horizontal', 'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 } },
            { 'title': 'spanned', 'orientation': 'vertical-spanned', 'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 } },
            {
                'title': 'spanned',
                'orientation': 'horizontal-spanned',
                'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 },
            },
        ],
    },
    {
        'order': 34,
        'show-by-default': true,
        'dual-screen': true,
        'title': 'Galaxy Fold',
        'screen': {
            'horizontal': { 'width': 653, 'height': 280 },
            'device-pixel-ratio': 3,
            'vertical': { 'width': 280, 'height': 653 },
            'vertical-spanned': { 'width': 717, 'height': 512 },
            'horizontal-spanned': { 'width': 512, 'height': 717 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'type': 'phone',
        'modes': [
            { 'title': 'default', 'orientation': 'vertical', 'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 } },
            { 'title': 'default', 'orientation': 'horizontal', 'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 } },
            { 'title': 'spanned', 'orientation': 'vertical-spanned', 'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 } },
            {
                'title': 'spanned',
                'orientation': 'horizontal-spanned',
                'insets': { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 },
            },
        ],
    },
    {
        'order': 36,
        'show-by-default': true,
        'title': 'Samsung Galaxy A51/71',
        'screen': {
            'horizontal': {
                'width': 914,
                'height': 412,
            },
            'device-pixel-ratio': 2.625,
            'vertical': {
                'width': 412,
                'height': 914,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
        'type': 'phone',
    },
    {
        'order': 52,
        'show-by-default': true,
        'title': 'Nest Hub Max',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/google-nest-hub-max-horizontal.avif)',
                    'insets': { 'left': 92, 'top': 96, 'right': 91, 'bottom': 248 },
                },
                'width': 1280,
                'height': 800,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 1280,
                'height': 800,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.188 Safari/537.36 CrKey/1.54.250320',
        'type': 'tablet',
        'modes': [{ 'title': 'default', 'orientation': 'horizontal' }],
    },
    {
        'order': 50,
        'show-by-default': true,
        'title': 'Nest Hub',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/google-nest-hub-horizontal.avif)',
                    'insets': { 'left': 82, 'top': 74, 'right': 83, 'bottom': 222 },
                },
                'width': 1024,
                'height': 600,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'width': 1024,
                'height': 600,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.109 Safari/537.36 CrKey/1.54.248666',
        'type': 'tablet',
        'modes': [{ 'title': 'default', 'orientation': 'horizontal' }],
    },
    {
        'show-by-default': false,
        'title': 'iPhone 4',
        'screen': {
            'horizontal': { 'width': 480, 'height': 320 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 320, 'height': 480 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53',
        'type': 'phone',
    },
    {
        'order': 130,
        'show-by-default': false,
        'title': 'iPhone 5/SE',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/iPhone5-landscape.avif)',
                    'insets': { 'left': 115, 'top': 25, 'right': 115, 'bottom': 28 },
                },
                'width': 568,
                'height': 320,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/iPhone5-portrait.avif)',
                    'insets': { 'left': 29, 'top': 105, 'right': 25, 'bottom': 111 },
                },
                'width': 320,
                'height': 568,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        'type': 'phone',
    },
    {
        'order': 131,
        'show-by-default': false,
        'title': 'iPhone 6/7/8',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/iPhone6-landscape.avif)',
                    'insets': { 'left': 106, 'top': 28, 'right': 106, 'bottom': 28 },
                },
                'width': 667,
                'height': 375,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/iPhone6-portrait.avif)',
                    'insets': { 'left': 28, 'top': 105, 'right': 28, 'bottom': 105 },
                },
                'width': 375,
                'height': 667,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        'type': 'phone',
    },
    {
        'order': 132,
        'show-by-default': false,
        'title': 'iPhone 6/7/8 Plus',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/iPhone6Plus-landscape.avif)',
                    'insets': { 'left': 109, 'top': 29, 'right': 109, 'bottom': 27 },
                },
                'width': 736,
                'height': 414,
            },
            'device-pixel-ratio': 3,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/iPhone6Plus-portrait.avif)',
                    'insets': { 'left': 26, 'top': 107, 'right': 30, 'bottom': 111 },
                },
                'width': 414,
                'height': 736,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        'type': 'phone',
    },
    {
        'order': 133,
        'show-by-default': false,
        'title': 'iPhone X',
        'screen': {
            'horizontal': { 'width': 812, 'height': 375 },
            'device-pixel-ratio': 3,
            'vertical': { 'width': 375, 'height': 812 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'BlackBerry Z30',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 360, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Nexus 4',
        'screen': {
            'horizontal': { 'width': 640, 'height': 384 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 384, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '4.4.2', 'architecture': '', 'model': 'Nexus 4', 'mobile': true },
        'type': 'phone',
    },
    {
        'title': 'Nexus 5',
        'type': 'phone',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '6.0', 'architecture': '', 'model': 'Nexus 5', 'mobile': true },
        'capabilities': ['touch', 'mobile'],
        'show-by-default': false,
        'screen': {
            'device-pixel-ratio': 3,
            'vertical': { 'width': 360, 'height': 640 },
            'horizontal': { 'width': 640, 'height': 360 },
        },
        'modes': [
            {
                'title': 'default',
                'orientation': 'vertical',
                'insets': { 'left': 0, 'top': 25, 'right': 0, 'bottom': 48 },
                'image': '@url(optimized/google-nexus-5-vertical-default-1x.avif) 1x, @url(optimized/google-nexus-5-vertical-default-2x.avif) 2x',
            },
            {
                'title': 'navigation bar',
                'orientation': 'vertical',
                'insets': { 'left': 0, 'top': 80, 'right': 0, 'bottom': 48 },
                'image': '@url(optimized/google-nexus-5-vertical-navigation-1x.avif) 1x, @url(optimized/google-nexus-5-vertical-navigation-2x.avif) 2x',
            },
            {
                'title': 'keyboard',
                'orientation': 'vertical',
                'insets': { 'left': 0, 'top': 80, 'right': 0, 'bottom': 312 },
                'image': '@url(optimized/google-nexus-5-vertical-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5-vertical-keyboard-2x.avif) 2x',
            },
            {
                'title': 'default',
                'orientation': 'horizontal',
                'insets': { 'left': 0, 'top': 25, 'right': 42, 'bottom': 0 },
                'image': '@url(optimized/google-nexus-5-horizontal-default-1x.avif) 1x, @url(optimized/google-nexus-5-horizontal-default-2x.avif) 2x',
            },
            {
                'title': 'navigation bar',
                'orientation': 'horizontal',
                'insets': { 'left': 0, 'top': 80, 'right': 42, 'bottom': 0 },
                'image': '@url(optimized/google-nexus-5-horizontal-navigation-1x.avif) 1x, @url(optimized/google-nexus-5-horizontal-navigation-2x.avif) 2x',
            },
            {
                'title': 'keyboard',
                'orientation': 'horizontal',
                'insets': { 'left': 0, 'top': 80, 'right': 42, 'bottom': 202 },
                'image': '@url(optimized/google-nexus-5-horizontal-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5-horizontal-keyboard-2x.avif) 2x',
            },
        ],
    },
    {
        'title': 'Nexus 5X',
        'type': 'phone',
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '8.0.0', 'architecture': '', 'model': 'Nexus 5X', 'mobile': true },
        'capabilities': ['touch', 'mobile'],
        'show-by-default': false,
        'screen': {
            'device-pixel-ratio': 2.625,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/Nexus5X-portrait.avif)',
                    'insets': { 'left': 18, 'top': 88, 'right': 22, 'bottom': 98 },
                },
                'width': 412,
                'height': 732,
            },
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/Nexus5X-landscape.avif)',
                    'insets': { 'left': 88, 'top': 21, 'right': 98, 'bottom': 19 },
                },
                'width': 732,
                'height': 412,
            },
        },
        'modes': [
            {
                'title': 'default',
                'orientation': 'vertical',
                'insets': { 'left': 0, 'top': 24, 'right': 0, 'bottom': 48 },
                'image': '@url(optimized/google-nexus-5x-vertical-default-1x.avif) 1x, @url(optimized/google-nexus-5x-vertical-default-2x.avif) 2x',
            },
            {
                'title': 'navigation bar',
                'orientation': 'vertical',
                'insets': { 'left': 0, 'top': 80, 'right': 0, 'bottom': 48 },
                'image': '@url(optimized/google-nexus-5x-vertical-navigation-1x.avif) 1x, @url(optimized/google-nexus-5x-vertical-navigation-2x.avif) 2x',
            },
            {
                'title': 'keyboard',
                'orientation': 'vertical',
                'insets': { 'left': 0, 'top': 80, 'right': 0, 'bottom': 342 },
                'image': '@url(optimized/google-nexus-5x-vertical-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5x-vertical-keyboard-2x.avif) 2x',
            },
            {
                'title': 'default',
                'orientation': 'horizontal',
                'insets': { 'left': 0, 'top': 24, 'right': 48, 'bottom': 0 },
                'image': '@url(optimized/google-nexus-5x-horizontal-default-1x.avif) 1x, @url(optimized/google-nexus-5x-horizontal-default-2x.avif) 2x',
            },
            {
                'title': 'navigation bar',
                'orientation': 'horizontal',
                'insets': { 'left': 0, 'top': 80, 'right': 48, 'bottom': 0 },
                'image': '@url(optimized/google-nexus-5x-horizontal-navigation-1x.avif) 1x, @url(optimized/google-nexus-5x-horizontal-navigation-2x.avif) 2x',
            },
            {
                'title': 'keyboard',
                'orientation': 'horizontal',
                'insets': { 'left': 0, 'top': 80, 'right': 48, 'bottom': 222 },
                'image': '@url(optimized/google-nexus-5x-horizontal-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5x-horizontal-keyboard-2x.avif) 2x',
            },
        ],
    },
    {
        'show-by-default': false,
        'title': 'Nexus 6',
        'screen': {
            'horizontal': { 'width': 732, 'height': 412 },
            'device-pixel-ratio': 3.5,
            'vertical': { 'width': 412, 'height': 732 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '7.1.1', 'architecture': '', 'model': 'Nexus 6', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Nexus 6P',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/Nexus6P-landscape.avif)',
                    'insets': { 'left': 94, 'top': 17, 'right': 88, 'bottom': 17 },
                },
                'width': 732,
                'height': 412,
            },
            'device-pixel-ratio': 3.5,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/Nexus6P-portrait.avif)',
                    'insets': { 'left': 16, 'top': 94, 'right': 16, 'bottom': 88 },
                },
                'width': 412,
                'height': 732,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '8.0.0', 'architecture': '', 'model': 'Nexus 6P', 'mobile': true },
        'type': 'phone',
    },
    {
        'order': 120,
        'show-by-default': false,
        'title': 'Pixel 2',
        'screen': {
            'horizontal': { 'width': 731, 'height': 411 },
            'device-pixel-ratio': 2.625,
            'vertical': { 'width': 411, 'height': 731 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '8.0', 'architecture': '', 'model': 'Pixel 2', 'mobile': true },
        'type': 'phone',
    },
    {
        'order': 121,
        'show-by-default': false,
        'title': 'Pixel 2 XL',
        'screen': {
            'horizontal': { 'width': 823, 'height': 411 },
            'device-pixel-ratio': 3.5,
            'vertical': { 'width': 411, 'height': 823 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '8.0.0', 'architecture': '', 'model': 'Pixel 2 XL', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Pixel 3',
        'screen': {
            'horizontal': { 'width': 786, 'height': 393 },
            'device-pixel-ratio': 2.75,
            'vertical': { 'width': 393, 'height': 786 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '9', 'architecture': '', 'model': 'Pixel 3', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Pixel 4',
        'screen': {
            'horizontal': { 'width': 745, 'height': 353 },
            'device-pixel-ratio': 3,
            'vertical': { 'width': 353, 'height': 745 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '10', 'architecture': '', 'model': 'Pixel 4', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'LG Optimus L70',
        'screen': {
            'horizontal': { 'width': 640, 'height': 384 },
            'device-pixel-ratio': 1.25,
            'vertical': { 'width': 384, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '4.4.2', 'architecture': '', 'model': 'LGMS323', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Nokia N9',
        'screen': {
            'horizontal': { 'width': 854, 'height': 480 },
            'device-pixel-ratio': 1,
            'vertical': { 'width': 480, 'height': 854 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Nokia Lumia 520',
        'screen': {
            'horizontal': { 'width': 533, 'height': 320 },
            'device-pixel-ratio': 1.5,
            'vertical': { 'width': 320, 'height': 533 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Microsoft Lumia 550',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 640, 'height': 360 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Microsoft Lumia 950',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 4,
            'vertical': { 'width': 360, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Galaxy S III',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 360, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '4.0', 'architecture': '', 'model': 'GT-I9300', 'mobile': true },
        'type': 'phone',
    },
    {
        'order': 110,
        'show-by-default': false,
        'title': 'Galaxy S5',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 3,
            'vertical': { 'width': 360, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '5.0', 'architecture': '', 'model': 'SM-G900P', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Galaxy S8',
        'screen': {
            'horizontal': { 'width': 740, 'height': 360 },
            'device-pixel-ratio': 3,
            'vertical': { 'width': 360, 'height': 740 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '7.0', 'architecture': '', 'model': 'SM-G950U', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Galaxy S9+',
        'screen': {
            'horizontal': { 'width': 658, 'height': 320 },
            'device-pixel-ratio': 4.5,
            'vertical': { 'width': 320, 'height': 658 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '8.0.0', 'architecture': '', 'model': 'SM-G965U', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Galaxy Tab S4',
        'screen': {
            'horizontal': { 'width': 1138, 'height': 712 },
            'device-pixel-ratio': 2.25,
            'vertical': { 'width': 712, 'height': 1138 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '8.1.0', 'architecture': '', 'model': 'SM-T837A', 'mobile': true },
        'type': 'phone',
    },
    {
        'order': 1,
        'show-by-default': false,
        'title': 'JioPhone 2',
        'screen': {
            'horizontal': { 'width': 320, 'height': 240 },
            'device-pixel-ratio': 1,
            'vertical': { 'width': 240, 'height': 320 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Kindle Fire HDX',
        'screen': {
            'horizontal': { 'width': 1280, 'height': 800 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 800, 'height': 1280 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',
        'type': 'tablet',
    },
    {
        'show-by-default': false,
        'title': 'iPad Mini',
        'screen': {
            'horizontal': { 'width': 1024, 'height': 768 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 768, 'height': 1024 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        'type': 'tablet',
    },
    {
        'order': 140,
        'show-by-default': false,
        'title': 'iPad',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/iPad-landscape.avif)',
                    'insets': { 'left': 112, 'top': 56, 'right': 116, 'bottom': 52 },
                },
                'width': 1024,
                'height': 768,
            },
            'device-pixel-ratio': 2,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/iPad-portrait.avif)',
                    'insets': { 'left': 52, 'top': 114, 'right': 55, 'bottom': 114 },
                },
                'width': 768,
                'height': 1024,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        'type': 'tablet',
    },
    {
        'order': 141,
        'show-by-default': false,
        'title': 'iPad Pro',
        'screen': {
            'horizontal': { 'width': 1366, 'height': 1024 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 1024, 'height': 1366 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        'type': 'tablet',
    },
    {
        'show-by-default': false,
        'title': 'Blackberry PlayBook',
        'screen': {
            'horizontal': { 'width': 1024, 'height': 600 },
            'device-pixel-ratio': 1,
            'vertical': { 'width': 600, 'height': 1024 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+',
        'type': 'tablet',
    },
    {
        'show-by-default': false,
        'title': 'Nexus 10',
        'screen': {
            'horizontal': { 'width': 1280, 'height': 800 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 800, 'height': 1280 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '6.0.1', 'architecture': '', 'model': 'Nexus 10', 'mobile': false },
        'type': 'tablet',
    },
    {
        'show-by-default': false,
        'title': 'Nexus 7',
        'screen': {
            'horizontal': { 'width': 960, 'height': 600 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 600, 'height': 960 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '6.0.1', 'architecture': '', 'model': 'Nexus 7', 'mobile': false },
        'type': 'tablet',
    },
    {
        'show-by-default': false,
        'title': 'Galaxy Note 3',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 3,
            'vertical': { 'width': 360, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '4.3', 'architecture': '', 'model': 'SM-N900T', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Galaxy Note II',
        'screen': {
            'horizontal': { 'width': 640, 'height': 360 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 360, 'height': 640 },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '4.1', 'architecture': '', 'model': 'GT-N7100', 'mobile': true },
        'type': 'phone',
    },
    {
        'show-by-default': false,
        'title': 'Laptop with touch',
        'screen': {
            'horizontal': { 'width': 1280, 'height': 950 },
            'device-pixel-ratio': 1,
            'vertical': { 'width': 950, 'height': 1280 },
        },
        'capabilities': ['touch'],
        'user-agent': '',
        'type': 'notebook',
        'modes': [{ 'title': 'default', 'orientation': 'horizontal' }],
    },
    {
        'show-by-default': false,
        'title': 'Laptop with HiDPI screen',
        'screen': {
            'horizontal': { 'width': 1440, 'height': 900 },
            'device-pixel-ratio': 2,
            'vertical': { 'width': 900, 'height': 1440 },
        },
        'capabilities': [],
        'user-agent': '',
        'type': 'notebook',
        'modes': [{ 'title': 'default', 'orientation': 'horizontal' }],
    },
    {
        'show-by-default': false,
        'title': 'Laptop with MDPI screen',
        'screen': {
            'horizontal': { 'width': 1280, 'height': 800 },
            'device-pixel-ratio': 1,
            'vertical': { 'width': 800, 'height': 1280 },
        },
        'capabilities': [],
        'user-agent': '',
        'type': 'notebook',
        'modes': [{ 'title': 'default', 'orientation': 'horizontal' }],
    },
    {
        'show-by-default': false,
        'title': 'Moto G4',
        'screen': {
            'horizontal': {
                'outline': {
                    'image': '@url(optimized/MotoG4-landscape.avif)',
                    'insets': { 'left': 91, 'top': 30, 'right': 74, 'bottom': 30 },
                },
                'width': 640,
                'height': 360,
            },
            'device-pixel-ratio': 3,
            'vertical': {
                'outline': {
                    'image': '@url(optimized/MotoG4-portrait.avif)',
                    'insets': { 'left': 30, 'top': 91, 'right': 30, 'bottom': 74 },
                },
                'width': 360,
                'height': 640,
            },
        },
        'capabilities': ['touch', 'mobile'],
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        'user-agent-metadata': { 'platform': 'Android', 'platformVersion': '6.0.1', 'architecture': '', 'model': 'Moto G (4)', 'mobile': true },
        'type': 'phone',
    },
];


/***/ }),

/***/ "./src/screencast/flyoutMenuComponent.ts":
/*!***********************************************!*\
  !*** ./src/screencast/flyoutMenuComponent.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _FlyoutMenuComponent_instances, _FlyoutMenuComponent_buttonRef, _FlyoutMenuComponent_globalSelectedItem, _FlyoutMenuComponent_iconName, _FlyoutMenuComponent_title, _FlyoutMenuComponent_container, _FlyoutMenuComponent_offsetDirection, _FlyoutMenuComponent_displayCurrentSelection, _FlyoutMenuComponent_menuItemSections, _FlyoutMenuComponent_onItemSelected, _FlyoutMenuComponent_onClick, _FlyoutMenuComponent_closeMenu, _FlyoutMenuComponent_menuSectionTemplate, _FlyoutMenuComponent_menuTemplate, _FlyoutMenuComponent_update, _FlyoutMenuComponent_getTitleFromMenuItemSections;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OffsetDirection = void 0;
const lit_html_1 = __webpack_require__(/*! lit-html */ "./node_modules/lit-html/development/lit-html.js");
const ref_js_1 = __webpack_require__(/*! lit-html/directives/ref.js */ "./node_modules/lit-html/development/directives/ref.js");
const style_map_js_1 = __webpack_require__(/*! lit-html/directives/style-map.js */ "./node_modules/lit-html/development/directives/style-map.js");
var OffsetDirection;
(function (OffsetDirection) {
    OffsetDirection["Right"] = "Right";
    OffsetDirection["Left"] = "Left";
})(OffsetDirection = exports.OffsetDirection || (exports.OffsetDirection = {}));
class FlyoutMenuComponent {
    constructor(props, container) {
        _FlyoutMenuComponent_instances.add(this);
        _FlyoutMenuComponent_buttonRef.set(this, (0, ref_js_1.createRef)());
        _FlyoutMenuComponent_globalSelectedItem.set(this, void 0);
        _FlyoutMenuComponent_iconName.set(this, void 0);
        _FlyoutMenuComponent_title.set(this, void 0);
        _FlyoutMenuComponent_container.set(this, void 0);
        _FlyoutMenuComponent_offsetDirection.set(this, OffsetDirection.Left);
        _FlyoutMenuComponent_displayCurrentSelection.set(this, false);
        _FlyoutMenuComponent_menuItemSections.set(this, void 0);
        _FlyoutMenuComponent_onItemSelected.set(this, (value, sectionIndex, fn) => {
            return () => {
                fn(value);
                if (__classPrivateFieldGet(this, _FlyoutMenuComponent_globalSelectedItem, "f")) {
                    __classPrivateFieldSet(this, _FlyoutMenuComponent_globalSelectedItem, value, "f");
                    __classPrivateFieldGet(this, _FlyoutMenuComponent_instances, "m", _FlyoutMenuComponent_update).call(this);
                }
                else {
                    __classPrivateFieldGet(this, _FlyoutMenuComponent_menuItemSections, "f")[sectionIndex].selectedItem = value;
                }
            };
        });
        _FlyoutMenuComponent_onClick.set(this, () => {
            const thisComponent = __classPrivateFieldGet(this, _FlyoutMenuComponent_buttonRef, "f").value;
            const boundingRect = thisComponent.getBoundingClientRect();
            let styles = {
                display: 'block',
                position: 'absolute',
            };
            (0, lit_html_1.render)(__classPrivateFieldGet(this, _FlyoutMenuComponent_instances, "m", _FlyoutMenuComponent_menuTemplate).call(this, styles), document.body);
            const popoverElement = document.getElementById('popover');
            styles.top = Math.min(boundingRect.top - popoverElement.offsetHeight).toString() + 'px';
            if (__classPrivateFieldGet(this, _FlyoutMenuComponent_offsetDirection, "f") === OffsetDirection.Left) {
                styles.left = Math.min(boundingRect.left).toString() + 'px';
            }
            else if (__classPrivateFieldGet(this, _FlyoutMenuComponent_offsetDirection, "f") === OffsetDirection.Right) {
                styles.right = Math.min(document.body.offsetWidth - boundingRect.right).toString() + 'px';
            }
            (0, lit_html_1.render)(__classPrivateFieldGet(this, _FlyoutMenuComponent_instances, "m", _FlyoutMenuComponent_menuTemplate).call(this, styles), document.body);
            document.body.addEventListener('mousedown', __classPrivateFieldGet(this, _FlyoutMenuComponent_closeMenu, "f"));
        });
        _FlyoutMenuComponent_closeMenu.set(this, () => {
            document.getElementById('popover').style.display = 'none';
            document.body.removeEventListener('mousedown', __classPrivateFieldGet(this, _FlyoutMenuComponent_closeMenu, "f"));
        });
        __classPrivateFieldSet(this, _FlyoutMenuComponent_globalSelectedItem, props.globalSelectedItem, "f");
        __classPrivateFieldSet(this, _FlyoutMenuComponent_iconName, props.iconName, "f");
        __classPrivateFieldSet(this, _FlyoutMenuComponent_title, props.title, "f");
        __classPrivateFieldSet(this, _FlyoutMenuComponent_menuItemSections, props.menuItemSections, "f");
        __classPrivateFieldSet(this, _FlyoutMenuComponent_container, container, "f");
        if (props.offsetDirection) {
            __classPrivateFieldSet(this, _FlyoutMenuComponent_offsetDirection, props.offsetDirection, "f");
        }
        if (props.displayCurrentSelection) {
            __classPrivateFieldSet(this, _FlyoutMenuComponent_displayCurrentSelection, props.displayCurrentSelection, "f");
        }
        __classPrivateFieldGet(this, _FlyoutMenuComponent_instances, "m", _FlyoutMenuComponent_update).call(this);
    }
    template() {
        return (0, lit_html_1.html) `
            <button ${(0, ref_js_1.ref)(__classPrivateFieldGet(this, _FlyoutMenuComponent_buttonRef, "f"))} @click=${__classPrivateFieldGet(this, _FlyoutMenuComponent_onClick, "f")} .title=${__classPrivateFieldGet(this, _FlyoutMenuComponent_title, "f")}>
                ${__classPrivateFieldGet(this, _FlyoutMenuComponent_displayCurrentSelection, "f")
            ? (0, lit_html_1.html) `${__classPrivateFieldGet(this, _FlyoutMenuComponent_instances, "m", _FlyoutMenuComponent_getTitleFromMenuItemSections).call(this, __classPrivateFieldGet(this, _FlyoutMenuComponent_globalSelectedItem, "f"))}`
            : ''}
                <i class='codicon ${__classPrivateFieldGet(this, _FlyoutMenuComponent_iconName, "f")}'></i>
            </button>
        `;
    }
    static render(props, elementId) {
        const flyoutMenuContainer = document.getElementById(elementId);
        if (flyoutMenuContainer) {
            new FlyoutMenuComponent(props, flyoutMenuContainer);
        }
    }
}
exports["default"] = FlyoutMenuComponent;
_FlyoutMenuComponent_buttonRef = new WeakMap(), _FlyoutMenuComponent_globalSelectedItem = new WeakMap(), _FlyoutMenuComponent_iconName = new WeakMap(), _FlyoutMenuComponent_title = new WeakMap(), _FlyoutMenuComponent_container = new WeakMap(), _FlyoutMenuComponent_offsetDirection = new WeakMap(), _FlyoutMenuComponent_displayCurrentSelection = new WeakMap(), _FlyoutMenuComponent_menuItemSections = new WeakMap(), _FlyoutMenuComponent_onItemSelected = new WeakMap(), _FlyoutMenuComponent_onClick = new WeakMap(), _FlyoutMenuComponent_closeMenu = new WeakMap(), _FlyoutMenuComponent_instances = new WeakSet(), _FlyoutMenuComponent_menuSectionTemplate = function _FlyoutMenuComponent_menuSectionTemplate(menuItemSection, menuItemSectionIndex) {
    const renderedMenuItems = menuItemSection.menuItems.map((item, i) => {
        let isSelected = false;
        if (__classPrivateFieldGet(this, _FlyoutMenuComponent_globalSelectedItem, "f")) {
            isSelected = __classPrivateFieldGet(this, _FlyoutMenuComponent_globalSelectedItem, "f") === item.value;
        }
        else {
            isSelected = menuItemSection.selectedItem ?
                item.value === menuItemSection.selectedItem : i === 0;
        }
        return (0, lit_html_1.html) `
                <li @mousedown=${__classPrivateFieldGet(this, _FlyoutMenuComponent_onItemSelected, "f").call(this, item.value, menuItemSectionIndex, menuItemSection.onItemSelected)}>
                    <i class='codicon codicon-check' style=${(0, style_map_js_1.styleMap)({
            visibility: isSelected ? 'visible' : 'hidden'
        })}></i>
                    ${item.name}
                </li>
            `;
    });
    return (0, lit_html_1.html) `
            <ul>${renderedMenuItems}</ul>
        `;
}, _FlyoutMenuComponent_menuTemplate = function _FlyoutMenuComponent_menuTemplate(styles) {
    let partials = [];
    for (let i = 0; i < __classPrivateFieldGet(this, _FlyoutMenuComponent_menuItemSections, "f").length; i++) {
        const section = __classPrivateFieldGet(this, _FlyoutMenuComponent_menuItemSections, "f")[i];
        partials.push(__classPrivateFieldGet(this, _FlyoutMenuComponent_instances, "m", _FlyoutMenuComponent_menuSectionTemplate).call(this, section, i));
        if (i !== __classPrivateFieldGet(this, _FlyoutMenuComponent_menuItemSections, "f").length - 1) {
            partials.push((0, lit_html_1.html) `<hr />`);
        }
    }
    return (0, lit_html_1.html) `
            <div id='popover' style=${(0, style_map_js_1.styleMap)(styles)}>
                ${partials}
            </div>
        `;
}, _FlyoutMenuComponent_update = function _FlyoutMenuComponent_update() {
    if (!__classPrivateFieldGet(this, _FlyoutMenuComponent_container, "f")) {
        return;
    }
    (0, lit_html_1.render)(this.template(), __classPrivateFieldGet(this, _FlyoutMenuComponent_container, "f"));
}, _FlyoutMenuComponent_getTitleFromMenuItemSections = function _FlyoutMenuComponent_getTitleFromMenuItemSections(value) {
    if (!value) {
        return '';
    }
    for (const section of __classPrivateFieldGet(this, _FlyoutMenuComponent_menuItemSections, "f")) {
        for (const entry of section.menuItems) {
            if (value === entry.value) {
                return entry.name;
            }
        }
    }
    return '';
};


/***/ }),

/***/ "./src/screencast/input.ts":
/*!*********************************!*\
  !*** ./src/screencast/input.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScreencastInputHandler = exports.MouseEventMap = void 0;
exports.MouseEventMap = {
    mousedown: 'mousePressed',
    mouseup: 'mouseReleased',
    mousemove: 'mouseMoved',
    wheel: 'mouseWheel'
};
const MouseButtonMap = [
    'left',
    'middle',
    'right',
    'back',
    'forward'
];
class ScreencastInputHandler {
    constructor(cdpConnection) {
        this.cdpConnection = cdpConnection;
        this.activeTouchParams = null;
    }
    emitMouseEvent(mouseEvent, scale) {
        const eventType = exports.MouseEventMap[mouseEvent.type];
        if (!eventType) {
            return;
        }
        this.cdpConnection.sendMessageToBackend('Input.dispatchMouseEvent', {
            type: eventType,
            clickCount: mouseEvent.detail,
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: this.modifiersForEvent(mouseEvent),
            button: MouseButtonMap[mouseEvent.button],
            buttons: mouseEvent.buttons,
            deltaX: mouseEvent.deltaX,
            deltaY: mouseEvent.deltaY
        });
    }
    emitKeyEvent(keyboardEvent) {
        const hasNonShiftModifier = !!(keyboardEvent.ctrlKey || keyboardEvent.altKey || keyboardEvent.metaKey);
        if (hasNonShiftModifier || keyboardEvent.key === 'Tab') {
            // Prevent keyboard shortcuts from acting on the screencast image.
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
        }
        if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && (keyboardEvent.key === 'c' || keyboardEvent.key === 'x') && keyboardEvent.type === 'keydown') {
            // We make a call to CDP to get the currently selected text in the screencast.
            // By passing "true" for the "isCutOrCopy" parameter in "sendMessageToBackend", the cdpConnection class will
            // handle the response to the Runtime.evaluate call and update the user's system clipboard.
            this.cdpConnection.sendMessageToBackend('Runtime.evaluate', {
                expression: 'document.getSelection().toString()',
            }, undefined, true);
        }
        if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && keyboardEvent.key === 'v' && keyboardEvent.type === 'keydown') {
            // If the user inputs a paste command shortcut, we send a request to VSCode to retrieve the user's system clipboard contents.
            // When the clipboard contents are sent back to the screencast, we insert that text into the screencast-focused input via "pasteClipboardContents"
            this.cdpConnection.readClipboardAndPasteRequest();
        }
        else if (keyboardEvent.type === 'keydown' || keyboardEvent.type === 'keyup') {
            const text = hasNonShiftModifier ? '' : this.textFromEvent(keyboardEvent);
            this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', {
                type: keyboardEvent.type === 'keyup' ? 'keyUp' : (text ? 'keyDown' : 'rawKeyDown'),
                autoRepeat: keyboardEvent.repeat,
                code: keyboardEvent.code,
                key: keyboardEvent.key,
                location: keyboardEvent.location,
                modifiers: this.modifiersForEvent(keyboardEvent),
                windowsVirtualKeyCode: keyboardEvent.keyCode,
                nativeVirtualKeyCode: keyboardEvent.keyCode,
                text,
            });
        }
    }
    emitTouchFromMouseEvent(mouseEvent, scale) {
        const buttons = ['none', 'left', 'middle', 'right'];
        const eventType = exports.MouseEventMap[mouseEvent.type];
        if (!eventType) {
            return;
        }
        if (!(mouseEvent.which in buttons)) {
            return;
        }
        if (eventType !== 'mouseWheel' && buttons[mouseEvent.which] === 'none') {
            return;
        }
        const params = {
            type: eventType,
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: 0,
            button: MouseButtonMap[mouseEvent.button],
            clickCount: 0,
        };
        if (mouseEvent.type === 'wheel') {
            const wheelEvent = mouseEvent;
            params.deltaX = wheelEvent.deltaX;
            params.deltaY = -wheelEvent.deltaY;
            params.button = 'none';
        }
        else {
            this.activeTouchParams = params;
        }
        this.cdpConnection.sendMessageToBackend('Input.emulateTouchFromMouseEvent', params);
    }
    cancelTouch() {
        if (this.activeTouchParams !== null) {
            const params = this.activeTouchParams;
            this.activeTouchParams = null;
            params.type = 'mouseReleased';
            this.cdpConnection.sendMessageToBackend('Input.emulateTouchFromMouseEvent', params);
        }
    }
    textFromEvent(event) {
        if (event.type === 'keyup') {
            return '';
        }
        if (event.key === 'Enter') {
            return '\r';
        }
        if (event.key.length > 1) {
            return '';
        }
        return event.key;
    }
    modifiersForEvent(event) {
        return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
    }
}
exports.ScreencastInputHandler = ScreencastInputHandler;


/***/ }),

/***/ "./src/screencast/screencast.ts":
/*!**************************************!*\
  !*** ./src/screencast/screencast.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Screencast = void 0;
const lit_html_1 = __webpack_require__(/*! lit-html */ "./node_modules/lit-html/development/lit-html.js");
const cdp_1 = __webpack_require__(/*! ./cdp */ "./src/screencast/cdp.ts");
const input_1 = __webpack_require__(/*! ./input */ "./src/screencast/input.ts");
const dimensionComponent_1 = __importDefault(__webpack_require__(/*! ./dimensionComponent */ "./src/screencast/dimensionComponent.ts"));
const emulatedDeviceHelpers_1 = __webpack_require__(/*! ./emulatedDeviceHelpers */ "./src/screencast/emulatedDeviceHelpers.ts");
const flyoutMenuComponent_1 = __importStar(__webpack_require__(/*! ./flyoutMenuComponent */ "./src/screencast/flyoutMenuComponent.ts"));
const webviewEvents_1 = __webpack_require__(/*! ../common/webviewEvents */ "./src/common/webviewEvents.ts");
class Screencast {
    constructor() {
        this.cdpConnection = new cdp_1.ScreencastCDPConnection();
        this.history = [];
        this.historyIndex = 0;
        this.emulatedWidth = 0;
        this.emulatedHeight = 0;
        this.inspectMode = false;
        this.mediaFeatureConfig = new Map();
        this.emulatedMedia = '';
        this.isTouchMode = false;
        this.deviceUserAgent = '';
        this.onDeviceSelected = (value) => {
            const isResponsive = (value === 'responsive');
            let isTouchMode = false;
            if (isResponsive) {
                this.emulatedWidth = this.mainWrapper.offsetWidth;
                this.emulatedHeight = (this.mainWrapper.offsetHeight - this.toolbar.offsetHeight - this.emulationBar.offsetHeight);
                this.deviceUserAgent = '';
            }
            else {
                const device = (0, emulatedDeviceHelpers_1.getEmulatedDeviceDetails)(value);
                if (!device) {
                    return;
                }
                if (device.modes) {
                    const defaultDeviceMode = device.modes.find((mode) => mode.title === 'default');
                    if (!defaultDeviceMode) {
                        throw new Error(`No default device mode in \`modes\` property for ${device.title}`);
                    }
                    this.emulatedWidth = device.screen[defaultDeviceMode.orientation].width;
                    this.emulatedHeight = device.screen[defaultDeviceMode.orientation].height;
                }
                else {
                    this.emulatedWidth = device.screen.vertical.width;
                    this.emulatedHeight = device.screen.vertical.height;
                }
                this.deviceUserAgent = device['user-agent'];
                isTouchMode = (device.capabilities.includes('touch') || device.capabilities.includes('mobile'));
            }
            this.setTouchMode(isTouchMode);
            dimensionComponent_1.default.setDimensionState(this.emulatedWidth, this.emulatedHeight, isResponsive, !isResponsive);
            this.updateEmulation();
            this.sendEmulationTelemetry('device', value);
        };
        this.onVisionDeficiencySelected = (value) => {
            this.cdpConnection.sendMessageToBackend('Emulation.setEmulatedVisionDeficiency', { type: value });
            this.sendEmulationTelemetry('visionDeficiency', value);
        };
        this.onEmulatedMediaSelected = (value) => {
            this.emulatedMedia = value;
            this.updateMediaFeatures();
            this.sendEmulationTelemetry('emulatedMedia', value);
        };
        this.onForcedColorsSelected = (value) => {
            this.mediaFeatureConfig.set('forced-colors', value);
            this.updateMediaFeatures();
            this.sendEmulationTelemetry('forcedColors', value);
        };
        this.onPrefersColorSchemeSelected = (value) => {
            this.mediaFeatureConfig.set('prefers-color-scheme', value);
            this.updateMediaFeatures();
            this.sendEmulationTelemetry('prefersColorScheme', value);
        };
        this.onUpdateDimensions = (width, height) => {
            this.emulatedWidth = width;
            this.emulatedHeight = height;
            this.updateEmulation();
        };
        this.updateMediaFeatures = () => {
            let features = [];
            this.mediaFeatureConfig.forEach((value, name) => {
                features.push({ name, value });
            });
            const payload = {
                features,
                media: this.emulatedMedia
            };
            this.cdpConnection.sendMessageToBackend('Emulation.setEmulatedMedia', payload);
        };
        this.backButton = document.getElementById('back');
        this.forwardButton = document.getElementById('forward');
        this.inspectButton = document.getElementById('inspect');
        this.mainWrapper = document.getElementById('main');
        this.reloadButton = document.getElementById('reload');
        this.urlInput = document.getElementById('url');
        this.screencastImage = document.getElementById('canvas');
        this.toolbar = document.getElementById('toolbar');
        this.emulationBar = document.getElementById('emulation-bar');
        this.inactiveOverlay = document.getElementById('inactive-overlay');
        this.backButton.addEventListener('click', () => this.onBackClick());
        this.forwardButton.addEventListener('click', () => this.onForwardClick());
        this.inspectButton.addEventListener('click', () => this.onInspectClick());
        this.reloadButton.addEventListener('click', () => this.onReloadClick());
        this.urlInput.addEventListener('keydown', event => this.onUrlKeyDown(event));
        const emulatedDevices = (0, emulatedDeviceHelpers_1.groupEmulatedDevicesByType)();
        flyoutMenuComponent_1.default.render({
            iconName: 'codicon-chevron-down',
            title: 'Emulate devices',
            globalSelectedItem: 'responsive',
            displayCurrentSelection: true,
            menuItemSections: [
                {
                    onItemSelected: this.onDeviceSelected,
                    menuItems: [
                        { name: 'Responsive', value: 'responsive' }
                    ]
                },
                {
                    onItemSelected: this.onDeviceSelected,
                    menuItems: emulatedDevices.get('phone') || []
                },
                {
                    onItemSelected: this.onDeviceSelected,
                    menuItems: emulatedDevices.get('tablet') || []
                },
                {
                    onItemSelected: this.onDeviceSelected,
                    menuItems: emulatedDevices.get('notebook') || []
                }
            ]
        }, 'emulation-bar-right');
        dimensionComponent_1.default.render({
            width: this.mainWrapper.offsetWidth,
            height: this.mainWrapper.offsetHeight,
            heightOffset: this.toolbar.offsetHeight + this.emulationBar.offsetHeight,
            onUpdateDimensions: this.onUpdateDimensions
        }, 'emulation-bar-center');
        (0, lit_html_1.render)((0, lit_html_1.html) `
            ${new flyoutMenuComponent_1.default({
            iconName: 'codicon-wand',
            title: 'Emulate CSS media features',
            offsetDirection: flyoutMenuComponent_1.OffsetDirection.Right,
            menuItemSections: [
                {
                    onItemSelected: this.onEmulatedMediaSelected,
                    menuItems: [
                        { name: 'No media type emulation', value: '' },
                        { name: 'screen', value: 'screen' },
                        { name: 'print', value: 'print' }
                    ],
                },
                {
                    onItemSelected: this.onPrefersColorSchemeSelected,
                    menuItems: [
                        { name: 'No prefers-color-scheme emulation', value: '' },
                        { name: 'prefers-color-scheme: light', value: 'light' },
                        { name: 'prefers-color-scheme: dark', value: 'dark' },
                    ]
                },
                {
                    onItemSelected: this.onForcedColorsSelected,
                    menuItems: [
                        { name: 'No forced-colors emulation', value: '' },
                        { name: 'forced-colors: none', value: 'none' },
                        { name: 'forced-colors: active', value: 'active' }
                    ]
                }
            ]
        }).template()}
            ${new flyoutMenuComponent_1.default({
            iconName: 'codicon-eye',
            title: 'Emulate vision deficiencies',
            offsetDirection: flyoutMenuComponent_1.OffsetDirection.Right,
            menuItemSections: [
                {
                    onItemSelected: this.onVisionDeficiencySelected,
                    menuItems: [
                        { name: 'No vision deficiency emulation', value: 'none' },
                        { name: 'Blurred vision', value: 'blurredVision' },
                        { name: 'Protanopia', value: 'protanopia' },
                        { name: 'Deuteranopia', value: 'deuteranopia' },
                        { name: 'Tritanopia', value: 'tritanopia' },
                        { name: 'Achromatopsia', value: 'achromatopsia' },
                    ]
                }
            ]
        }).template()}
        `, document.getElementById('emulation-bar-left'));
        this.cdpConnection.registerForEvent('Page.frameNavigated', result => this.onFrameNavigated(result));
        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onScreencastFrame(result));
        this.cdpConnection.registerForEvent('Page.screencastVisibilityChanged', result => this.onScreencastVisibilityChanged(result));
        // This message comes from the DevToolsPanel instance.
        this.cdpConnection.registerForEvent('DevTools.toggleInspect', result => this.onToggleInspect(result));
        this.cdpConnection.registerWriteToClipboardFunction(result => this.onSaveToClipboard(result));
        this.cdpConnection.registerReadClipboardAndPasteFunction(() => this.getClipboardContents());
        this.cdpConnection.registerForEvent('readClipboard', clipboardContents => this.pasteClipboardContents(clipboardContents));
        this.inputHandler = new input_1.ScreencastInputHandler(this.cdpConnection);
        this.cdpConnection.sendMessageToBackend('Page.enable', {});
        // Optimizing the resize event to limit how often can it be called.
        let resizeTimeout = 0;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateEmulation(), 100);
        });
        this.registerInputListeners();
        // Start screencast
        this.updateEmulation();
        this.updateHistory();
    }
    registerInputListeners() {
        // Disable context menu on screencast image
        this.screencastImage.addEventListener('contextmenu', event => event.preventDefault());
        for (const eventName of Object.keys(input_1.MouseEventMap)) {
            this.screencastImage.addEventListener(eventName, event => {
                const scale = this.screencastImage.offsetWidth / this.emulatedWidth;
                const mouseEvent = event;
                if (this.isTouchMode && !this.inspectMode) {
                    this.inputHandler.emitTouchFromMouseEvent(mouseEvent, scale);
                }
                else if (mouseEvent.button !== 2 /* right click */) {
                    this.inputHandler.emitMouseEvent(mouseEvent, scale);
                }
            });
        }
        for (const eventName of ['keydown', 'keyup']) {
            this.screencastImage.addEventListener(eventName, event => {
                this.inputHandler.emitKeyEvent(event);
            });
        }
    }
    updateHistory() {
        this.cdpConnection.sendMessageToBackend('Page.getNavigationHistory', {}, result => {
            const { currentIndex, entries } = result;
            this.history = entries;
            this.historyIndex = currentIndex;
            this.backButton.disabled = this.historyIndex < 1;
            this.forwardButton.disabled = this.historyIndex >= this.history.length - 1;
            this.urlInput.value = this.history[this.historyIndex].url;
        });
    }
    updateEmulation() {
        const isTouch = this.isTouchMode;
        const deviceMetricsParams = {
            width: this.emulatedWidth,
            height: this.emulatedHeight,
            deviceScaleFactor: 0,
            mobile: isTouch,
        };
        const touchEmulationParams = {
            enabled: isTouch,
            maxTouchPoints: 1,
        };
        this.cdpConnection.sendMessageToBackend('Emulation.setUserAgentOverride', {
            userAgent: this.deviceUserAgent,
        });
        this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', deviceMetricsParams);
        this.cdpConnection.sendMessageToBackend('Emulation.setTouchEmulationEnabled', touchEmulationParams);
        this.updateScreencast();
    }
    updateScreencast() {
        const screencastParams = {
            format: 'png',
            quality: 100,
            maxWidth: Math.floor(this.emulatedWidth * window.devicePixelRatio),
            maxHeight: Math.floor(this.emulatedHeight * window.devicePixelRatio)
        };
        this.cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
    }
    onBackClick() {
        if (this.historyIndex > 0) {
            const entryId = this.history[this.historyIndex - 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', { entryId });
        }
    }
    onForwardClick() {
        if (this.historyIndex < this.history.length - 1) {
            const entryId = this.history[this.historyIndex + 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', { entryId });
        }
    }
    onFrameNavigated({ frame }) {
        if (!frame.parentId) {
            this.updateHistory();
        }
    }
    onInspectClick() {
        cdp_1.vscode.postMessage({ type: 'open-devtools' });
    }
    onReloadClick() {
        this.cdpConnection.sendMessageToBackend('Page.reload', {});
    }
    onUrlKeyDown(event) {
        let url = this.urlInput.value;
        if (event.key === 'Enter' && url) {
            if (url.startsWith('/') || url[1] === ':') {
                try {
                    url = new URL(`file://${url}`).href;
                }
                catch (e) {
                    // Try the original URL if it can't be converted to a file URL.
                }
            }
            if (!url.startsWith('http:') && !url.startsWith('file:')) {
                url = 'http://' + url;
            }
            this.cdpConnection.sendMessageToBackend('Page.navigate', { url });
        }
    }
    onScreencastFrame({ data, sessionId }) {
        const expectedRatio = this.emulatedWidth / this.emulatedHeight;
        const actualRatio = this.screencastImage.naturalWidth / this.screencastImage.naturalHeight;
        this.screencastImage.src = `data:image/png;base64,${data}`;
        if (expectedRatio !== actualRatio) {
            this.updateEmulation();
        }
        this.cdpConnection.sendMessageToBackend('Page.screencastFrameAck', { sessionId });
    }
    onScreencastVisibilityChanged({ visible }) {
        this.inactiveOverlay.hidden = visible;
    }
    onToggleInspect({ enabled }) {
        this.setTouchMode(!enabled);
    }
    onSaveToClipboard(message) {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => cdp_1.vscode.postMessage(msg, '*'), 'writeToClipboard', {
            data: {
                message,
            },
        });
    }
    sendEmulationTelemetry(event, value) {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => cdp_1.vscode.postMessage(msg, '*'), 'telemetry', {
            event: 'screencast',
            name: 'Screencast.Emulation',
            data: {
                event,
                value
            }
        });
    }
    getClipboardContents() {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => cdp_1.vscode.postMessage(msg, '*'), 'readClipboard');
    }
    pasteClipboardContents(message) {
        this.cdpConnection.sendMessageToBackend('Runtime.evaluate', {
            expression: `document.execCommand("insertText", false, "${message.replace(/"/g, '\\"')}");`,
        });
    }
    setTouchMode(enabled) {
        const touchEventsParams = {
            enabled,
            configuration: enabled ? 'mobile' : 'desktop',
        };
        this.screencastImage.classList.toggle('touch', enabled);
        this.cdpConnection.sendMessageToBackend('Emulation.setEmitTouchEventsForMouse', touchEventsParams);
        this.isTouchMode = enabled;
    }
}
exports.Screencast = Screencast;


/***/ }),

/***/ "./node_modules/lit-html/development/async-directive.js":
/*!**************************************************************!*\
  !*** ./node_modules/lit-html/development/async-directive.js ***!
  \**************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "directive": () => (/* reexport safe */ _directive_js__WEBPACK_IMPORTED_MODULE_1__.directive),
/* harmony export */   "AsyncDirective": () => (/* binding */ AsyncDirective)
/* harmony export */ });
/* harmony import */ var _directive_helpers_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./directive-helpers.js */ "./node_modules/lit-html/development/directive-helpers.js");
/* harmony import */ var _directive_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./directive.js */ "./node_modules/lit-html/development/directive.js");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */



const DEV_MODE = true;
/**
 * Recursively walks down the tree of Parts/TemplateInstances/Directives to set
 * the connected state of directives and run `disconnected`/ `reconnected`
 * callbacks.
 *
 * @return True if there were children to disconnect; false otherwise
 */
const notifyChildrenConnectedChanged = (parent, isConnected) => {
    var _a, _b;
    const children = parent._$disconnectableChildren;
    if (children === undefined) {
        return false;
    }
    for (const obj of children) {
        // The existence of `_$notifyDirectiveConnectionChanged` is used as a "brand" to
        // disambiguate AsyncDirectives from other DisconnectableChildren
        // (as opposed to using an instanceof check to know when to call it); the
        // redundancy of "Directive" in the API name is to avoid conflicting with
        // `_$notifyConnectionChanged`, which exists `ChildParts` which are also in
        // this list
        // Disconnect Directive (and any nested directives contained within)
        // This property needs to remain unminified.
        (_b = (_a = obj)['_$notifyDirectiveConnectionChanged']) === null || _b === void 0 ? void 0 : _b.call(_a, isConnected, false);
        // Disconnect Part/TemplateInstance
        notifyChildrenConnectedChanged(obj, isConnected);
    }
    return true;
};
/**
 * Removes the given child from its parent list of disconnectable children, and
 * if the parent list becomes empty as a result, removes the parent from its
 * parent, and so forth up the tree when that causes subsequent parent lists to
 * become empty.
 */
const removeDisconnectableFromParent = (obj) => {
    let parent, children;
    do {
        if ((parent = obj._$parent) === undefined) {
            break;
        }
        children = parent._$disconnectableChildren;
        children.delete(obj);
        obj = parent;
    } while ((children === null || children === void 0 ? void 0 : children.size) === 0);
};
const addDisconnectableToParent = (obj) => {
    // Climb the parent tree, creating a sparse tree of children needing
    // disconnection
    for (let parent; (parent = obj._$parent); obj = parent) {
        let children = parent._$disconnectableChildren;
        if (children === undefined) {
            parent._$disconnectableChildren = children = new Set();
        }
        else if (children.has(obj)) {
            // Once we've reached a parent that already contains this child, we
            // can short-circuit
            break;
        }
        children.add(obj);
        installDisconnectAPI(parent);
    }
};
/**
 * Changes the parent reference of the ChildPart, and updates the sparse tree of
 * Disconnectable children accordingly.
 *
 * Note, this method will be patched onto ChildPart instances and called from
 * the core code when parts are moved between different parents.
 */
function reparentDisconnectables(newParent) {
    if (this._$disconnectableChildren !== undefined) {
        removeDisconnectableFromParent(this);
        this._$parent = newParent;
        addDisconnectableToParent(this);
    }
    else {
        this._$parent = newParent;
    }
}
/**
 * Sets the connected state on any directives contained within the committed
 * value of this part (i.e. within a TemplateInstance or iterable of
 * ChildParts) and runs their `disconnected`/`reconnected`s, as well as within
 * any directives stored on the ChildPart (when `valueOnly` is false).
 *
 * `isClearingValue` should be passed as `true` on a top-level part that is
 * clearing itself, and not as a result of recursively disconnecting directives
 * as part of a `clear` operation higher up the tree. This both ensures that any
 * directive on this ChildPart that produced a value that caused the clear
 * operation is not disconnected, and also serves as a performance optimization
 * to avoid needless bookkeeping when a subtree is going away; when clearing a
 * subtree, only the top-most part need to remove itself from the parent.
 *
 * `fromPartIndex` is passed only in the case of a partial `_clear` running as a
 * result of truncating an iterable.
 *
 * Note, this method will be patched onto ChildPart instances and called from the
 * core code when parts are cleared or the connection state is changed by the
 * user.
 */
function notifyChildPartConnectedChanged(isConnected, isClearingValue = false, fromPartIndex = 0) {
    const value = this._$committedValue;
    const children = this._$disconnectableChildren;
    if (children === undefined || children.size === 0) {
        return;
    }
    if (isClearingValue) {
        if (Array.isArray(value)) {
            // Iterable case: Any ChildParts created by the iterable should be
            // disconnected and removed from this ChildPart's disconnectable
            // children (starting at `fromPartIndex` in the case of truncation)
            for (let i = fromPartIndex; i < value.length; i++) {
                notifyChildrenConnectedChanged(value[i], false);
                removeDisconnectableFromParent(value[i]);
            }
        }
        else if (value != null) {
            // TemplateInstance case: If the value has disconnectable children (will
            // only be in the case that it is a TemplateInstance), we disconnect it
            // and remove it from this ChildPart's disconnectable children
            notifyChildrenConnectedChanged(value, false);
            removeDisconnectableFromParent(value);
        }
    }
    else {
        notifyChildrenConnectedChanged(this, isConnected);
    }
}
/**
 * Patches disconnection API onto ChildParts.
 */
const installDisconnectAPI = (obj) => {
    var _a, _b;
    var _c, _d;
    if (obj.type == _directive_js__WEBPACK_IMPORTED_MODULE_1__.PartType.CHILD) {
        (_a = (_c = obj)._$notifyConnectionChanged) !== null && _a !== void 0 ? _a : (_c._$notifyConnectionChanged = notifyChildPartConnectedChanged);
        (_b = (_d = obj)._$reparentDisconnectables) !== null && _b !== void 0 ? _b : (_d._$reparentDisconnectables = reparentDisconnectables);
    }
};
/**
 * An abstract `Directive` base class whose `disconnected` method will be
 * called when the part containing the directive is cleared as a result of
 * re-rendering, or when the user calls `part.setConnected(false)` on
 * a part that was previously rendered containing the directive (as happens
 * when e.g. a LitElement disconnects from the DOM).
 *
 * If `part.setConnected(true)` is subsequently called on a
 * containing part, the directive's `reconnected` method will be called prior
 * to its next `update`/`render` callbacks. When implementing `disconnected`,
 * `reconnected` should also be implemented to be compatible with reconnection.
 *
 * Note that updates may occur while the directive is disconnected. As such,
 * directives should generally check the `this.isConnected` flag during
 * render/update to determine whether it is safe to subscribe to resources
 * that may prevent garbage collection.
 */
class AsyncDirective extends _directive_js__WEBPACK_IMPORTED_MODULE_1__.Directive {
    constructor() {
        super(...arguments);
        // @internal
        this._$disconnectableChildren = undefined;
    }
    /**
     * Initialize the part with internal fields
     * @param part
     * @param parent
     * @param attributeIndex
     */
    _$initialize(part, parent, attributeIndex) {
        super._$initialize(part, parent, attributeIndex);
        addDisconnectableToParent(this);
        this.isConnected = part._$isConnected;
    }
    // This property needs to remain unminified.
    /**
     * Called from the core code when a directive is going away from a part (in
     * which case `shouldRemoveFromParent` should be true), and from the
     * `setChildrenConnected` helper function when recursively changing the
     * connection state of a tree (in which case `shouldRemoveFromParent` should
     * be false).
     *
     * @param isConnected
     * @param isClearingDirective - True when the directive itself is being
     *     removed; false when the tree is being disconnected
     * @internal
     */
    ['_$notifyDirectiveConnectionChanged'](isConnected, isClearingDirective = true) {
        var _a, _b;
        if (isConnected !== this.isConnected) {
            this.isConnected = isConnected;
            if (isConnected) {
                (_a = this.reconnected) === null || _a === void 0 ? void 0 : _a.call(this);
            }
            else {
                (_b = this.disconnected) === null || _b === void 0 ? void 0 : _b.call(this);
            }
        }
        if (isClearingDirective) {
            notifyChildrenConnectedChanged(this, isConnected);
            removeDisconnectableFromParent(this);
        }
    }
    /**
     * Sets the value of the directive's Part outside the normal `update`/`render`
     * lifecycle of a directive.
     *
     * This method should not be called synchronously from a directive's `update`
     * or `render`.
     *
     * @param directive The directive to update
     * @param value The value to set
     */
    setValue(value) {
        if ((0,_directive_helpers_js__WEBPACK_IMPORTED_MODULE_0__.isSingleExpression)(this.__part)) {
            this.__part._$setValue(value, this);
        }
        else {
            // this.__attributeIndex will be defined in this case, but
            // assert it in dev mode
            if (DEV_MODE && this.__attributeIndex === undefined) {
                throw new Error(`Expected this.__attributeIndex to be a number`);
            }
            const newValues = [...this.__part._$committedValue];
            newValues[this.__attributeIndex] = value;
            this.__part._$setValue(newValues, this, 0);
        }
    }
    /**
     * User callbacks for implementing logic to release any resources/subscriptions
     * that may have been retained by this directive. Since directives may also be
     * re-connected, `reconnected` should also be implemented to restore the
     * working state of the directive prior to the next render.
     */
    disconnected() { }
    reconnected() { }
}
//# sourceMappingURL=async-directive.js.map

/***/ }),

/***/ "./node_modules/lit-html/development/directive-helpers.js":
/*!****************************************************************!*\
  !*** ./node_modules/lit-html/development/directive-helpers.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isPrimitive": () => (/* binding */ isPrimitive),
/* harmony export */   "TemplateResultType": () => (/* binding */ TemplateResultType),
/* harmony export */   "isTemplateResult": () => (/* binding */ isTemplateResult),
/* harmony export */   "isDirectiveResult": () => (/* binding */ isDirectiveResult),
/* harmony export */   "getDirectiveClass": () => (/* binding */ getDirectiveClass),
/* harmony export */   "isSingleExpression": () => (/* binding */ isSingleExpression),
/* harmony export */   "insertPart": () => (/* binding */ insertPart),
/* harmony export */   "setChildPartValue": () => (/* binding */ setChildPartValue),
/* harmony export */   "setCommittedValue": () => (/* binding */ setCommittedValue),
/* harmony export */   "getCommittedValue": () => (/* binding */ getCommittedValue),
/* harmony export */   "removePart": () => (/* binding */ removePart),
/* harmony export */   "clearPart": () => (/* binding */ clearPart)
/* harmony export */ });
/* harmony import */ var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lit-html.js */ "./node_modules/lit-html/development/lit-html.js");
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var _a, _b;

const { _ChildPart: ChildPart } = _lit_html_js__WEBPACK_IMPORTED_MODULE_0__._$LH;
const ENABLE_SHADYDOM_NOPATCH = true;
const wrap = ENABLE_SHADYDOM_NOPATCH &&
    ((_a = window.ShadyDOM) === null || _a === void 0 ? void 0 : _a.inUse) &&
    ((_b = window.ShadyDOM) === null || _b === void 0 ? void 0 : _b.noPatch) === true
    ? window.ShadyDOM.wrap
    : (node) => node;
/**
 * Tests if a value is a primitive value.
 *
 * See https://tc39.github.io/ecma262/#sec-typeof-operator
 */
const isPrimitive = (value) => value === null || (typeof value != 'object' && typeof value != 'function');
const TemplateResultType = {
    HTML: 1,
    SVG: 2,
};
/**
 * Tests if a value is a TemplateResult.
 */
const isTemplateResult = (value, type) => {
    var _a, _b;
    return type === undefined
        ? // This property needs to remain unminified.
            ((_a = value) === null || _a === void 0 ? void 0 : _a['_$litType$']) !== undefined
        : ((_b = value) === null || _b === void 0 ? void 0 : _b['_$litType$']) === type;
};
/**
 * Tests if a value is a DirectiveResult.
 */
const isDirectiveResult = (value) => { var _a; 
// This property needs to remain unminified.
return ((_a = value) === null || _a === void 0 ? void 0 : _a['_$litDirective$']) !== undefined; };
/**
 * Retrieves the Directive class for a DirectiveResult
 */
const getDirectiveClass = (value) => { var _a; 
// This property needs to remain unminified.
return (_a = value) === null || _a === void 0 ? void 0 : _a['_$litDirective$']; };
/**
 * Tests whether a part has only a single-expression with no strings to
 * interpolate between.
 *
 * Only AttributePart and PropertyPart can have multiple expressions.
 * Multi-expression parts have a `strings` property and single-expression
 * parts do not.
 */
const isSingleExpression = (part) => part.strings === undefined;
const createMarker = () => document.createComment('');
/**
 * Inserts a ChildPart into the given container ChildPart's DOM, either at the
 * end of the container ChildPart, or before the optional `refPart`.
 *
 * This does not add the part to the containerPart's committed value. That must
 * be done by callers.
 *
 * @param containerPart Part within which to add the new ChildPart
 * @param refPart Part before which to add the new ChildPart; when omitted the
 *     part added to the end of the `containerPart`
 * @param part Part to insert, or undefined to create a new part
 */
const insertPart = (containerPart, refPart, part) => {
    var _a;
    const container = wrap(containerPart._$startNode).parentNode;
    const refNode = refPart === undefined ? containerPart._$endNode : refPart._$startNode;
    if (part === undefined) {
        const startNode = wrap(container).insertBefore(createMarker(), refNode);
        const endNode = wrap(container).insertBefore(createMarker(), refNode);
        part = new ChildPart(startNode, endNode, containerPart, containerPart.options);
    }
    else {
        const endNode = wrap(part._$endNode).nextSibling;
        const oldParent = part._$parent;
        const parentChanged = oldParent !== containerPart;
        if (parentChanged) {
            (_a = part._$reparentDisconnectables) === null || _a === void 0 ? void 0 : _a.call(part, containerPart);
            // Note that although `_$reparentDisconnectables` updates the part's
            // `_$parent` reference after unlinking from its current parent, that
            // method only exists if Disconnectables are present, so we need to
            // unconditionally set it here
            part._$parent = containerPart;
            // Since the _$isConnected getter is somewhat costly, only
            // read it once we know the subtree has directives that need
            // to be notified
            let newConnectionState;
            if (part._$notifyConnectionChanged !== undefined &&
                (newConnectionState = containerPart._$isConnected) !==
                    oldParent._$isConnected) {
                part._$notifyConnectionChanged(newConnectionState);
            }
        }
        if (endNode !== refNode || parentChanged) {
            let start = part._$startNode;
            while (start !== endNode) {
                const n = wrap(start).nextSibling;
                wrap(container).insertBefore(start, refNode);
                start = n;
            }
        }
    }
    return part;
};
/**
 * Sets the value of a Part.
 *
 * Note that this should only be used to set/update the value of user-created
 * parts (i.e. those created using `insertPart`); it should not be used
 * by directives to set the value of the directive's container part. Directives
 * should return a value from `update`/`render` to update their part state.
 *
 * For directives that require setting their part value asynchronously, they
 * should extend `AsyncDirective` and call `this.setValue()`.
 *
 * @param part Part to set
 * @param value Value to set
 * @param index For `AttributePart`s, the index to set
 * @param directiveParent Used internally; should not be set by user
 */
const setChildPartValue = (part, value, directiveParent = part) => {
    part._$setValue(value, directiveParent);
    return part;
};
// A sentinal value that can never appear as a part value except when set by
// live(). Used to force a dirty-check to fail and cause a re-render.
const RESET_VALUE = {};
/**
 * Sets the committed value of a ChildPart directly without triggering the
 * commit stage of the part.
 *
 * This is useful in cases where a directive needs to update the part such
 * that the next update detects a value change or not. When value is omitted,
 * the next update will be guaranteed to be detected as a change.
 *
 * @param part
 * @param value
 */
const setCommittedValue = (part, value = RESET_VALUE) => (part._$committedValue = value);
/**
 * Returns the committed value of a ChildPart.
 *
 * The committed value is used for change detection and efficient updates of
 * the part. It can differ from the value set by the template or directive in
 * cases where the template value is transformed before being commited.
 *
 * - `TemplateResult`s are committed as a `TemplateInstance`
 * - Iterables are committed as `Array<ChildPart>`
 * - All other types are committed as the template value or value returned or
 *   set by a directive.
 *
 * @param part
 */
const getCommittedValue = (part) => part._$committedValue;
/**
 * Removes a ChildPart from the DOM, including any of its content.
 *
 * @param part The Part to remove
 */
const removePart = (part) => {
    var _a;
    (_a = part._$notifyConnectionChanged) === null || _a === void 0 ? void 0 : _a.call(part, false, true);
    let start = part._$startNode;
    const end = wrap(part._$endNode).nextSibling;
    while (start !== end) {
        const n = wrap(start).nextSibling;
        wrap(start).remove();
        start = n;
    }
};
const clearPart = (part) => {
    part._$clear();
};
//# sourceMappingURL=directive-helpers.js.map

/***/ }),

/***/ "./node_modules/lit-html/development/directive.js":
/*!********************************************************!*\
  !*** ./node_modules/lit-html/development/directive.js ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PartType": () => (/* binding */ PartType),
/* harmony export */   "directive": () => (/* binding */ directive),
/* harmony export */   "Directive": () => (/* binding */ Directive)
/* harmony export */ });
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const PartType = {
    ATTRIBUTE: 1,
    CHILD: 2,
    PROPERTY: 3,
    BOOLEAN_ATTRIBUTE: 4,
    EVENT: 5,
    ELEMENT: 6,
};
/**
 * Creates a user-facing directive function from a Directive class. This
 * function has the same parameters as the directive's render() method.
 */
const directive = (c) => (...values) => ({
    // This property needs to remain unminified.
    ['_$litDirective$']: c,
    values,
});
/**
 * Base class for creating custom directives. Users should extend this class,
 * implement `render` and/or `update`, and then pass their subclass to
 * `directive`.
 */
class Directive {
    constructor(_partInfo) { }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    /** @internal */
    _$initialize(part, parent, attributeIndex) {
        this.__part = part;
        this._$parent = parent;
        this.__attributeIndex = attributeIndex;
    }
    /** @internal */
    _$resolve(part, props) {
        return this.update(part, props);
    }
    update(_part, props) {
        return this.render(...props);
    }
}
//# sourceMappingURL=directive.js.map

/***/ }),

/***/ "./node_modules/lit-html/development/directives/ref.js":
/*!*************************************************************!*\
  !*** ./node_modules/lit-html/development/directives/ref.js ***!
  \*************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createRef": () => (/* binding */ createRef),
/* harmony export */   "ref": () => (/* binding */ ref)
/* harmony export */ });
/* harmony import */ var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lit-html.js */ "./node_modules/lit-html/development/lit-html.js");
/* harmony import */ var _async_directive_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../async-directive.js */ "./node_modules/lit-html/development/async-directive.js");
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */


/**
 * Creates a new Ref object, which is container for a reference to an element.
 */
const createRef = () => new Ref();
/**
 * An object that holds a ref value.
 */
class Ref {
}
// When callbacks are used for refs, this map tracks the last value the callback
// was called with, for ensuring a directive doesn't clear the ref if the ref
// has already been rendered to a new spot. It is double-keyed on both the
// context (`options.host`) and the callback, since we auto-bind class methods
// to `options.host`.
const lastElementForContextAndCallback = new WeakMap();
class RefDirective extends _async_directive_js__WEBPACK_IMPORTED_MODULE_1__.AsyncDirective {
    render(_ref) {
        return _lit_html_js__WEBPACK_IMPORTED_MODULE_0__.nothing;
    }
    update(part, [ref]) {
        var _a;
        const refChanged = ref !== this._ref;
        if (refChanged && this._ref !== undefined) {
            // The ref passed to the directive has changed;
            // unset the previous ref's value
            this._updateRefValue(undefined);
        }
        if (refChanged || this._lastElementForRef !== this._element) {
            // We either got a new ref or this is the first render;
            // store the ref/element & update the ref value
            this._ref = ref;
            this._context = (_a = part.options) === null || _a === void 0 ? void 0 : _a.host;
            this._updateRefValue((this._element = part.element));
        }
        return _lit_html_js__WEBPACK_IMPORTED_MODULE_0__.nothing;
    }
    _updateRefValue(element) {
        var _a;
        if (typeof this._ref === 'function') {
            // If the current ref was called with a previous value, call with
            // `undefined`; We do this to ensure callbacks are called in a consistent
            // way regardless of whether a ref might be moving up in the tree (in
            // which case it would otherwise be called with the new value before the
            // previous one unsets it) and down in the tree (where it would be unset
            // before being set). Note that element lookup is keyed by
            // both the context and the callback, since we allow passing unbound
            // functions that are called on options.host, and we want to treat
            // these as unique "instances" of a function.
            const context = (_a = this._context) !== null && _a !== void 0 ? _a : globalThis;
            let lastElementForCallback = lastElementForContextAndCallback.get(context);
            if (lastElementForCallback === undefined) {
                lastElementForCallback = new WeakMap();
                lastElementForContextAndCallback.set(context, lastElementForCallback);
            }
            if (lastElementForCallback.get(this._ref) !== undefined) {
                this._ref.call(this._context, undefined);
            }
            lastElementForCallback.set(this._ref, element);
            // Call the ref with the new element value
            if (element !== undefined) {
                this._ref.call(this._context, element);
            }
        }
        else {
            this._ref.value = element;
        }
    }
    get _lastElementForRef() {
        var _a, _b, _c;
        return typeof this._ref === 'function'
            ? (_b = lastElementForContextAndCallback
                .get((_a = this._context) !== null && _a !== void 0 ? _a : globalThis)) === null || _b === void 0 ? void 0 : _b.get(this._ref)
            : (_c = this._ref) === null || _c === void 0 ? void 0 : _c.value;
    }
    disconnected() {
        // Only clear the box if our element is still the one in it (i.e. another
        // directive instance hasn't rendered its element to it before us); that
        // only happens in the event of the directive being cleared (not via manual
        // disconnection)
        if (this._lastElementForRef === this._element) {
            this._updateRefValue(undefined);
        }
    }
    reconnected() {
        // If we were manually disconnected, we can safely put our element back in
        // the box, since no rendering could have occurred to change its state
        this._updateRefValue(this._element);
    }
}
/**
 * Sets the value of a Ref object or calls a ref callback with the element it's
 * bound to.
 *
 * A Ref object acts as a container for a reference to an element. A ref
 * callback is a function that takes an element as its only argument.
 *
 * The ref directive sets the value of the Ref object or calls the ref callback
 * during rendering, if the referenced element changed.
 *
 * Note: If a ref callback is rendered to a different element position or is
 * removed in a subsequent render, it will first be called with `undefined`,
 * followed by another call with the new element it was rendered to (if any).
 *
 * ```js
 * // Using Ref object
 * const inputRef = createRef();
 * render(html`<input ${ref(inputRef)}>`, container);
 * inputRef.value.focus();
 *
 * // Using callback
 * const callback = (inputElement) => inputElement.focus();
 * render(html`<input ${ref(callback)}>`, container);
 * ```
 */
const ref = (0,_async_directive_js__WEBPACK_IMPORTED_MODULE_1__.directive)(RefDirective);
//# sourceMappingURL=ref.js.map

/***/ }),

/***/ "./node_modules/lit-html/development/directives/style-map.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lit-html/development/directives/style-map.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "styleMap": () => (/* binding */ styleMap)
/* harmony export */ });
/* harmony import */ var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lit-html.js */ "./node_modules/lit-html/development/lit-html.js");
/* harmony import */ var _directive_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../directive.js */ "./node_modules/lit-html/development/directive.js");
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */


class StyleMapDirective extends _directive_js__WEBPACK_IMPORTED_MODULE_1__.Directive {
    constructor(partInfo) {
        var _a;
        super(partInfo);
        if (partInfo.type !== _directive_js__WEBPACK_IMPORTED_MODULE_1__.PartType.ATTRIBUTE ||
            partInfo.name !== 'style' ||
            ((_a = partInfo.strings) === null || _a === void 0 ? void 0 : _a.length) > 2) {
            throw new Error('The `styleMap` directive must be used in the `style` attribute ' +
                'and must be the only part in the attribute.');
        }
    }
    render(styleInfo) {
        return Object.keys(styleInfo).reduce((style, prop) => {
            const value = styleInfo[prop];
            if (value == null) {
                return style;
            }
            // Convert property names from camel-case to dash-case, i.e.:
            //  `backgroundColor` -> `background-color`
            // Vendor-prefixed names need an extra `-` appended to front:
            //  `webkitAppearance` -> `-webkit-appearance`
            // Exception is any property name containing a dash, including
            // custom properties; we assume these are already dash-cased i.e.:
            //  `--my-button-color` --> `--my-button-color`
            prop = prop
                .replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, '-$&')
                .toLowerCase();
            return style + `${prop}:${value};`;
        }, '');
    }
    update(part, [styleInfo]) {
        const { style } = part.element;
        if (this._previousStyleProperties === undefined) {
            this._previousStyleProperties = new Set();
            for (const name in styleInfo) {
                this._previousStyleProperties.add(name);
            }
            return this.render(styleInfo);
        }
        // Remove old properties that no longer exist in styleInfo
        // We use forEach() instead of for-of so that re don't require down-level
        // iteration.
        this._previousStyleProperties.forEach((name) => {
            // If the name isn't in styleInfo or it's null/undefined
            if (styleInfo[name] == null) {
                this._previousStyleProperties.delete(name);
                if (name.includes('-')) {
                    style.removeProperty(name);
                }
                else {
                    // Note reset using empty string (vs null) as IE11 does not always
                    // reset via null (https://developer.mozilla.org/en-US/docs/Web/API/ElementCSSInlineStyle/style#setting_styles)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style[name] = '';
                }
            }
        });
        // Add or update properties
        for (const name in styleInfo) {
            const value = styleInfo[name];
            if (value != null) {
                this._previousStyleProperties.add(name);
                if (name.includes('-')) {
                    style.setProperty(name, value);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style[name] = value;
                }
            }
        }
        return _lit_html_js__WEBPACK_IMPORTED_MODULE_0__.noChange;
    }
}
/**
 * A directive that applies CSS properties to an element.
 *
 * `styleMap` can only be used in the `style` attribute and must be the only
 * expression in the attribute. It takes the property names in the
 * {@link StyleInfo styleInfo} object and adds the property values as CSS
 * properties. Property names with dashes (`-`) are assumed to be valid CSS
 * property names and set on the element's style object using `setProperty()`.
 * Names without dashes are assumed to be camelCased JavaScript property names
 * and set on the element's style object using property assignment, allowing the
 * style object to translate JavaScript-style names to CSS property names.
 *
 * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
 * '0'})` sets the `background-color`, `border-top` and `--size` properties.
 *
 * @param styleInfo
 * @see {@link https://lit.dev/docs/templates/directives/#stylemap styleMap code samples on Lit.dev}
 */
const styleMap = (0,_directive_js__WEBPACK_IMPORTED_MODULE_1__.directive)(StyleMapDirective);
//# sourceMappingURL=style-map.js.map

/***/ }),

/***/ "./node_modules/lit-html/development/lit-html.js":
/*!*******************************************************!*\
  !*** ./node_modules/lit-html/development/lit-html.js ***!
  \*******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "INTERNAL": () => (/* binding */ INTERNAL),
/* harmony export */   "html": () => (/* binding */ html),
/* harmony export */   "svg": () => (/* binding */ svg),
/* harmony export */   "noChange": () => (/* binding */ noChange),
/* harmony export */   "nothing": () => (/* binding */ nothing),
/* harmony export */   "render": () => (/* binding */ render),
/* harmony export */   "_$LH": () => (/* binding */ _$LH)
/* harmony export */ });
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var _a, _b, _c, _d;
const DEV_MODE = true;
const ENABLE_EXTRA_SECURITY_HOOKS = true;
const ENABLE_SHADYDOM_NOPATCH = true;
/**
 * Useful for visualizing and logging insights into what the Lit template system is doing.
 *
 * Compiled out of prod mode builds.
 */
const debugLogEvent = DEV_MODE
    ? (event) => {
        const shouldEmit = window
            .emitLitDebugLogEvents;
        if (!shouldEmit) {
            return;
        }
        window.dispatchEvent(new CustomEvent('lit-debug', {
            detail: event,
        }));
    }
    : undefined;
// Used for connecting beginRender and endRender events when there are nested
// renders when errors are thrown preventing an endRender event from being
// called.
let debugLogRenderId = 0;
/**
 * `true` if we're building for google3 with temporary back-compat helpers.
 * This export is not present in prod builds.
 * @internal
 */
const INTERNAL = true;
let issueWarning;
if (DEV_MODE) {
    (_a = globalThis.litIssuedWarnings) !== null && _a !== void 0 ? _a : (globalThis.litIssuedWarnings = new Set());
    // Issue a warning, if we haven't already.
    issueWarning = (code, warning) => {
        warning += code
            ? ` See https://lit.dev/msg/${code} for more information.`
            : '';
        if (!globalThis.litIssuedWarnings.has(warning)) {
            console.warn(warning);
            globalThis.litIssuedWarnings.add(warning);
        }
    };
    issueWarning('dev-mode', `Lit is in dev mode. Not recommended for production!`);
}
const wrap = ENABLE_SHADYDOM_NOPATCH &&
    ((_b = window.ShadyDOM) === null || _b === void 0 ? void 0 : _b.inUse) &&
    ((_c = window.ShadyDOM) === null || _c === void 0 ? void 0 : _c.noPatch) === true
    ? window.ShadyDOM.wrap
    : (node) => node;
const trustedTypes = globalThis.trustedTypes;
/**
 * Our TrustedTypePolicy for HTML which is declared using the html template
 * tag function.
 *
 * That HTML is a developer-authored constant, and is parsed with innerHTML
 * before any untrusted expressions have been mixed in. Therefor it is
 * considered safe by construction.
 */
const policy = trustedTypes
    ? trustedTypes.createPolicy('lit-html', {
        createHTML: (s) => s,
    })
    : undefined;
const identityFunction = (value) => value;
const noopSanitizer = (_node, _name, _type) => identityFunction;
/** Sets the global sanitizer factory. */
const setSanitizer = (newSanitizer) => {
    if (!ENABLE_EXTRA_SECURITY_HOOKS) {
        return;
    }
    if (sanitizerFactoryInternal !== noopSanitizer) {
        throw new Error(`Attempted to overwrite existing lit-html security policy.` +
            ` setSanitizeDOMValueFactory should be called at most once.`);
    }
    sanitizerFactoryInternal = newSanitizer;
};
/**
 * Only used in internal tests, not a part of the public API.
 */
const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
    sanitizerFactoryInternal = noopSanitizer;
};
const createSanitizer = (node, name, type) => {
    return sanitizerFactoryInternal(node, name, type);
};
// Added to an attribute name to mark the attribute as bound so we can find
// it easily.
const boundAttributeSuffix = '$lit$';
// This marker is used in many syntactic positions in HTML, so it must be
// a valid element name and attribute name. We don't support dynamic names (yet)
// but this at least ensures that the parse tree is closer to the template
// intention.
const marker = `lit$${String(Math.random()).slice(9)}$`;
// String used to tell if a comment is a marker comment
const markerMatch = '?' + marker;
// Text used to insert a comment marker node. We use processing instruction
// syntax because it's slightly smaller, but parses as a comment node.
const nodeMarker = `<${markerMatch}>`;
const d = document;
// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = (v = '') => d.createComment(v);
const isPrimitive = (value) => value === null || (typeof value != 'object' && typeof value != 'function');
const isArray = Array.isArray;
const isIterable = (value) => {
    var _a;
    return isArray(value) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof ((_a = value) === null || _a === void 0 ? void 0 : _a[Symbol.iterator]) === 'function';
};
const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;
// These regexes represent the five parsing states that we care about in the
// Template's HTML scanner. They match the *end* of the state they're named
// after.
// Depending on the match, we transition to a new state. If there's no match,
// we stay in the same state.
// Note that the regexes are stateful. We utilize lastIndex and sync it
// across the multiple regexes used. In addition to the five regexes below
// we also dynamically create a regex to find the matching end tags for raw
// text elements.
/**
 * End of text is: `<` followed by:
 *   (comment start) or (tag) or (dynamic tag binding)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;
const commentEndRegex = /-->/g;
/**
 * Comments not started with <!--, like </{, can be ended by a single `>`
 */
const comment2EndRegex = />/g;
/**
 * The tagEnd regex matches the end of the "inside an opening" tag syntax
 * position. It either matches a `>`, an attribute-like sequence, or the end
 * of the string after a space (attribute-name position ending).
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" are HTML space characters:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * So an attribute is:
 *  * The name: any character except a whitespace character, ("), ('), ">",
 *    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const tagEndRegex = new RegExp(`>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`, 'g');
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;
const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
const rawTextElement = /^(?:script|style|textarea|title)$/i;
/** TemplateResult types */
const HTML_RESULT = 1;
const SVG_RESULT = 2;
// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;
/**
 * Generates a template literal tag function that returns a TemplateResult with
 * the given result type.
 */
const tag = (type) => (strings, ...values) => {
    // Warn against templates octal escape sequences
    // We do this here rather than in render so that the warning is closer to the
    // template definition.
    if (DEV_MODE && strings.some((s) => s === undefined)) {
        console.warn('Some template strings are undefined.\n' +
            'This is probably caused by illegal octal escape sequences.');
    }
    return {
        // This property needs to remain unminified.
        ['_$litType$']: type,
        strings,
        values,
    };
};
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const header = (title: string) => html`<h1>${title}</h1>`;
 * ```
 *
 * The `html` tag returns a description of the DOM to render as a value. It is
 * lazy, meaning no work is done until the template is rendered. When rendering,
 * if a template comes from the same expression as a previously rendered result,
 * it's efficiently updated instead of replaced.
 */
const html = tag(HTML_RESULT);
/**
 * Interprets a template literal as an SVG fragment that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const rect = svg`<rect width="10" height="10"></rect>`;
 *
 * const myImage = html`
 *   <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
 *     ${rect}
 *   </svg>`;
 * ```
 *
 * The `svg` *tag function* should only be used for SVG fragments, or elements
 * that would be contained **inside** an `<svg>` HTML element. A common error is
 * placing an `<svg>` *element* in a template tagged with the `svg` tag
 * function. The `<svg>` element is an HTML element and should be used within a
 * template tagged with the {@linkcode html} tag function.
 *
 * In LitElement usage, it's invalid to return an SVG fragment from the
 * `render()` method, as the SVG fragment will be contained within the element's
 * shadow root and thus cannot be used within an `<svg>` HTML element.
 */
const svg = tag(SVG_RESULT);
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = Symbol.for('lit-noChange');
/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Prefer using `nothing` over other falsy values as it provides a consistent
 * behavior between various expression binding contexts.
 *
 * In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
 * same and render no nodes. In attribute expressions, `nothing` _removes_ the
 * attribute, while `undefined` and `null` will render an empty string. In
 * property expressions `nothing` becomes `undefined`.
 */
const nothing = Symbol.for('lit-nothing');
/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - the must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const templateCache = new WeakMap();
/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 * @param value
 * @param container
 * @param options
 */
const render = (value, container, options) => {
    var _a, _b, _c;
    if (DEV_MODE && container == null) {
        // Give a clearer error message than
        //     Uncaught TypeError: Cannot read properties of null (reading
        //     '_$litPart$')
        // which reads like an internal Lit error.
        throw new TypeError(`The container to render into may not be ${container}`);
    }
    const renderId = DEV_MODE ? debugLogRenderId++ : 0;
    const partOwnerNode = (_a = options === null || options === void 0 ? void 0 : options.renderBefore) !== null && _a !== void 0 ? _a : container;
    // This property needs to remain unminified.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let part = partOwnerNode['_$litPart$'];
    debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
        kind: 'begin render',
        id: renderId,
        value,
        container,
        options,
        part,
    });
    if (part === undefined) {
        const endNode = (_b = options === null || options === void 0 ? void 0 : options.renderBefore) !== null && _b !== void 0 ? _b : null;
        // Internal modification: don't clear container to match lit-html 2.0
        if (INTERNAL &&
            ((_c = options) === null || _c === void 0 ? void 0 : _c.clearContainerForLit2MigrationOnly) ===
                true) {
            let n = container.firstChild;
            // Clear only up to the `endNode` aka `renderBefore` node.
            while (n && n !== endNode) {
                const next = n.nextSibling;
                n.remove();
                n = next;
            }
        }
        // This property needs to remain unminified.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        partOwnerNode['_$litPart$'] = part = new ChildPart(container.insertBefore(createMarker(), endNode), endNode, undefined, options !== null && options !== void 0 ? options : {});
    }
    part._$setValue(value);
    debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
        kind: 'end render',
        id: renderId,
        value,
        container,
        options,
        part,
    });
    return part;
};
if (ENABLE_EXTRA_SECURITY_HOOKS) {
    render.setSanitizer = setSanitizer;
    render.createSanitizer = createSanitizer;
    if (DEV_MODE) {
        render._testOnlyClearSanitizerFactoryDoNotCallOrElse =
            _testOnlyClearSanitizerFactoryDoNotCallOrElse;
    }
}
const walker = d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */, null, false);
let sanitizerFactoryInternal = noopSanitizer;
/**
 * Returns an HTML string for the given TemplateStringsArray and result type
 * (HTML or SVG), along with the case-sensitive bound attribute names in
 * template order. The HTML contains comment comment markers denoting the
 * `ChildPart`s and suffixes on bound attributes denoting the `AttributeParts`.
 *
 * @param strings template strings array
 * @param type HTML or SVG
 * @return Array containing `[html, attrNames]` (array returned for terseness,
 *     to avoid object fields since this code is shared with non-minified SSR
 *     code)
 */
const getTemplateHtml = (strings, type) => {
    // Insert makers into the template HTML to represent the position of
    // bindings. The following code scans the template strings to determine the
    // syntactic position of the bindings. They can be in text position, where
    // we insert an HTML comment, attribute value position, where we insert a
    // sentinel string and re-write the attribute name, or inside a tag where
    // we insert the sentinel string.
    const l = strings.length - 1;
    // Stores the case-sensitive bound attribute names in the order of their
    // parts. ElementParts are also reflected in this array as undefined
    // rather than a string, to disambiguate from attribute bindings.
    const attrNames = [];
    let html = type === SVG_RESULT ? '<svg>' : '';
    // When we're inside a raw text tag (not it's text content), the regex
    // will still be tagRegex so we can find attributes, but will switch to
    // this regex when the tag ends.
    let rawTextEndRegex;
    // The current parsing state, represented as a reference to one of the
    // regexes
    let regex = textEndRegex;
    for (let i = 0; i < l; i++) {
        const s = strings[i];
        // The index of the end of the last attribute name. When this is
        // positive at end of a string, it means we're in an attribute value
        // position and need to rewrite the attribute name.
        // We also use a special value of -2 to indicate that we encountered
        // the end of a string in attribute name position.
        let attrNameEndIndex = -1;
        let attrName;
        let lastIndex = 0;
        let match;
        // The conditions in this loop handle the current parse state, and the
        // assignments to the `regex` variable are the state transitions.
        while (lastIndex < s.length) {
            // Make sure we start searching from where we previously left off
            regex.lastIndex = lastIndex;
            match = regex.exec(s);
            if (match === null) {
                break;
            }
            lastIndex = regex.lastIndex;
            if (regex === textEndRegex) {
                if (match[COMMENT_START] === '!--') {
                    regex = commentEndRegex;
                }
                else if (match[COMMENT_START] !== undefined) {
                    // We started a weird comment, like </{
                    regex = comment2EndRegex;
                }
                else if (match[TAG_NAME] !== undefined) {
                    if (rawTextElement.test(match[TAG_NAME])) {
                        // Record if we encounter a raw-text element. We'll switch to
                        // this regex at the end of the tag.
                        rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
                    }
                    regex = tagEndRegex;
                }
                else if (match[DYNAMIC_TAG_NAME] !== undefined) {
                    if (DEV_MODE) {
                        throw new Error('Bindings in tag names are not supported. Please use static templates instead. ' +
                            'See https://lit.dev/docs/templates/expressions/#static-expressions');
                    }
                    regex = tagEndRegex;
                }
            }
            else if (regex === tagEndRegex) {
                if (match[ENTIRE_MATCH] === '>') {
                    // End of a tag. If we had started a raw-text element, use that
                    // regex
                    regex = rawTextEndRegex !== null && rawTextEndRegex !== void 0 ? rawTextEndRegex : textEndRegex;
                    // We may be ending an unquoted attribute value, so make sure we
                    // clear any pending attrNameEndIndex
                    attrNameEndIndex = -1;
                }
                else if (match[ATTRIBUTE_NAME] === undefined) {
                    // Attribute name position
                    attrNameEndIndex = -2;
                }
                else {
                    attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
                    attrName = match[ATTRIBUTE_NAME];
                    regex =
                        match[QUOTE_CHAR] === undefined
                            ? tagEndRegex
                            : match[QUOTE_CHAR] === '"'
                                ? doubleQuoteAttrEndRegex
                                : singleQuoteAttrEndRegex;
                }
            }
            else if (regex === doubleQuoteAttrEndRegex ||
                regex === singleQuoteAttrEndRegex) {
                regex = tagEndRegex;
            }
            else if (regex === commentEndRegex || regex === comment2EndRegex) {
                regex = textEndRegex;
            }
            else {
                // Not one of the five state regexes, so it must be the dynamically
                // created raw text regex and we're at the close of that element.
                regex = tagEndRegex;
                rawTextEndRegex = undefined;
            }
        }
        if (DEV_MODE) {
            // If we have a attrNameEndIndex, which indicates that we should
            // rewrite the attribute name, assert that we're in a valid attribute
            // position - either in a tag, or a quoted attribute value.
            console.assert(attrNameEndIndex === -1 ||
                regex === tagEndRegex ||
                regex === singleQuoteAttrEndRegex ||
                regex === doubleQuoteAttrEndRegex, 'unexpected parse state B');
        }
        // We have four cases:
        //  1. We're in text position, and not in a raw text element
        //     (regex === textEndRegex): insert a comment marker.
        //  2. We have a non-negative attrNameEndIndex which means we need to
        //     rewrite the attribute name to add a bound attribute suffix.
        //  3. We're at the non-first binding in a multi-binding attribute, use a
        //     plain marker.
        //  4. We're somewhere else inside the tag. If we're in attribute name
        //     position (attrNameEndIndex === -2), add a sequential suffix to
        //     generate a unique attribute name.
        // Detect a binding next to self-closing tag end and insert a space to
        // separate the marker from the tag end:
        const end = regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
        html +=
            regex === textEndRegex
                ? s + nodeMarker
                : attrNameEndIndex >= 0
                    ? (attrNames.push(attrName),
                        s.slice(0, attrNameEndIndex) +
                            boundAttributeSuffix +
                            s.slice(attrNameEndIndex)) +
                        marker +
                        end
                    : s +
                        marker +
                        (attrNameEndIndex === -2 ? (attrNames.push(undefined), i) : end);
    }
    const htmlResult = html + (strings[l] || '<?>') + (type === SVG_RESULT ? '</svg>' : '');
    // A security check to prevent spoofing of Lit template results.
    // In the future, we may be able to replace this with Array.isTemplateObject,
    // though we might need to make that check inside of the html and svg
    // functions, because precompiled templates don't come in as
    // TemplateStringArray objects.
    if (!Array.isArray(strings) || !strings.hasOwnProperty('raw')) {
        let message = 'invalid template strings array';
        if (DEV_MODE) {
            message = `
          Internal Error: expected template strings to be an array
          with a 'raw' field. Faking a template strings array by
          calling html or svg like an ordinary function is effectively
          the same as calling unsafeHtml and can lead to major security
          issues, e.g. opening your code up to XSS attacks.

          If you're using the html or svg tagged template functions normally
          and and still seeing this error, please file a bug at
          https://github.com/lit/lit/issues/new?template=bug_report.md
          and include information about your build tooling, if any.
        `
                .trim()
                .replace(/\n */g, '\n');
        }
        throw new Error(message);
    }
    // Returned as an array for terseness
    return [
        policy !== undefined
            ? policy.createHTML(htmlResult)
            : htmlResult,
        attrNames,
    ];
};
class Template {
    constructor(
    // This property needs to remain unminified.
    { strings, ['_$litType$']: type }, options) {
        /** @internal */
        this.parts = [];
        let node;
        let nodeIndex = 0;
        let attrNameIndex = 0;
        const partCount = strings.length - 1;
        const parts = this.parts;
        // Create template element
        const [html, attrNames] = getTemplateHtml(strings, type);
        this.el = Template.createElement(html, options);
        walker.currentNode = this.el.content;
        // Reparent SVG nodes into template root
        if (type === SVG_RESULT) {
            const content = this.el.content;
            const svgElement = content.firstChild;
            svgElement.remove();
            content.append(...svgElement.childNodes);
        }
        // Walk the template to find binding markers and create TemplateParts
        while ((node = walker.nextNode()) !== null && parts.length < partCount) {
            if (node.nodeType === 1) {
                if (DEV_MODE) {
                    const tag = node.localName;
                    // Warn if `textarea` includes an expression and throw if `template`
                    // does since these are not supported. We do this by checking
                    // innerHTML for anything that looks like a marker. This catches
                    // cases like bindings in textarea there markers turn into text nodes.
                    if (/^(?:textarea|template)$/i.test(tag) &&
                        node.innerHTML.includes(marker)) {
                        const m = `Expressions are not supported inside \`${tag}\` ` +
                            `elements. See https://lit.dev/msg/expression-in-${tag} for more ` +
                            `information.`;
                        if (tag === 'template') {
                            throw new Error(m);
                        }
                        else
                            issueWarning('', m);
                    }
                }
                // TODO (justinfagnani): for attempted dynamic tag names, we don't
                // increment the bindingIndex, and it'll be off by 1 in the element
                // and off by two after it.
                if (node.hasAttributes()) {
                    // We defer removing bound attributes because on IE we might not be
                    // iterating attributes in their template order, and would sometimes
                    // remove an attribute that we still need to create a part for.
                    const attrsToRemove = [];
                    for (const name of node.getAttributeNames()) {
                        // `name` is the name of the attribute we're iterating over, but not
                        // _neccessarily_ the name of the attribute we will create a part
                        // for. They can be different in browsers that don't iterate on
                        // attributes in source order. In that case the attrNames array
                        // contains the attribute name we'll process next. We only need the
                        // attribute name here to know if we should process a bound attribute
                        // on this element.
                        if (name.endsWith(boundAttributeSuffix) ||
                            name.startsWith(marker)) {
                            const realName = attrNames[attrNameIndex++];
                            attrsToRemove.push(name);
                            if (realName !== undefined) {
                                // Lowercase for case-sensitive SVG attributes like viewBox
                                const value = node.getAttribute(realName.toLowerCase() + boundAttributeSuffix);
                                const statics = value.split(marker);
                                const m = /([.?@])?(.*)/.exec(realName);
                                parts.push({
                                    type: ATTRIBUTE_PART,
                                    index: nodeIndex,
                                    name: m[2],
                                    strings: statics,
                                    ctor: m[1] === '.'
                                        ? PropertyPart
                                        : m[1] === '?'
                                            ? BooleanAttributePart
                                            : m[1] === '@'
                                                ? EventPart
                                                : AttributePart,
                                });
                            }
                            else {
                                parts.push({
                                    type: ELEMENT_PART,
                                    index: nodeIndex,
                                });
                            }
                        }
                    }
                    for (const name of attrsToRemove) {
                        node.removeAttribute(name);
                    }
                }
                // TODO (justinfagnani): benchmark the regex against testing for each
                // of the 3 raw text element names.
                if (rawTextElement.test(node.tagName)) {
                    // For raw text elements we need to split the text content on
                    // markers, create a Text node for each segment, and create
                    // a TemplatePart for each marker.
                    const strings = node.textContent.split(marker);
                    const lastIndex = strings.length - 1;
                    if (lastIndex > 0) {
                        node.textContent = trustedTypes
                            ? trustedTypes.emptyScript
                            : '';
                        // Generate a new text node for each literal section
                        // These nodes are also used as the markers for node parts
                        // We can't use empty text nodes as markers because they're
                        // normalized when cloning in IE (could simplify when
                        // IE is no longer supported)
                        for (let i = 0; i < lastIndex; i++) {
                            node.append(strings[i], createMarker());
                            // Walk past the marker node we just added
                            walker.nextNode();
                            parts.push({ type: CHILD_PART, index: ++nodeIndex });
                        }
                        // Note because this marker is added after the walker's current
                        // node, it will be walked to in the outer loop (and ignored), so
                        // we don't need to adjust nodeIndex here
                        node.append(strings[lastIndex], createMarker());
                    }
                }
            }
            else if (node.nodeType === 8) {
                const data = node.data;
                if (data === markerMatch) {
                    parts.push({ type: CHILD_PART, index: nodeIndex });
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        parts.push({ type: COMMENT_PART, index: nodeIndex });
                        // Move to the end of the match
                        i += marker.length - 1;
                    }
                }
            }
            nodeIndex++;
        }
        debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
            kind: 'template prep',
            template: this,
            clonableTemplate: this.el,
            parts: this.parts,
            strings,
        });
    }
    // Overridden via `litHtmlPolyfillSupport` to provide platform support.
    /** @nocollapse */
    static createElement(html, _options) {
        const el = d.createElement('template');
        el.innerHTML = html;
        return el;
    }
}
function resolveDirective(part, value, parent = part, attributeIndex) {
    var _a, _b, _c;
    var _d;
    // Bail early if the value is explicitly noChange. Note, this means any
    // nested directive is still attached and is not run.
    if (value === noChange) {
        return value;
    }
    let currentDirective = attributeIndex !== undefined
        ? (_a = parent.__directives) === null || _a === void 0 ? void 0 : _a[attributeIndex]
        : parent.__directive;
    const nextDirectiveConstructor = isPrimitive(value)
        ? undefined
        : // This property needs to remain unminified.
            value['_$litDirective$'];
    if ((currentDirective === null || currentDirective === void 0 ? void 0 : currentDirective.constructor) !== nextDirectiveConstructor) {
        // This property needs to remain unminified.
        (_b = currentDirective === null || currentDirective === void 0 ? void 0 : currentDirective['_$notifyDirectiveConnectionChanged']) === null || _b === void 0 ? void 0 : _b.call(currentDirective, false);
        if (nextDirectiveConstructor === undefined) {
            currentDirective = undefined;
        }
        else {
            currentDirective = new nextDirectiveConstructor(part);
            currentDirective._$initialize(part, parent, attributeIndex);
        }
        if (attributeIndex !== undefined) {
            ((_c = (_d = parent).__directives) !== null && _c !== void 0 ? _c : (_d.__directives = []))[attributeIndex] =
                currentDirective;
        }
        else {
            parent.__directive = currentDirective;
        }
    }
    if (currentDirective !== undefined) {
        value = resolveDirective(part, currentDirective._$resolve(part, value.values), currentDirective, attributeIndex);
    }
    return value;
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class TemplateInstance {
    constructor(template, parent) {
        /** @internal */
        this._parts = [];
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$template = template;
        this._$parent = parent;
    }
    // Called by ChildPart parentNode getter
    get parentNode() {
        return this._$parent.parentNode;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    // This method is separate from the constructor because we need to return a
    // DocumentFragment and we don't want to hold onto it with an instance field.
    _clone(options) {
        var _a;
        const { el: { content }, parts: parts, } = this._$template;
        const fragment = ((_a = options === null || options === void 0 ? void 0 : options.creationScope) !== null && _a !== void 0 ? _a : d).importNode(content, true);
        walker.currentNode = fragment;
        let node = walker.nextNode();
        let nodeIndex = 0;
        let partIndex = 0;
        let templatePart = parts[0];
        while (templatePart !== undefined) {
            if (nodeIndex === templatePart.index) {
                let part;
                if (templatePart.type === CHILD_PART) {
                    part = new ChildPart(node, node.nextSibling, this, options);
                }
                else if (templatePart.type === ATTRIBUTE_PART) {
                    part = new templatePart.ctor(node, templatePart.name, templatePart.strings, this, options);
                }
                else if (templatePart.type === ELEMENT_PART) {
                    part = new ElementPart(node, this, options);
                }
                this._parts.push(part);
                templatePart = parts[++partIndex];
            }
            if (nodeIndex !== (templatePart === null || templatePart === void 0 ? void 0 : templatePart.index)) {
                node = walker.nextNode();
                nodeIndex++;
            }
        }
        return fragment;
    }
    _update(values) {
        let i = 0;
        for (const part of this._parts) {
            if (part !== undefined) {
                debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                    kind: 'set part',
                    part,
                    value: values[i],
                    valueIndex: i,
                    values,
                    templateInstance: this,
                });
                if (part.strings !== undefined) {
                    part._$setValue(values, part, i);
                    // The number of values the part consumes is part.strings.length - 1
                    // since values are in between template spans. We increment i by 1
                    // later in the loop, so increment it by part.strings.length - 2 here
                    i += part.strings.length - 2;
                }
                else {
                    part._$setValue(values[i]);
                }
            }
            i++;
        }
    }
}
class ChildPart {
    constructor(startNode, endNode, parent, options) {
        var _a;
        this.type = CHILD_PART;
        this._$committedValue = nothing;
        // The following fields will be patched onto ChildParts when required by
        // AsyncDirective
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$startNode = startNode;
        this._$endNode = endNode;
        this._$parent = parent;
        this.options = options;
        // Note __isConnected is only ever accessed on RootParts (i.e. when there is
        // no _$parent); the value on a non-root-part is "don't care", but checking
        // for parent would be more code
        this.__isConnected = (_a = options === null || options === void 0 ? void 0 : options.isConnected) !== null && _a !== void 0 ? _a : true;
        if (ENABLE_EXTRA_SECURITY_HOOKS) {
            // Explicitly initialize for consistent class shape.
            this._textSanitizer = undefined;
        }
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        var _a, _b;
        // ChildParts that are not at the root should always be created with a
        // parent; only RootChildNode's won't, so they return the local isConnected
        // state
        return (_b = (_a = this._$parent) === null || _a === void 0 ? void 0 : _a._$isConnected) !== null && _b !== void 0 ? _b : this.__isConnected;
    }
    /**
     * The parent node into which the part renders its content.
     *
     * A ChildPart's content consists of a range of adjacent child nodes of
     * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
     * `.endNode`).
     *
     * - If both `.startNode` and `.endNode` are non-null, then the part's content
     * consists of all siblings between `.startNode` and `.endNode`, exclusively.
     *
     * - If `.startNode` is non-null but `.endNode` is null, then the part's
     * content consists of all siblings following `.startNode`, up to and
     * including the last child of `.parentNode`. If `.endNode` is non-null, then
     * `.startNode` will always be non-null.
     *
     * - If both `.endNode` and `.startNode` are null, then the part's content
     * consists of all child nodes of `.parentNode`.
     */
    get parentNode() {
        let parentNode = wrap(this._$startNode).parentNode;
        const parent = this._$parent;
        if (parent !== undefined &&
            parentNode.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */) {
            // If the parentNode is a DocumentFragment, it may be because the DOM is
            // still in the cloned fragment during initial render; if so, get the real
            // parentNode the part will be committed into by asking the parent.
            parentNode = parent.parentNode;
        }
        return parentNode;
    }
    /**
     * The part's leading marker node, if any. See `.parentNode` for more
     * information.
     */
    get startNode() {
        return this._$startNode;
    }
    /**
     * The part's trailing marker node, if any. See `.parentNode` for more
     * information.
     */
    get endNode() {
        return this._$endNode;
    }
    _$setValue(value, directiveParent = this) {
        if (DEV_MODE && this.parentNode === null) {
            throw new Error(`This \`ChildPart\` has no \`parentNode\` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's \`innerHTML\` or \`textContent\` can do this.`);
        }
        value = resolveDirective(this, value, directiveParent);
        if (isPrimitive(value)) {
            // Non-rendering child values. It's important that these do not render
            // empty text nodes to avoid issues with preventing default <slot>
            // fallback content.
            if (value === nothing || value == null || value === '') {
                if (this._$committedValue !== nothing) {
                    debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                        kind: 'commit nothing to child',
                        start: this._$startNode,
                        end: this._$endNode,
                        parent: this._$parent,
                        options: this.options,
                    });
                    this._$clear();
                }
                this._$committedValue = nothing;
            }
            else if (value !== this._$committedValue && value !== noChange) {
                this._commitText(value);
            }
            // This property needs to remain unminified.
        }
        else if (value['_$litType$'] !== undefined) {
            this._commitTemplateResult(value);
        }
        else if (value.nodeType !== undefined) {
            this._commitNode(value);
        }
        else if (isIterable(value)) {
            this._commitIterable(value);
        }
        else {
            // Fallback, will render the string representation
            this._commitText(value);
        }
    }
    _insert(node, ref = this._$endNode) {
        return wrap(wrap(this._$startNode).parentNode).insertBefore(node, ref);
    }
    _commitNode(value) {
        var _a;
        if (this._$committedValue !== value) {
            this._$clear();
            if (ENABLE_EXTRA_SECURITY_HOOKS &&
                sanitizerFactoryInternal !== noopSanitizer) {
                const parentNodeName = (_a = this._$startNode.parentNode) === null || _a === void 0 ? void 0 : _a.nodeName;
                if (parentNodeName === 'STYLE' || parentNodeName === 'SCRIPT') {
                    let message = 'Forbidden';
                    if (DEV_MODE) {
                        if (parentNodeName === 'STYLE') {
                            message =
                                `Lit does not support binding inside style nodes. ` +
                                    `This is a security risk, as style injection attacks can ` +
                                    `exfiltrate data and spoof UIs. ` +
                                    `Consider instead using css\`...\` literals ` +
                                    `to compose styles, and make do dynamic styling with ` +
                                    `css custom properties, ::parts, <slot>s, ` +
                                    `and by mutating the DOM rather than stylesheets.`;
                        }
                        else {
                            message =
                                `Lit does not support binding inside script nodes. ` +
                                    `This is a security risk, as it could allow arbitrary ` +
                                    `code execution.`;
                        }
                    }
                    throw new Error(message);
                }
            }
            debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                kind: 'commit node',
                start: this._$startNode,
                parent: this._$parent,
                value: value,
                options: this.options,
            });
            this._$committedValue = this._insert(value);
        }
    }
    _commitText(value) {
        // If the committed value is a primitive it means we called _commitText on
        // the previous render, and we know that this._$startNode.nextSibling is a
        // Text node. We can now just replace the text content (.data) of the node.
        if (this._$committedValue !== nothing &&
            isPrimitive(this._$committedValue)) {
            const node = wrap(this._$startNode).nextSibling;
            if (ENABLE_EXTRA_SECURITY_HOOKS) {
                if (this._textSanitizer === undefined) {
                    this._textSanitizer = createSanitizer(node, 'data', 'property');
                }
                value = this._textSanitizer(value);
            }
            debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                kind: 'commit text',
                node,
                value,
                options: this.options,
            });
            node.data = value;
        }
        else {
            if (ENABLE_EXTRA_SECURITY_HOOKS) {
                const textNode = document.createTextNode('');
                this._commitNode(textNode);
                // When setting text content, for security purposes it matters a lot
                // what the parent is. For example, <style> and <script> need to be
                // handled with care, while <span> does not. So first we need to put a
                // text node into the document, then we can sanitize its content.
                if (this._textSanitizer === undefined) {
                    this._textSanitizer = createSanitizer(textNode, 'data', 'property');
                }
                value = this._textSanitizer(value);
                debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                    kind: 'commit text',
                    node: textNode,
                    value,
                    options: this.options,
                });
                textNode.data = value;
            }
            else {
                this._commitNode(d.createTextNode(value));
                debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                    kind: 'commit text',
                    node: wrap(this._$startNode).nextSibling,
                    value,
                    options: this.options,
                });
            }
        }
        this._$committedValue = value;
    }
    _commitTemplateResult(result) {
        var _a;
        // This property needs to remain unminified.
        const { values, ['_$litType$']: type } = result;
        // If $litType$ is a number, result is a plain TemplateResult and we get
        // the template from the template cache. If not, result is a
        // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
        // to create the <template> element the first time we see it.
        const template = typeof type === 'number'
            ? this._$getTemplate(result)
            : (type.el === undefined &&
                (type.el = Template.createElement(type.h, this.options)),
                type);
        if (((_a = this._$committedValue) === null || _a === void 0 ? void 0 : _a._$template) === template) {
            debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                kind: 'template updating',
                template,
                instance: this._$committedValue,
                parts: this._$committedValue._parts,
                options: this.options,
                values,
            });
            this._$committedValue._update(values);
        }
        else {
            const instance = new TemplateInstance(template, this);
            const fragment = instance._clone(this.options);
            debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                kind: 'template instantiated',
                template,
                instance,
                parts: instance._parts,
                options: this.options,
                fragment,
                values,
            });
            instance._update(values);
            debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                kind: 'template instantiated and updated',
                template,
                instance,
                parts: instance._parts,
                options: this.options,
                fragment,
                values,
            });
            this._commitNode(fragment);
            this._$committedValue = instance;
        }
    }
    // Overridden via `litHtmlPolyfillSupport` to provide platform support.
    /** @internal */
    _$getTemplate(result) {
        let template = templateCache.get(result.strings);
        if (template === undefined) {
            templateCache.set(result.strings, (template = new Template(result)));
        }
        return template;
    }
    _commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If value is an array, then the previous render was of an
        // iterable and value will contain the ChildParts from the previous
        // render. If value is not an array, clear this part and make a new
        // array for ChildParts.
        if (!isArray(this._$committedValue)) {
            this._$committedValue = [];
            this._$clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this._$committedValue;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            if (partIndex === itemParts.length) {
                // If no existing part, create a new one
                // TODO (justinfagnani): test perf impact of always creating two parts
                // instead of sharing parts between nodes
                // https://github.com/lit/lit/issues/1266
                itemParts.push((itemPart = new ChildPart(this._insert(createMarker()), this._insert(createMarker()), this, this.options)));
            }
            else {
                // Reuse an existing part
                itemPart = itemParts[partIndex];
            }
            itemPart._$setValue(item);
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // itemParts always have end nodes
            this._$clear(itemPart && wrap(itemPart._$endNode).nextSibling, partIndex);
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
        }
    }
    /**
     * Removes the nodes contained within this Part from the DOM.
     *
     * @param start Start node to clear from, for clearing a subset of the part's
     *     DOM (used when truncating iterables)
     * @param from  When `start` is specified, the index within the iterable from
     *     which ChildParts are being removed, used for disconnecting directives in
     *     those Parts.
     *
     * @internal
     */
    _$clear(start = wrap(this._$startNode).nextSibling, from) {
        var _a;
        (_a = this._$notifyConnectionChanged) === null || _a === void 0 ? void 0 : _a.call(this, false, true, from);
        while (start && start !== this._$endNode) {
            const n = wrap(start).nextSibling;
            wrap(start).remove();
            start = n;
        }
    }
    /**
     * Implementation of RootPart's `isConnected`. Note that this metod
     * should only be called on `RootPart`s (the `ChildPart` returned from a
     * top-level `render()` call). It has no effect on non-root ChildParts.
     * @param isConnected Whether to set
     * @internal
     */
    setConnected(isConnected) {
        var _a;
        if (this._$parent === undefined) {
            this.__isConnected = isConnected;
            (_a = this._$notifyConnectionChanged) === null || _a === void 0 ? void 0 : _a.call(this, isConnected);
        }
        else if (DEV_MODE) {
            throw new Error('part.setConnected() may only be called on a ' +
                'RootPart returned from render().');
        }
    }
}
class AttributePart {
    constructor(element, name, strings, parent, options) {
        this.type = ATTRIBUTE_PART;
        /** @internal */
        this._$committedValue = nothing;
        /** @internal */
        this._$disconnectableChildren = undefined;
        this.element = element;
        this.name = name;
        this._$parent = parent;
        this.options = options;
        if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
            this._$committedValue = new Array(strings.length - 1).fill(new String());
            this.strings = strings;
        }
        else {
            this._$committedValue = nothing;
        }
        if (ENABLE_EXTRA_SECURITY_HOOKS) {
            this._sanitizer = undefined;
        }
    }
    get tagName() {
        return this.element.tagName;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    /**
     * Sets the value of this part by resolving the value from possibly multiple
     * values and static strings and committing it to the DOM.
     * If this part is single-valued, `this._strings` will be undefined, and the
     * method will be called with a single value argument. If this part is
     * multi-value, `this._strings` will be defined, and the method is called
     * with the value array of the part's owning TemplateInstance, and an offset
     * into the value array from which the values should be read.
     * This method is overloaded this way to eliminate short-lived array slices
     * of the template instance values, and allow a fast-path for single-valued
     * parts.
     *
     * @param value The part value, or an array of values for multi-valued parts
     * @param valueIndex the index to start reading values from. `undefined` for
     *   single-valued parts
     * @param noCommit causes the part to not commit its value to the DOM. Used
     *   in hydration to prime attribute parts with their first-rendered value,
     *   but not set the attribute, and in SSR to no-op the DOM operation and
     *   capture the value for serialization.
     *
     * @internal
     */
    _$setValue(value, directiveParent = this, valueIndex, noCommit) {
        const strings = this.strings;
        // Whether any of the values has changed, for dirty-checking
        let change = false;
        if (strings === undefined) {
            // Single-value binding case
            value = resolveDirective(this, value, directiveParent, 0);
            change =
                !isPrimitive(value) ||
                    (value !== this._$committedValue && value !== noChange);
            if (change) {
                this._$committedValue = value;
            }
        }
        else {
            // Interpolation case
            const values = value;
            value = strings[0];
            let i, v;
            for (i = 0; i < strings.length - 1; i++) {
                v = resolveDirective(this, values[valueIndex + i], directiveParent, i);
                if (v === noChange) {
                    // If the user-provided value is `noChange`, use the previous value
                    v = this._$committedValue[i];
                }
                change || (change = !isPrimitive(v) || v !== this._$committedValue[i]);
                if (v === nothing) {
                    value = nothing;
                }
                else if (value !== nothing) {
                    value += (v !== null && v !== void 0 ? v : '') + strings[i + 1];
                }
                // We always record each value, even if one is `nothing`, for future
                // change detection.
                this._$committedValue[i] = v;
            }
        }
        if (change && !noCommit) {
            this._commitValue(value);
        }
    }
    /** @internal */
    _commitValue(value) {
        if (value === nothing) {
            wrap(this.element).removeAttribute(this.name);
        }
        else {
            if (ENABLE_EXTRA_SECURITY_HOOKS) {
                if (this._sanitizer === undefined) {
                    this._sanitizer = sanitizerFactoryInternal(this.element, this.name, 'attribute');
                }
                value = this._sanitizer(value !== null && value !== void 0 ? value : '');
            }
            debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
                kind: 'commit attribute',
                element: this.element,
                name: this.name,
                value,
                options: this.options,
            });
            wrap(this.element).setAttribute(this.name, (value !== null && value !== void 0 ? value : ''));
        }
    }
}
class PropertyPart extends AttributePart {
    constructor() {
        super(...arguments);
        this.type = PROPERTY_PART;
    }
    /** @internal */
    _commitValue(value) {
        if (ENABLE_EXTRA_SECURITY_HOOKS) {
            if (this._sanitizer === undefined) {
                this._sanitizer = sanitizerFactoryInternal(this.element, this.name, 'property');
            }
            value = this._sanitizer(value);
        }
        debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
            kind: 'commit property',
            element: this.element,
            name: this.name,
            value,
            options: this.options,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.element[this.name] = value === nothing ? undefined : value;
    }
}
// Temporary workaround for https://crbug.com/993268
// Currently, any attribute starting with "on" is considered to be a
// TrustedScript source. Such boolean attributes must be set to the equivalent
// trusted emptyScript value.
const emptyStringForBooleanAttribute = trustedTypes
    ? trustedTypes.emptyScript
    : '';
class BooleanAttributePart extends AttributePart {
    constructor() {
        super(...arguments);
        this.type = BOOLEAN_ATTRIBUTE_PART;
    }
    /** @internal */
    _commitValue(value) {
        debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
            kind: 'commit boolean attribute',
            element: this.element,
            name: this.name,
            value: !!(value && value !== nothing),
            options: this.options,
        });
        if (value && value !== nothing) {
            wrap(this.element).setAttribute(this.name, emptyStringForBooleanAttribute);
        }
        else {
            wrap(this.element).removeAttribute(this.name);
        }
    }
}
class EventPart extends AttributePart {
    constructor(element, name, strings, parent, options) {
        super(element, name, strings, parent, options);
        this.type = EVENT_PART;
        if (DEV_MODE && this.strings !== undefined) {
            throw new Error(`A \`<${element.localName}>\` has a \`@${name}=...\` listener with ` +
                'invalid content. Event listeners in templates must have exactly ' +
                'one expression and no surrounding text.');
        }
    }
    // EventPart does not use the base _$setValue/_resolveValue implementation
    // since the dirty checking is more complex
    /** @internal */
    _$setValue(newListener, directiveParent = this) {
        var _a;
        newListener =
            (_a = resolveDirective(this, newListener, directiveParent, 0)) !== null && _a !== void 0 ? _a : nothing;
        if (newListener === noChange) {
            return;
        }
        const oldListener = this._$committedValue;
        // If the new value is nothing or any options change we have to remove the
        // part as a listener.
        const shouldRemoveListener = (newListener === nothing && oldListener !== nothing) ||
            newListener.capture !==
                oldListener.capture ||
            newListener.once !==
                oldListener.once ||
            newListener.passive !==
                oldListener.passive;
        // If the new value is not nothing and we removed the listener, we have
        // to add the part as a listener.
        const shouldAddListener = newListener !== nothing &&
            (oldListener === nothing || shouldRemoveListener);
        debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
            kind: 'commit event listener',
            element: this.element,
            name: this.name,
            value: newListener,
            options: this.options,
            removeListener: shouldRemoveListener,
            addListener: shouldAddListener,
            oldListener,
        });
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.name, this, oldListener);
        }
        if (shouldAddListener) {
            // Beware: IE11 and Chrome 41 don't like using the listener as the
            // options object. Figure out how to deal w/ this in IE11 - maybe
            // patch addEventListener?
            this.element.addEventListener(this.name, this, newListener);
        }
        this._$committedValue = newListener;
    }
    handleEvent(event) {
        var _a, _b;
        if (typeof this._$committedValue === 'function') {
            this._$committedValue.call((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : this.element, event);
        }
        else {
            this._$committedValue.handleEvent(event);
        }
    }
}
class ElementPart {
    constructor(element, parent, options) {
        this.element = element;
        this.type = ELEMENT_PART;
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$parent = parent;
        this.options = options;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    _$setValue(value) {
        debugLogEvent === null || debugLogEvent === void 0 ? void 0 : debugLogEvent({
            kind: 'commit to element binding',
            element: this.element,
            value,
            options: this.options,
        });
        resolveDirective(this, value);
    }
}
/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports  mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-element, which re-exports all of lit-html.
 *
 * @private
 */
const _$LH = {
    // Used in lit-ssr
    _boundAttributeSuffix: boundAttributeSuffix,
    _marker: marker,
    _markerMatch: markerMatch,
    _HTML_RESULT: HTML_RESULT,
    _getTemplateHtml: getTemplateHtml,
    // Used in hydrate
    _TemplateInstance: TemplateInstance,
    _isIterable: isIterable,
    _resolveDirective: resolveDirective,
    // Used in tests and private-ssr-support
    _ChildPart: ChildPart,
    _AttributePart: AttributePart,
    _BooleanAttributePart: BooleanAttributePart,
    _EventPart: EventPart,
    _PropertyPart: PropertyPart,
    _ElementPart: ElementPart,
};
// Apply polyfills if available
const polyfillSupport = DEV_MODE
    ? window.litHtmlPolyfillSupportDevMode
    : window.litHtmlPolyfillSupport;
polyfillSupport === null || polyfillSupport === void 0 ? void 0 : polyfillSupport(Template, ChildPart);
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
((_d = globalThis.litHtmlVersions) !== null && _d !== void 0 ? _d : (globalThis.litHtmlVersions = [])).push('2.2.2');
if (DEV_MODE && globalThis.litHtmlVersions.length > 1) {
    issueWarning('multiple-versions', `Multiple versions of Lit loaded. ` +
        `Loading multiple versions is not recommended.`);
}
//# sourceMappingURL=lit-html.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!********************************!*\
  !*** ./src/screencast/main.ts ***!
  \********************************/

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
const screencast_1 = __webpack_require__(/*! ./screencast */ "./src/screencast/screencast.ts");
new screencast_1.Screencast();

})();

/******/ })()
;
//# sourceMappingURL=screencast.bundle.js.map