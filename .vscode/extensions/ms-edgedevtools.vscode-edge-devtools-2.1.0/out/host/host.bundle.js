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

/***/ "./src/host/messageRouter.ts":
/*!***********************************!*\
  !*** ./src/host/messageRouter.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessageRouter = void 0;
const webviewEvents_1 = __webpack_require__(/*! ../common/webviewEvents */ "./src/common/webviewEvents.ts");
const vscode = acquireVsCodeApi();
/**
 * Both the DevTools iframe and the Extension (which owns the ws connection to the browser) will
 * post messages to the Webview window for communication between the two. This class routes message
 * to the correct location based on the origin and type of message posted.
 *
 */
class MessageRouter {
    constructor(webviewWindow) {
        this.devtoolsActionReceived = false;
        this.fallbackAttempt = false;
        webviewWindow.addEventListener('DOMContentLoaded', () => {
            var _a;
            this.toolsFrameWindow = document.getElementById('devtools-frame').contentWindow;
            (_a = this.toolsFrameWindow) === null || _a === void 0 ? void 0 : _a.addEventListener('load', () => {
                this.devtoolsActionReceived = true;
            });
            this.errorMessageDiv = document.getElementById('error-message');
        });
        const extensionMessageCallback = this.onMessageFromChannel.bind(this);
        // Both the DevTools iframe and the extension will post messages to the webview
        // Listen for messages and forward to correct recipient based on origin
        webviewWindow.addEventListener('message', messageEvent => {
            const fromExtension = messageEvent.origin.startsWith('vscode-webview://');
            if (!fromExtension) {
                // Send message from DevTools to Extension
                this.onMessageFromFrame(messageEvent.data.method, messageEvent.data.args);
                // Record that the DevTools has sent a message to prevent error page from loading
                this.devtoolsActionReceived = true;
            }
            else if (this.toolsFrameWindow) {
                // Send message from Extension to DevTools
                (0, webviewEvents_1.parseMessageFromChannel)(messageEvent.data, extensionMessageCallback);
                messageEvent.preventDefault();
                messageEvent.stopImmediatePropagation();
            }
        }, true);
        // Inform the extension we are ready to receive messages
        this.sendReady();
        // Set timeout to show error message if devtools has not loaded within 10 seconds
        setTimeout(() => this.showLoadingError(), 10000);
    }
    onMessageFromFrame(e, args) {
        switch (e) {
            case 'openInEditor':
                const [url, line, column, ignoreTabChanges] = args;
                this.openInEditor(url, line, column, ignoreTabChanges);
                return true;
            case 'cssMirrorContent':
                const [cssUrl = url, newContent] = args;
                this.cssMirrorContent(cssUrl, newContent);
                return true;
            case 'openInNewTab':
                this.openInNewTab(args[0]);
                return true;
            case 'recordEnumeratedHistogram':
                const [actionName, actionCode, bucketSize] = args;
                this.recordEnumeratedHistogram(actionName, actionCode, bucketSize);
                return true;
            case 'recordPerformanceHistogram':
                const [histogramName, duration] = args;
                this.recordPerformanceHistogram(histogramName, duration);
                return true;
            case 'reportError':
                const [type, message, stack, filename, sourceUrl, lineno, colno] = args;
                this.reportError(type, message, stack, filename, sourceUrl, lineno, colno);
                return true;
            case 'sendMessageToBackend':
                const [cdpMessage] = args;
                this.sendMessageToBackend(cdpMessage);
                return true;
            case 'toggleScreencast':
                this.toggleScreencast();
                return true;
            case 'replayConsoleMessages':
                this.replayConsoleMessages();
                return true;
            case 'toggleCSSMirrorContent':
                const [isEnabled] = args;
                this.toggleCSSMirrorContent(isEnabled);
                return true;
            default:
                // TODO: handle other types of messages from devtools
                return false;
        }
    }
    onMessageFromChannel(e, args) {
        if (e !== 'websocket') {
            return false;
        }
        const { event, message } = JSON.parse(args);
        this.fireWebSocketCallback(event, message);
        return true;
    }
    sendReady() {
        // Inform the extension we are ready to receive messages
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'ready');
    }
    recordEnumeratedHistogram(actionName, actionCode, _bucketSize) {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: actionCode,
            event: 'enumerated',
            name: actionName,
        });
    }
    recordPerformanceHistogram(histogramName, duration) {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: duration,
            event: 'performance',
            name: histogramName,
        });
    }
    reportError(type, message, stack, filename, sourceUrl, lineno, colno) {
        // Package up the error info to send to the extension
        const data = { message, stack, filename, sourceUrl, lineno, colno };
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data,
            event: 'error',
            name: type,
        });
    }
    openInEditor(url, line, column, ignoreTabChanges) {
        // Forward the data to the extension
        const request = { column, line, url, ignoreTabChanges };
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'openInEditor', request);
    }
    toggleScreencast() {
        // Forward the data to the extension
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'toggleScreencast');
    }
    toggleCSSMirrorContent(isEnabled) {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'toggleCSSMirrorContent', { isEnabled });
    }
    replayConsoleMessages() {
        // Forward the data to the extension
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'replayConsoleMessages');
    }
    cssMirrorContent(url, newContent) {
        // Forward the data to the extension
        const request = { url, newContent };
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'cssMirrorContent', request);
    }
    openInNewTab(url) {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'openUrl', { url });
    }
    sendMessageToBackend(message) {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'websocket', { message });
    }
    sendTelemetry(telemetry) {
        // Forward the data to the extension
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'telemetry', telemetry);
    }
    sendDevToolsConnectionStatus(success) {
        (0, webviewEvents_1.encodeMessageForChannel)(msg => vscode.postMessage(msg, '*'), 'devtoolsConnection', success);
    }
    fireWebSocketCallback(e, message) {
        // Send response message to DevTools
        if (this.toolsFrameWindow && e === 'message') {
            this.toolsFrameWindow.postMessage({ method: 'dispatchMessage', args: [message] }, '*');
        }
    }
    showLoadingError() {
        if (this.devtoolsActionReceived || !this.errorMessageDiv) {
            this.sendDevToolsConnectionStatus(true);
            this.fallbackAttempt = false;
            return;
        }
        // Show the error message if DevTools has failed to record an action
        if (!this.fallbackAttempt) {
            this.sendDevToolsConnectionStatus(false);
            this.fallbackAttempt = true;
        }
        else {
            this.errorMessageDiv.classList.remove('hidden');
        }
    }
}
exports.MessageRouter = MessageRouter;


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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!******************************!*\
  !*** ./src/host/mainHost.ts ***!
  \******************************/

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.messageRouter = void 0;
const messageRouter_1 = __webpack_require__(/*! ./messageRouter */ "./src/host/messageRouter.ts");
exports.messageRouter = new messageRouter_1.MessageRouter(window);

})();

/******/ })()
;
//# sourceMappingURL=host.bundle.js.map