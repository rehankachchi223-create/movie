import { movieService } from './src/services/movieService.js';
import { INITIAL_MOVIES } from './src/firebase/seedMovies.js';

async function runPreviewTests() {
  console.log('====================================================');
  console.log('VERIFYING UNIVERSAL MOVIE-SPECIFIC PREVIEW MAPPING');
  console.log('====================================================\n');

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

  // TEST 1: Hollywood preview mapping
  console.log('--- TEST 1: Hollywood Movie Previews ---');
  const inception = INITIAL_MOVIES.find(m => m.title === 'Inception');
  const inceptionPreview = await movieService.getMoviePreview(inception);
  console.log('Inception preview:', inceptionPreview);
  assert(inceptionPreview && inceptionPreview.videoKey === 'cdx31ak4KbQ', 'Inception has exact matching preview (cdx31ak4KbQ)');

  // TEST 2: Bollywood preview mapping
  console.log('\n--- TEST 2: Bollywood Movie Previews ---');
  const dangal = INITIAL_MOVIES.find(m => m.title === 'Dangal');
  const dangalPreview = await movieService.getMoviePreview(dangal);
  console.log('Dangal preview:', dangalPreview);
  assert(dangalPreview && dangalPreview.videoKey === '9jyD4Ykbq8Y', 'Dangal has exact matching preview (9jyD4Ykbq8Y)');

  const idiots = INITIAL_MOVIES.find(m => m.title === '3 Idiots');
  const idiotsPreview = await movieService.getMoviePreview(idiots);
  console.log('3 Idiots preview:', idiotsPreview);
  assert(idiotsPreview && idiotsPreview.videoKey === 'K0eDlFX9GMc', '3 Idiots has exact matching preview (K0eDlFX9GMc)');

  // TEST 3: Anime preview mapping
  console.log('\n--- TEST 3: Anime Movie Previews ---');
  const yourName = INITIAL_MOVIES.find(m => m.title === 'Your Name.');
  const yourNamePreview = await movieService.getMoviePreview(yourName);
  console.log('Your Name preview:', yourNamePreview);
  assert(yourNamePreview && yourNamePreview.videoKey === 'TYku4P7MHdo', 'Your Name has exact matching preview (TYku4P7MHdo)');

  const spiritedAway = INITIAL_MOVIES.find(m => m.title === 'Spirited Away');
  const spiritedAwayPreview = await movieService.getMoviePreview(spiritedAway);
  console.log('Spirited Away preview:', spiritedAwayPreview);
  assert(spiritedAwayPreview && spiritedAwayPreview.videoKey === 'ByXuk9QqQkk', 'Spirited Away has exact matching preview (ByXuk9QqQkk)');

  // TEST 4: Korean Cinema preview mapping
  console.log('\n--- TEST 4: Korean Movie Previews ---');
  const parasite = INITIAL_MOVIES.find(m => m.title === 'Parasite');
  const parasitePreview = await movieService.getMoviePreview(parasite);
  console.log('Parasite preview:', parasitePreview);
  assert(parasitePreview && parasitePreview.videoKey === '5xH0R_228XE', 'Parasite has exact matching preview (5xH0R_228XE)');

  // TEST 5: Live TMDB Movie Previews for dynamically fetched movies
  console.log('\n--- TEST 5: Live Dynamic TMDB Movies ---');
  const liveMovies = await movieService.getTrending(4);
  for (const m of liveMovies.data) {
    const prev = await movieService.getMoviePreview(m);
    console.log(`Live TMDB "${m.title}" preview:`, prev?.videoKey || '(No video found)');
    assert(prev === null || typeof prev?.videoKey === 'string', `Live movie "${m.title}" resolved safely`);
  }

  // TEST 6: Rapid Movie Switching without Pollution
  console.log('\n--- TEST 6: Rapid Movie Switching Isolation ---');
  const [p1, p2, p3] = await Promise.all([
    movieService.getMoviePreview(inception),
    movieService.getMoviePreview(dangal),
    movieService.getMoviePreview(yourName),
  ]);
  assert(p1.videoKey !== p2.videoKey && p2.videoKey !== p3.videoKey, 'All movies return distinct, non-polluting preview keys');
  assert(p1.videoKey === 'cdx31ak4KbQ', 'Movie 1 retained correct key under concurrent calls');
  assert(p2.videoKey === '9jyD4Ykbq8Y', 'Movie 2 retained correct key under concurrent calls');
  assert(p3.videoKey === 'TYku4P7MHdo', 'Movie 3 retained correct key under concurrent calls');

  // TEST 7: Graceful Fallback for invalid/empty movie
  console.log('\n--- TEST 7: Graceful Fallback for Invalid IDs ---');
  const invalidPreview = await movieService.getMoviePreview({ id: 'non-existent-999999' });
  console.log('Invalid movie preview:', invalidPreview);
  assert(invalidPreview === null, 'Invalid movie safely returns null (triggering static backdrop)');

  console.log('\n====================================================');
  console.log(`FINAL RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');
}

runPreviewTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
