// Vercel serverless entry point.
const { createApp } = require("../dist/src/app");

const app = createApp();

module.exports = app;



