import { createClient } from '@supabase/supabase-js';

const BIFROST_URL = process.env.BIFROST_URL || 'https://gateway-buildathon.ltl.sh/v1/chat/completions';
const MODEL = 'gpt-5.5';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing auth token' });
  const accessToken = authHeader.replace('Bearer ', '');

  const { summaryText } = req.body;
  if (!summaryText) return res.status(400).json({ error: 'summaryText required' });

  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user }, error } = await sb.auth.getUser(accessToken);
    if (error || !user) return res.status(401).json({ error: 'Invalid session' });

    const systemPrompt = `You are a fitness and nutrition logging assistant. The person will describe their day in free text - workouts done, food eaten, and optionally their body weight. Extract structured data from it.

Rules for workouts:
- Identify the split type if mentioned (push, pull, legs, or cardio).
- Log EVERY SET as its own separate entry, never collapse multiple sets into one line with a multiplier. For example "bench 40kg x8 x3" (3 sets of 8 reps at 40kg) must become THREE separate entries: {"name":"Bench","weight":40,"reps":8}, {"name":"Bench","weight":40,"reps":8}, {"name":"Bench","weight":40,"reps":8}. If reps or weight differ across sets (e.g. a pyramid set), capture each set's actual weight and reps individually rather than assuming they're identical.
- If cardio duration is mentioned, capture minutes. If no workout is mentioned, return an empty exercises array and omit cardioMins.

Rules for food:
- Allocate every food item mentioned into EXACTLY 4 meal buckets: "Breakfast", "Lunch", "Snacks", "Dinner". Never create a 5th category and never leave a bucket out of the response - if nothing was eaten for a bucket, omit it from the meals array entirely (don't include an empty/zero entry for it).
- If the person explicitly labels what meal something was (e.g. "breakfast was X", "for lunch I had Y"), use that label directly.
- If items aren't labeled by meal, use your own intelligence and typical Indian eating patterns to allocate them sensibly: morning items (eggs, oats, idli, dosa, poha, upma) usually go to Breakfast; a heavier meal with rice/dal/roti/sabzi mentioned mid-description usually goes to Lunch; small items, fruit, shakes, or anything described as eaten between meals goes to Snacks; the last/heaviest meal mentioned, or anything described as evening/night, goes to Dinner. Use the order items are mentioned in the text as a hint for chronological placement across the day.
- For each meal bucket, estimate total protein, calories, carbs, and fat (summed across its items), using typical Indian food composition data. Include an "items" array listing the individual foods you placed in that bucket.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, in exactly this shape:
{"weightKg": number or null, "workout": {"type": "push|pull|legs|cardio", "exercises": [{"name": string, "weight": number, "reps": number}], "cardioMins": number} or null, "meals": [{"name": "Breakfast|Lunch|Snacks|Dinner", "items": [string], "protein": number, "calories": number, "carbs": number, "fat": number}]}`;

    const gw = await fetch(BIFROST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GPT_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Day recap: ${summaryText}` },
        ],
      }),
    });

    if (!gw.ok) {
      const t = await gw.text();
      console.error('parse-day gateway error', gw.status, t);
      return res.status(502).json({ error: 'AI gateway error' });
    }

    const data = await gw.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: 'Could not parse day summary' });

    const parsed = JSON.parse(match[0]);
    res.status(200).json({
      weightKg: parsed.weightKg != null ? Math.round(parsed.weightKg * 10) / 10 : null,
      workout: parsed.workout && (parsed.workout.type || (parsed.workout.exercises || []).length > 0 || parsed.workout.cardioMins > 0)
        ? {
            type: parsed.workout.type || 'cardio',
            exercises: (parsed.workout.exercises || []).map(ex => ({
              name: ex.name || '',
              weight: Math.round((ex.weight || 0) * 10) / 10,
              reps: Math.round(ex.reps || 0),
            })),
            cardioMins: Math.round(parsed.workout.cardioMins || 0),
          }
        : null,
      meals: (parsed.meals || []).map(m => ({
        name: m.name || '',
        items: Array.isArray(m.items) ? m.items.filter(Boolean) : [],
        protein: Math.round((m.protein || 0) * 10) / 10,
        calories: Math.round(m.calories || 0),
        carbs: Math.round((m.carbs || 0) * 10) / 10,
        fat: Math.round((m.fat || 0) * 10) / 10,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
