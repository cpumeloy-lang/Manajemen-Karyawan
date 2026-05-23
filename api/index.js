export default async function handler(req, res) {
  try {
    // Gunakan dynamic import agar kita bisa menangkap error saat loading server.js di Vercel
    const module = await import('../server.js');
    const app = module.default;
    return app(req, res);
  } catch (err) {
    console.error("Vercel Serverless Execution Error:", err);
    // Kembalikan detail error ke client agar bisa dibaca langsung!
    res.status(500).json({
      success: false,
      error: `Vercel Execution Error: ${err.message}`,
      stack: err.stack
    });
  }
}
