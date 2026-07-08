import { createClient } from '@supabase/supabase-js';

const BIFROST_URL = process.env.BIFROST_URL || 'https://gateway-buildathon.ltl.sh/v1/chat/completions';
const MODEL = 'gpt-5.5';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing auth token' });
  const accessToken = authHeader.replace('Bearer ', '');

  const { mealText } = req.body;
  if (!mealText) return res.status(400).json({ error: 'mealText required' });

  try {
    // Verify the caller is a real logged-in user before spending gateway budget.
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user }, error } = await sb.auth.getUser(accessToken);
    if (error || !user) return res.status(401).json({ error: 'Invalid session' });

    const systemPrompt = `You are a nutrition estimation assistant. Given a description of a meal, estimate its total protein, calories, carbs, and fat in grams/kcal as eaten (sum all items mentioned, accounting for stated quantities). Use typical Indian food composition data where relevant. Respond with ONLY a raw JSON object, no markdown fences, no preamble, no explanation text outside the JSON, in exactly this shape:
{"protein": number, "calories": number, "carbs": number, "fat": number, "note": "short one-sentence basis for the estimate, under 20 words"}`;

    const gw = await fetch(BIFROST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GPT_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Meal: ${mealText}` },
        ],
      }),
    });

    if (!gw.ok) {
      const t = await gw.text();
      console.error('estimate-meal gateway error', gw.status, t);
      return res.status(502).json({ error: 'AI gateway error' });
    }

    const data = await gw.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: 'Could not parse macro estimate' });

    const parsed = JSON.parse(match[0]);
    res.status(200).json({
      totals: {
        protein: Math.round((parsed.protein || 0) * 10) / 10,
        calories: Math.round(parsed.calories || 0),
        carbs: Math.round((parsed.carbs || 0) * 10) / 10,
        fat: Math.round((parsed.fat || 0) * 10) / 10,
      },
      note: parsed.note || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
