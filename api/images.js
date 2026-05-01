// api/images.js
// Cloudinary 폴더 내 이미지 목록을 서버에서 가져옴

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { folder } = req.query;
  if (!folder) return res.status(400).json({ error: "folder required" });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Cloudinary credentials not configured" });
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?prefix=${folder}/&type=upload&max_results=50`,
      {
        headers: { "Authorization": `Basic ${credentials}` }
      }
    );

    const data = await response.json();
    const urls = (data.resources || []).map(r =>
      `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto,w_600/${r.public_id}`
    );

    res.status(200).json({ urls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch images", urls: [] });
  }
}
