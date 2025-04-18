const http = require('http');
const assert = require('assert');

// 🔁 Start the server
require('../server.cjs');

function makeRequest(path, expectedStatusCode, callback) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'GET'
    };

    const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
            try {
                assert.strictEqual(res.statusCode, expectedStatusCode);
                console.log(`✅ ${path} returned ${expectedStatusCode}`);
                callback(null);
            } catch (err) {
                console.error(`❌ ${path} returned ${res.statusCode}, expected ${expectedStatusCode}`);
                callback(err);
            }
        });
    });

    req.on('error', err => {
        console.error(`❌ Error on ${path}:`, err);
        callback(err);
    });

    req.end();
}

function runTests() {
    const tests = [
        cb => makeRequest('/', 302, cb),
        cb => makeRequest('/browser', 200, cb),
        cb => makeRequest('/does-not-exist', 404, cb)
    ];

    let i = 0;
    function next(err) {
        if (err || i === tests.length) return process.exit(err ? 1 : 0);
        tests[i++](next);
    }
    next();
}

setTimeout(runTests, 1000);
