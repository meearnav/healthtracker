import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_TARGETS = { calories: 2300, protein: 130, fat: 58, carbs: 290 };
const PR_TARGETS = { squat: 100, bench: 45, curl: 15, jogPace: 6.0, jogDist: 4 };

const DEFAULT_LIFT_TARGETS = [
  { id: 'squat', label: 'Squat', target: 100, unit: 'kg' },
  { id: 'bench', label: 'Bench', target: 45, unit: 'kg' },
  { id: 'curl', label: 'DB Curl', target: 15, unit: 'kg' },
  { id: 'jog', label: 'Jog 4km', target: 6.0, unit: 'min/km pace' },
];

const DEFAULT_PROTEIN_SOURCES = [
  { id: 'eggs', name: 'Eggs', detail: '6g protein/egg, whole egg has the fat too' },
  { id: 'curd', name: 'Curd/yogurt', detail: '~11g per 200g, gentler than milk if lactose-sensitive' },
  { id: 'paneer', name: 'Paneer', detail: '~18g per 100g, low lactose, practical for canteen meals' },
  { id: 'tofu', name: 'Tofu', detail: '~8g per 100g, no dairy concern at all' },
  { id: 'dal', name: 'Lentils/dal', detail: '~9g per cooked cup, plus fiber' },
  { id: 'whey', name: 'Whey/soy protein', detail: 'Worth considering if canteen days fall short' },
];

const COLORS = {
  paper: '#F7F5F0',
  paperRaised: '#FCFBF8',
  ink: '#1C1B19',
  inkSoft: '#5B574E',
  clay: '#8B6F47',
  clayLight: '#E4D9C8',
  sage: '#4A5D52',
  sageLight: '#DFE6E1',
  brick: '#A33B2C',
  brickLight: '#F1DCD7',
  hairline: '#D4CFC4',
};

const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const fmtDate = (d) => {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Per-unit macro reference. Quantities are per typical serving noted in `per`.
const FOOD_DB = [
  { keys: ['egg', 'eggs', 'boiled egg', 'omelette', 'omelet'], per: '1 egg', protein: 6, calories: 78, carbs: 0.6, fat: 5.3 },
  { keys: ['egg white', 'egg whites'], per: '1 white', protein: 3.6, calories: 17, carbs: 0.2, fat: 0.1 },
  { keys: ['curd', 'yogurt', 'yoghurt', 'dahi'], per: '100g', protein: 3.5, calories: 60, carbs: 4.7, fat: 3.3 },
  { keys: ['paneer'], per: '100g', protein: 18, calories: 265, carbs: 1.2, fat: 20.8 },
  { keys: ['tofu'], per: '100g', protein: 8, calories: 76, carbs: 1.9, fat: 4.8 },
  { keys: ['milk'], per: '100ml', protein: 3.4, calories: 61, carbs: 4.8, fat: 3.3 },
  { keys: ['dal', 'lentil', 'lentils', 'sambar'], per: '1 cup cooked', protein: 9, calories: 198, carbs: 35, fat: 1.5 },
  { keys: ['rajma', 'chole', 'chickpea', 'chickpeas', 'kidney beans'], per: '1 cup cooked', protein: 15, calories: 269, carbs: 45, fat: 4.5 },
  { keys: ['rice', 'steamed rice'], per: '1 cup cooked', protein: 4.3, calories: 205, carbs: 45, fat: 0.4 },
  { keys: ['roti', 'chapati', 'phulka'], per: '1 piece', protein: 3, calories: 85, carbs: 18, fat: 0.4 },
  { keys: ['naan'], per: '1 piece', protein: 6, calories: 260, carbs: 45, fat: 5 },
  { keys: ['idli'], per: '1 piece', protein: 2, calories: 39, carbs: 8, fat: 0.1 },
  { keys: ['dosa'], per: '1 piece', protein: 3, calories: 133, carbs: 17, fat: 5 },
  { keys: ['upma'], per: '1 cup', protein: 5, calories: 192, carbs: 32, fat: 5 },
  { keys: ['poha'], per: '1 cup', protein: 4, calories: 180, carbs: 35, fat: 3 },
  { keys: ['paratha'], per: '1 piece', protein: 5, calories: 260, carbs: 32, fat: 12 },
  { keys: ['banana'], per: '1 medium', protein: 1.3, calories: 105, carbs: 27, fat: 0.4 },
  { keys: ['apple'], per: '1 medium', protein: 0.5, calories: 95, carbs: 25, fat: 0.3 },
  { keys: ['almonds', 'almond'], per: '10 pieces', protein: 2.4, calories: 70, carbs: 2.5, fat: 6 },
  { keys: ['peanut', 'peanuts', 'groundnut'], per: '30g', protein: 7.3, calories: 170, carbs: 6, fat: 14 },
  { keys: ['peanut butter'], per: '1 tbsp', protein: 3.6, calories: 94, carbs: 3, fat: 8 },
  { keys: ['oats', 'oatmeal'], per: '1 cup cooked', protein: 6, calories: 166, carbs: 28, fat: 3.6 },
  { keys: ['bread', 'toast'], per: '1 slice', protein: 3, calories: 80, carbs: 14, fat: 1 },
  { keys: ['cheese'], per: '1 slice (20g)', protein: 5, calories: 80, carbs: 0.5, fat: 6.5 },
  { keys: ['butter', 'ghee'], per: '1 tbsp', protein: 0, calories: 102, carbs: 0, fat: 11.5 },
  { keys: ['protein shake', 'whey', 'protein powder'], per: '1 scoop', protein: 24, calories: 120, carbs: 3, fat: 1.5 },
  { keys: ['soya chunks', 'soy chunks', 'soya'], per: '50g dry', protein: 26, calories: 173, carbs: 17, fat: 0.5 },
  { keys: ['vegetable curry', 'sabzi', 'mixed veg'], per: '1 cup', protein: 3, calories: 120, carbs: 14, fat: 6 },
  { keys: ['salad'], per: '1 bowl', protein: 2, calories: 60, carbs: 10, fat: 1 },
];

function estimateMacros(text) {
  const lower = text.toLowerCase();
  let totals = { protein: 0, calories: 0, carbs: 0, fat: 0 };
  let matched = [];
  let unmatched = [];

  const parts = lower.split(/[+,]| and /).map(s => s.trim()).filter(Boolean);

  parts.forEach(part => {
    const numMatch = part.match(/^(\d+(\.\d+)?)\s*/);
    const qty = numMatch ? parseFloat(numMatch[1]) : 1;
    const rest = numMatch ? part.slice(numMatch[0].length).trim() : part;

    const food = FOOD_DB.find(f => f.keys.some(k => rest.includes(k)));
    if (food) {
      totals.protein += food.protein * qty;
      totals.calories += food.calories * qty;
      totals.carbs += food.carbs * qty;
      totals.fat += food.fat * qty;
      matched.push(`${qty} \u00d7 ${food.keys[0]}`);
    } else if (rest) {
      unmatched.push(rest);
    }
  });

  return {
    totals: {
      protein: Math.round(totals.protein * 10) / 10,
      calories: Math.round(totals.calories),
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    },
    matched,
    unmatched,
  };
}

function downloadCSV(weightLog, workoutLog, foodLog) {
  const lines = [];
  lines.push('Section,Date,Field1,Field2,Field3,Field4,Field5');

  weightLog.forEach(w => {
    lines.push(`Weight,${w.date},${w.weightKg}kg,,,,`);
  });

  workoutLog.forEach(w => {
    const exSummary = w.exercises.map(ex => `${ex.name} ${ex.weight}kg x${ex.reps}`).join('; ');
    lines.push(`Workout,${w.date},${w.type},"${exSummary}",${w.cardioMins || 0}min cardio,,`);
  });

  foodLog.forEach(m => {
    lines.push(`Food,${m.date},"${m.name}",${m.protein}g protein,${m.calories}kcal,${m.carbs}g carbs,${m.fat}g fat`);
  });

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-log-${todayStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parses one CSV line into fields, respecting double-quoted fields that may contain commas.
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { fields.push(cur); cur = ''; }
      else cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const numFrom = (s) => {
  if (s == null) return null;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

// Parses the exported CSV format back into weight/workout/food entries.
// Returns { weights, workouts, foods, errors } - errors is a list of { line, reason } for skipped rows.
// Nothing here touches storage; this is pure parsing so the caller can show a preview first.
function parseImportCSV(text) {
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { weights: [], workouts: [], foods: [], errors: [{ line: 0, reason: 'File is empty.' }] };
  }

  const weights = [];
  const workouts = [];
  const foods = [];
  const errors = [];

  // Skip a header row if present (first cell is literally "Section").
  let startIdx = 0;
  const firstFields = parseCsvLine(rawLines[0]);
  if ((firstFields[0] || '').trim().toLowerCase() === 'section') startIdx = 1;

  for (let i = startIdx; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const fields = parseCsvLine(rawLines[i]);
    const section = (fields[0] || '').trim().toLowerCase();
    const date = (fields[1] || '').trim();

    if (!DATE_RE.test(date)) {
      errors.push({ line: lineNum, reason: `Unrecognized or missing date ("${fields[1] || ''}"). Expected YYYY-MM-DD.` });
      continue;
    }

    if (section === 'weight') {
      const w = numFrom(fields[2]);
      if (w == null || w < 30 || w > 200) {
        errors.push({ line: lineNum, reason: `Weight value missing or out of plausible range (30-200kg): "${fields[2] || ''}".` });
        continue;
      }
      weights.push({ date, weightKg: w });
    } else if (section === 'workout') {
      const type = (fields[2] || 'cardio').trim().toLowerCase();
      const validTypes = ['push', 'pull', 'legs', 'cardio'];
      const exSummary = (fields[3] || '').trim();
      const cardioMins = numFrom(fields[4]) || 0;
      const exercises = [];
      if (exSummary) {
        exSummary.split(';').map(s => s.trim()).filter(Boolean).forEach(part => {
          // format: "Name 40kg x8"
          const m = part.match(/^(.*?)\s+([\d.]+)\s*kg\s*x\s*(\d+)$/i);
          if (m) {
            exercises.push({ name: m[1].trim(), weight: parseFloat(m[2]), reps: parseInt(m[3], 10) });
          } else {
            errors.push({ line: lineNum, reason: `Could not parse exercise entry "${part}" — expected format "Name WEIGHTkg xREPS".` });
          }
        });
      }
      if (exercises.length === 0 && cardioMins === 0) {
        errors.push({ line: lineNum, reason: 'Workout row has no exercises and no cardio minutes; skipped.' });
        continue;
      }
      workouts.push({
        date,
        type: validTypes.includes(type) ? type : 'cardio',
        exercises,
        cardioMins,
        id: Date.now().toString(36) + '-imp-w-' + lineNum,
      });
    } else if (section === 'food') {
      const name = (fields[2] || '').trim();
      const protein = numFrom(fields[3]);
      const calories = numFrom(fields[4]);
      const carbs = numFrom(fields[5]);
      const fat = numFrom(fields[6]);
      if (!name) {
        errors.push({ line: lineNum, reason: 'Food row has no meal name; skipped.' });
        continue;
      }
      if (protein == null && calories == null && carbs == null && fat == null) {
        errors.push({ line: lineNum, reason: `Food row "${name}" has no readable macro values; skipped.` });
        continue;
      }
      foods.push({
        date,
        name,
        protein: protein ?? 0,
        calories: calories ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        estimated: false,
        source: 'import',
        id: Date.now().toString(36) + '-imp-f-' + lineNum,
      });
    } else {
      errors.push({ line: lineNum, reason: `Unrecognized section "${fields[0] || ''}" — expected Weight, Workout, or Food.` });
    }
  }

  return { weights, workouts, foods, errors };
}


// Calls our server-side gateway route to estimate macros for a free-text meal.
// The API key lives on the server; the browser only sends the user's auth token.
async function searchMacrosWithAI(mealText) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch('/api/estimate-meal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ mealText }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return { totals: data.totals, note: data.note || '' };
}

// Calls our server-side gateway route to parse a free-text day recap into
// structured weight / workout / meal entries. Key stays server-side.
async function parseDaySummaryWithAI(summaryText) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch('/api/parse-day', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ summaryText }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Supabase-backed replacement for the original window.storage hook.
// Same [value, save, loaded] signature so the rest of the component is unchanged.
// Each `key` is stored as one field inside the current user's single
// `user_settings.data` JSON blob, scoped per-user by Row Level Security.
function useStorage(key, fallback, shared = false) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (mounted) { setValue(fallback); setLoaded(true); } return; }
        const { data } = await supabase
          .from('user_settings').select('data').eq('user_id', user.id).maybeSingle();
        const blob = (data && data.data) || {};
        if (mounted) {
          setValue(key in blob ? blob[key] : fallback);
          setLoaded(true);
        }
      } catch {
        if (mounted) { setValue(fallback); setLoaded(true); }
      }
    })();
    return () => { mounted = false; };
  }, [key]);

  const save = useCallback(async (newValue) => {
    setValue(newValue); // optimistic
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Read-modify-write the single JSON blob so concurrent keys don't clobber.
      const { data } = await supabase
        .from('user_settings').select('data').eq('user_id', user.id).maybeSingle();
      const blob = (data && data.data) || {};
      blob[key] = newValue;
      await supabase.from('user_settings')
        .upsert({ user_id: user.id, data: blob, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' });
    } catch {
      // best effort; UI already optimistically updated
    }
  }, [key, shared]);

  return [value, save, loaded];
}

const btnStyle = (active) => ({
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: '15px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  padding: '8px 14px',
  border: `1px solid ${active ? COLORS.ink : COLORS.hairline}`,
  borderRadius: '3px',
  background: active ? COLORS.ink : 'transparent',
  color: active ? COLORS.paper : COLORS.inkSoft,
  cursor: 'pointer',
});

const inputStyle = {
  fontFamily: "'Source Serif 4', Georgia, serif",
  fontSize: '15px',
  padding: '8px 10px',
  border: `1px solid ${COLORS.hairline}`,
  borderRadius: '3px',
  background: COLORS.paperRaised,
  color: COLORS.ink,
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: COLORS.inkSoft,
  display: 'block',
  marginBottom: '4px',
};

const cardStyle = {
  background: COLORS.paperRaised,
  border: `1px solid ${COLORS.hairline}`,
  borderRadius: '6px',
  padding: '16px',
};

function StatBlock({ label, value, unit, target, tone }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  let barColor = COLORS.clay;
  if (tone === 'good') barColor = COLORS.sage;
  if (tone === 'over') barColor = COLORS.brick;
  return (
    <div style={{ ...cardStyle, flex: 1, minWidth: '130px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: 700, color: COLORS.ink, lineHeight: 1.1 }}>
        {value}<span style={{ fontSize: '14px', color: COLORS.inkSoft, fontWeight: 600 }}> {unit}</span>
      </div>
      {target ? (
        <>
          <div style={{ fontSize: '12px', color: COLORS.inkSoft, fontFamily: "'Source Serif 4', Georgia, serif", marginTop: '2px' }}>
            of {target} {unit} target
          </div>
          <div style={{ height: '5px', background: COLORS.hairline, borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.3s' }} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlateBar({ label, current, peak, unit }) {
  const pct = peak ? Math.min(100, Math.round((current / peak) * 100)) : 0;
  const reached = current >= peak;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '14px', fontWeight: 600, color: COLORS.ink, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
        <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', color: COLORS.inkSoft }}>
          {current}{unit} <span style={{ color: COLORS.hairline }}>/</span> {peak}{unit} peak
        </span>
      </div>
      <div style={{ height: '14px', background: COLORS.clayLight, borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: reached ? COLORS.sage : COLORS.clay,
          backgroundImage: reached ? 'none' : `repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.08) 18px, rgba(0,0,0,0.08) 20px)`,
        }} />
      </div>
    </div>
  );
}

export default function HealthTrackerPersonal() {
  const [tab, setTab] = useState('today');
  const [profile, saveProfile, profileLoaded] = useStorage('p-profile', { targets: DEFAULT_TARGETS, peaks: PR_TARGETS });
  const [weightLog, saveWeightLog, weightLoaded] = useStorage('p-weight-log', []);
  const [workoutLog, saveWorkoutLog, workoutLoaded] = useStorage('p-workout-log', []);
  const [foodLog, saveFoodLog, foodLoaded] = useStorage('p-food-log', []);
  const [liftTargets, saveLiftTargets, liftTargetsLoaded] = useStorage('p-lift-targets', DEFAULT_LIFT_TARGETS);
  const [proteinSources, saveProteinSources, proteinSourcesLoaded] = useStorage('p-protein-sources', DEFAULT_PROTEIN_SOURCES);
  const [macroTargets, saveMacroTargets, macroTargetsLoaded] = useStorage('p-macro-targets', DEFAULT_TARGETS);

  const allLoaded = profileLoaded && weightLoaded && workoutLoaded && foodLoaded && liftTargetsLoaded && proteinSourcesLoaded && macroTargetsLoaded;

  // form states
  const [weightInput, setWeightInput] = useState('');
  const [mealName, setMealName] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealCarbs, setMealCarbs] = useState('');
  const [mealFat, setMealFat] = useState('');
  const [workoutType, setWorkoutType] = useState('push');
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseWeight, setExerciseWeight] = useState('');
  const [exerciseReps, setExerciseReps] = useState('');
  const [cardioMins, setCardioMins] = useState('');
  const [draftExercises, setDraftExercises] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [aiError, setAiError] = useState('');

  // day summary tab state
  const [summaryDate, setSummaryDate] = useState(todayStr());
  const [summaryText, setSummaryText] = useState('');
  const [summaryParsed, setSummaryParsed] = useState(null);
  const [summaryParsing, setSummaryParsing] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // history tab state
  const [historyDate, setHistoryDate] = useState(todayStr());
  const [historyEditing, setHistoryEditing] = useState(false);
  const [historyEditWeight, setHistoryEditWeight] = useState('');
  const [historyEditWorkouts, setHistoryEditWorkouts] = useState([]);
  const [historyEditFood, setHistoryEditFood] = useState([]);

  // editable settings state
  const [editingLifts, setEditingLifts] = useState(false);
  const [draftLifts, setDraftLifts] = useState([]);
  const [editingMacros, setEditingMacros] = useState(false);
  const [draftMacros, setDraftMacros] = useState({});
  const [editingProtein, setEditingProtein] = useState(false);
  const [draftProtein, setDraftProtein] = useState([]);
  const [newLiftLabel, setNewLiftLabel] = useState('');
  const [newLiftTarget, setNewLiftTarget] = useState('');
  const [newLiftUnit, setNewLiftUnit] = useState('kg');
  const [newProteinName, setNewProteinName] = useState('');
  const [newProteinDetail, setNewProteinDetail] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [logDate, setLogDate] = useState(todayStr());

  const targets = macroTargets || DEFAULT_TARGETS;
  const peaks = profile?.peaks || PR_TARGETS;

  const today = todayStr();
  const logDateFood = foodLog.filter(f => f.date === logDate);
  const logDateTotals = logDateFood.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const latestWeight = weightLog.length ? weightLog[weightLog.length - 1].weightKg : null;

  function flash(msg) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2000);
  }

  async function addWeight() {
    const w = parseFloat(weightInput);
    if (!w || w < 30 || w > 200) return;
    const next = [...weightLog.filter(e => e.date !== logDate), { date: logDate, weightKg: w }]
      .sort((a, b) => a.date.localeCompare(b.date));
    await saveWeightLog(next);
    setWeightInput('');
    flash('Weight logged');
  }

  function handleMealNameChange(value) {
    setMealName(value);
    setAiNote(''); setAiError('');
    if (value.trim().length > 2) {
      setEstimate(estimateMacros(value));
    } else {
      setEstimate(null);
    }
  }

  async function handleAiSearch() {
    if (!mealName.trim()) return;
    setAiSearching(true);
    setAiError(''); setAiNote('');
    try {
      const result = await searchMacrosWithAI(mealName.trim());
      setMealProtein(String(result.totals.protein));
      setMealCalories(String(result.totals.calories));
      setMealCarbs(String(result.totals.carbs));
      setMealFat(String(result.totals.fat));
      setAiNote(result.note);
      setEstimate(null);
    } catch (err) {
      setAiError('Could not fetch an estimate right now. Try again, or enter macros manually.');
    } finally {
      setAiSearching(false);
    }
  }

  async function addMeal() {
    if (!mealName.trim()) return;
    const est = estimate || estimateMacros(mealName);
    const usedManualOverride = mealProtein !== '' || mealCalories !== '' || mealCarbs !== '' || mealFat !== '';
    const entry = {
      date: logDate,
      name: mealName.trim(),
      protein: mealProtein !== '' ? parseFloat(mealProtein) : est.totals.protein,
      calories: mealCalories !== '' ? parseFloat(mealCalories) : est.totals.calories,
      carbs: mealCarbs !== '' ? parseFloat(mealCarbs) : est.totals.carbs,
      fat: mealFat !== '' ? parseFloat(mealFat) : est.totals.fat,
      estimated: !usedManualOverride,
      source: usedManualOverride ? (aiNote ? 'ai' : 'manual') : 'lookup',
      id: Date.now().toString(36),
    };
    await saveFoodLog([...foodLog, entry]);
    setMealName(''); setMealProtein(''); setMealCalories(''); setMealCarbs(''); setMealFat('');
    setEstimate(null); setAiNote(''); setAiError('');
    flash('Meal logged');
  }

  async function deleteMeal(id) {
    await saveFoodLog(foodLog.filter(m => m.id !== id));
  }

  function handleExport() {
    downloadCSV(weightLog, workoutLog, foodLog);
    flash('CSV downloaded');
  }

  function handleImportFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportError('');
    setImportPreview(null);
    setImporting(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target.result || '');
        const result = parseImportCSV(text);

        const existingWeightDates = new Set(weightLog.map(w => w.date));
        const existingWorkoutDates = new Set(workoutLog.map(w => w.date));
        const existingFoodDates = new Set(foodLog.map(m => m.date));

        const newWeights = result.weights.filter(w => !existingWeightDates.has(w.date));
        const skippedWeights = result.weights.length - newWeights.length;

        const newWorkouts = result.workouts.filter(w => !existingWorkoutDates.has(w.date));
        const skippedWorkouts = result.workouts.length - newWorkouts.length;

        const newFoods = result.foods.filter(m => !existingFoodDates.has(m.date));
        const skippedFoods = result.foods.length - newFoods.length;

        setImportPreview({
          fileName: file.name,
          newWeights, skippedWeights,
          newWorkouts, skippedWorkouts,
          newFoods, skippedFoods,
          errors: result.errors,
        });
      } catch (err) {
        setImportError('Could not read that file as a CSV. Make sure it\'s the format exported by this tracker.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setImportError('Could not read that file.');
      setImporting(false);
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!importPreview) return;
    if (importPreview.newWeights.length > 0) {
      await saveWeightLog([...weightLog, ...importPreview.newWeights].sort((a, b) => a.date.localeCompare(b.date)));
    }
    if (importPreview.newWorkouts.length > 0) {
      await saveWorkoutLog([...workoutLog, ...importPreview.newWorkouts]);
    }
    if (importPreview.newFoods.length > 0) {
      await saveFoodLog([...foodLog, ...importPreview.newFoods]);
    }
    const total = importPreview.newWeights.length + importPreview.newWorkouts.length + importPreview.newFoods.length;
    setImportPreview(null);
    flash(`Imported ${total} new entr${total === 1 ? 'y' : 'ies'}`);
  }

  function cancelImport() {
    setImportPreview(null);
    setImportError('');
  }

  async function handleParseSummary() {
    if (!summaryText.trim()) return;
    setSummaryParsing(true);
    setSummaryError(''); setSummaryParsed(null);
    try {
      const result = await parseDaySummaryWithAI(summaryText.trim());
      setSummaryParsed(result);
    } catch (err) {
      setSummaryError('Could not parse that summary right now. Try again, or log items individually in the other tabs.');
    } finally {
      setSummaryParsing(false);
    }
  }

  function updateParsedMeal(index, field, value) {
    setSummaryParsed(prev => {
      const meals = [...prev.meals];
      let nextValue;
      if (field === 'name') nextValue = value;
      else if (field === 'items') nextValue = value.split(',').map(s => s.trim()).filter(Boolean);
      else nextValue = parseFloat(value) || 0;
      meals[index] = { ...meals[index], [field]: nextValue };
      return { ...prev, meals };
    });
  }

  function removeParsedMeal(index) {
    setSummaryParsed(prev => ({ ...prev, meals: prev.meals.filter((_, i) => i !== index) }));
  }

  function updateParsedExercise(index, field, value) {
    setSummaryParsed(prev => {
      const exercises = [...prev.workout.exercises];
      exercises[index] = { ...exercises[index], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
      return { ...prev, workout: { ...prev.workout, exercises } };
    });
  }

  function removeParsedExercise(index) {
    setSummaryParsed(prev => ({
      ...prev,
      workout: { ...prev.workout, exercises: prev.workout.exercises.filter((_, i) => i !== index) },
    }));
  }

  async function confirmSummary() {
    if (!summaryParsed) return;
    const dateToUse = summaryDate;

    if (summaryParsed.weightKg != null) {
      const nextWeights = [...weightLog.filter(e => e.date !== dateToUse), { date: dateToUse, weightKg: summaryParsed.weightKg }]
        .sort((a, b) => a.date.localeCompare(b.date));
      await saveWeightLog(nextWeights);
    }

    if (summaryParsed.workout && (summaryParsed.workout.exercises.length > 0 || summaryParsed.workout.cardioMins > 0)) {
      const entry = {
        date: dateToUse,
        type: summaryParsed.workout.type,
        exercises: summaryParsed.workout.exercises,
        cardioMins: summaryParsed.workout.cardioMins || 0,
        id: Date.now().toString(36) + '-w',
      };
      await saveWorkoutLog([...workoutLog, entry]);

      const newPeaks = { ...peaks };
      summaryParsed.workout.exercises.forEach(ex => {
        const lname = (ex.name || '').toLowerCase();
        if (lname.includes('squat') && ex.weight > (newPeaks.squat || 0)) newPeaks.squat = ex.weight;
        if (lname.includes('bench') && ex.weight > (newPeaks.bench || 0)) newPeaks.bench = ex.weight;
        if (lname.includes('curl') && ex.weight > (newPeaks.curl || 0)) newPeaks.curl = ex.weight;
      });
      if (JSON.stringify(newPeaks) !== JSON.stringify(peaks)) {
        await saveProfile({ ...profile, peaks: newPeaks });
      }
    }

    if (summaryParsed.meals.length > 0) {
      const newMeals = summaryParsed.meals.map((m, i) => ({
        date: dateToUse,
        name: (m.items && m.items.length > 0) ? `${m.name} (${m.items.join(' + ')})` : m.name,
        protein: m.protein,
        calories: m.calories,
        carbs: m.carbs,
        fat: m.fat,
        estimated: true,
        source: 'ai',
        id: Date.now().toString(36) + '-f' + i,
      }));
      await saveFoodLog([...foodLog, ...newMeals]);
    }

    setSummaryText(''); setSummaryParsed(null);
    flash('Day logged');
  }

  function clearSummary() {
    setSummaryText('');
    setSummaryParsed(null);
    setSummaryError('');
  }

  // --- Lift targets edit ---
  function startEditLifts() {
    setDraftLifts(liftTargets.map(l => ({ ...l })));
    setEditingLifts(true);
  }
  function cancelEditLifts() { setEditingLifts(false); }
  async function saveEditLifts() {
    await saveLiftTargets(draftLifts);
    setEditingLifts(false);
    flash('Lift targets saved');
  }
  function updateDraftLift(idx, field, value) {
    setDraftLifts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === 'target' ? (parseFloat(value) || 0) : value };
      return next;
    });
  }
  function removeDraftLift(idx) {
    setDraftLifts(prev => prev.filter((_, i) => i !== idx));
  }
  function addDraftLift() {
    if (!newLiftLabel.trim() || !newLiftTarget) return;
    setDraftLifts(prev => [...prev, { id: Date.now().toString(36), label: newLiftLabel.trim(), target: parseFloat(newLiftTarget), unit: newLiftUnit }]);
    setNewLiftLabel(''); setNewLiftTarget(''); setNewLiftUnit('kg');
  }

  // --- Macro targets edit ---
  function startEditMacros() {
    setDraftMacros({ ...targets });
    setEditingMacros(true);
  }
  function cancelEditMacros() { setEditingMacros(false); }
  async function saveEditMacros() {
    await saveMacroTargets(draftMacros);
    setEditingMacros(false);
    flash('Targets saved');
  }

  // --- Protein sources edit ---
  function startEditProtein() {
    setDraftProtein(proteinSources.map(p => ({ ...p })));
    setEditingProtein(true);
  }
  function cancelEditProtein() { setEditingProtein(false); }
  async function saveEditProtein() {
    await saveProteinSources(draftProtein);
    setEditingProtein(false);
    flash('Sources saved');
  }
  function updateDraftProtein(idx, field, value) {
    setDraftProtein(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function removeDraftProtein(idx) {
    setDraftProtein(prev => prev.filter((_, i) => i !== idx));
  }
  function addDraftProtein() {
    if (!newProteinName.trim()) return;
    setDraftProtein(prev => [...prev, { id: Date.now().toString(36), name: newProteinName.trim(), detail: newProteinDetail.trim() }]);
    setNewProteinName(''); setNewProteinDetail('');
  }

  function startHistoryEdit() {
    const dayWeight = weightLog.find(w => w.date === historyDate);
    const dayWorkouts = workoutLog.filter(w => w.date === historyDate);
    const dayFood = foodLog.filter(m => m.date === historyDate);
    setHistoryEditWeight(dayWeight ? String(dayWeight.weightKg) : '');
    setHistoryEditWorkouts(dayWorkouts.map(w => ({ ...w, exercises: w.exercises.map(ex => ({ ...ex })) })));
    setHistoryEditFood(dayFood.map(m => ({ ...m })));
    setHistoryEditing(true);
  }

  function cancelHistoryEdit() {
    setHistoryEditing(false);
  }

  function updateHistoryExercise(workoutIdx, exIdx, field, value) {
    setHistoryEditWorkouts(prev => {
      const next = [...prev];
      const exercises = [...next[workoutIdx].exercises];
      exercises[exIdx] = { ...exercises[exIdx], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
      next[workoutIdx] = { ...next[workoutIdx], exercises };
      return next;
    });
  }

  function removeHistoryExercise(workoutIdx, exIdx) {
    setHistoryEditWorkouts(prev => {
      const next = [...prev];
      next[workoutIdx] = { ...next[workoutIdx], exercises: next[workoutIdx].exercises.filter((_, i) => i !== exIdx) };
      return next;
    });
  }

  function removeHistoryWorkout(workoutIdx) {
    setHistoryEditWorkouts(prev => prev.filter((_, i) => i !== workoutIdx));
  }

  function updateHistoryWorkoutField(workoutIdx, field, value) {
    setHistoryEditWorkouts(prev => {
      const next = [...prev];
      next[workoutIdx] = { ...next[workoutIdx], [field]: field === 'type' ? value : (parseFloat(value) || 0) };
      return next;
    });
  }

  function updateHistoryMeal(mealIdx, field, value) {
    setHistoryEditFood(prev => {
      const next = [...prev];
      next[mealIdx] = { ...next[mealIdx], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
      return next;
    });
  }

  function removeHistoryMeal(mealIdx) {
    setHistoryEditFood(prev => prev.filter((_, i) => i !== mealIdx));
  }

  async function saveHistoryEdit() {
    const w = parseFloat(historyEditWeight);
    const nextWeights = historyEditWeight !== '' && !isNaN(w)
      ? [...weightLog.filter(e => e.date !== historyDate), { date: historyDate, weightKg: w }].sort((a, b) => a.date.localeCompare(b.date))
      : weightLog.filter(e => e.date !== historyDate);
    await saveWeightLog(nextWeights);

    const otherWorkouts = workoutLog.filter(w => w.date !== historyDate);
    await saveWorkoutLog([...otherWorkouts, ...historyEditWorkouts]);

    const otherFood = foodLog.filter(m => m.date !== historyDate);
    await saveFoodLog([...otherFood, ...historyEditFood]);

    setHistoryEditing(false);
    flash('Day updated');
  }

  function addDraftExercise() {
    if (!exerciseName.trim() || !exerciseWeight || !exerciseReps) return;
    setDraftExercises([...draftExercises, {
      name: exerciseName.trim(),
      weight: parseFloat(exerciseWeight),
      reps: parseInt(exerciseReps, 10),
    }]);
    setExerciseName(''); setExerciseWeight(''); setExerciseReps('');
  }

  async function saveWorkout() {
    if (draftExercises.length === 0 && !cardioMins) return;
    const entry = {
      date: logDate,
      type: workoutType,
      exercises: draftExercises,
      cardioMins: parseFloat(cardioMins) || 0,
      id: Date.now().toString(36),
    };
    await saveWorkoutLog([...workoutLog, entry]);

    // update peaks if exceeded
    const newPeaks = { ...peaks };
    draftExercises.forEach(ex => {
      const lname = ex.name.toLowerCase();
      if (lname.includes('squat') && ex.weight > (newPeaks.squat || 0)) newPeaks.squat = ex.weight;
      if (lname.includes('bench') && ex.weight > (newPeaks.bench || 0)) newPeaks.bench = ex.weight;
      if (lname.includes('curl') && ex.weight > (newPeaks.curl || 0)) newPeaks.curl = ex.weight;
    });
    if (JSON.stringify(newPeaks) !== JSON.stringify(peaks)) {
      await saveProfile({ ...profile, peaks: newPeaks });
    }

    setDraftExercises([]); setCardioMins('');
    flash('Workout logged');
  }

  if (!allLoaded) {
    return (
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.inkSoft, padding: '2rem', textAlign: 'center' }}>
        Opening your logbook…
      </div>
    );
  }

  // current squat/bench/curl maxes for plate bars (best lifetime values seen)
  const liftMaxes = { squat: peaks.squat || 0, bench: peaks.bench || 0, curl: peaks.curl || 0 };

  const recentWorkouts = [...workoutLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const recentWeights = [...weightLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  // PR timeline: for each exercise name, find every date a new heaviest weight was logged
  // (a "PR moment"), producing a running best-ever record per lift.
  function buildPrTimeline() {
    const byExercise = {};
    const sortedSessions = [...workoutLog].sort((a, b) => a.date.localeCompare(b.date));
    sortedSessions.forEach(session => {
      (session.exercises || []).forEach(ex => {
        const key = (ex.name || '').trim().toLowerCase();
        if (!key) return;
        if (!byExercise[key]) byExercise[key] = { label: ex.name.trim(), best: 0, milestones: [] };
        if (ex.weight > byExercise[key].best) {
          byExercise[key].best = ex.weight;
          byExercise[key].milestones.push({ date: session.date, weight: ex.weight, reps: ex.reps });
        }
      });
    });
    return Object.values(byExercise)
      .filter(e => e.milestones.length > 0)
      .sort((a, b) => b.best - a.best);
  }
  const prTimeline = buildPrTimeline();

  // Weekly volume: bucket every logged set into ISO weeks, counted per workout type.
  function isoWeekKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  function buildWeeklyVolume() {
    const weeks = {};
    workoutLog.forEach(session => {
      const wk = isoWeekKey(session.date);
      if (!weeks[wk]) weeks[wk] = { push: 0, pull: 0, legs: 0, cardio: 0 };
      const setCount = (session.exercises || []).length;
      const type = session.type || 'cardio';
      if (weeks[wk][type] !== undefined) {
        weeks[wk][type] += setCount > 0 ? setCount : (session.cardioMins > 0 ? 1 : 0);
      }
    });
    return Object.entries(weeks)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .reverse()
      .map(([weekStart, counts]) => ({ weekStart, ...counts }));
  }
  const weeklyVolume = buildWeeklyVolume();
  const weeklyVolumeMax = Math.max(1, ...weeklyVolume.flatMap(w => [w.push, w.pull, w.legs, w.cardio]));

  // simple sparkline path for weight trend
  const sortedWeights = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const wMin = sortedWeights.length ? Math.min(...sortedWeights.map(w => w.weightKg)) - 1 : 60;
  const wMax = sortedWeights.length ? Math.max(...sortedWeights.map(w => w.weightKg)) + 1 : 68;
  const sparkW = 600, sparkH = 120, padX = 10, padY = 10;
  const points = sortedWeights.map((w, i) => {
    const x = sortedWeights.length > 1 ? padX + (i / (sortedWeights.length - 1)) * (sparkW - padX * 2) : sparkW / 2;
    const y = padY + (1 - (w.weightKg - wMin) / (wMax - wMin || 1)) * (sparkH - padY * 2);
    return [x, y];
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  // history tab: collect every date that has any data, sorted newest first
  const allDatesSet = new Set([
    ...weightLog.map(w => w.date),
    ...workoutLog.map(w => w.date),
    ...foodLog.map(m => m.date),
  ]);
  const allDates = Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));

  const historyWeight = weightLog.find(w => w.date === historyDate);
  const historyWorkouts = workoutLog.filter(w => w.date === historyDate);
  const historyFood = foodLog.filter(m => m.date === historyDate);
  const historyTotals = historyFood.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", background: COLORS.paper, padding: '1.5rem', borderRadius: '10px', color: COLORS.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Source+Serif+4:ital,opsz@0,8..60;1,8..60&display=swap');
        .ht-btn:hover { opacity: 0.85; }
        .ht-tab-row { display: flex; gap: 8px; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .ht-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
        .ht-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }
        .ht-row > div { flex: 1; min-width: 90px; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.clay, fontWeight: 600 }}>
            Personal logbook
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '22px', fontWeight: 700 }}>
            {fmtDate(today)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saveMsg && (
            <div style={{ fontSize: '13px', color: COLORS.sage, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase' }}>
              {saveMsg}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleImportFileSelect}
          />
          <button
            className="ht-btn"
            style={{ ...btnStyle(false), opacity: importing ? 0.6 : 1 }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={importing}
            title="Upload a CSV in this tracker's export format"
          >
            {importing ? 'Reading…' : 'Import CSV'}
          </button>
          <button className="ht-btn" style={btnStyle(false)} onClick={handleExport} title="Download all logged data as CSV">
            Export CSV
          </button>
        </div>
      </div>

      {importError && (
        <div style={{ fontSize: '13px', color: COLORS.brick, background: COLORS.brickLight, borderRadius: '4px', padding: '8px 10px', marginBottom: '1rem' }}>
          {importError}
        </div>
      )}

      {importPreview && (
        <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: COLORS.clay, marginBottom: '8px' }}>
            Import preview — {importPreview.fileName}
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '10px' }}>
            <div>Weight: <strong>{importPreview.newWeights.length}</strong> new day{importPreview.newWeights.length !== 1 ? 's' : ''} to add{importPreview.skippedWeights > 0 && <span style={{ color: COLORS.inkSoft }}> · {importPreview.skippedWeights} skipped (date already logged)</span>}</div>
            <div>Workouts: <strong>{importPreview.newWorkouts.length}</strong> new session{importPreview.newWorkouts.length !== 1 ? 's' : ''} to add{importPreview.skippedWorkouts > 0 && <span style={{ color: COLORS.inkSoft }}> · {importPreview.skippedWorkouts} skipped (date already logged)</span>}</div>
            <div>Food: <strong>{importPreview.newFoods.length}</strong> new meal{importPreview.newFoods.length !== 1 ? 's' : ''} to add{importPreview.skippedFoods > 0 && <span style={{ color: COLORS.inkSoft }}> · {importPreview.skippedFoods} skipped (date already logged)</span>}</div>
          </div>

          {importPreview.errors.length > 0 && (
            <div style={{ fontSize: '12px', color: COLORS.brick, background: COLORS.brickLight, borderRadius: '4px', padding: '8px 10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{importPreview.errors.length} row{importPreview.errors.length !== 1 ? 's' : ''} couldn't be read and will be skipped:</div>
              {importPreview.errors.slice(0, 8).map((e, i) => (
                <div key={i}>Line {e.line}: {e.reason}</div>
              ))}
              {importPreview.errors.length > 8 && <div>…and {importPreview.errors.length - 8} more.</div>}
            </div>
          )}

          {(importPreview.newWeights.length + importPreview.newWorkouts.length + importPreview.newFoods.length) === 0 ? (
            <div style={{ fontSize: '14px', color: COLORS.inkSoft, marginBottom: '10px' }}>
              Nothing new to import — every date in this file already has data logged, or no valid rows were found.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '8px' }}>
            {(importPreview.newWeights.length + importPreview.newWorkouts.length + importPreview.newFoods.length) > 0 && (
              <button className="ht-btn" style={btnStyle(true)} onClick={confirmImport}>Confirm import</button>
            )}
            <button className="ht-btn" style={btnStyle(false)} onClick={cancelImport}>Cancel</button>
          </div>
        </div>
      )}

      <div className="ht-tab-row">
        {['today', 'day summary', 'workout', 'nutrition', 'progress', 'history'].map(t => (
          <button key={t} className="ht-btn" style={btnStyle(tab === t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={labelStyle}>Logging for</div>
            <div className="ht-row" style={{ alignItems: 'center' }}>
              <div style={{ flex: 'none', minWidth: '160px' }}>
                <input
                  style={{ ...inputStyle, maxWidth: '180px' }}
                  type="date"
                  value={logDate}
                  max={today}
                  onChange={e => setLogDate(e.target.value)}
                />
              </div>
              {logDate !== today && (
                <button className="ht-btn" style={btnStyle(false)} onClick={() => setLogDate(today)}>Back to today</button>
              )}
            </div>
            {logDate !== today && (
              <div style={{ fontSize: '12px', color: COLORS.clay, marginTop: '6px' }}>
                Logging against {fmtDate(logDate)}, not today. Anything you add below will be dated {fmtDate(logDate)}.
              </div>
            )}
          </div>

          <div className="ht-grid" style={{ marginBottom: '1.25rem' }}>
            <StatBlock label="Protein" value={Math.round(logDateTotals.protein)} unit="g" target={targets.protein} tone={logDateTotals.protein >= targets.protein ? 'good' : 'neutral'} />
            <StatBlock label="Calories" value={Math.round(logDateTotals.calories)} unit="kcal" target={targets.calories} tone={logDateTotals.calories > targets.calories * 1.1 ? 'over' : 'neutral'} />
            <StatBlock label="Carbs" value={Math.round(logDateTotals.carbs)} unit="g" target={targets.carbs} />
            <StatBlock label="Fat" value={Math.round(logDateTotals.fat)} unit="g" target={targets.fat} />
          </div>

          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={labelStyle}>Log weight for {fmtDate(logDate)}</div>
            <div className="ht-row">
              <div>
                <input style={inputStyle} type="number" step="0.1" placeholder={latestWeight ? `Last: ${latestWeight}kg` : 'kg'} value={weightInput} onChange={e => setWeightInput(e.target.value)} />
              </div>
              <button className="ht-btn" style={btnStyle(true)} onClick={addWeight}>Save</button>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Quick add a meal</div>
            <div className="ht-row" style={{ marginBottom: '8px' }}>
              <div style={{ flex: 2, minWidth: '160px' }}>
                <input style={inputStyle} placeholder="e.g. 2 eggs + curd + 1 roti" value={mealName} onChange={e => handleMealNameChange(e.target.value)} />
              </div>
              <button
                className="ht-btn"
                style={{ ...btnStyle(false), opacity: aiSearching ? 0.6 : 1 }}
                onClick={handleAiSearch}
                disabled={aiSearching || !mealName.trim()}
              >
                {aiSearching ? 'Searching…' : 'AI search'}
              </button>
            </div>

            {aiNote && (
              <div style={{
                fontSize: '13px', color: COLORS.sage, background: COLORS.sageLight, borderRadius: '4px',
                padding: '8px 10px', marginBottom: '8px', fontFamily: "'Source Serif 4', Georgia, serif",
              }}>
                AI estimate filled in below — {aiNote}
              </div>
            )}

            {aiError && (
              <div style={{
                fontSize: '13px', color: COLORS.brick, background: COLORS.brickLight, borderRadius: '4px',
                padding: '8px 10px', marginBottom: '8px', fontFamily: "'Source Serif 4', Georgia, serif",
              }}>
                {aiError}
              </div>
            )}

            {estimate && !aiNote && (
              <div style={{
                fontSize: '13px', color: COLORS.inkSoft, background: COLORS.clayLight, borderRadius: '4px',
                padding: '8px 10px', marginBottom: '8px', fontFamily: "'Source Serif 4', Georgia, serif",
              }}>
                {estimate.matched.length > 0 ? (
                  <>
                    Quick estimate: <strong style={{ color: COLORS.ink }}>{estimate.totals.protein}g protein</strong> · {estimate.totals.calories} kcal · {estimate.totals.carbs}g carbs · {estimate.totals.fat}g fat
                    {estimate.unmatched.length > 0 && (
                      <div style={{ marginTop: '2px' }}>Not recognized: {estimate.unmatched.join(', ')} — tap "AI search" for those, or add manually below</div>
                    )}
                  </>
                ) : (
                  <span>Didn't recognize these items in the quick lookup — tap "AI search" for an accurate estimate, or fill in macros manually below.</span>
                )}
              </div>
            )}

            <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginBottom: '4px' }}>
              Leave blank to use the estimate above. Fill in any field to override it.
            </div>
            <div className="ht-row">
              <div><input style={inputStyle} type="number" placeholder="Protein g" value={mealProtein} onChange={e => setMealProtein(e.target.value)} /></div>
              <div><input style={inputStyle} type="number" placeholder="Cals" value={mealCalories} onChange={e => setMealCalories(e.target.value)} /></div>
              <div><input style={inputStyle} type="number" placeholder="Carbs g" value={mealCarbs} onChange={e => setMealCarbs(e.target.value)} /></div>
              <div><input style={inputStyle} type="number" placeholder="Fat g" value={mealFat} onChange={e => setMealFat(e.target.value)} /></div>
              <button className="ht-btn" style={btnStyle(true)} onClick={addMeal}>Add</button>
            </div>
          </div>

          {logDateFood.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={labelStyle}>Meals — {fmtDate(logDate)}</div>
              {logDateFood.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.hairline}` }}>
                  <span>
                    {m.name}
                    {m.source === 'lookup' && <span style={{ fontSize: '11px', color: COLORS.clay, marginLeft: '6px' }}>(quick estimate)</span>}
                    {m.source === 'ai' && <span style={{ fontSize: '11px', color: COLORS.sage, marginLeft: '6px' }}>(AI estimate)</span>}
                  </span>
                  <span style={{ color: COLORS.inkSoft, display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span>{m.protein}g protein · {m.calories} kcal</span>
                    <button onClick={() => deleteMeal(m.id)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'workout' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={labelStyle}>Lift targets</div>
              {!editingLifts && (
                <button className="ht-btn" style={btnStyle(false)} onClick={startEditLifts}>Edit targets</button>
              )}
            </div>

            {!editingLifts && (
              <div style={{ fontSize: '14px', lineHeight: 1.9 }}>
                {liftTargets.map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>{l.label}</span>
                    <span style={{ color: COLORS.inkSoft }}>
                      best: <strong style={{ color: COLORS.ink }}>{peaks[l.id] || 0}{l.unit.startsWith('kg') ? 'kg' : ''}</strong>
                      {' '}<span style={{ color: COLORS.hairline }}>/</span> target: {l.target}{l.unit.startsWith('kg') ? 'kg' : ` ${l.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {editingLifts && (
              <>
                {draftLifts.map((l, i) => (
                  <div key={l.id} className="ht-row" style={{ marginBottom: '8px' }}>
                    <div style={{ flex: 2, minWidth: '100px' }}>
                      <input style={inputStyle} placeholder="Name" value={l.label} onChange={e => updateDraftLift(i, 'label', e.target.value)} />
                    </div>
                    <div style={{ minWidth: '70px' }}>
                      <input style={inputStyle} type="number" placeholder="Target" value={l.target} onChange={e => updateDraftLift(i, 'target', e.target.value)} />
                    </div>
                    <div style={{ minWidth: '80px' }}>
                      <input style={inputStyle} placeholder="unit" value={l.unit} onChange={e => updateDraftLift(i, 'unit', e.target.value)} />
                    </div>
                    <button onClick={() => removeDraftLift(i)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${COLORS.hairline}`, paddingTop: '10px', marginTop: '4px', marginBottom: '10px' }}>
                  <div style={{ ...labelStyle, marginBottom: '6px' }}>Add new lift</div>
                  <div className="ht-row">
                    <div style={{ flex: 2 }}><input style={inputStyle} placeholder="e.g. Shoulder press" value={newLiftLabel} onChange={e => setNewLiftLabel(e.target.value)} /></div>
                    <div><input style={inputStyle} type="number" placeholder="Target" value={newLiftTarget} onChange={e => setNewLiftTarget(e.target.value)} /></div>
                    <div><input style={inputStyle} placeholder="unit" value={newLiftUnit} onChange={e => setNewLiftUnit(e.target.value)} /></div>
                    <button className="ht-btn" style={btnStyle(false)} onClick={addDraftLift}>+ Add</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="ht-btn" style={btnStyle(true)} onClick={saveEditLifts}>Save</button>
                  <button className="ht-btn" style={btnStyle(false)} onClick={cancelEditLifts}>Cancel</button>
                </div>
              </>
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={labelStyle}>PR timeline</div>
            {prTimeline.length === 0 ? (
              <div style={{ fontSize: '14px', color: COLORS.inkSoft, padding: '0.5rem 0' }}>
                Log a few sessions with weights to start seeing your all-time bests here.
              </div>
            ) : (
              <div>
                {prTimeline.map((ex, i) => {
                  const latest = ex.milestones[ex.milestones.length - 1];
                  const prior = ex.milestones.length > 1 ? ex.milestones[ex.milestones.length - 2] : null;
                  return (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < prTimeline.length - 1 ? `1px solid ${COLORS.hairline}` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', color: COLORS.ink }}>{ex.label}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 700, color: COLORS.clay }}>{ex.best}kg</span>
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginTop: '2px' }}>
                        Hit on {fmtDate(latest.date)} at {latest.reps} reps
                        {prior && ` — up from ${prior.weight}kg on ${fmtDate(prior.date)}`}
                        {ex.milestones.length > 2 && ` · ${ex.milestones.length} PRs logged total`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginTop: '10px' }}>
              Auto-tracked from every session you log — no editing needed, this just reflects your real history.
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={labelStyle}>Weekly volume — sets per pattern</div>
            {weeklyVolume.length === 0 ? (
              <div style={{ fontSize: '14px', color: COLORS.inkSoft, padding: '0.5rem 0' }}>
                Log a few weeks of sessions to see your training volume by week.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '11px', color: COLORS.inkSoft, fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS.clay, display: 'inline-block' }} />Push</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS.sage, display: 'inline-block' }} />Pull</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS.brick, display: 'inline-block' }} />Legs</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS.inkSoft, display: 'inline-block' }} />Cardio</span>
                </div>
                {weeklyVolume.map((w, i) => {
                  const total = w.push + w.pull + w.legs + w.cardio;
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: COLORS.inkSoft, marginBottom: '3px' }}>
                        <span>Week of {fmtDate(w.weekStart)}</span>
                        <span>{total} session{total !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ height: '12px', borderRadius: '2px', overflow: 'hidden', display: 'flex', background: COLORS.clayLight }}>
                        {w.push > 0 && <div style={{ width: `${(w.push / weeklyVolumeMax) * 100}%`, background: COLORS.clay }} />}
                        {w.pull > 0 && <div style={{ width: `${(w.pull / weeklyVolumeMax) * 100}%`, background: COLORS.sage }} />}
                        {w.legs > 0 && <div style={{ width: `${(w.legs / weeklyVolumeMax) * 100}%`, background: COLORS.brick }} />}
                        {w.cardio > 0 && <div style={{ width: `${(w.cardio / weeklyVolumeMax) * 100}%`, background: COLORS.inkSoft }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginTop: '4px' }}>
              Counts logged sessions per split per week (last 6 weeks) — a quick check that no muscle group is being skipped.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={labelStyle}>Log a session</div>
              <input
                style={{ ...inputStyle, maxWidth: '160px' }}
                type="date"
                value={logDate}
                max={today}
                onChange={e => setLogDate(e.target.value)}
              />
            </div>
            {logDate !== today && (
              <div style={{ fontSize: '12px', color: COLORS.clay, marginBottom: '8px' }}>
                Logging against {fmtDate(logDate)}, not today.
              </div>
            )}
            <div className="ht-row" style={{ marginBottom: '10px' }}>
              <div>
                <span style={labelStyle}>Split</span>
                <select style={inputStyle} value={workoutType} onChange={e => setWorkoutType(e.target.value)}>
                  <option value="push">Push</option>
                  <option value="pull">Pull</option>
                  <option value="legs">Legs</option>
                  <option value="cardio">Cardio only</option>
                </select>
              </div>
              <div>
                <span style={labelStyle}>Cardio mins</span>
                <input style={inputStyle} type="number" placeholder="0" value={cardioMins} onChange={e => setCardioMins(e.target.value)} />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${COLORS.hairline}`, paddingTop: '10px', marginBottom: '10px' }}>
              <span style={labelStyle}>Add exercise</span>
              <div className="ht-row">
                <div style={{ flex: 2, minWidth: '140px' }}>
                  <input style={inputStyle} placeholder="e.g. Squat" value={exerciseName} onChange={e => setExerciseName(e.target.value)} />
                </div>
                <div><input style={inputStyle} type="number" placeholder="kg" value={exerciseWeight} onChange={e => setExerciseWeight(e.target.value)} /></div>
                <div><input style={inputStyle} type="number" placeholder="reps" value={exerciseReps} onChange={e => setExerciseReps(e.target.value)} /></div>
                <button className="ht-btn" style={btnStyle(false)} onClick={addDraftExercise}>+ Add</button>
              </div>
            </div>

            {draftExercises.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {draftExercises.map((ex, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' }}>
                    <span>{ex.name}</span>
                    <span style={{ color: COLORS.inkSoft }}>{ex.weight}kg × {ex.reps}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="ht-btn" style={btnStyle(true)} onClick={saveWorkout}>Save session</button>
          </div>

          {recentWorkouts.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={labelStyle}>Recent sessions</div>
              {recentWorkouts.map(w => (
                <div key={w.id} style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.hairline}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, textTransform: 'uppercase', fontSize: '13px', color: COLORS.clay }}>
                    <span>{w.type}</span>
                    <span>{fmtDate(w.date)}</span>
                  </div>
                  {w.exercises.map((ex, i) => (
                    <div key={i} style={{ fontSize: '14px', color: COLORS.inkSoft, paddingLeft: '4px' }}>{ex.name}: {ex.weight}kg × {ex.reps}</div>
                  ))}
                  {w.cardioMins > 0 && <div style={{ fontSize: '14px', color: COLORS.inkSoft, paddingLeft: '4px' }}>Cardio: {w.cardioMins} min</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'nutrition' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={labelStyle}>Viewing</div>
              <input
                style={{ ...inputStyle, maxWidth: '160px' }}
                type="date"
                value={logDate}
                max={today}
                onChange={e => setLogDate(e.target.value)}
              />
            </div>
            {logDate !== today && (
              <div style={{ fontSize: '12px', color: COLORS.clay, marginTop: '6px' }}>
                Showing {fmtDate(logDate)}. <button onClick={() => setLogDate(today)} style={{ background: 'none', border: 'none', color: COLORS.clay, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '12px' }}>Back to today</button>
              </div>
            )}
          </div>

          <div className="ht-grid" style={{ marginBottom: '1.25rem' }}>
            <StatBlock label={logDate === today ? "Protein today" : `Protein — ${fmtDate(logDate)}`} value={Math.round(logDateTotals.protein)} unit="g" target={targets.protein} tone={logDateTotals.protein >= targets.protein ? 'good' : 'neutral'} />
            <StatBlock label={logDate === today ? "Calories today" : `Calories — ${fmtDate(logDate)}`} value={Math.round(logDateTotals.calories)} unit="kcal" target={targets.calories} />
          </div>

          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={labelStyle}>Daily targets</div>
              {!editingMacros && (
                <button className="ht-btn" style={btnStyle(false)} onClick={startEditMacros}>Edit targets</button>
              )}
            </div>
            {!editingMacros && (
              <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
                <div>Protein: <strong>{targets.protein}g</strong> — anchor target, hit this first</div>
                <div>Calories: <strong>{targets.calories} kcal</strong> — mild deficit for slow recomp</div>
                <div>Fat: <strong>{targets.fat}g</strong> minimum for hormone health</div>
                <div>Carbs: <strong>{targets.carbs}g</strong> — fuels training, flex this up/down</div>
              </div>
            )}
            {editingMacros && (
              <>
                <div className="ht-row" style={{ marginBottom: '10px' }}>
                  <div>
                    <span style={labelStyle}>Protein (g)</span>
                    <input style={inputStyle} type="number" value={draftMacros.protein ?? targets.protein} onChange={e => setDraftMacros(p => ({ ...p, protein: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <span style={labelStyle}>Calories (kcal)</span>
                    <input style={inputStyle} type="number" value={draftMacros.calories ?? targets.calories} onChange={e => setDraftMacros(p => ({ ...p, calories: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <span style={labelStyle}>Carbs (g)</span>
                    <input style={inputStyle} type="number" value={draftMacros.carbs ?? targets.carbs} onChange={e => setDraftMacros(p => ({ ...p, carbs: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <span style={labelStyle}>Fat (g)</span>
                    <input style={inputStyle} type="number" value={draftMacros.fat ?? targets.fat} onChange={e => setDraftMacros(p => ({ ...p, fat: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="ht-btn" style={btnStyle(true)} onClick={saveEditMacros}>Save</button>
                  <button className="ht-btn" style={btnStyle(false)} onClick={cancelEditMacros}>Cancel</button>
                </div>
              </>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={labelStyle}>Protein sources</div>
              {!editingProtein && (
                <button className="ht-btn" style={btnStyle(false)} onClick={startEditProtein}>Edit sources</button>
              )}
            </div>

            {!editingProtein && (
              <div style={{ fontSize: '14px', lineHeight: 1.9, color: COLORS.inkSoft }}>
                {proteinSources.map(s => (
                  <div key={s.id}><strong style={{ color: COLORS.ink }}>{s.name}</strong>{s.detail ? ` — ${s.detail}` : ''}</div>
                ))}
              </div>
            )}

            {editingProtein && (
              <>
                {draftProtein.map((s, i) => (
                  <div key={s.id} style={{ marginBottom: '8px', borderBottom: `1px solid ${COLORS.hairline}`, paddingBottom: '8px' }}>
                    <div className="ht-row" style={{ marginBottom: '4px' }}>
                      <div style={{ flex: 1, minWidth: '100px' }}>
                        <input style={inputStyle} placeholder="Source name" value={s.name} onChange={e => updateDraftProtein(i, 'name', e.target.value)} />
                      </div>
                      <button onClick={() => removeDraftProtein(i)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                    </div>
                    <input style={inputStyle} placeholder="Detail / quantity info" value={s.detail} onChange={e => updateDraftProtein(i, 'detail', e.target.value)} />
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${COLORS.hairline}`, paddingTop: '10px', marginBottom: '10px' }}>
                  <div style={{ ...labelStyle, marginBottom: '6px' }}>Add source</div>
                  <div style={{ marginBottom: '6px' }}>
                    <input style={inputStyle} placeholder="Source name (e.g. Greek yogurt)" value={newProteinName} onChange={e => setNewProteinName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <input style={inputStyle} placeholder="Detail (e.g. ~17g per 100g)" value={newProteinDetail} onChange={e => setNewProteinDetail(e.target.value)} />
                  </div>
                  <button className="ht-btn" style={btnStyle(false)} onClick={addDraftProtein}>+ Add</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="ht-btn" style={btnStyle(true)} onClick={saveEditProtein}>Save</button>
                  <button className="ht-btn" style={btnStyle(false)} onClick={cancelEditProtein}>Cancel</button>
                </div>
              </>
            )}

            <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginTop: '10px', borderTop: `1px solid ${COLORS.hairline}`, paddingTop: '8px' }}>
              The Today tab auto-estimates macros for common foods when you type a meal description. Unrecognized items are flagged so you can fill them in manually.
            </div>
          </div>
        </div>
      )}

      {tab === 'progress' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={labelStyle}>Weight trend</div>
            {sortedWeights.length < 2 ? (
              <div style={{ fontSize: '14px', color: COLORS.inkSoft, padding: '1rem 0' }}>Log weight on a few more days to see a trend line.</div>
            ) : (
              <svg viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ width: '100%', height: '120px' }} role="img" aria-label="Body weight trend over time">
                <path d={pathD} fill="none" stroke={COLORS.clay} strokeWidth="2" />
                {points.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={COLORS.sage} />
                ))}
              </svg>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: COLORS.inkSoft, marginTop: '4px' }}>
              {sortedWeights.length > 0 && <span>{fmtDate(sortedWeights[0].date)}: {sortedWeights[0].weightKg}kg</span>}
              {sortedWeights.length > 1 && <span>{fmtDate(sortedWeights[sortedWeights.length - 1].date)}: {sortedWeights[sortedWeights.length - 1].weightKg}kg</span>}
            </div>
          </div>

          {recentWeights.length > 0 && (
            <div style={cardStyle}>
              <div style={labelStyle}>Recent weigh-ins</div>
              {recentWeights.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px', borderBottom: i < recentWeights.length - 1 ? `1px solid ${COLORS.hairline}` : 'none' }}>
                  <span style={{ color: COLORS.inkSoft }}>{fmtDate(w.date)}</span>
                  <span style={{ fontWeight: 600 }}>{w.weightKg} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'day summary' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={labelStyle}>Which day is this for?</div>
            <input
              style={{ ...inputStyle, maxWidth: '200px' }}
              type="date"
              value={summaryDate}
              max={todayStr()}
              onChange={e => setSummaryDate(e.target.value)}
            />
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Describe your day</div>
            <textarea
              style={{ ...inputStyle, minHeight: '110px', resize: 'vertical', fontFamily: "'Source Serif 4', Georgia, serif" }}
              placeholder="e.g. Did push day, bench 40kg x8 x3 sets, shoulder press 15kg x10 x3. 20 min treadmill after. Had 3 eggs and a banana in the morning, dal rice with curd around noon, a protein shake in the evening, paneer sabzi with 2 rotis at night. Weight this morning was 64.2kg."
              value={summaryText}
              onChange={e => setSummaryText(e.target.value)}
            />
            <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginTop: '4px' }}>
              Tip: most phone and desktop keyboards have a built-in microphone/dictation key right on the keyboard itself — that types into this box like any other text field.
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button className="ht-btn" style={{ ...btnStyle(true), opacity: summaryParsing ? 0.6 : 1 }} onClick={handleParseSummary} disabled={summaryParsing || !summaryText.trim()}>
                {summaryParsing ? 'Reading your day…' : 'Extract data'}
              </button>
              {(summaryText || summaryParsed) && (
                <button className="ht-btn" style={btnStyle(false)} onClick={clearSummary}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {summaryError && (
            <div style={{ fontSize: '13px', color: COLORS.brick, background: COLORS.brickLight, borderRadius: '4px', padding: '8px 10px', marginTop: '12px' }}>
              {summaryError}
            </div>
          )}

          {summaryParsed && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: COLORS.clay, marginBottom: '10px' }}>
                Confirm before logging — {fmtDate(summaryDate)}
              </div>

              {summaryParsed.weightKg != null && (
                <div style={{ ...cardStyle, marginBottom: '12px' }}>
                  <div style={labelStyle}>Weight</div>
                  <input
                    style={{ ...inputStyle, maxWidth: '140px' }}
                    type="number"
                    step="0.1"
                    value={summaryParsed.weightKg}
                    onChange={e => setSummaryParsed(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              )}

              {summaryParsed.workout && (
                <div style={{ ...cardStyle, marginBottom: '12px' }}>
                  <div style={labelStyle}>Workout — {summaryParsed.workout.type}</div>
                  {summaryParsed.workout.exercises.map((ex, i) => (
                    <div key={i} className="ht-row" style={{ marginBottom: '6px' }}>
                      <div style={{ flex: 2, minWidth: '120px' }}>
                        <input style={inputStyle} value={ex.name} onChange={e => updateParsedExercise(i, 'name', e.target.value)} />
                      </div>
                      <div><input style={inputStyle} type="number" value={ex.weight} onChange={e => updateParsedExercise(i, 'weight', e.target.value)} /></div>
                      <div><input style={inputStyle} type="number" value={ex.reps} onChange={e => updateParsedExercise(i, 'reps', e.target.value)} /></div>
                      <button onClick={() => removeParsedExercise(i)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                    </div>
                  ))}
                  {summaryParsed.workout.cardioMins > 0 && (
                    <div style={{ fontSize: '14px', color: COLORS.inkSoft, marginTop: '4px' }}>
                      Cardio: <input
                        style={{ ...inputStyle, width: '70px', display: 'inline-block' }}
                        type="number"
                        value={summaryParsed.workout.cardioMins}
                        onChange={e => setSummaryParsed(prev => ({ ...prev, workout: { ...prev.workout, cardioMins: parseFloat(e.target.value) || 0 } }))}
                      /> min
                    </div>
                  )}
                </div>
              )}

              {summaryParsed.meals.length > 0 && (
                <div style={{ ...cardStyle, marginBottom: '12px' }}>
                  <div style={labelStyle}>Meals</div>
                  {summaryParsed.meals.map((m, i) => (
                    <div key={i} style={{ borderBottom: i < summaryParsed.meals.length - 1 ? `1px solid ${COLORS.hairline}` : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                      <div className="ht-row" style={{ marginBottom: '4px' }}>
                        <div style={{ flex: 3, minWidth: '140px' }}>
                          <input style={inputStyle} value={m.name} onChange={e => updateParsedMeal(i, 'name', e.target.value)} />
                        </div>
                        <button onClick={() => removeParsedMeal(i)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: COLORS.inkSoft, display: 'block', marginBottom: '2px' }}>Items counted (comma-separated, edit if wrong)</span>
                        <input
                          style={{ ...inputStyle, fontSize: '13px' }}
                          value={(m.items || []).join(', ')}
                          onChange={e => updateParsedMeal(i, 'items', e.target.value)}
                          placeholder="e.g. Yoga Bar muesli, Amul milk"
                        />
                      </div>
                      <div className="ht-row">
                        <div><input style={inputStyle} type="number" value={m.protein} onChange={e => updateParsedMeal(i, 'protein', e.target.value)} placeholder="Protein g" /></div>
                        <div><input style={inputStyle} type="number" value={m.calories} onChange={e => updateParsedMeal(i, 'calories', e.target.value)} placeholder="Cals" /></div>
                        <div><input style={inputStyle} type="number" value={m.carbs} onChange={e => updateParsedMeal(i, 'carbs', e.target.value)} placeholder="Carbs g" /></div>
                        <div><input style={inputStyle} type="number" value={m.fat} onChange={e => updateParsedMeal(i, 'fat', e.target.value)} placeholder="Fat g" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!summaryParsed.weightKg && !summaryParsed.workout && summaryParsed.meals.length === 0 && (
                <div style={{ fontSize: '14px', color: COLORS.inkSoft, marginBottom: '12px' }}>
                  Nothing was extracted from that text. Try adding more detail, or log items individually in the other tabs.
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ht-btn" style={btnStyle(true)} onClick={confirmSummary}>Confirm and log this day</button>
                <button className="ht-btn" style={btnStyle(false)} onClick={clearSummary}>Clear and start over</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={labelStyle}>Pick a day</div>
                <input
                  style={{ ...inputStyle, maxWidth: '200px' }}
                  type="date"
                  value={historyDate}
                  max={todayStr()}
                  onChange={e => { setHistoryDate(e.target.value); setHistoryEditing(false); }}
                />
              </div>
              {!historyEditing && (historyWeight || historyWorkouts.length > 0 || historyFood.length > 0) && (
                <button className="ht-btn" style={btnStyle(false)} onClick={startHistoryEdit}>Edit this day</button>
              )}
            </div>
            {allDates.length > 0 && (
              <div style={{ fontSize: '12px', color: COLORS.inkSoft, marginTop: '8px' }}>
                {allDates.length} day{allDates.length !== 1 ? 's' : ''} logged so far
              </div>
            )}
          </div>

          {!historyEditing && !historyWeight && historyWorkouts.length === 0 && historyFood.length === 0 && (
            <div style={{ fontSize: '14px', color: COLORS.inkSoft, padding: '1rem 0' }}>
              No data logged for {fmtDate(historyDate)}.
            </div>
          )}

          {!historyEditing && (historyWeight || historyWorkouts.length > 0 || historyFood.length > 0) && (
            <>
              {historyWeight && (
                <div style={{ ...cardStyle, marginBottom: '12px' }}>
                  <div style={labelStyle}>Weight</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '22px', fontWeight: 700 }}>{historyWeight.weightKg} kg</div>
                </div>
              )}

              {historyWorkouts.length > 0 && (
                <div style={{ ...cardStyle, marginBottom: '12px' }}>
                  <div style={labelStyle}>Workout</div>
                  {historyWorkouts.map(w => (
                    <div key={w.id} style={{ marginBottom: '8px' }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, textTransform: 'uppercase', fontSize: '13px', color: COLORS.clay }}>{w.type}</div>
                      {w.exercises.map((ex, i) => (
                        <div key={i} style={{ fontSize: '14px', color: COLORS.inkSoft, paddingLeft: '4px' }}>{ex.name}: {ex.weight}kg × {ex.reps}</div>
                      ))}
                      {w.cardioMins > 0 && <div style={{ fontSize: '14px', color: COLORS.inkSoft, paddingLeft: '4px' }}>Cardio: {w.cardioMins} min</div>}
                    </div>
                  ))}
                </div>
              )}

              {historyFood.length > 0 && (
                <div style={cardStyle}>
                  <div style={labelStyle}>Food — {Math.round(historyTotals.protein)}g protein · {Math.round(historyTotals.calories)} kcal total</div>
                  {historyFood.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px', borderBottom: `1px solid ${COLORS.hairline}` }}>
                      <span>{m.name}</span>
                      <span style={{ color: COLORS.inkSoft }}>{m.protein}g protein · {m.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {historyEditing && (
            <>
              <div style={{ ...cardStyle, marginBottom: '12px' }}>
                <div style={labelStyle}>Weight</div>
                <input
                  style={{ ...inputStyle, maxWidth: '140px' }}
                  type="number"
                  step="0.1"
                  placeholder="No weight logged"
                  value={historyEditWeight}
                  onChange={e => setHistoryEditWeight(e.target.value)}
                />
              </div>

              <div style={{ ...cardStyle, marginBottom: '12px' }}>
                <div style={labelStyle}>Workouts</div>
                {historyEditWorkouts.length === 0 && (
                  <div style={{ fontSize: '14px', color: COLORS.inkSoft }}>No workout logged for this day.</div>
                )}
                {historyEditWorkouts.map((w, wi) => (
                  <div key={w.id} style={{ borderBottom: wi < historyEditWorkouts.length - 1 ? `1px solid ${COLORS.hairline}` : 'none', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div className="ht-row" style={{ marginBottom: '6px' }}>
                      <div>
                        <select style={inputStyle} value={w.type} onChange={e => updateHistoryWorkoutField(wi, 'type', e.target.value)}>
                          <option value="push">Push</option>
                          <option value="pull">Pull</option>
                          <option value="legs">Legs</option>
                          <option value="cardio">Cardio only</option>
                        </select>
                      </div>
                      <div>
                        <input style={inputStyle} type="number" placeholder="Cardio mins" value={w.cardioMins || ''} onChange={e => updateHistoryWorkoutField(wi, 'cardioMins', e.target.value)} />
                      </div>
                      <button onClick={() => removeHistoryWorkout(wi)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove session</button>
                    </div>
                    {w.exercises.map((ex, ei) => (
                      <div key={ei} className="ht-row" style={{ marginBottom: '6px' }}>
                        <div style={{ flex: 2, minWidth: '120px' }}>
                          <input style={inputStyle} value={ex.name} onChange={e => updateHistoryExercise(wi, ei, 'name', e.target.value)} />
                        </div>
                        <div><input style={inputStyle} type="number" value={ex.weight} onChange={e => updateHistoryExercise(wi, ei, 'weight', e.target.value)} /></div>
                        <div><input style={inputStyle} type="number" value={ex.reps} onChange={e => updateHistoryExercise(wi, ei, 'reps', e.target.value)} /></div>
                        <button onClick={() => removeHistoryExercise(wi, ei)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ ...cardStyle, marginBottom: '12px' }}>
                <div style={labelStyle}>Meals</div>
                {historyEditFood.length === 0 && (
                  <div style={{ fontSize: '14px', color: COLORS.inkSoft }}>No meals logged for this day.</div>
                )}
                {historyEditFood.map((m, mi) => (
                  <div key={m.id} style={{ borderBottom: mi < historyEditFood.length - 1 ? `1px solid ${COLORS.hairline}` : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div className="ht-row" style={{ marginBottom: '4px' }}>
                      <div style={{ flex: 3, minWidth: '140px' }}>
                        <input style={inputStyle} value={m.name} onChange={e => updateHistoryMeal(mi, 'name', e.target.value)} />
                      </div>
                      <button onClick={() => removeHistoryMeal(mi)} style={{ background: 'none', border: 'none', color: COLORS.brick, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', textTransform: 'uppercase' }}>remove</button>
                    </div>
                    <div className="ht-row">
                      <div><input style={inputStyle} type="number" value={m.protein} onChange={e => updateHistoryMeal(mi, 'protein', e.target.value)} placeholder="Protein g" /></div>
                      <div><input style={inputStyle} type="number" value={m.calories} onChange={e => updateHistoryMeal(mi, 'calories', e.target.value)} placeholder="Cals" /></div>
                      <div><input style={inputStyle} type="number" value={m.carbs} onChange={e => updateHistoryMeal(mi, 'carbs', e.target.value)} placeholder="Carbs g" /></div>
                      <div><input style={inputStyle} type="number" value={m.fat} onChange={e => updateHistoryMeal(mi, 'fat', e.target.value)} placeholder="Fat g" /></div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ht-btn" style={btnStyle(true)} onClick={saveHistoryEdit}>Save changes</button>
                <button className="ht-btn" style={btnStyle(false)} onClick={cancelHistoryEdit}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}