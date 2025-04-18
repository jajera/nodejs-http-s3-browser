# nodejs-http-s3-browser

Simple Node.js-based S3 browser using native HTTPS to list contents of a public S3 bucket.

## Features

- Browse folders and files in a public S3 bucket
- Supports light/dark mode toggle
- Image preview modal
- Optional proxy mode to serve S3 content via the app
- Basic test suite

## Requirements

- Node.js 18+ (or newer)
- Publicly accessible S3 bucket

## Usage

### 1. Install dependencies

This app has no runtime dependencies, but you may install ESLint if using linting:

```bash
npm install
```

### 2. Start the server

```bash
node server.cjs
```

Optional environment variables:

| Variable       | Description                           |
|----------------|---------------------------------------|
| `S3_BASE_URL`  | Public S3 bucket base URL             |
| `USE_PROXY`    | Set to `true` to serve files via proxy |

Example:

```bash
USE_PROXY=true S3_BASE_URL=https://example-bucket.s3.amazonaws.com node server.cjs
```

### 3. Visit in browser

Open [http://localhost:3000/browser](http://localhost:3000/browser)

---

## Testing

Run the test suite (includes auto-started server check):

```bash
npm test
```

---

## License

MIT
