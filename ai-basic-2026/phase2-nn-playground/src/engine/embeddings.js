/**
 * embeddings.js
 *
 * Pre-built curated embedding vectors for English and Korean words.
 * 50-dimensional synthetic embeddings designed so that:
 *   - Words in the same category cluster together
 *   - Classic analogies work: king - man + woman ≈ queen, paris - france + korea ≈ seoul
 *
 * Structured generation approach:
 *   dim 0:    gender axis (male +0.5, female -0.5)
 *   dim 1:    royalty marker
 *   dim 2:    animacy / living-thing
 *   dim 3:    size / age
 *   dim 4:    abstractness
 *   dims 5-7: geography continent encoding
 *   dim 8:    capital-city vs country
 *   dim 9:    human-relation
 *   dims 10-14: semantic sub-axes (valence, intensity, food/nature, action, color)
 *   dims 15-19: category centroid
 *   dims 20-49: per-word noise
 */

// ============================================================
// Seeded pseudo-random number generator (mulberry32)
// ============================================================
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIM = 50;

function zeros(n) {
  return new Array(n).fill(0);
}

// ============================================================
// Vector math utilities
// ============================================================
export function vectorAdd(a, b) {
  return a.map((v, i) => v + (b[i] || 0));
}

export function vectorSub(a, b) {
  return a.map((v, i) => v - (b[i] || 0));
}

export function vectorScale(a, s) {
  return a.map((v) => v * s);
}

function vectorNorm(a) {
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0));
}

function vectorNormalize(a) {
  const n = vectorNorm(a);
  return n === 0 ? a.slice() : a.map((v) => v / n);
}

export function cosineSimilarity(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ============================================================
// Structured embedding generation
// ============================================================

const CATEGORY_AXES = {
  royalty: { 1: 0.6, 2: 0.4, 9: 0.3 },
  gender: { 2: 0.4, 9: 0.15 },
  countries: { 2: -0.3, 4: -0.3 },
  cities: { 2: -0.3, 4: -0.3, 8: 0.6 },
  animals: { 2: 0.7, 4: -0.4 },
  food: { 2: -0.15, 4: -0.4, 10: 0.5 },
  emotions: { 2: 0.15, 4: 0.7, 13: -0.15 },
  colors: { 4: -0.15, 14: 0.7 },
  professions: { 2: 0.4, 9: 0.4, 4: 0.15 },
  family: { 2: 0.4, 9: 0.7 },
  sports: { 2: 0.15, 4: -0.3, 13: 0.5 },
  nature: { 2: 0.3, 4: -0.15, 11: 0.5 },
  technology: { 2: -0.4, 4: 0.3, 12: 0.5 },
  music: { 2: 0.15, 4: 0.15, 12: 0.3, 10: 0.3 },
  body: { 2: 0.5, 4: -0.3, 9: 0.15 },
  verbs: { 4: 0.15, 13: 0.7 },
  adjectives: { 4: 0.3, 14: 0.15 },
};

// Geography encoding (dims 5-7) for countries/cities
const GEO_VECS = {
  france: [0.5, 0.4, -0.15],
  germany: [0.4, 0.5, -0.15],
  japan: [-0.4, -0.25, 0.5],
  korea: [-0.4, -0.15, 0.4],
  china: [-0.25, -0.4, 0.4],
  usa: [0.15, -0.5, -0.4],
  england: [0.5, 0.3, -0.25],
  italy: [0.4, 0.25, 0.15],
  spain: [0.4, 0.15, 0.15],
  paris: [0.5, 0.4, -0.15],
  berlin: [0.4, 0.5, -0.15],
  tokyo: [-0.4, -0.25, 0.5],
  seoul: [-0.4, -0.15, 0.4],
  beijing: [-0.25, -0.4, 0.4],
  washington: [0.15, -0.5, -0.4],
  london: [0.5, 0.3, -0.25],
  rome: [0.4, 0.25, 0.15],
  madrid: [0.4, 0.15, 0.15],
};

function wordSeed(word) {
  let h = 0;
  for (let i = 0; i < word.length; i++) {
    h = ((h << 5) - h + word.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function makeEmbedding(word, category, properties = {}) {
  const r = mulberry32(wordSeed(word) + 7919);
  const vec = zeros(DIM);

  // 1) Category axes
  const axes = CATEGORY_AXES[category] || {};
  for (const [dim, val] of Object.entries(axes)) {
    vec[parseInt(dim)] += val;
  }

  // 2) Gender axis (dims 0, 20, 21 — spread across multiple dims for robustness)
  if (properties.gender === 'male') {
    vec[0] += 0.7; vec[20] += 0.4; vec[21] += 0.3;
  } else if (properties.gender === 'female') {
    vec[0] -= 0.7; vec[20] -= 0.4; vec[21] -= 0.3;
  }

  // 3) Geography (dims 5-7, 22-24 — double encoding for strong geo signal)
  const geoKey = properties.geoKey || word.toLowerCase();
  if (GEO_VECS[geoKey]) {
    vec[5] += GEO_VECS[geoKey][0] * 1.5;
    vec[6] += GEO_VECS[geoKey][1] * 1.5;
    vec[7] += GEO_VECS[geoKey][2] * 1.5;
    vec[22] += GEO_VECS[geoKey][0] * 0.8;
    vec[23] += GEO_VECS[geoKey][1] * 0.8;
    vec[24] += GEO_VECS[geoKey][2] * 0.8;
  }

  // 4) Age axis (dims 3, 25)
  if (properties.age === 'young') { vec[3] -= 0.4; vec[25] -= 0.3; }
  else if (properties.age === 'old') { vec[3] += 0.3; vec[25] += 0.2; }

  // 5) Category-specific centroid (dims 15-19)
  const catRng = mulberry32(wordSeed(category) + 1337);
  for (let d = 15; d < 20; d++) {
    vec[d] += (catRng() - 0.5) * 0.8;
  }

  // 6) Semantic property offsets
  if (properties.valence === 'positive') vec[10] += 0.4;
  if (properties.valence === 'negative') vec[10] -= 0.4;
  if (properties.intensity === 'high') vec[11] += 0.3;
  if (properties.intensity === 'low') vec[11] -= 0.3;
  if (properties.size === 'big') vec[3] += 0.35;
  if (properties.size === 'small') vec[3] -= 0.35;
  if (properties.speed === 'fast') vec[12] += 0.35;
  if (properties.speed === 'slow') vec[12] -= 0.35;
  if (properties.temp === 'hot') vec[13] += 0.35;
  if (properties.temp === 'cold') vec[13] -= 0.35;

  // 7) Per-word noise (very small on structured dims, moderate on noise dims)
  for (let d = 0; d < DIM; d++) {
    const noiseScale = d < 26 ? 0.02 : 0.08;
    vec[d] += (r() - 0.5) * 2 * noiseScale;
  }

  return vectorNormalize(vec);
}

// ============================================================
// English word definitions
// ============================================================
const EN_WORDS = [
  // Royalty
  { word: 'king', category: 'royalty', props: { gender: 'male' } },
  { word: 'queen', category: 'royalty', props: { gender: 'female' } },
  { word: 'prince', category: 'royalty', props: { gender: 'male', age: 'young' } },
  { word: 'princess', category: 'royalty', props: { gender: 'female', age: 'young' } },
  { word: 'crown', category: 'royalty', props: {} },
  { word: 'throne', category: 'royalty', props: {} },
  { word: 'palace', category: 'royalty', props: {} },
  { word: 'kingdom', category: 'royalty', props: {} },
  { word: 'royal', category: 'royalty', props: {} },
  { word: 'emperor', category: 'royalty', props: { gender: 'male' } },
  { word: 'empress', category: 'royalty', props: { gender: 'female' } },

  // Gender / People
  { word: 'man', category: 'gender', props: { gender: 'male' } },
  { word: 'woman', category: 'gender', props: { gender: 'female' } },
  { word: 'boy', category: 'gender', props: { gender: 'male', age: 'young' } },
  { word: 'girl', category: 'gender', props: { gender: 'female', age: 'young' } },
  { word: 'male', category: 'gender', props: { gender: 'male' } },
  { word: 'female', category: 'gender', props: { gender: 'female' } },
  { word: 'person', category: 'gender', props: {} },
  { word: 'child', category: 'gender', props: { age: 'young' } },
  { word: 'adult', category: 'gender', props: { age: 'old' } },
  { word: 'baby', category: 'gender', props: { age: 'young' } },
  { word: 'gentleman', category: 'gender', props: { gender: 'male' } },
  { word: 'lady', category: 'gender', props: { gender: 'female' } },

  // Countries
  { word: 'france', category: 'countries', props: { geoKey: 'france' } },
  { word: 'germany', category: 'countries', props: { geoKey: 'germany' } },
  { word: 'japan', category: 'countries', props: { geoKey: 'japan' } },
  { word: 'korea', category: 'countries', props: { geoKey: 'korea' } },
  { word: 'china', category: 'countries', props: { geoKey: 'china' } },
  { word: 'usa', category: 'countries', props: { geoKey: 'usa' } },
  { word: 'england', category: 'countries', props: { geoKey: 'england' } },
  { word: 'italy', category: 'countries', props: { geoKey: 'italy' } },
  { word: 'spain', category: 'countries', props: { geoKey: 'spain' } },
  { word: 'russia', category: 'countries', props: { geoKey: 'germany' } },
  { word: 'india', category: 'countries', props: { geoKey: 'china' } },
  { word: 'brazil', category: 'countries', props: { geoKey: 'usa' } },
  { word: 'canada', category: 'countries', props: { geoKey: 'usa' } },
  { word: 'australia', category: 'countries', props: { geoKey: 'japan' } },
  { word: 'mexico', category: 'countries', props: { geoKey: 'spain' } },

  // Cities
  { word: 'paris', category: 'cities', props: { geoKey: 'paris' } },
  { word: 'berlin', category: 'cities', props: { geoKey: 'berlin' } },
  { word: 'tokyo', category: 'cities', props: { geoKey: 'tokyo' } },
  { word: 'seoul', category: 'cities', props: { geoKey: 'seoul' } },
  { word: 'beijing', category: 'cities', props: { geoKey: 'beijing' } },
  { word: 'washington', category: 'cities', props: { geoKey: 'washington' } },
  { word: 'london', category: 'cities', props: { geoKey: 'london' } },
  { word: 'rome', category: 'cities', props: { geoKey: 'rome' } },
  { word: 'madrid', category: 'cities', props: { geoKey: 'madrid' } },
  { word: 'moscow', category: 'cities', props: { geoKey: 'berlin' } },
  { word: 'delhi', category: 'cities', props: { geoKey: 'beijing' } },
  { word: 'sydney', category: 'cities', props: { geoKey: 'tokyo' } },
  { word: 'toronto', category: 'cities', props: { geoKey: 'washington' } },
  { word: 'osaka', category: 'cities', props: { geoKey: 'tokyo' } },
  { word: 'busan', category: 'cities', props: { geoKey: 'seoul' } },

  // Animals
  { word: 'dog', category: 'animals', props: { size: 'small' } },
  { word: 'cat', category: 'animals', props: { size: 'small' } },
  { word: 'bird', category: 'animals', props: { size: 'small' } },
  { word: 'fish', category: 'animals', props: { size: 'small' } },
  { word: 'horse', category: 'animals', props: { size: 'big' } },
  { word: 'lion', category: 'animals', props: { size: 'big' } },
  { word: 'tiger', category: 'animals', props: { size: 'big' } },
  { word: 'elephant', category: 'animals', props: { size: 'big' } },
  { word: 'bear', category: 'animals', props: { size: 'big' } },
  { word: 'wolf', category: 'animals', props: { size: 'big' } },
  { word: 'rabbit', category: 'animals', props: { size: 'small' } },
  { word: 'snake', category: 'animals', props: { size: 'small' } },
  { word: 'eagle', category: 'animals', props: { size: 'big' } },
  { word: 'dolphin', category: 'animals', props: { size: 'big' } },
  { word: 'whale', category: 'animals', props: { size: 'big' } },
  { word: 'monkey', category: 'animals', props: { size: 'small' } },
  { word: 'deer', category: 'animals', props: { size: 'big' } },
  { word: 'penguin', category: 'animals', props: { size: 'small' } },
  { word: 'ant', category: 'animals', props: { size: 'small' } },
  { word: 'bee', category: 'animals', props: { size: 'small' } },

  // Food
  { word: 'apple', category: 'food', props: {} },
  { word: 'banana', category: 'food', props: {} },
  { word: 'rice', category: 'food', props: { geoKey: 'japan' } },
  { word: 'bread', category: 'food', props: { geoKey: 'france' } },
  { word: 'pizza', category: 'food', props: { geoKey: 'italy' } },
  { word: 'sushi', category: 'food', props: { geoKey: 'japan' } },
  { word: 'kimchi', category: 'food', props: { geoKey: 'korea' } },
  { word: 'pasta', category: 'food', props: { geoKey: 'italy' } },
  { word: 'coffee', category: 'food', props: {} },
  { word: 'tea', category: 'food', props: { geoKey: 'china' } },
  { word: 'chocolate', category: 'food', props: {} },
  { word: 'cheese', category: 'food', props: { geoKey: 'france' } },
  { word: 'cake', category: 'food', props: {} },
  { word: 'soup', category: 'food', props: {} },
  { word: 'salad', category: 'food', props: {} },
  { word: 'steak', category: 'food', props: { geoKey: 'usa' } },
  { word: 'noodle', category: 'food', props: { geoKey: 'china' } },
  { word: 'burger', category: 'food', props: { geoKey: 'usa' } },
  { word: 'taco', category: 'food', props: { geoKey: 'spain' } },
  { word: 'curry', category: 'food', props: { geoKey: 'china' } },

  // Emotions
  { word: 'happy', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: 'sad', category: 'emotions', props: { valence: 'negative', intensity: 'low' } },
  { word: 'angry', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: 'love', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: 'fear', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: 'joy', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: 'surprise', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: 'hope', category: 'emotions', props: { valence: 'positive', intensity: 'low' } },
  { word: 'peace', category: 'emotions', props: { valence: 'positive', intensity: 'low' } },
  { word: 'hate', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: 'trust', category: 'emotions', props: { valence: 'positive', intensity: 'low' } },
  { word: 'pride', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: 'shame', category: 'emotions', props: { valence: 'negative', intensity: 'low' } },
  { word: 'jealousy', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: 'excitement', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },

  // Colors
  { word: 'red', category: 'colors', props: { temp: 'hot' } },
  { word: 'blue', category: 'colors', props: { temp: 'cold' } },
  { word: 'green', category: 'colors', props: {} },
  { word: 'yellow', category: 'colors', props: { temp: 'hot' } },
  { word: 'black', category: 'colors', props: {} },
  { word: 'white', category: 'colors', props: {} },
  { word: 'orange', category: 'colors', props: { temp: 'hot' } },
  { word: 'purple', category: 'colors', props: {} },
  { word: 'pink', category: 'colors', props: {} },
  { word: 'brown', category: 'colors', props: {} },
  { word: 'gray', category: 'colors', props: {} },
  { word: 'gold', category: 'colors', props: { temp: 'hot' } },
  { word: 'silver', category: 'colors', props: { temp: 'cold' } },

  // Professions
  { word: 'teacher', category: 'professions', props: {} },
  { word: 'doctor', category: 'professions', props: {} },
  { word: 'engineer', category: 'professions', props: {} },
  { word: 'artist', category: 'professions', props: {} },
  { word: 'scientist', category: 'professions', props: {} },
  { word: 'lawyer', category: 'professions', props: {} },
  { word: 'nurse', category: 'professions', props: { gender: 'female' } },
  { word: 'pilot', category: 'professions', props: {} },
  { word: 'chef', category: 'professions', props: {} },
  { word: 'police', category: 'professions', props: {} },
  { word: 'soldier', category: 'professions', props: { gender: 'male' } },
  { word: 'farmer', category: 'professions', props: {} },
  { word: 'writer', category: 'professions', props: {} },
  { word: 'musician', category: 'professions', props: {} },
  { word: 'actor', category: 'professions', props: { gender: 'male' } },
  { word: 'actress', category: 'professions', props: { gender: 'female' } },
  { word: 'professor', category: 'professions', props: {} },
  { word: 'programmer', category: 'professions', props: {} },

  // Family
  { word: 'father', category: 'family', props: { gender: 'male', age: 'old' } },
  { word: 'mother', category: 'family', props: { gender: 'female', age: 'old' } },
  { word: 'son', category: 'family', props: { gender: 'male', age: 'young' } },
  { word: 'daughter', category: 'family', props: { gender: 'female', age: 'young' } },
  { word: 'brother', category: 'family', props: { gender: 'male' } },
  { word: 'sister', category: 'family', props: { gender: 'female' } },
  { word: 'husband', category: 'family', props: { gender: 'male' } },
  { word: 'wife', category: 'family', props: { gender: 'female' } },
  { word: 'uncle', category: 'family', props: { gender: 'male' } },
  { word: 'aunt', category: 'family', props: { gender: 'female' } },
  { word: 'grandfather', category: 'family', props: { gender: 'male', age: 'old' } },
  { word: 'grandmother', category: 'family', props: { gender: 'female', age: 'old' } },
  { word: 'nephew', category: 'family', props: { gender: 'male', age: 'young' } },
  { word: 'niece', category: 'family', props: { gender: 'female', age: 'young' } },

  // Sports
  { word: 'soccer', category: 'sports', props: {} },
  { word: 'baseball', category: 'sports', props: {} },
  { word: 'basketball', category: 'sports', props: {} },
  { word: 'tennis', category: 'sports', props: {} },
  { word: 'swimming', category: 'sports', props: {} },
  { word: 'running', category: 'sports', props: { speed: 'fast' } },
  { word: 'golf', category: 'sports', props: {} },
  { word: 'boxing', category: 'sports', props: {} },
  { word: 'skiing', category: 'sports', props: { temp: 'cold' } },
  { word: 'cycling', category: 'sports', props: { speed: 'fast' } },
  { word: 'volleyball', category: 'sports', props: {} },
  { word: 'hockey', category: 'sports', props: { temp: 'cold' } },
  { word: 'wrestling', category: 'sports', props: {} },
  { word: 'archery', category: 'sports', props: {} },

  // Nature
  { word: 'tree', category: 'nature', props: { size: 'big' } },
  { word: 'flower', category: 'nature', props: { size: 'small' } },
  { word: 'river', category: 'nature', props: { size: 'big' } },
  { word: 'mountain', category: 'nature', props: { size: 'big' } },
  { word: 'ocean', category: 'nature', props: { size: 'big' } },
  { word: 'sun', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: 'moon', category: 'nature', props: { temp: 'cold', size: 'big' } },
  { word: 'star', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: 'rain', category: 'nature', props: { temp: 'cold' } },
  { word: 'snow', category: 'nature', props: { temp: 'cold' } },
  { word: 'wind', category: 'nature', props: {} },
  { word: 'cloud_nature', category: 'nature', props: {} },
  { word: 'forest', category: 'nature', props: { size: 'big' } },
  { word: 'desert', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: 'island', category: 'nature', props: {} },
  { word: 'lake', category: 'nature', props: { size: 'big' } },
  { word: 'volcano', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: 'earthquake', category: 'nature', props: { intensity: 'high' } },
  { word: 'thunder', category: 'nature', props: { intensity: 'high' } },
  { word: 'rainbow', category: 'nature', props: {} },

  // Technology
  { word: 'computer', category: 'technology', props: {} },
  { word: 'phone', category: 'technology', props: { size: 'small' } },
  { word: 'internet', category: 'technology', props: {} },
  { word: 'robot', category: 'technology', props: {} },
  { word: 'software', category: 'technology', props: {} },
  { word: 'data', category: 'technology', props: {} },
  { word: 'algorithm', category: 'technology', props: {} },
  { word: 'network', category: 'technology', props: {} },
  { word: 'database', category: 'technology', props: {} },
  { word: 'server', category: 'technology', props: {} },
  { word: 'cloud_tech', category: 'technology', props: {} },
  { word: 'AI', category: 'technology', props: {} },
  { word: 'machine', category: 'technology', props: {} },
  { word: 'digital', category: 'technology', props: {} },
  { word: 'code', category: 'technology', props: {} },

  // Music
  { word: 'guitar', category: 'music', props: {} },
  { word: 'piano', category: 'music', props: { size: 'big' } },
  { word: 'drum', category: 'music', props: {} },
  { word: 'sing', category: 'music', props: {} },
  { word: 'song', category: 'music', props: {} },
  { word: 'concert', category: 'music', props: {} },
  { word: 'melody', category: 'music', props: {} },
  { word: 'rhythm', category: 'music', props: {} },
  { word: 'violin', category: 'music', props: {} },
  { word: 'orchestra', category: 'music', props: { size: 'big' } },
  { word: 'jazz', category: 'music', props: {} },
  { word: 'rock', category: 'music', props: {} },
  { word: 'harmony', category: 'music', props: {} },
  { word: 'flute', category: 'music', props: { size: 'small' } },

  // Body
  { word: 'hand', category: 'body', props: {} },
  { word: 'eye', category: 'body', props: { size: 'small' } },
  { word: 'heart', category: 'body', props: {} },
  { word: 'head', category: 'body', props: {} },
  { word: 'brain', category: 'body', props: {} },
  { word: 'face', category: 'body', props: {} },
  { word: 'arm', category: 'body', props: {} },
  { word: 'leg', category: 'body', props: {} },
  { word: 'foot', category: 'body', props: {} },
  { word: 'finger', category: 'body', props: { size: 'small' } },
  { word: 'mouth', category: 'body', props: { size: 'small' } },
  { word: 'ear', category: 'body', props: { size: 'small' } },
  { word: 'bone', category: 'body', props: {} },
  { word: 'blood', category: 'body', props: {} },
  { word: 'skin', category: 'body', props: {} },

  // Verbs
  { word: 'run', category: 'verbs', props: { speed: 'fast' } },
  { word: 'walk', category: 'verbs', props: { speed: 'slow' } },
  { word: 'eat', category: 'verbs', props: {} },
  { word: 'sleep', category: 'verbs', props: { speed: 'slow' } },
  { word: 'read', category: 'verbs', props: {} },
  { word: 'write', category: 'verbs', props: {} },
  { word: 'think', category: 'verbs', props: {} },
  { word: 'speak', category: 'verbs', props: {} },
  { word: 'learn', category: 'verbs', props: {} },
  { word: 'play', category: 'verbs', props: {} },
  { word: 'work', category: 'verbs', props: {} },
  { word: 'drive', category: 'verbs', props: { speed: 'fast' } },
  { word: 'fly', category: 'verbs', props: { speed: 'fast' } },
  { word: 'swim', category: 'verbs', props: {} },
  { word: 'dance', category: 'verbs', props: {} },
  { word: 'cook', category: 'verbs', props: {} },
  { word: 'build', category: 'verbs', props: {} },
  { word: 'teach', category: 'verbs', props: {} },
  { word: 'grow', category: 'verbs', props: { speed: 'slow' } },
  { word: 'fight', category: 'verbs', props: { intensity: 'high' } },
  { word: 'cry', category: 'verbs', props: { valence: 'negative' } },
  { word: 'laugh', category: 'verbs', props: { valence: 'positive' } },
  { word: 'jump', category: 'verbs', props: { speed: 'fast' } },
  { word: 'climb', category: 'verbs', props: {} },
  { word: 'open', category: 'verbs', props: {} },

  // Adjectives
  { word: 'big', category: 'adjectives', props: { size: 'big' } },
  { word: 'small', category: 'adjectives', props: { size: 'small' } },
  { word: 'fast', category: 'adjectives', props: { speed: 'fast' } },
  { word: 'slow', category: 'adjectives', props: { speed: 'slow' } },
  { word: 'hot', category: 'adjectives', props: { temp: 'hot' } },
  { word: 'cold', category: 'adjectives', props: { temp: 'cold' } },
  { word: 'old', category: 'adjectives', props: { age: 'old' } },
  { word: 'new', category: 'adjectives', props: {} },
  { word: 'good', category: 'adjectives', props: { valence: 'positive' } },
  { word: 'bad', category: 'adjectives', props: { valence: 'negative' } },
  { word: 'beautiful', category: 'adjectives', props: { valence: 'positive' } },
  { word: 'strong', category: 'adjectives', props: { size: 'big', intensity: 'high' } },
  { word: 'weak', category: 'adjectives', props: { size: 'small', intensity: 'low' } },
  { word: 'rich', category: 'adjectives', props: { valence: 'positive' } },
  { word: 'poor', category: 'adjectives', props: { valence: 'negative' } },
  { word: 'young', category: 'adjectives', props: { age: 'young' } },
  { word: 'tall', category: 'adjectives', props: { size: 'big' } },
  { word: 'short', category: 'adjectives', props: { size: 'small' } },
  { word: 'bright', category: 'adjectives', props: { valence: 'positive' } },
  { word: 'dark', category: 'adjectives', props: { valence: 'negative' } },
  { word: 'heavy', category: 'adjectives', props: { size: 'big' } },
  { word: 'light', category: 'adjectives', props: { size: 'small' } },
  { word: 'loud', category: 'adjectives', props: { intensity: 'high' } },
  { word: 'quiet', category: 'adjectives', props: { intensity: 'low' } },
  { word: 'hard', category: 'adjectives', props: { intensity: 'high' } },
  { word: 'soft', category: 'adjectives', props: { intensity: 'low' } },
];

// ============================================================
// Korean word definitions
// ============================================================
const KO_WORDS = [
  // 왕족
  { word: '왕', category: 'royalty', props: { gender: 'male' } },
  { word: '여왕', category: 'royalty', props: { gender: 'female' } },
  { word: '왕자', category: 'royalty', props: { gender: 'male', age: 'young' } },
  { word: '공주', category: 'royalty', props: { gender: 'female', age: 'young' } },
  { word: '왕관', category: 'royalty', props: {} },
  { word: '왕좌', category: 'royalty', props: {} },
  { word: '궁전', category: 'royalty', props: {} },
  { word: '왕국', category: 'royalty', props: {} },
  { word: '왕실', category: 'royalty', props: {} },
  { word: '황제', category: 'royalty', props: { gender: 'male' } },
  { word: '황후', category: 'royalty', props: { gender: 'female' } },

  // 성별 / 사람
  { word: '남자', category: 'gender', props: { gender: 'male' } },
  { word: '여자', category: 'gender', props: { gender: 'female' } },
  { word: '소년', category: 'gender', props: { gender: 'male', age: 'young' } },
  { word: '소녀', category: 'gender', props: { gender: 'female', age: 'young' } },
  { word: '남성', category: 'gender', props: { gender: 'male' } },
  { word: '여성', category: 'gender', props: { gender: 'female' } },
  { word: '사람', category: 'gender', props: {} },
  { word: '아이', category: 'gender', props: { age: 'young' } },
  { word: '어른', category: 'gender', props: { age: 'old' } },
  { word: '아기', category: 'gender', props: { age: 'young' } },
  { word: '신사', category: 'gender', props: { gender: 'male' } },
  { word: '숙녀', category: 'gender', props: { gender: 'female' } },

  // 나라
  { word: '프랑스', category: 'countries', props: { geoKey: 'france' } },
  { word: '독일', category: 'countries', props: { geoKey: 'germany' } },
  { word: '일본', category: 'countries', props: { geoKey: 'japan' } },
  { word: '한국', category: 'countries', props: { geoKey: 'korea' } },
  { word: '중국', category: 'countries', props: { geoKey: 'china' } },
  { word: '미국', category: 'countries', props: { geoKey: 'usa' } },
  { word: '영국', category: 'countries', props: { geoKey: 'england' } },
  { word: '이탈리아', category: 'countries', props: { geoKey: 'italy' } },
  { word: '스페인', category: 'countries', props: { geoKey: 'spain' } },
  { word: '러시아', category: 'countries', props: { geoKey: 'germany' } },
  { word: '인도', category: 'countries', props: { geoKey: 'china' } },
  { word: '브라질', category: 'countries', props: { geoKey: 'usa' } },
  { word: '캐나다', category: 'countries', props: { geoKey: 'usa' } },
  { word: '호주', category: 'countries', props: { geoKey: 'japan' } },
  { word: '멕시코', category: 'countries', props: { geoKey: 'spain' } },

  // 도시
  { word: '파리', category: 'cities', props: { geoKey: 'paris' } },
  { word: '베를린', category: 'cities', props: { geoKey: 'berlin' } },
  { word: '도쿄', category: 'cities', props: { geoKey: 'tokyo' } },
  { word: '서울', category: 'cities', props: { geoKey: 'seoul' } },
  { word: '베이징', category: 'cities', props: { geoKey: 'beijing' } },
  { word: '워싱턴', category: 'cities', props: { geoKey: 'washington' } },
  { word: '런던', category: 'cities', props: { geoKey: 'london' } },
  { word: '로마', category: 'cities', props: { geoKey: 'rome' } },
  { word: '마드리드', category: 'cities', props: { geoKey: 'madrid' } },
  { word: '모스크바', category: 'cities', props: { geoKey: 'berlin' } },
  { word: '뉴델리', category: 'cities', props: { geoKey: 'beijing' } },
  { word: '시드니', category: 'cities', props: { geoKey: 'tokyo' } },
  { word: '토론토', category: 'cities', props: { geoKey: 'washington' } },
  { word: '오사카', category: 'cities', props: { geoKey: 'tokyo' } },
  { word: '부산', category: 'cities', props: { geoKey: 'seoul' } },

  // 동물
  { word: '개', category: 'animals', props: { size: 'small' } },
  { word: '고양이', category: 'animals', props: { size: 'small' } },
  { word: '새', category: 'animals', props: { size: 'small' } },
  { word: '물고기', category: 'animals', props: { size: 'small' } },
  { word: '말', category: 'animals', props: { size: 'big' } },
  { word: '사자', category: 'animals', props: { size: 'big' } },
  { word: '호랑이', category: 'animals', props: { size: 'big' } },
  { word: '코끼리', category: 'animals', props: { size: 'big' } },
  { word: '곰', category: 'animals', props: { size: 'big' } },
  { word: '늑대', category: 'animals', props: { size: 'big' } },
  { word: '토끼', category: 'animals', props: { size: 'small' } },
  { word: '뱀', category: 'animals', props: { size: 'small' } },
  { word: '독수리', category: 'animals', props: { size: 'big' } },
  { word: '돌고래', category: 'animals', props: { size: 'big' } },
  { word: '고래', category: 'animals', props: { size: 'big' } },
  { word: '원숭이', category: 'animals', props: { size: 'small' } },
  { word: '사슴', category: 'animals', props: { size: 'big' } },
  { word: '펭귄', category: 'animals', props: { size: 'small' } },
  { word: '개미', category: 'animals', props: { size: 'small' } },
  { word: '벌', category: 'animals', props: { size: 'small' } },

  // 음식
  { word: '사과', category: 'food', props: {} },
  { word: '바나나', category: 'food', props: {} },
  { word: '밥', category: 'food', props: { geoKey: 'japan' } },
  { word: '빵', category: 'food', props: { geoKey: 'france' } },
  { word: '피자', category: 'food', props: { geoKey: 'italy' } },
  { word: '스시', category: 'food', props: { geoKey: 'japan' } },
  { word: '김치', category: 'food', props: { geoKey: 'korea' } },
  { word: '파스타', category: 'food', props: { geoKey: 'italy' } },
  { word: '커피', category: 'food', props: {} },
  { word: '차', category: 'food', props: { geoKey: 'china' } },
  { word: '초콜릿', category: 'food', props: {} },
  { word: '치즈', category: 'food', props: { geoKey: 'france' } },
  { word: '케이크', category: 'food', props: {} },
  { word: '국', category: 'food', props: {} },
  { word: '샐러드', category: 'food', props: {} },
  { word: '스테이크', category: 'food', props: { geoKey: 'usa' } },
  { word: '국수', category: 'food', props: { geoKey: 'china' } },
  { word: '햄버거', category: 'food', props: { geoKey: 'usa' } },
  { word: '타코', category: 'food', props: { geoKey: 'spain' } },
  { word: '카레', category: 'food', props: { geoKey: 'china' } },

  // 감정
  { word: '행복', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: '슬픔', category: 'emotions', props: { valence: 'negative', intensity: 'low' } },
  { word: '분노', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: '사랑', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: '공포', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: '기쁨', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: '놀라움', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: '희망', category: 'emotions', props: { valence: 'positive', intensity: 'low' } },
  { word: '평화', category: 'emotions', props: { valence: 'positive', intensity: 'low' } },
  { word: '증오', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: '신뢰', category: 'emotions', props: { valence: 'positive', intensity: 'low' } },
  { word: '자부심', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },
  { word: '수치심', category: 'emotions', props: { valence: 'negative', intensity: 'low' } },
  { word: '질투', category: 'emotions', props: { valence: 'negative', intensity: 'high' } },
  { word: '흥분', category: 'emotions', props: { valence: 'positive', intensity: 'high' } },

  // 색상
  { word: '빨강', category: 'colors', props: { temp: 'hot' } },
  { word: '파랑', category: 'colors', props: { temp: 'cold' } },
  { word: '초록', category: 'colors', props: {} },
  { word: '노랑', category: 'colors', props: { temp: 'hot' } },
  { word: '검정', category: 'colors', props: {} },
  { word: '하양', category: 'colors', props: {} },
  { word: '주황', category: 'colors', props: { temp: 'hot' } },
  { word: '보라', category: 'colors', props: {} },
  { word: '분홍', category: 'colors', props: {} },
  { word: '갈색', category: 'colors', props: {} },
  { word: '회색', category: 'colors', props: {} },
  { word: '금색', category: 'colors', props: { temp: 'hot' } },
  { word: '은색', category: 'colors', props: { temp: 'cold' } },

  // 직업
  { word: '선생님', category: 'professions', props: {} },
  { word: '의사', category: 'professions', props: {} },
  { word: '엔지니어', category: 'professions', props: {} },
  { word: '예술가', category: 'professions', props: {} },
  { word: '과학자', category: 'professions', props: {} },
  { word: '변호사', category: 'professions', props: {} },
  { word: '간호사', category: 'professions', props: { gender: 'female' } },
  { word: '조종사', category: 'professions', props: {} },
  { word: '요리사', category: 'professions', props: {} },
  { word: '경찰', category: 'professions', props: {} },
  { word: '군인', category: 'professions', props: { gender: 'male' } },
  { word: '농부', category: 'professions', props: {} },
  { word: '작가', category: 'professions', props: {} },
  { word: '음악가', category: 'professions', props: {} },
  { word: '배우', category: 'professions', props: { gender: 'male' } },
  { word: '여배우', category: 'professions', props: { gender: 'female' } },
  { word: '교수', category: 'professions', props: {} },
  { word: '프로그래머', category: 'professions', props: {} },

  // 가족
  { word: '아버지', category: 'family', props: { gender: 'male', age: 'old' } },
  { word: '어머니', category: 'family', props: { gender: 'female', age: 'old' } },
  { word: '아들', category: 'family', props: { gender: 'male', age: 'young' } },
  { word: '딸', category: 'family', props: { gender: 'female', age: 'young' } },
  { word: '형제', category: 'family', props: { gender: 'male' } },
  { word: '자매', category: 'family', props: { gender: 'female' } },
  { word: '남편', category: 'family', props: { gender: 'male' } },
  { word: '아내', category: 'family', props: { gender: 'female' } },
  { word: '삼촌', category: 'family', props: { gender: 'male' } },
  { word: '이모', category: 'family', props: { gender: 'female' } },
  { word: '할아버지', category: 'family', props: { gender: 'male', age: 'old' } },
  { word: '할머니', category: 'family', props: { gender: 'female', age: 'old' } },
  { word: '조카', category: 'family', props: { gender: 'male', age: 'young' } },
  { word: '조카딸', category: 'family', props: { gender: 'female', age: 'young' } },

  // 스포츠
  { word: '축구', category: 'sports', props: {} },
  { word: '야구', category: 'sports', props: {} },
  { word: '농구', category: 'sports', props: {} },
  { word: '테니스', category: 'sports', props: {} },
  { word: '수영', category: 'sports', props: {} },
  { word: '달리기', category: 'sports', props: { speed: 'fast' } },
  { word: '골프', category: 'sports', props: {} },
  { word: '권투', category: 'sports', props: {} },
  { word: '스키', category: 'sports', props: { temp: 'cold' } },
  { word: '자전거', category: 'sports', props: { speed: 'fast' } },
  { word: '배구', category: 'sports', props: {} },
  { word: '하키', category: 'sports', props: { temp: 'cold' } },
  { word: '레슬링', category: 'sports', props: {} },
  { word: '양궁', category: 'sports', props: {} },

  // 자연
  { word: '나무', category: 'nature', props: { size: 'big' } },
  { word: '꽃', category: 'nature', props: { size: 'small' } },
  { word: '강', category: 'nature', props: { size: 'big' } },
  { word: '산', category: 'nature', props: { size: 'big' } },
  { word: '바다', category: 'nature', props: { size: 'big' } },
  { word: '태양', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: '달_자연', category: 'nature', props: { temp: 'cold', size: 'big' } },
  { word: '별', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: '비', category: 'nature', props: { temp: 'cold' } },
  { word: '눈_자연', category: 'nature', props: { temp: 'cold' } },
  { word: '바람', category: 'nature', props: {} },
  { word: '구름', category: 'nature', props: {} },
  { word: '숲', category: 'nature', props: { size: 'big' } },
  { word: '사막', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: '섬', category: 'nature', props: {} },
  { word: '호수', category: 'nature', props: { size: 'big' } },
  { word: '화산', category: 'nature', props: { temp: 'hot', size: 'big' } },
  { word: '지진', category: 'nature', props: { intensity: 'high' } },
  { word: '천둥', category: 'nature', props: { intensity: 'high' } },
  { word: '무지개', category: 'nature', props: {} },

  // 기술
  { word: '컴퓨터', category: 'technology', props: {} },
  { word: '전화', category: 'technology', props: { size: 'small' } },
  { word: '인터넷', category: 'technology', props: {} },
  { word: '로봇', category: 'technology', props: {} },
  { word: '소프트웨어', category: 'technology', props: {} },
  { word: '데이터', category: 'technology', props: {} },
  { word: '알고리즘', category: 'technology', props: {} },
  { word: '네트워크', category: 'technology', props: {} },
  { word: '데이터베이스', category: 'technology', props: {} },
  { word: '서버', category: 'technology', props: {} },
  { word: '클라우드', category: 'technology', props: {} },
  { word: '인공지능', category: 'technology', props: {} },
  { word: '기계', category: 'technology', props: {} },
  { word: '디지털', category: 'technology', props: {} },
  { word: '코드', category: 'technology', props: {} },

  // 음악
  { word: '기타', category: 'music', props: {} },
  { word: '피아노', category: 'music', props: { size: 'big' } },
  { word: '드럼', category: 'music', props: {} },
  { word: '노래', category: 'music', props: {} },
  { word: '노래하다', category: 'music', props: {} },
  { word: '콘서트', category: 'music', props: {} },
  { word: '멜로디', category: 'music', props: {} },
  { word: '리듬', category: 'music', props: {} },
  { word: '바이올린', category: 'music', props: {} },
  { word: '오케스트라', category: 'music', props: { size: 'big' } },
  { word: '재즈', category: 'music', props: {} },
  { word: '록', category: 'music', props: {} },
  { word: '화음', category: 'music', props: {} },
  { word: '플루트', category: 'music', props: { size: 'small' } },

  // 신체
  { word: '손', category: 'body', props: {} },
  { word: '눈_신체', category: 'body', props: { size: 'small' } },
  { word: '심장', category: 'body', props: {} },
  { word: '머리', category: 'body', props: {} },
  { word: '뇌', category: 'body', props: {} },
  { word: '얼굴', category: 'body', props: {} },
  { word: '팔', category: 'body', props: {} },
  { word: '다리', category: 'body', props: {} },
  { word: '발', category: 'body', props: {} },
  { word: '손가락', category: 'body', props: { size: 'small' } },
  { word: '입', category: 'body', props: { size: 'small' } },
  { word: '귀', category: 'body', props: { size: 'small' } },
  { word: '뼈', category: 'body', props: {} },
  { word: '피', category: 'body', props: {} },
  { word: '피부', category: 'body', props: {} },

  // 동사
  { word: '달리다', category: 'verbs', props: { speed: 'fast' } },
  { word: '걷다', category: 'verbs', props: { speed: 'slow' } },
  { word: '먹다', category: 'verbs', props: {} },
  { word: '자다', category: 'verbs', props: { speed: 'slow' } },
  { word: '읽다', category: 'verbs', props: {} },
  { word: '쓰다', category: 'verbs', props: {} },
  { word: '생각하다', category: 'verbs', props: {} },
  { word: '말하다', category: 'verbs', props: {} },
  { word: '배우다', category: 'verbs', props: {} },
  { word: '놀다', category: 'verbs', props: {} },
  { word: '일하다', category: 'verbs', props: {} },
  { word: '운전하다', category: 'verbs', props: { speed: 'fast' } },
  { word: '날다', category: 'verbs', props: { speed: 'fast' } },
  { word: '수영하다', category: 'verbs', props: {} },
  { word: '춤추다', category: 'verbs', props: {} },
  { word: '요리하다', category: 'verbs', props: {} },
  { word: '만들다', category: 'verbs', props: {} },
  { word: '가르치다', category: 'verbs', props: {} },
  { word: '자라다', category: 'verbs', props: { speed: 'slow' } },
  { word: '싸우다', category: 'verbs', props: { intensity: 'high' } },
  { word: '부르다', category: 'verbs', props: {} },
  { word: '울다', category: 'verbs', props: { valence: 'negative' } },
  { word: '웃다', category: 'verbs', props: { valence: 'positive' } },
  { word: '뛰다', category: 'verbs', props: { speed: 'fast' } },
  { word: '오르다', category: 'verbs', props: {} },

  // 형용사
  { word: '큰', category: 'adjectives', props: { size: 'big' } },
  { word: '작은', category: 'adjectives', props: { size: 'small' } },
  { word: '빠른', category: 'adjectives', props: { speed: 'fast' } },
  { word: '느린', category: 'adjectives', props: { speed: 'slow' } },
  { word: '뜨거운', category: 'adjectives', props: { temp: 'hot' } },
  { word: '차가운', category: 'adjectives', props: { temp: 'cold' } },
  { word: '오래된', category: 'adjectives', props: { age: 'old' } },
  { word: '새로운', category: 'adjectives', props: {} },
  { word: '좋은', category: 'adjectives', props: { valence: 'positive' } },
  { word: '나쁜', category: 'adjectives', props: { valence: 'negative' } },
  { word: '아름다운', category: 'adjectives', props: { valence: 'positive' } },
  { word: '강한', category: 'adjectives', props: { size: 'big', intensity: 'high' } },
  { word: '약한', category: 'adjectives', props: { size: 'small', intensity: 'low' } },
  { word: '부유한', category: 'adjectives', props: { valence: 'positive' } },
  { word: '가난한', category: 'adjectives', props: { valence: 'negative' } },
  { word: '젊은', category: 'adjectives', props: { age: 'young' } },
  { word: '높은', category: 'adjectives', props: { size: 'big' } },
  { word: '짧은', category: 'adjectives', props: { size: 'small' } },
  { word: '밝은', category: 'adjectives', props: { valence: 'positive' } },
  { word: '어두운', category: 'adjectives', props: { valence: 'negative' } },
  { word: '무거운', category: 'adjectives', props: { size: 'big' } },
  { word: '가벼운', category: 'adjectives', props: { size: 'small' } },
  { word: '시끄러운', category: 'adjectives', props: { intensity: 'high' } },
  { word: '조용한', category: 'adjectives', props: { intensity: 'low' } },
  { word: '단단한', category: 'adjectives', props: { intensity: 'high' } },
  { word: '부드러운', category: 'adjectives', props: { intensity: 'low' } },
];

// ============================================================
// Build embedding entries
// ============================================================
function buildEntries(wordDefs) {
  return wordDefs.map(({ word, category, props }) => ({
    word,
    vector: makeEmbedding(word, category, props),
    category,
  }));
}

const englishEntries = buildEntries(EN_WORDS);
const koreanEntries = buildEntries(KO_WORDS);

// ============================================================
// Simple PCA (power iteration)
// ============================================================
function computePCA(entries, dims = 3) {
  const n = entries.length;
  const d = entries[0].vector.length;

  // Center
  const mean = zeros(d);
  for (const e of entries) {
    for (let j = 0; j < d; j++) mean[j] += e.vector[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = entries.map((e) => e.vector.map((v, j) => v - mean[j]));

  const components = [];
  const data = centered.map((r) => r.slice());

  for (let comp = 0; comp < dims; comp++) {
    const prng = mulberry32(comp * 9973 + 31);
    let pc = Array.from({ length: d }, () => prng() - 0.5);
    let norm = vectorNorm(pc);
    pc = pc.map((v) => v / norm);

    for (let iter = 0; iter < 50; iter++) {
      const newPc = zeros(d);
      for (let i = 0; i < n; i++) {
        let dot = 0;
        for (let j = 0; j < d; j++) dot += data[i][j] * pc[j];
        for (let j = 0; j < d; j++) newPc[j] += dot * data[i][j];
      }
      norm = vectorNorm(newPc);
      pc = norm === 0 ? pc : newPc.map((v) => v / norm);
    }
    components.push(pc);

    // Deflate
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = 0; j < d; j++) dot += data[i][j] * pc[j];
      for (let j = 0; j < d; j++) data[i][j] -= dot * pc[j];
    }
  }

  return centered.map((row) => {
    return components.map((pc) => {
      let dot = 0;
      for (let j = 0; j < d; j++) dot += row[j] * pc[j];
      return Math.round(dot * 10000) / 10000;
    });
  });
}

const enPCA = computePCA(englishEntries, 3);
const koPCA = computePCA(koreanEntries, 3);

englishEntries.forEach((e, i) => {
  e.pca2d = [enPCA[i][0], enPCA[i][1]];
  e.pca3d = [enPCA[i][0], enPCA[i][1], enPCA[i][2]];
});
koreanEntries.forEach((e, i) => {
  e.pca2d = [koPCA[i][0], koPCA[i][1]];
  e.pca3d = [koPCA[i][0], koPCA[i][1], koPCA[i][2]];
});

// ============================================================
// Lookup maps
// ============================================================
const enMap = new Map(englishEntries.map((e) => [e.word.toLowerCase(), e]));
const koMap = new Map(koreanEntries.map((e) => [e.word, e]));

// Display-name map: internal keys like cloud_nature -> "cloud"
const DISPLAY_NAMES = {
  cloud_nature: 'cloud',
  cloud_tech: 'cloud',
  sing_verb: 'sing',
  '달_자연': '달',
  '눈_자연': '눈',
  '눈_신체': '눈(신체)',
};

export function displayName(word) {
  return DISPLAY_NAMES[word] || word;
}

// ============================================================
// Public API
// ============================================================

export { DIM };
export const englishEmbeddings = englishEntries;
export const koreanEmbeddings = koreanEntries;

export function getWord(word, lang = 'en') {
  if (lang === 'en') return enMap.get(word.toLowerCase()) || null;
  return koMap.get(word) || null;
}

export function searchWords(query, lang = 'en') {
  const entries = lang === 'en' ? englishEntries : koreanEntries;
  const q = query.toLowerCase();
  return entries.filter((e) => {
    const display = displayName(e.word).toLowerCase();
    return display.includes(q) || e.word.toLowerCase().includes(q);
  });
}

export function findNearest(vec, n = 5, exclude = [], lang = 'en') {
  const entries = lang === 'en' ? englishEntries : koreanEntries;
  const excSet = new Set(exclude.map((w) => w.toLowerCase()));

  const scored = entries
    .filter((e) => !excSet.has(e.word.toLowerCase()))
    .map((e) => ({
      ...e,
      similarity: cosineSimilarity(vec, e.vector),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, n);
}

export function analogy(wordA, wordB, wordC, n = 5, lang = 'en') {
  const a = getWord(wordA, lang);
  const b = getWord(wordB, lang);
  const c = getWord(wordC, lang);
  if (!a || !b || !c) return [];

  const resultVec = vectorAdd(vectorSub(b.vector, a.vector), c.vector);
  return findNearest(resultVec, n, [wordA, wordB, wordC], lang);
}

export function getCategories(lang = 'en') {
  const entries = lang === 'en' ? englishEntries : koreanEntries;
  return [...new Set(entries.map((e) => e.category))];
}

export const CATEGORY_COLORS = {
  royalty: '#FFD700',
  gender: '#FF69B4',
  countries: '#4169E1',
  cities: '#1E90FF',
  animals: '#32CD32',
  food: '#FF8C00',
  emotions: '#FF4500',
  colors: '#DA70D6',
  professions: '#20B2AA',
  family: '#DB7093',
  sports: '#00CED1',
  nature: '#228B22',
  technology: '#7B68EE',
  music: '#FF1493',
  body: '#CD853F',
  verbs: '#87CEEB',
  adjectives: '#DDA0DD',
};

/** Legacy export for EmbeddingCalc compatibility */
export const categories = Object.keys(CATEGORY_COLORS);

export const CATEGORY_LABELS_KO = {
  royalty: '왕족',
  gender: '성별',
  countries: '나라',
  cities: '도시',
  animals: '동물',
  food: '음식',
  emotions: '감정',
  colors: '색상',
  professions: '직업',
  family: '가족',
  sports: '스포츠',
  nature: '자연',
  technology: '기술',
  music: '음악',
  body: '신체',
  verbs: '동사',
  adjectives: '형용사',
};

export const ANALOGY_EXAMPLES = {
  en: [
    // Gender
    { a: 'king', b: 'queen', c: 'man', expected: 'woman', label: 'king : queen = man : ?', category: 'Gender' },
    { a: 'king', b: 'queen', c: 'prince', expected: 'princess', label: 'king : queen = prince : ?', category: 'Gender' },
    { a: 'father', b: 'mother', c: 'son', expected: 'daughter', label: 'father : mother = son : ?', category: 'Gender' },
    { a: 'father', b: 'mother', c: 'brother', expected: 'sister', label: 'father : mother = brother : ?', category: 'Gender' },
    { a: 'father', b: 'mother', c: 'husband', expected: 'wife', label: 'father : mother = husband : ?', category: 'Gender' },
    { a: 'man', b: 'woman', c: 'king', expected: 'queen', label: 'man : woman = king : ?', category: 'Gender' },
    { a: 'boy', b: 'girl', c: 'man', expected: 'woman', label: 'boy : girl = man : ?', category: 'Gender' },
    // Geography
    { a: 'paris', b: 'france', c: 'seoul', expected: 'korea', label: 'paris : france = seoul : ?', category: 'Geography' },
    { a: 'paris', b: 'france', c: 'tokyo', expected: 'japan', label: 'paris : france = tokyo : ?', category: 'Geography' },
    { a: 'paris', b: 'france', c: 'berlin', expected: 'germany', label: 'paris : france = berlin : ?', category: 'Geography' },
    { a: 'paris', b: 'france', c: 'london', expected: 'england', label: 'paris : france = london : ?', category: 'Geography' },
    { a: 'paris', b: 'france', c: 'rome', expected: 'italy', label: 'paris : france = rome : ?', category: 'Geography' },
    { a: 'paris', b: 'france', c: 'beijing', expected: 'china', label: 'paris : france = beijing : ?', category: 'Geography' },
    { a: 'paris', b: 'france', c: 'madrid', expected: 'spain', label: 'paris : france = madrid : ?', category: 'Geography' },
    // Opposites
    { a: 'big', b: 'small', c: 'fast', expected: 'slow', label: 'big : small = fast : ?', category: 'Opposites' },
    { a: 'hot', b: 'cold', c: 'old', expected: 'new', label: 'hot : cold = old : ?', category: 'Opposites' },
    { a: 'good', b: 'bad', c: 'strong', expected: 'weak', label: 'good : bad = strong : ?', category: 'Opposites' },
    { a: 'rich', b: 'poor', c: 'big', expected: 'small', label: 'rich : poor = big : ?', category: 'Opposites' },
    // Culture (food-country)
    { a: 'sushi', b: 'japan', c: 'kimchi', expected: 'korea', label: 'sushi : japan = kimchi : ?', category: 'Culture' },
    { a: 'pizza', b: 'italy', c: 'sushi', expected: 'japan', label: 'pizza : italy = sushi : ?', category: 'Culture' },
    // Animal
    { a: 'dog', b: 'cat', c: 'lion', expected: 'tiger', label: 'dog : cat = lion : ?', category: 'Animal' },
    // Profession
    { a: 'teacher', b: 'doctor', c: 'teach', expected: 'learn', label: 'teacher : doctor = teach : ?', category: 'Profession' },
  ],
  ko: [
    // 성별
    { a: '왕', b: '여왕', c: '남자', expected: '여자', label: '왕 : 여왕 = 남자 : ?', category: '성별' },
    { a: '왕', b: '여왕', c: '왕자', expected: '공주', label: '왕 : 여왕 = 왕자 : ?', category: '성별' },
    { a: '아버지', b: '어머니', c: '아들', expected: '딸', label: '아버지 : 어머니 = 아들 : ?', category: '성별' },
    { a: '아버지', b: '어머니', c: '형제', expected: '자매', label: '아버지 : 어머니 = 형제 : ?', category: '성별' },
    { a: '아버지', b: '어머니', c: '남편', expected: '아내', label: '아버지 : 어머니 = 남편 : ?', category: '성별' },
    { a: '남자', b: '여자', c: '왕', expected: '여왕', label: '남자 : 여자 = 왕 : ?', category: '성별' },
    { a: '소년', b: '소녀', c: '남자', expected: '여자', label: '소년 : 소녀 = 남자 : ?', category: '성별' },
    // 지리
    { a: '파리', b: '프랑스', c: '서울', expected: '한국', label: '파리 : 프랑스 = 서울 : ?', category: '지리' },
    { a: '파리', b: '프랑스', c: '도쿄', expected: '일본', label: '파리 : 프랑스 = 도쿄 : ?', category: '지리' },
    { a: '파리', b: '프랑스', c: '베를린', expected: '독일', label: '파리 : 프랑스 = 베를린 : ?', category: '지리' },
    { a: '파리', b: '프랑스', c: '런던', expected: '영국', label: '파리 : 프랑스 = 런던 : ?', category: '지리' },
    { a: '파리', b: '프랑스', c: '로마', expected: '이탈리아', label: '파리 : 프랑스 = 로마 : ?', category: '지리' },
    { a: '파리', b: '프랑스', c: '베이징', expected: '중국', label: '파리 : 프랑스 = 베이징 : ?', category: '지리' },
    // 반의어
    { a: '큰', b: '작은', c: '빠른', expected: '느린', label: '큰 : 작은 = 빠른 : ?', category: '반의어' },
    { a: '뜨거운', b: '차가운', c: '오래된', expected: '새로운', label: '뜨거운 : 차가운 = 오래된 : ?', category: '반의어' },
    { a: '좋은', b: '나쁜', c: '강한', expected: '약한', label: '좋은 : 나쁜 = 강한 : ?', category: '반의어' },
    // 감정
    { a: '행복', b: '슬픔', c: '사랑', expected: '증오', label: '행복 : 슬픔 = 사랑 : ?', category: '감정' },
    // 문화 (음식-나라)
    { a: '스시', b: '일본', c: '김치', expected: '한국', label: '스시 : 일본 = 김치 : ?', category: '문화' },
    { a: '피자', b: '이탈리아', c: '스시', expected: '일본', label: '피자 : 이탈리아 = 스시 : ?', category: '문화' },
    // 동물
    { a: '개', b: '고양이', c: '사자', expected: '호랑이', label: '개 : 고양이 = 사자 : ?', category: '동물' },
    // 가족
    { a: '아버지', b: '아들', c: '어머니', expected: '딸', label: '아버지 : 아들 = 어머니 : ?', category: '가족' },
  ],
};
