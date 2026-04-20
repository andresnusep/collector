// Fictional record collection — track-level data

const MOODS_POOL = ['Hypnotic', 'Uplifting', 'Melancholic', 'Heavy', 'Dreamy', 'Joyful', 'Peak Time', 'Smokey', 'Euphoric', 'Driving', 'Fire'];

function makeTracks(opts) {
  // opts.count = track count, opts.baseBpm, opts.baseKey ('8A' camelot), opts.seed
  const { count, baseBpm, baseKey, seed, titles = [] } = opts;
  const keyNum = parseInt(baseKey);
  const keyLet = baseKey.slice(-1);
  const tracks = [];
  let s = seed * 9301;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < count; i++) {
    const side = i < Math.ceil(count / 2) ? 'A' : 'B';
    const pos = side === 'A' ? i + 1 : i - Math.ceil(count / 2) + 1;
    const bpmShift = Math.floor(rng() * 10 - 4);
    const keyShift = Math.floor(rng() * 3 - 1);
    const nk = ((keyNum - 1 + keyShift + 12) % 12) + 1;
    const mins = 3 + Math.floor(rng() * 6);
    const secs = Math.floor(rng() * 60);
    tracks.push({
      n: `${side}${pos}`,
      title: titles[i] || `Untitled ${side}${pos}`,
      bpm: baseBpm + bpmShift,
      key: `${nk}${keyLet}`,
      len: `${mins}:${String(secs).padStart(2, '0')}`,
      mood: MOODS_POOL[Math.floor(rng() * MOODS_POOL.length)],
      energy: Math.max(1, Math.min(10, opts.baseEnergy + Math.floor(rng() * 3 - 1))),
    });
  }
  return tracks;
}

window.RECORDS = [
  {
    id: 'r01', artist: 'Ondalina', title: 'Aguas Profundas', year: 1978,
    label: 'Discos del Trópico', catalog: 'DDT-4412',
    genre: 'Boogaloo', mood: 'Hypnotic', energy: 6, bpm: 112, key: '8A',
    cover: { hue: 28, shape: 'stripes' },
    notes: 'Bogotá dig, 2023. Copy has light surface noise on B2.',
    value: 64,
    tracks: makeTracks({
      count: 8, baseBpm: 112, baseKey: '8A', baseEnergy: 6, seed: 1,
      titles: ['Aguas Profundas', 'La Sombra', 'Medianoche', 'Ritmo del Pez', 'El Río', 'Sol Bajo', 'Transición', 'Salida'],
    }),
  },
  {
    id: 'r02', artist: 'Kofi Mensah Quintet', title: 'Highlife Transmissions', year: 1974,
    label: 'Accra Sound Ltd.', catalog: 'ASL-0091',
    genre: 'Afrobeat', mood: 'Uplifting', energy: 8, bpm: 124, key: '11B',
    cover: { hue: 55, shape: 'circles' },
    notes: 'OG pressing. Traded for two reissues at the Lagos fair.',
    value: 220,
    tracks: makeTracks({
      count: 4, baseBpm: 124, baseKey: '11B', baseEnergy: 8, seed: 2,
      titles: ['Transmission One', 'Kumasi Nights', 'Dust & Brass', 'Transmission Two'],
    }),
  },
  {
    id: 'r03', artist: 'Neon Fiord', title: 'Cold Room Dances', year: 1983,
    label: 'Midnattsol Records', catalog: 'MDS-17',
    genre: 'Italo', mood: 'Melancholic', energy: 7, bpm: 118, key: '4A',
    cover: { hue: 220, shape: 'grid' },
    notes: 'Discogs rare. The Oslo pressing — not the Milan reissue.',
    value: 180,
    tracks: makeTracks({
      count: 6, baseBpm: 118, baseKey: '4A', baseEnergy: 7, seed: 3,
      titles: ['Cold Room', 'Glass Pavilion', 'Frost Lamps', 'Ice on the Wire', 'Long Walk', 'Morning Heater'],
    }),
  },
  {
    id: 'r04', artist: 'Amaranth Sound System', title: 'Dub Geography', year: 1991,
    label: 'Heavyweight Imprint', catalog: 'HW-204',
    genre: 'Dub', mood: 'Heavy', energy: 5, bpm: 78, key: '2A',
    cover: { hue: 140, shape: 'halftone' },
    notes: 'Test press — matrix scratched HW-204-TP/1.',
    value: 95,
    tracks: makeTracks({
      count: 3, baseBpm: 78, baseKey: '2A', baseEnergy: 5, seed: 4,
      titles: ['North Coast Dub', 'Harbour Echo', 'Concrete Riddim'],
    }),
  },
  {
    id: 'r05', artist: 'Sable Mirage', title: 'Tape Hiss Futures', year: 2019,
    label: 'Polar Vortex', catalog: 'PV-008',
    genre: 'Ambient', mood: 'Dreamy', energy: 3, bpm: 90, key: '5A',
    cover: { hue: 310, shape: 'waves' },
    notes: 'Clear vinyl. Numbered 44/300.',
    value: 42,
    tracks: makeTracks({
      count: 2, baseBpm: 90, baseKey: '5A', baseEnergy: 3, seed: 5,
      titles: ['Cassette Morning', 'Slow Snow'],
    }),
  },
  {
    id: 'r06', artist: 'Grupo Tropikalia', title: 'Sonido de la Costa', year: 1981,
    label: 'Caribe Fiesta', catalog: 'CF-1188',
    genre: 'Cumbia', mood: 'Joyful', energy: 9, bpm: 100, key: '10A',
    cover: { hue: 12, shape: 'stripes' },
    notes: 'Played out. Needs a clean but worth it — crowd-killer.',
    value: 58,
    tracks: makeTracks({
      count: 10, baseBpm: 100, baseKey: '10A', baseEnergy: 9, seed: 6,
      titles: ['Cumbia de la Noche', 'Guayabo', 'Palmeras Rojas', 'El Farol', 'Puerto Sol', 'Guaracha Nueva', 'Paraíso Corto', 'Marea Baja', 'Sombrero Azul', 'Despedida'],
    }),
  },
  {
    id: 'r07', artist: 'Hadron Club', title: 'Basement Protocol', year: 1996,
    label: 'Subfrequencia', catalog: 'SFQ-014',
    genre: 'House', mood: 'Peak Time', energy: 10, bpm: 128, key: '12A',
    cover: { hue: 280, shape: 'grid' },
    notes: 'B2 is the one. Acid workout.',
    value: 140,
    tracks: makeTracks({
      count: 5, baseBpm: 128, baseKey: '12A', baseEnergy: 10, seed: 7,
      titles: ['Protocol One', 'Door Policy', 'Four AM', 'Ghost Modulator', 'Sunrise Exit'],
    }),
  },
  {
    id: 'r08', artist: 'Ruby Ivey Trio', title: 'Low-Light Sessions', year: 1969,
    label: 'Blue Room', catalog: 'BR-55',
    genre: 'Jazz', mood: 'Smokey', energy: 4, bpm: 88, key: '6A',
    cover: { hue: 40, shape: 'halftone' },
    notes: 'Mono pressing. Ring wear but plays beautifully.',
    value: 310,
    tracks: makeTracks({
      count: 7, baseBpm: 88, baseKey: '6A', baseEnergy: 4, seed: 8,
      titles: ['Low-Light', 'After Hours Waltz', 'Velvet Room', 'The Corner', 'Whiskey Brass', 'Close the Doors', 'Encore'],
    }),
  },
  {
    id: 'r09', artist: 'Zouk Electrique', title: 'Tropiques Numériques', year: 1987,
    label: 'Antilles Digitale', catalog: 'AD-0031',
    genre: 'Zouk', mood: 'Euphoric', energy: 9, bpm: 120, key: '11A',
    cover: { hue: 330, shape: 'circles' },
    notes: 'Paris dig. Two copies — one sealed, one for gigs.',
    value: 85,
    tracks: makeTracks({
      count: 12, baseBpm: 120, baseKey: '11A', baseEnergy: 9, seed: 9,
      titles: ['Numérique', 'Soleil Bleu', 'Cassette Tropique', 'Martinique', 'Guadeloupe FM', 'Zouk Machine', 'Nuit Chaude', 'Plage 2', 'Electrique', 'Retour', 'Dub Version', 'Instrumental'],
    }),
  },
  {
    id: 'r10', artist: 'Obsidian Arc', title: 'Pattern Language', year: 2002,
    label: 'Konstrukt', catalog: 'KST-44',
    genre: 'Techno', mood: 'Driving', energy: 9, bpm: 132, key: '1A',
    cover: { hue: 200, shape: 'waves' },
    notes: 'Minimal. Use as a bridge between Hadron and Neon Fiord.',
    value: 70,
    tracks: makeTracks({
      count: 4, baseBpm: 132, baseKey: '1A', baseEnergy: 9, seed: 10,
      titles: ['Pattern 01', 'Pattern 02', 'Pattern 03', 'Pattern 04'],
    }),
  },
  {
    id: 'r11', artist: 'Las Estrellas de Medianoche', title: 'Baile Sideral', year: 1976,
    label: 'Estrella Roja', catalog: 'ER-221',
    genre: 'Salsa', mood: 'Fire', energy: 10, bpm: 108, key: '9A',
    cover: { hue: 0, shape: 'stripes' },
    notes: 'Gatefold. Heavyweight 180g re-cut.',
    value: 120,
    tracks: makeTracks({
      count: 8, baseBpm: 108, baseKey: '9A', baseEnergy: 10, seed: 11,
      titles: ['Baile Sideral', 'Guaguancó Cósmico', 'La Orquesta Infinita', 'Timbal Planetario', 'Tres Estrellas', 'Son Espacial', 'Coro del Cielo', 'Finale'],
    }),
  },
  {
    id: 'r12', artist: 'Porcelain Ghost', title: 'Static Garden', year: 2015,
    label: 'Glass House', catalog: 'GH-06',
    genre: 'Downtempo', mood: 'Dreamy', energy: 4, bpm: 95, key: '7A',
    cover: { hue: 260, shape: 'halftone' },
    notes: 'Opener material. A2 bleeds into the B1 perfectly.',
    value: 38,
    tracks: makeTracks({
      count: 6, baseBpm: 95, baseKey: '7A', baseEnergy: 4, seed: 12,
      titles: ['Static Garden', 'Little Flowers', 'Greenhouse', 'Moss', 'Windowbox', 'Fade'],
    }),
  },
];

// Helpers for track IDs: "recordId-trackIndex"
window.parseTrackId = (id) => {
  const [rid, idx] = id.split('-');
  const record = window.RECORDS.find(r => r.id === rid);
  if (!record) return null;
  const track = record.tracks[Number(idx)];
  if (!track) return null;
  return { record, track, idx: Number(idx) };
};

window.GENRES = ['All', 'Boogaloo', 'Afrobeat', 'Italo', 'Dub', 'Ambient', 'Cumbia', 'House', 'Jazz', 'Zouk', 'Techno', 'Salsa', 'Downtempo'];
