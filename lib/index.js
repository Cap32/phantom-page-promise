'use strict';

var _page = require('phantom/lib/page');

var _page2 = _interopRequireDefault(_page);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const promisePolyfillFile = 'node_modules/promise-polyfill/promise.min.js';
const Constants = {
	CALL_PHANTOM: '_evaluatePromise',
	HAS_INJECTED: '_hasInjectedPromise',
	TIMEOUT_ERROR: 'TIMEOUT'
};

const execDelay = (t = 2000) => new Promise(done => setTimeout(done, t));

_page2.default.prototype.evaluatePromise = (() => {
	var _ref = _asyncToGenerator(function* (src, options = {}) {
		var _this = this;

		const {
			timeout = 10000,
			delay,
			args = []
		} = options;
		const code = typeof src === 'string' ? src : src.toString();

		const execTimeout = new Promise(function (r, reject) {
			setTimeout(function () {
				return reject(Constants.TIMEOUT_ERROR);
			}, timeout);
		});

		if (!(yield this.property(Constants.HAS_INJECTED))) {
			const injected = yield this.injectJs(promisePolyfillFile);
			this.property(Constants.HAS_INJECTED, injected);
		}

		if (delay) {
			if (delay > timeout) {
				throw new Error('Run `evaluatePromise` error: ' + 'Option: `timeout` MUST larger than `delay`.');
			}
			yield execDelay(delay);
		}

		const argsString = args.map(function (arg) {
			return JSON.stringify(arg);
		}).join(', ');

		const finalCode = `
		function () {
			return (${ code })(${ argsString }).then(function (result) {
				window.callPhantom({
					${ Constants.CALL_PHANTOM }: result,
				});
			});
		}
	`;

		const execMain = new Promise(function (resolve) {
			const done = function (data) {
				if (data && data[Constants.CALL_PHANTOM]) {
					resolve(data[Constants.CALL_PHANTOM]);
					_this.off('onCallback', done);
				}
			};
			_this.on('onCallback', done);
		});

		this.evaluateAsync(finalCode);

		return Promise.race([execTimeout, execMain]);
	});

	return function (_x, _x2) {
		return _ref.apply(this, arguments);
	};
})();