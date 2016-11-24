# phantom-page-promise

A phantomjs-node extension that make phantom page support promise.

## Usage

```js
import 'phantom-page-promise';
import phantom from 'phantom';

const init = async () => {
    const ph = await phantom.create();
    const page = await ph.createPage();
    const status = await page.open('http://facebook.com');

    if (status.toLowerCase() !== 'success') { throw new Error(status); }

    const result = await page.evaluatePromise(
        `function () {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('it works');
                }, 2000);
            })
        }`
    );

    console.log(result); // 'it works'

    ph && ph.exit();
    page && page.close();
};

init();
```

## API

##### page#evaluatePromise(codeOrFunction[, options])

Just like `page.evaluateJavaScript`, but could evaluate and return a promise.

###### Arguments

1. `codeOrFunction` (String|Function): Evaluate a function or function contained in a string.
2. `options` (Object): See below for detail.

###### Available options:

- `timeout` (Number): Specify timeout of execution. If timeout before the promise return, it would throw a `TIMEOUT` error. Defaults to 10000(ms).
- `delay` (Number): Specify delay of execution. Defaults to 0(ms).
- `args` ([Any]): Specify arguments to the function. Only work if the type of `codeOrFunction` is `Function`.

###### Return

(Promise): The result.


## Installing

Using npm:

```
npm install --save phantom-page-promise
```

Using yarn:

```
yarn add phantom-page-promise
```

## License

MIT
