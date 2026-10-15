import { detectIndustry, filterGenresForIndustry, INDUSTRIES } from './src/utils/industry.js';
import { movieService } from './src/services/movieService.js';

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING INDUSTRY -> GENRE -> MOVIES VERIFICATION');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // TEST 1: Bollywood filtering
  console.log('\n--- TEST 1: Open Bollywood ---');
  const bollyRes = await movieService.getMovies({ industry: 'bollywood', limit: 8 });
  const bollyMovies = bollyRes.data.items;
  console.log(`Returned ${bollyMovies.length} Bollywood movies:`, bollyMovies.map(m => `${m.title} (${m.industry})`));
  assert(bollyMovies.length > 0, 'Bollywood returned movies');
  assert(bollyMovies.every(m => m.industry === 'bollywood'), 'Test 1: Only Bollywood movies returned (no Hollywood, Anime, or others)');

  // TEST 2: Hollywood filtering
  console.log('\n--- TEST 2: Open Hollywood ---');
  const hollyRes = await movieService.getMovies({ industry: 'hollywood', limit: 8 });
  const hollyMovies = hollyRes.data.items;
  console.log(`Returned ${hollyMovies.length} Hollywood movies:`, hollyMovies.map(m => `${m.title} (${m.industry})`));
  assert(hollyMovies.length > 0, 'Hollywood returned movies');
  assert(hollyMovies.every(m => m.industry === 'hollywood'), 'Test 2: Only Hollywood movies returned');

  // TEST 3: Anime filtering
  console.log('\n--- TEST 3: Open Anime ---');
  const animeRes = await movieService.getMovies({ industry: 'anime', limit: 8 });
  const animeMovies = animeRes.data.items;
  console.log(`Returned ${animeMovies.length} Anime movies:`, animeMovies.map(m => `${m.title} (${m.industry})`));
  assert(animeMovies.length > 0, 'Anime returned movies');
  assert(animeMovies.every(m => m.industry === 'anime'), 'Test 3: Only Anime movies returned (no regular Hollywood/Bollywood)');

  // TEST 4: Bollywood + Romance
  console.log('\n--- TEST 4: Bollywood + Romance ---');
  const bollyRomanceRes = await movieService.getMovies({ industry: 'bollywood', genre_id: '10749', limit: 8 });
  const bollyRomance = bollyRomanceRes.data.items;
  console.log(`Returned ${bollyRomance.length} Bollywood Romance movies:`, bollyRomance.map(m => `${m.title} (${m.industry}, Genres: ${m.genres?.map(g => g.name).join(', ')})`));
  assert(bollyRomance.length > 0, 'Bollywood Romance returned movies');
  assert(bollyRomance.every(m => m.industry === 'bollywood'), 'Test 4a: Every movie belongs to Bollywood');
  assert(bollyRomance.every(m => m.genres?.some(g => String(g.id) === '10749' || g.name.toLowerCase().includes('romance'))), 'Test 4b: Every movie has Romance genre');

  // TEST 5: Hollywood + Action
  console.log('\n--- TEST 5: Hollywood + Action ---');
  const hollyActionRes = await movieService.getMovies({ industry: 'hollywood', genre_id: '28', limit: 8 });
  const hollyAction = hollyActionRes.data.items;
  console.log(`Returned ${hollyAction.length} Hollywood Action movies:`, hollyAction.map(m => `${m.title} (${m.industry}, Genres: ${m.genres?.map(g => g.name).join(', ')})`));
  assert(hollyAction.length > 0, 'Hollywood Action returned movies');
  assert(hollyAction.every(m => m.industry === 'hollywood'), 'Test 5a: Every movie belongs to Hollywood');
  assert(hollyAction.every(m => m.genres?.some(g => String(g.id) === '28' || g.name.toLowerCase().includes('action'))), 'Test 5b: Every movie has Action genre');

  // TEST 6: Anime + Fantasy
  console.log('\n--- TEST 6: Anime + Fantasy ---');
  const animeFantasyRes = await movieService.getMovies({ industry: 'anime', genre_id: '14', limit: 8 });
  const animeFantasy = animeFantasyRes.data.items;
  console.log(`Returned ${animeFantasy.length} Anime Fantasy movies:`, animeFantasy.map(m => `${m.title} (${m.industry}, Genres: ${m.genres?.map(g => g.name).join(', ')})`));
  assert(animeFantasy.length > 0, 'Anime Fantasy returned movies');
  assert(animeFantasy.every(m => m.industry === 'anime'), 'Test 6a: Every movie belongs to Anime');
  assert(animeFantasy.every(m => m.genres?.some(g => String(g.id) === '14' || g.name.toLowerCase().includes('fantasy'))), 'Test 6b: Every movie has Fantasy genre');

  // TEST 7: Dynamic Genre Filters update by industry
  console.log('\n--- TEST 7: Dynamic Genre Options Update by Industry ---');
  const bollyGenres = await movieService.getGenres('bollywood');
  const animeGenres = await movieService.getGenres('anime');
  const hollyGenres = await movieService.getGenres('hollywood');
  console.log('Bollywood Genres count:', bollyGenres.data.length, bollyGenres.data.map(g => g.name));
  console.log('Anime Genres count:', animeGenres.data.length, animeGenres.data.map(g => g.name));
  console.log('Hollywood Genres count:', hollyGenres.data.length, hollyGenres.data.map(g => g.name));
  assert(bollyGenres.data.length > 0 && hollyGenres.data.length > 0 && animeGenres.data.length > 0, 'All industries return genre lists');
  assert(animeGenres.data.some(g => g.name === 'Animation' || g.name === 'Fantasy'), 'Test 7: Anime has specialized genres tailored to anime');

  // TEST 8: Scoped Search
  console.log('\n--- TEST 8: Scoped Search by Industry ---');
  const searchBolly = await movieService.getMovies({ industry: 'bollywood', search: 'Dangal' });
  console.log('Bollywood search for "Dangal":', searchBolly.data.items.map(m => `${m.title} (${m.industry})`));
  assert(searchBolly.data.items.length > 0 && searchBolly.data.items.every(m => m.industry === 'bollywood'), 'Test 8: Search "Dangal" in Bollywood returns Dangal without cross-industry pollution');

  // TEST 9: Movie Details and Keywords formatting
  console.log('\n--- TEST 9: Movie Details & Safe Keywords ---');
  const movieDetail = await movieService.getMovieById(bollyMovies[0].id);
  console.log(`Fetched details for "${movieDetail.data.title}": Industry = ${movieDetail.data.industry}, Keywords type = ${typeof movieDetail.data.keywords}`);
  assert(movieDetail.data.industry === 'bollywood', 'Test 9a: Movie details preserves detected industry');
  assert(typeof movieDetail.data.keywords === 'string', 'Test 9b: Keywords properly serialized as string without breaking .split');

  console.log('\n==================================================');
  console.log(`FINAL RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
