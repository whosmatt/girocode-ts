# girocode-ts

A lightweight, fully client-side Progressive Web App (PWA) for generating EPC-QR codes (GiroCodes) for requesting SEPA payments.
IBAN and Beneficiary can be remembered in localstorage for convenience.

## Build environment

- Node.js with npm
- TypeScript
- Unix-like environment (Linux, macOS, WSL) with `cp` and `find` utilities

## Build

```bash
npm install
npm run build
```

Builds the project to `dist/`.

## Development & Deployment

Serve the `dist/` directory with any HTTP server.