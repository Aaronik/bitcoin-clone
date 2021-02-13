# Bitcoin Clone

This is a bitcoin clone written in javascript.

### Install

`sudo apt install libtool` -- this is needed for compiling the cryptographic library Sodium
`npm install`

### Config
Add a file in the root folder (the same folder as this readme) called `wallet.json`.
Add the following information:

```json
[
  {
    "name":"miner",
    "pk":"...",
    "sk":"..."
  }
]

```

### Run
`node server.js` --

### TODO
- Use JS libraries instead of native Sodium
- Simplify Config setup and wallet creation
