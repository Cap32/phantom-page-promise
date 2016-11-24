
import Page from 'phantom/lib/page';

const Consts = {
	POLYFILL: 'node_modules/promise-polyfill/promise.min.js',
	CALL_PHANTOM: '_evaluatePromise',
	HAS_INJECTED: '_hasInjectedPromise',
	TIMEOUT_ERROR: 'TIMEOUT',
	ERROR_PREFIX: 'Run `evaluatePromise` error',
	DEFAULT_TIMEOUT: 10000,
};

const execDelay = (t = 2000) => new Promise((done) => setTimeout(done, t));

Page.prototype.evaluatePromise = async function (src, options = {}) {
	const {
		timeout = Consts.DEFAULT_TIMEOUT,
		delay,
		args = [],
	} = options;
	const code = typeof src === 'string' ? src : src.toString();

	const execTimeout = new Promise((r, reject) => {
		setTimeout(() => reject(Consts.TIMEOUT_ERROR), timeout);
	});

	if (!await this.property(Consts.HAS_INJECTED)) {
		const injected = await this.injectJs(Consts.POLYFILL);

		if (!injected) {
			throw new Error(
				`${Consts.ERROR_PREFIX}: Cannot find moudle "${Consts.POLYFILL}".` +
				'\nMaybe this is a bug. Please add an issue to the project.'
			);
		}

		this.property(Consts.HAS_INJECTED, injected);
	}

	if (delay) {
		if (delay > timeout) {
			throw new Error(
				`${Consts.ERROR_PREFIX}: Option "timeout" MUST larger than "delay".`
			);
		}
		await execDelay(delay);
	}

	const argsString = args.map((arg) => JSON.stringify(arg)).join(', ');

	const finalCode = `
		function () {
			return (${code})(${argsString}).then(function (result) {
				window.callPhantom({
					${Consts.CALL_PHANTOM}: result,
				});
			});
		}
	`;

	const execMain = new Promise((resolve) => {
		const done = (data) => {
			if (data && data[Consts.CALL_PHANTOM]) {
				resolve(data[Consts.CALL_PHANTOM]);
				this.off('onCallback', done);
			}
		};
		this.on('onCallback', done);
	});

	this.evaluateAsync(finalCode);

	return Promise.race([execTimeout, execMain]);
};
