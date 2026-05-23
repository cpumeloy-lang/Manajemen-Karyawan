// index.mjs - Vercel Serverless Function entrypoint (ESM)
// Menggunakan ekstensi .mjs agar Vercel Node Runtime dapat menggunakan import() native 
// dan mencegah error 405 (Method Not Allowed) maupun 500 (ESM require error).

export default async function handler(req, res) {
  try {
    // Memuat server.js (yang merupakan ES Module)
    const serverModule = await import('../server.js');
    const app = serverModule.default;
    return app(req, res);
  } catch (err) {
    console.error("Vercel Serverless Execution Error:", err);
    res.status(500).json({
      success: false,
      error: `Vercel MJS Execution Error: ${err.message}`,
      stack: err.stack,
      name: err.name
    });
  }
}
