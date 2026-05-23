// index.cjs - Vercel Serverless Function entrypoint (CommonJS)
// Kami menggunakan .cjs agar Vercel Node Runtime dapat menggunakan require() 
// saat proses bootstrap, menghindari "require() of ES Module is not supported".

module.exports = async function handler(req, res) {
  try {
    // Memuat server.js (yang merupakan ES Module) secara dinamis
    const serverModule = await import('../server.js');
    const app = serverModule.default;
    return app(req, res);
  } catch (err) {
    console.error("Vercel Serverless Execution Error:", err);
    res.status(500).json({
      success: false,
      error: `Vercel CJS Execution Error: ${err.message}`,
      stack: err.stack,
      name: err.name
    });
  }
};
