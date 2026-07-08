import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client that respects the user's own auth token,
// so Row Level Security still confines it to that user's rows only.
function supabaseForUser(accessToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
}

const BIFROST_URL = process.env.BIFROST_URL || 'https://gateway-buildathon.ltl.sh/v1/chat/completions';
const MODEL = 'gpt-5.5';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing auth token' });
  const accessToken = authHeader.replace('Bearer ', '');

  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const sb = supabaseForUser(accessToken);
    const { data: { user }, error: userErr } = await sb.auth.getUser(accessToken);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid session' });

    // The UI stores all logs inside one JSON blob (user_settings.data), keyed
    // the same way the client's useStorage hook writes them.
    const { data: settingsRow } = await sb
      .from('user_settings').select('data').eq('user_id', user.id).maybeSingle();
    const blob = (settingsRow && settingsRow.data) || {};

    const weightLog = blob['p-weight-log'] || [];
    const workoutLog = blob['p-workout-log'] || [];
    const foodLog = blob['p-food-log'] || [];
    const macroTargets = blob['p-macro-targets'] || { calories: 2300, protein: 130, fat: 58, carbs: 290 };

    // Keep the context bounded: last ~21 days of each.
    const since = new Date();
    since.setDate(since.getDate() - 21);
    const sinceStr = since.toISOString().slice(0, 10);
    const recent = (arr) => arr.filter(x => (x.date || '') >= sinceStr);

    const contextSummary = `
User's recent logged data (last ~3 weeks):

Weight entries: ${JSON.stringify(recent(weightLog))}
Workouts: ${JSON.stringify(recent(workoutLog))}
Food/meals: ${JSON.stringify(recent(foodLog))}
Daily macro targets: ${JSON.stringify(macroTargets)}
`.trim();

    const systemPrompt = `You are a health and nutrition assistant embedded in a personal fitness tracking app. You answer questions strictly about health, nutrition, exercise, and the user's own logged data. You are not a doctor; for anything symptomatic, diagnostic, or medication-related, tell the user to see a real clinician instead of guessing. Use the user's actual logged data below to personalize answers when relevant. Keep answers concise and practical.

${contextSummary}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const gatewayRes = await fetch(BIFROST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GPT_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 700 }),
    });

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      console.error('Bifrost gateway error:', gatewayRes.status, errText);
      return res.status(502).json({ error: 'The AI gateway returned an error.' });
    }

    const data = await gatewayRes.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('Unexpected gateway response shape:', JSON.stringify(data));
      return res.status(502).json({ error: 'Unexpected response from AI gateway.' });
    }

    res.status(200).json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong generating a reply.' });
  }
}
