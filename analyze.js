// api/analyze.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { age, bodyType, imageUrl } = req.body || {};
  if (!age || !bodyType) return res.status(400).json({ error: "missing params" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const naverId      = process.env.NAVER_CLIENT_ID;
  const naverSecret  = process.env.NAVER_CLIENT_SECRET;
  if (!anthropicKey) return res.status(500).json({ error: "Anthropic API key not configured" });

  try {
    // 메시지 구성 — 이미지 URL이 있으면 Claude Vision으로 실제 이미지 분석
    const messageContent = [];

    if (imageUrl) {
      messageContent.push({
        type: "image",
        source: { type: "url", url: imageUrl }
      });
    }

    messageContent.push({
      type: "text",
      content: undefined, // 아래에서 설정
      text: `이 패션 이미지를 보고 실제로 착용한 옷을 분석해주세요.
착용자: ${age} 여성, 체형: ${bodyType}

${imageUrl ? "이미지에 실제로 보이는 옷만 분석하세요. 없는 아이템을 추가하지 마세요." : ""}

JSON만 반환 (코드블록 없이):
{
  "coreStyle": "이미지에서 보이는 핵심 스타일 2-3단어",
  "description": "실제 착용 룩의 특징 설명 2문장",
  "keyItems": ["실제 착용 아이템1", "아이템2", "아이템3"],
  "tip": "${bodyType} 체형을 위한 스타일링 팁 한 문장",
  "occasions": ["어울리는 상황1", "상황2"],
  "shopping": [
    {"item": "이미지 속 실제 아이템명", "keyword": "네이버쇼핑 검색 키워드 (색상+디테일 포함, 짧게)", "category": "카테고리"},
    {"item": "이미지 속 실제 아이템명", "keyword": "네이버쇼핑 검색 키워드", "category": "카테고리"},
    {"item": "이미지 속 실제 아이템명", "keyword": "네이버쇼핑 검색 키워드", "category": "카테고리"}
  ]
}`
    });

    // 1) Claude Vision으로 이미지 분석
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: messageContent }]
      }),
    });

    const aiData = await aiRes.json();
    const raw = aiData.content?.find(c => c.type === "text")?.text || "{}";
    const analysis = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // 2) 각 아이템 키워드로 네이버 쇼핑 검색
    if (naverId && naverSecret && analysis.shopping?.length) {
      const shoppingWithProducts = await Promise.all(
        analysis.shopping.map(async (s) => {
          try {
            const naverRes = await fetch(
              `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(s.keyword)}&display=1&sort=sim`,
              {
                headers: {
                  "X-Naver-Client-Id": naverId,
                  "X-Naver-Client-Secret": naverSecret,
                }
              }
            );
            const naverData = await naverRes.json();
            const products = (naverData.items || []).map(p => ({
              title: p.title.replace(/<[^>]+>/g, ""),
              price: parseInt(p.lprice).toLocaleString() + "원",
              image: p.image,
              link: p.link,
              mall: p.mallName,
            }));
            return { ...s, products };
          } catch {
            return { ...s, products: [] };
          }
        })
      );
      analysis.shopping = shoppingWithProducts;
    }

    res.status(200).json(analysis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ coreStyle: "오류 발생", description: "잠시 후 다시 시도해 주세요." });
  }
}
