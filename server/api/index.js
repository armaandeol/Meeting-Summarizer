// This is a Vercel-specific entry point for serverless functions

const app = require("../index");

// Export a serverless function that Vercel can use
module.exports = (req, res) => {
  // Handle the incoming HTTP request using our Express app
  return app(req, res);
};
