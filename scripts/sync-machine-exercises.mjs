import fs from 'node:fs';

const API = 'https://oss.exercisedb.dev/api/v1/exercises';
const OUTPUT = 'app/machine-exercises.generated.ts';
const CACHE = 'scripts/machine-translations.json';
const equipmentTypes = ['leverage machine', 'smith machine', 'sled machine', 'cable', 'assisted'];
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function fetchJson(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get('retry-after'));
        if (response.status === 429 && attempt < attempts) await sleep((retryAfter || attempt * 2) * 1000);
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      await sleep(attempt * 1600);
    }
  }
  throw lastError;
}

async function mediaAvailable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    return response.ok && response.headers.get('content-type')?.includes('image/gif');
  } catch {
    return false;
  }
}

async function fetchEquipment(equipment) {
  const items = [];
  let after = '';
  do {
    const url = new URL(API);
    url.searchParams.set('limit', '25');
    url.searchParams.set('equipments', equipment);
    if (after) url.searchParams.set('after', after);
    const response = await fetchJson(url);
    items.push(...response.data);
    after = response.meta.hasNextPage ? response.meta.nextCursor : '';
    if (after) await sleep(700);
  } while (after);
  return items;
}

const muscleFor = (bodyParts) => {
  const part = bodyParts[0];
  if (part === 'chest') return 'Peito';
  if (part === 'back') return 'Costas';
  if (part === 'upper legs' || part === 'lower legs') return 'Pernas';
  if (part === 'shoulders') return 'Ombros';
  if (part === 'upper arms' || part === 'lower arms') return 'Braços';
  if (part === 'waist') return 'Abdômen';
  return null;
};

const equipmentLabel = (equipment) => ({
  'leverage machine': 'Máquina articulada',
  'smith machine': 'Máquina Smith',
  'sled machine': 'Máquina sled',
  cable: 'Estação de cabos',
  assisted: 'Máquina assistida'
})[equipment];

const movementNames = [
  ['twin handle parallel grip lat pulldown', 'puxada alta com pegada neutra e duas alças'],
  ['cable standing crossover high reverse fly', 'crucifixo inverso alto em pé no crossover'],
  ['standing crossover high reverse fly', 'crucifixo inverso alto em pé no crossover'],
  ['reverse grip straight back seated high row', 'remada alta sentada com coluna reta e pegada invertida'],
  ['straight back seated high row', 'remada alta sentada com coluna reta'],
  ['alternate lateral pulldown', 'puxada lateral alternada'],
  ['lateral pulldown with v bar', 'puxada lateral com barra V'],
  ['lateral pulldown', 'puxada lateral'],
  ['rear pulldown behind neck', 'puxada posterior por trás da cabeça'],
  ['rear pulldown', 'puxada posterior'],
  ['reverse grip pushdown', 'extensão de tríceps com pegada invertida'],
  ['tuck reverse crunch', 'abdominal reverso grupado'],
  ['inverse leg curl', 'flexão de pernas invertida'],
  ['single arm fly on exercise ball', 'crucifixo unilateral na bola suíça'],
  ['single arm press on exercise ball', 'supino unilateral na bola suíça'],
  ['single arm press', 'supino unilateral'],
  ['incline press', 'supino inclinado'],
  ['decline press', 'supino declinado'],
  ['middle fly', 'crucifixo central'],
  ['upper chest crossovers', 'crossover para peitoral superior'],
  ['single arm cable rope preacher curl', 'rosca Scott unilateral com corda'],
  ['single arm preacher curl', 'rosca Scott unilateral'],
  ['standing single leg calf raise', 'elevação de panturrilha unilateral em pé'],
  ['external rotation', 'rotação externa do ombro'],
  ['internal rotation', 'rotação interna do ombro'],
  ['straight arm pulldown', 'puxada com braços estendidos'],
  ['overhead triceps extension', 'extensão de tríceps acima da cabeça'],
  ['triceps pushdown', 'extensão de tríceps na polia'],
  ['pushdown', 'extensão de tríceps na polia'],
  ['reverse preacher curl', 'rosca Scott invertida'],
  ['concentration curl', 'rosca concentrada'],
  ['hammer curl', 'rosca martelo'],
  ['reverse curl', 'rosca invertida'],
  ['front shoulder raise', 'elevação frontal de ombros'],
  ['front raise', 'elevação frontal'],
  ['rear lateral raise', 'elevação lateral posterior'],
  ['lateral raise', 'elevação lateral'],
  ['shoulder external rotation', 'rotação externa de ombros'],
  ['standing single arm triceps extension', 'extensão unilateral de tríceps em pé'],
  ['standing single arm curl', 'rosca unilateral em pé'],
  ['single arm curl', 'rosca unilateral'],
  ['seated single arm alternate row', 'remada unilateral alternada sentada'],
  ['straight back seated row', 'remada sentada com coluna reta'],
  ['seated row', 'remada sentada'],
  ['standing row', 'remada em pé'],
  ['reverse fly', 'crucifixo inverso'],
  ['crossover reverse fly', 'crucifixo inverso no crossover'],
  ['crossover', 'crucifixo no crossover'],
  ['decline fly', 'crucifixo declinado'],
  ['incline fly', 'crucifixo inclinado'],
  ['low fly', 'crucifixo baixo'],
  ['lying fly', 'crucifixo deitado'],
  ['standing fly', 'crucifixo em pé'],
  ['single arm fly', 'crucifixo unilateral'],
  ['fly', 'crucifixo'],
  ['side crunch', 'abdominal lateral'],
  ['reverse crunch', 'abdominal reverso'],
  ['standing crunch', 'abdominal em pé'],
  ['seated crunch', 'abdominal sentado'],
  ['side bend', 'flexão lateral de tronco'],
  ['russian twist', 'rotação russa'],
  ['standing twist', 'rotação de tronco em pé'],
  ['twist', 'rotação de tronco'],
  ['standing hip extension', 'extensão de quadril em pé'],
  ['hip adduction', 'adução de quadril'],
  ['kickback', 'coice'],
  ['seated squat calf raise on leg press', 'panturrilha sentada no leg press'],
  ['decline reverse grip press', 'supino declinado com pegada invertida'],
  ['incline reverse grip press', 'supino inclinado com pegada invertida'],
  ['reverse grip press', 'supino com pegada invertida'],
  ['single leg seated calf raise', 'elevação de panturrilha unilateral sentada'],
  ['single leg floor calf raise', 'elevação de panturrilha unilateral no chão'],
  ['hack single leg calf raise', 'elevação de panturrilha unilateral no hack'],
  ['forward angled calf raise', 'elevação de panturrilha inclinada à frente'],
  ['standing leg calf raise', 'elevação de panturrilha em pé'],
  ['bent knee good morning', 'good morning com joelhos flexionados'],
  ['standing back wrist curl', 'flexão de punhos posterior em pé'],
  ['single leg split squat', 'agachamento unilateral'],
  ['45 degrees single leg press', 'leg press 45° unilateral'],
  ['45 leg press back pov', 'leg press 45° com vista posterior'],
  ['45 leg wide press', 'leg press 45° com pés afastados'],
  ['45 calf press', 'panturrilha no leg press 45°'],
  ['45 leg press', 'leg press 45°'],
  ['calf press on leg press', 'panturrilha no leg press'],
  ['lying calf press', 'panturrilha deitada no leg press'],
  ['closer hack squat', 'agachamento hack fechado'],
  ['sprint lunge', 'avanço explosivo'],
  ['seated leg raise crunch', 'abdominal com elevação de pernas'],
  ['lying two single leg curl', 'flexão de pernas alternada'],
  ['reverse grip preacher curl', 'rosca Scott com pegada invertida'],
  ['hammer grip preacher curl', 'rosca Scott martelo'],
  ['single arm lateral wide pulldown', 'puxada lateral aberta unilateral'],
  ['single arm lateral high row', 'remada alta lateral unilateral'],
  ['horizontal single leg press', 'leg press horizontal unilateral'],
  ['seated squat calf raise on leg press machine', 'panturrilha sentada no leg press'],
  ['single leg calf press on leg press', 'panturrilha unilateral no leg press'],
  ['incline triceps extension', 'extensão de tríceps inclinada'],
  ['standing behind head military press', 'desenvolvimento militar por trás da cabeça'],
  ['reverse decline close grip bench press', 'supino declinado fechado com pegada invertida'],
  ['reverse grip lateral pulldown', 'puxada lateral com pegada invertida'],
  ['reverse grip vertical row', 'remada vertical com pegada invertida'],
  ['alternating narrow grip seated row', 'remada sentada alternada com pegada fechada'],
  ['narrow grip seated row', 'remada sentada com pegada fechada'],
  ['seated reverse fly parallel grip', 'crucifixo inverso sentado com pegada neutra'],
  ['seated reverse fly', 'crucifixo inverso sentado'],
  ['seated calf press', 'panturrilha sentada'],
  ['seated calf raise', 'elevação de panturrilha sentada'],
  ['donkey calf raise', 'panturrilha donkey'],
  ['standing calf raise', 'elevação de panturrilha em pé'],
  ['single leg calf raise', 'elevação de panturrilha unilateral'],
  ['rotary calf', 'panturrilha rotatória'],
  ['calf press', 'panturrilha no leg press'],
  ['calf raise', 'elevação de panturrilha'],
  ['reverse calf raise', 'elevação tibial'],
  ['toe raise', 'elevação tibial'],
  ['lying leg curl', 'mesa flexora'],
  ['seated leg curl', 'cadeira flexora'],
  ['kneeling leg curl', 'flexão de perna ajoelhado'],
  ['leg extension', 'cadeira extensora'],
  ['alternate leg press', 'leg press alternado'],
  ['single leg press', 'leg press unilateral'],
  ['leg wide press', 'leg press com pés afastados'],
  ['leg press', 'leg press'],
  ['hack squat', 'agachamento hack'],
  ['lying squat', 'agachamento deitado'],
  ['full squat', 'agachamento completo'],
  ['chair squat', 'agachamento no banco'],
  ['front squat', 'agachamento frontal'],
  ['sumo squat', 'agachamento sumô'],
  ['split squat', 'agachamento unilateral'],
  ['squat', 'agachamento'],
  ['single leg deadlift', 'levantamento terra unilateral'],
  ['deadlift', 'levantamento terra'],
  ['seated good morning', 'good morning sentado'],
  ['good morning', 'good morning'],
  ['hip abduction', 'abdução de quadril'],
  ['hip adduction', 'adução de quadril'],
  ['hip extension', 'extensão de quadril'],
  ['hip raise', 'elevação de quadril'],
  ['incline chest press', 'supino inclinado'],
  ['decline chest press', 'supino declinado'],
  ['inner chest press', 'supino fechado'],
  ['standing chest press', 'supino em pé'],
  ['chest press', 'supino'],
  ['incline bench press', 'supino inclinado'],
  ['decline bench press', 'supino declinado'],
  ['wide grip bench press', 'supino com pegada aberta'],
  ['close grip bench press', 'supino fechado'],
  ['bench press', 'supino reto'],
  ['seated fly', 'crucifixo sentado'],
  ['chest dip', 'mergulho para peito'],
  ['seated dip', 'mergulho sentado'],
  ['triceps dip', 'mergulho de tríceps'],
  ['triceps extension', 'extensão de tríceps'],
  ['preacher curl', 'rosca Scott'],
  ['biceps curl', 'rosca bíceps'],
  ['wrist curl', 'flexão de punhos'],
  ['gripper hands', 'fortalecimento de pegada'],
  ['single arm shoulder press', 'desenvolvimento de ombros unilateral'],
  ['seated shoulder press', 'desenvolvimento de ombros sentado'],
  ['shoulder press', 'desenvolvimento de ombros'],
  ['military press', 'desenvolvimento militar'],
  ['behind neck press', 'desenvolvimento por trás da cabeça'],
  ['lateral raise', 'elevação lateral'],
  ['incline shoulder raise', 'elevação de ombros inclinada'],
  ['rear delt row', 'remada para deltoide posterior'],
  ['upright row', 'remada alta'],
  ['high row', 'remada alta'],
  ['t bar reverse grip row', 'remada T com pegada invertida'],
  ['t bar row', 'remada T'],
  ['reverse t bar row', 'remada T reversa'],
  ['bent over row with v bar', 'remada curvada com barra V'],
  ['bent over row', 'remada curvada'],
  ['single arm row', 'remada unilateral'],
  ['unilateral row', 'remada unilateral'],
  ['narrow row', 'remada com pegada fechada'],
  ['row', 'remada'],
  ['front pulldown', 'puxada frontal'],
  ['lat pulldown', 'puxada alta'],
  ['pulldown', 'puxada'],
  ['assisted standing chin up', 'barra fixa supinada assistida em pé'],
  ['assisted standing pull up', 'barra fixa pronada assistida em pé'],
  ['assisted parallel close grip pull up', 'barra fixa neutra assistida'],
  ['assisted pull up', 'barra fixa assistida'],
  ['pull up', 'barra fixa pronada'],
  ['chin up', 'barra fixa supinada'],
  ['pullover', 'pullover'],
  ['gripless shrug', 'encolhimento sem pegada'],
  ['back shrug', 'encolhimento posterior'],
  ['shrug', 'encolhimento'],
  ['reverse hyperextension', 'hiperextensão reversa'],
  ['back extension', 'extensão lombar'],
  ['seated crunch chest pad', 'abdominal sentado com apoio peitoral'],
  ['seated crunch', 'abdominal sentado'],
  ['kneeling twist', 'rotação de tronco ajoelhada'],
  ['cycle cross trainer', 'elíptico'],
  ['stationary bike walk', 'bicicleta ergométrica'],
  ['walking on incline treadmill', 'caminhada inclinada na esteira']
];

async function translateName(name, equipment, muscle) {
  let value = normalize(name)
    .replace(/\b(machine|smith machine|smith|sled machine|sled|cable)\b/g, ' ')
    .replace(/\braises\b/g, 'raise')
    .replace(/\brows\b/g, 'row')
    .replace(/\bpresses\b/g, 'press')
    .replace(/\s+/g, ' ')
    .trim();
  let translated = '';
  for (const [english, portuguese] of [...movementNames].sort((a, b) => b[0].length - a[0].length)) {
    if (value.includes(english)) {
      translated = portuguese;
      value = value.replace(english, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }
  const qualifiers = [
    ['incline', 'inclinado'], ['decline', 'declinado'], ['seated', 'sentado'], ['standing', 'em pé'],
    ['lying', 'deitado'], ['kneeling', 'ajoelhado'], ['single arm', 'unilateral'], ['single leg', 'unilateral'],
    ['reverse grip', 'com pegada invertida'], ['overhand', 'com pegada pronada'],
    ['narrow grip', 'com pegada fechada'], ['wide grip', 'com pegada aberta'],
    ['parallel grip', 'com pegada neutra'], ['alternate', 'alternado'], ['alternating', 'alternado'],
    ['forward angled', 'inclinado à frente'], ['back pov', 'com vista posterior'],
    ['low bar', 'com barra baixa'], ['clean grip', 'com pegada clean'], ['assisted', 'assistido'],
    ['straight arm', 'com braços estendidos'], ['with rope attachment', 'com corda'], ['with rope', 'com corda'],
    ['with v bar', 'com barra V'], ['v bar', 'com barra V'], ['on exercise ball', 'na bola suíça'],
    ['on stability ball', 'na bola suíça'], ['with arm blaster', 'com apoio de braço'],
    ['full range of motion', 'com amplitude completa'], ['pro lat bar', 'com barra longa'], ['back pov', 'com vista posterior'],
    ['reverse', 'reverso'], ['closer', 'fechado'], ['floor', 'no chão'], ['back', 'posterior'],
    ['low', 'baixo'], ['high', 'alto'], ['up down', 'de cima para baixo']
  ];
  const suffixes = [];
  for (const [english, portuguese] of qualifiers) {
    if (value.includes(english)) {
      suffixes.push(portuguese);
      value = value.replace(english, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  const needsTranslation = !translated || Boolean(value);
  if (needsTranslation) {
    const key = `name-${normalize(name)}`;
    if (!cache[key]) {
      try {
        const url = new URL('https://translate.googleapis.com/translate_a/single');
        url.searchParams.set('client', 'gtx');
        url.searchParams.set('sl', 'en');
        url.searchParams.set('tl', 'pt-BR');
        url.searchParams.set('dt', 't');
        url.searchParams.set('q', name);
        const response = await fetchJson(url);
        cache[key] = response[0].map((part) => part[0]).join('').trim();
        fs.writeFileSync(CACHE, `${JSON.stringify(cache, null, 2)}\n`);
      } catch {
        cache[key] = '';
      }
      await sleep(150);
    }
    if (cache[key]) translated = cache[key];
  }
  if (!translated) {
    if (value === 'press') translated = muscle === 'Peito' ? 'supino' : 'desenvolvimento';
    else if (value === 'lunge') translated = 'avanço';
    else if (value === 'raise') translated = 'elevação';
    else translated = `exercício de ${muscle.toLowerCase()}`;
  }
  const where = equipment === 'smith machine' ? 'no Smith' : equipment === 'sled machine' ? 'no trenó' : equipment === 'cable' ? 'no cabo' : equipment === 'assisted' ? 'na máquina assistida' : 'na máquina';
  const translatedName = needsTranslation && cache[`name-${normalize(name)}`] ? translated : `${translated}${suffixes.length ? ` ${suffixes.join(' ')}` : ''}`;
  const placement = equipment === 'cable' && /cabo|crossover/i.test(translatedName) ? '' : equipment === 'assisted' && /assistid/i.test(translatedName) ? '' : ` ${where}`;
  return `${translatedName}${placement}`.replace(/\s+/g, ' ').trim().replace(/^./, (letter) => letter.toUpperCase());
}

async function translateInstructions(item) {
  const key = item.exerciseId;
  const cleanTranslation = (line) => line
    .replace(/máquina de ferreiro/gi, 'máquina Smith')
    .replace(/smith machine/gi, 'máquina Smith')
    .replace(/barra da ferreiro/gi, 'barra do Smith')
    .replace(/da ferreiro/gi, 'do Smith')
    .replace(/máquina do ferreiro/gi, 'máquina Smith')
    .replace(/\ba ferreiro\b/gi, 'a máquina Smith')
    .replace(/\bdo ferreiro\b/gi, 'do Smith')
    .replace(/máquina de alavancagem/gi, 'máquina articulada')
    .replace(/máquina de alavanca/gi, 'máquina articulada');
  if (cache[key]) return cache[key].map(cleanTranslation);
  const original = item.instructions.map((instruction) => instruction.replace(/^Step:\d+\s*/, '').trim());
  const query = original.join('\n');
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'en');
    url.searchParams.set('tl', 'pt-BR');
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', query);
    const response = await fetchJson(url);
    const translated = response[0].map((part) => part[0]).join('').split('\n').map((line) => line.trim()).filter(Boolean);
    cache[key] = translated.map(cleanTranslation);
  } catch {
    cache[key] = [
      'Ajuste a máquina ao seu corpo e escolha uma carga confortável.',
      'Mantenha o tronco estabilizado durante todo o movimento.',
      'Execute a repetição de forma controlada e retorne devagar à posição inicial.'
    ];
  }
  fs.writeFileSync(CACHE, `${JSON.stringify(cache, null, 2)}\n`);
  await sleep(220);
  return cache[key];
}

const fetched = [];
for (const equipment of equipmentTypes) {
  fetched.push(...await fetchEquipment(equipment));
  await sleep(1000);
}
const unique = new Map();
for (const item of fetched) {
  const muscle = muscleFor(item.bodyParts);
  const equipment = item.equipments.find((value) => equipmentTypes.includes(value));
  const allowedAssisted = equipment !== 'assisted' || /assisted.*(pull.up|chin.up|dip|hanging knee raise|sit.up)/i.test(item.name);
  if (!muscle || !equipment || !allowedAssisted || !item.gifUrl) continue;
  const key = `${normalize(item.name)}|${equipment}`;
  if (!unique.has(key)) unique.set(key, { ...item, muscle, equipment });
}

const entries = [];
const candidates = [...unique.values()];
const checked = [];
for (let start = 0; start < candidates.length; start += 10) {
  const batch = candidates.slice(start, start + 10);
  const availability = await Promise.all(batch.map((item) => mediaAvailable(item.gifUrl)));
  batch.forEach((item, index) => { if (availability[index]) checked.push(item); });
}
console.log(`Mídias válidas: ${checked.length}/${candidates.length}`);
let index = 0;
for (const item of checked) {
  entries.push({
    id: `exdb-${item.exerciseId}`,
    name: await translateName(item.name, item.equipment, item.muscle),
    en: item.name,
    muscle: item.muscle,
    sets: 3,
    reps: item.targetMuscles.includes('calves') || item.targetMuscles.includes('abdominals') ? '12–15' : '10–12',
    last: '—',
    tag: 'Máquina',
    image: item.gifUrl,
    equipment: equipmentLabel(item.equipment),
    media: item.gifUrl,
    mediaType: 'gif',
    source: 'ExerciseDB',
    instructions: await translateInstructions(item)
  });
  index++;
  if (index % 20 === 0) console.log(`Traduzidos ${index}/${checked.length}`);
}

const deduplicated = [...new Map(entries.map((item) => [`${normalize(item.name)}|${item.equipment}`, item])).values()];
const muscleOrder = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen'];
deduplicated.sort((a, b) => muscleOrder.indexOf(a.muscle) - muscleOrder.indexOf(b.muscle) || a.name.localeCompare(b.name, 'pt-BR'));

const lines = deduplicated.map((item) => `  ${JSON.stringify(item)},`);
const output = `import type { Exercise } from './exercises';\n\n// Gerado por scripts/sync-machine-exercises.mjs a partir da ExerciseDB.\nexport const machineExercises: Exercise[] = [\n${lines.join('\n')}\n];\n`;
fs.writeFileSync(OUTPUT, output);
console.log(`Gerados ${deduplicated.length} exercícios de máquina em ${OUTPUT}.`);
