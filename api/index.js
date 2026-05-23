// Convert to CommonJS syntax to ensure Vercel can parse it as a serverless function entrypoint.
// Node.js will dynamically import the ESM server.js module.
module.exports = async function handler(req, res) {
  try {
    const module = await import('../server.js');
    const app = module.default;
    return app(req, res);
  } catch (err) {
    console.error("Vercel Startup Error:", err);
    res.status(500).json({
      success: false,
      error: `Vercel Execution Error: ${err.message}`,
      stack: err.stack
    });
  }
};
