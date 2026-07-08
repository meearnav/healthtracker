export const FOOD_DB = [
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

export function estimateMacros(text) {
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
      matched.push(`${qty} x ${food.keys[0]}`);
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
