// api/analyze.js
// API 키는 Vercel 환경변수에만 저장 — 브라우저에 절대 노출되지 않습니다

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { age, bodyType } = req.body || {};
  if (!age || !bodyType) return res.status(400).json({ error: "age and bodyType are required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `패션 스타일리스트로서 분석해주세요.
착용자: ${age} 여성, 체형: ${bodyType}

JSON만 반환 (코드블록 없이):
{
  "coreStyle": "핵심 스타일 키워드 2-3단어",
  "description": "이 룩의 매력과 특징 설명 2문장",
  "keyItems": ["핵심 아이템1", "아이템2", "아이템3"],
  "tip": "${bodyType} 체형을 위한 스타일링 팁 한 문장",
  "occasions": ["착용 상황1", "상황2"],
  "shopping": [
    {"item": "추천 상품명", "category": "카테고리", "price": "가격대"},
    {"item": "추천 상품명", "category": "카테고리", "price": "가격대"},
    {"item": "추천 상품명", "category": "카테고리", "price": "가격대"}
  ]
}`
        }]
      }),
    });

    const data = await response.json();
    const raw = data.content?.find(c => c.type === "text")?.text || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ coreStyle: "오류 발생", description: "잠시 후 다시 시도해 주세요." });
  }
}
