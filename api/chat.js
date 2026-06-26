// /api/chat.js
// Vercel 서버리스 함수 — Gemini API 호출
// 프론트엔드에서 직접 Gemini 키를 노출하지 않기 위한 중간 서버 역할

export default async function handler(req, res) {
  // CORS 허용 (필요시 특정 도메인으로 제한 가능)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { question, context } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'question 필드가 필요합니다.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
  }

  // RAG 프롬프트 구성 — Firestore에서 가져온 학급 데이터(context)를 근거로만 답변하도록 지시
  const systemPrompt = `당신은 한일고등학교 3학년 1반의 학급 AI 도우미입니다.
아래 [학급 데이터]에 있는 정보만을 근거로 답변하세요.
[학급 데이터]에 없는 내용은 "해당 정보가 아직 등록되지 않았어요. '정보 등록 요청'을 통해 추가해주세요!"라고 답하세요.
답변은 친근하고 간결한 한국어로 작성하세요. 그러나 '안녕'이나 '고마워'같은 질문이 아닌 단순 인사표현의 경우 친절하고 간결하게 답하세요.

[학급 데이터]
${context || '(제공된 데이터 없음)'}

[학생 질문]
${question}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 5000
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API 오류:', errText);
      return res.status(502).json({ error: 'Gemini API 호출 실패', detail: errText });
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성하지 못했습니다.';

    return res.status(200).json({ answer });

  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({ error: error.message });
  }
}
