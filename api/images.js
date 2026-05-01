// api/images.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { folder } = req.query;
  if (!folder) return res.status(400).json({ error: "folder required" });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Cloudinary credentials not configured", urls: [] });
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search?expression=folder%3D${encodeURIComponent(folder)}&max_results=50`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();
    console.log("Cloudinary response:", JSON.stringify(data).slice(0, 300));

    const urls = (data.resources || []).map(r =>
      `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto,w_600/${r.public_id}`
    );

    res.status(200).json({ urls });
  } catch (err) {
    console.error("Cloudinary error:", err);
    res.status(500).json({ error: err.message, urls: [] });
  }
}
