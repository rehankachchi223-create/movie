import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export const INITIAL_GENRES = [
  { id: 'genre-action', name: 'Action' },
  { id: 'genre-adventure', name: 'Adventure' },
  { id: 'genre-animation', name: 'Animation' },
  { id: 'genre-comedy', name: 'Comedy' },
  { id: 'genre-crime', name: 'Crime' },
  { id: 'genre-drama', name: 'Drama' },
  { id: 'genre-fantasy', name: 'Fantasy' },
  { id: 'genre-horror', name: 'Horror' },
  { id: 'genre-mystery', name: 'Mystery' },
  { id: 'genre-romance', name: 'Romance' },
  { id: 'genre-scifi', name: 'Sci-Fi' },
  { id: 'genre-thriller', name: 'Thriller' },
  { id: 'genre-western', name: 'Western' },
];

export const INITIAL_MOVIES = [
  // ── Hollywood ─────────────────────────────────────────────────────────────
  {
    id: '1',
    external_id: 'tmdb-27205',
    title: 'Inception',
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    tagline: 'Your mind is the scene of the crime.',
    release_date: '2010-07-16',
    runtime: 148,
    rating: 8.8,
    poster_url: 'https://image.tmdb.org/t/p/w500/oYuLE29oYiTHacHueFiCl2V1utM.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7ySaDx3zNStandard.jpg',
    director: 'Christopher Nolan',
    cast_list: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy, Ken Watanabe',
    keywords: 'dream, subconscious, heist, mind-bending, reality',
    original_language: 'en',
    origin_country: ['US'],
    industry: 'hollywood',
    trailer_key: 'cdx31ak4KbQ',
    trailer_url: 'https://www.youtube.com/watch?v=cdx31ak4KbQ',
    genres: [{ id: 'genre-action', name: 'Action' }, { id: 'genre-scifi', name: 'Sci-Fi' }, { id: 'genre-adventure', name: 'Adventure' }],
  },
  {
    id: '2',
    external_id: 'tmdb-157336',
    title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    release_date: '2014-11-07',
    runtime: 169,
    rating: 8.6,
    poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    director: 'Christopher Nolan',
    cast_list: 'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Michael Caine',
    keywords: 'space travel, black hole, time dilation, wormhole, survival',
    original_language: 'en',
    origin_country: ['US'],
    industry: 'hollywood',
    trailer_key: 'zSWdZVtXT7E',
    trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    genres: [{ id: 'genre-adventure', name: 'Adventure' }, { id: 'genre-drama', name: 'Drama' }, { id: 'genre-scifi', name: 'Sci-Fi' }],
  },
  {
    id: '3',
    external_id: 'tmdb-155',
    title: 'The Dark Knight',
    overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.',
    tagline: 'Welcome to a world without rules.',
    release_date: '2008-07-18',
    runtime: 152,
    rating: 9.0,
    poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/nMKdUU1hvTvianjAof23UtT4j2.jpg',
    director: 'Christopher Nolan',
    cast_list: 'Christian Bale, Heath Ledger, Aaron Eckhart, Michael Caine, Maggie Gyllenhaal',
    keywords: 'superhero, joker, gotham, vigilante, crime fighter',
    original_language: 'en',
    origin_country: ['US'],
    industry: 'hollywood',
    trailer_key: 'EXeTwQWrcwY',
    trailer_url: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
    genres: [{ id: 'genre-action', name: 'Action' }, { id: 'genre-crime', name: 'Crime' }, { id: 'genre-drama', name: 'Drama' }, { id: 'genre-thriller', name: 'Thriller' }],
  },
  {
    id: '4',
    external_id: 'tmdb-603',
    title: 'The Matrix',
    overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    tagline: 'Welcome to the Real World.',
    release_date: '1999-03-31',
    runtime: 136,
    rating: 8.7,
    poster_url: 'https://image.tmdb.org/t/p/w500/f89U3YSt122v0V9x9SZflavA7v9.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/7u32vVHotdBSdnA21iXUFXwyJO.jpg',
    director: 'Lana Wachowski, Lilly Wachowski',
    cast_list: 'Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss, Hugo Weaving',
    keywords: 'simulated reality, cyber, hacker, chosen one, martial arts',
    original_language: 'en',
    origin_country: ['US'],
    industry: 'hollywood',
    trailer_key: 'vKQi3bBA1y8',
    trailer_url: 'https://www.youtube.com/watch?v=vKQi3bBA1y8',
    genres: [{ id: 'genre-action', name: 'Action' }, { id: 'genre-scifi', name: 'Sci-Fi' }],
  },

  // ── Bollywood ─────────────────────────────────────────────────────────────
  {
    id: '201',
    external_id: 'tmdb-20453',
    title: '3 Idiots',
    overview: 'Two friends search for their long-lost companion while revisiting their college days and memories of their friend who inspired them to think differently.',
    tagline: 'Don\'t Chase Success, Chase Excellence.',
    release_date: '2009-12-25',
    runtime: 170,
    rating: 8.5,
    poster_url: 'https://image.tmdb.org/t/p/w500/7pSQ1xXb0dM4LqGj4yF3bLz5G6.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/8eihFdHG7u05y0Z1A825GfM822.jpg',
    director: 'Rajkumar Hirani',
    cast_list: 'Aamir Khan, R. Madhavan, Sharman Joshi, Kareena Kapoor, Boman Irani',
    keywords: 'college, engineering, friendship, inspiration, education',
    original_language: 'hi',
    origin_country: ['IN'],
    industry: 'bollywood',
    trailer_key: 'K0eDlFX9GMc',
    trailer_url: 'https://www.youtube.com/watch?v=K0eDlFX9GMc',
    genres: [{ id: 'genre-comedy', name: 'Comedy' }, { id: 'genre-drama', name: 'Drama' }, { id: 'genre-romance', name: 'Romance' }],
  },
  {
    id: '202',
    external_id: 'tmdb-360814',
    title: 'Dangal',
    overview: 'Former wrestler Mahavir Singh Phogat trains young daughters Geeta and Babita to follow in his footsteps and become world-class wrestlers.',
    tagline: 'Mhari chhoriyan chhoron se kam hain ke?',
    release_date: '2016-12-23',
    runtime: 161,
    rating: 8.4,
    poster_url: 'https://image.tmdb.org/t/p/w500/w1y5pZp5n6468rJgX41qG18k2h.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/9rB25q5G8205yY7u0a27G418j.jpg',
    director: 'Nitesh Tiwari',
    cast_list: 'Aamir Khan, Sakshi Tanwar, Fatima Sana Shaikh, Sanya Malhotra',
    keywords: 'wrestling, female empowerment, father daughter, biopic, sports',
    original_language: 'hi',
    origin_country: ['IN'],
    industry: 'bollywood',
    trailer_key: '9jyD4Ykbq8Y',
    trailer_url: 'https://www.youtube.com/watch?v=9jyD4Ykbq8Y',
    genres: [{ id: 'genre-drama', name: 'Drama' }, { id: 'genre-action', name: 'Action' }],
  },
  {
    id: '203',
    external_id: 'tmdb-872585',
    title: 'Jawan',
    overview: 'A man is driven by a personal vendetta to rectify the wrongs in society while keeping a promise made years ago.',
    tagline: 'Ready to unleash.',
    release_date: '2023-09-07',
    runtime: 169,
    rating: 8.1,
    poster_url: 'https://image.tmdb.org/t/p/w500/jFt1g94utSuR9vK17g20k2g4j.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/k1y81593r1g71829h7289y7g9.jpg',
    director: 'Atlee',
    cast_list: 'Shah Rukh Khan, Nayanthara, Vijay Sethupathi, Deepika Padukone',
    keywords: 'vigilante, action hero, dual role, social justice',
    original_language: 'hi',
    origin_country: ['IN'],
    industry: 'bollywood',
    trailer_key: 'COv52Qyctws',
    trailer_url: 'https://www.youtube.com/watch?v=COv52Qyctws',
    genres: [{ id: 'genre-action', name: 'Action' }, { id: 'genre-thriller', name: 'Thriller' }],
  },

  // ── Anime ─────────────────────────────────────────────────────────────────
  {
    id: '8',
    external_id: 'tmdb-129',
    title: 'Spirited Away',
    overview: 'A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon her courage.',
    tagline: 'The tunnel led Chihiro to a mysterious world...',
    release_date: '2001-07-20',
    runtime: 125,
    rating: 8.5,
    poster_url: 'https://image.tmdb.org/t/p/w500/39wmItE2AB53vScjDU2YStKXzAB.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/Ab8mt2YvK7tcoX4pGlWhK3jKj7e.jpg',
    director: 'Hayao Miyazaki',
    cast_list: 'Rumi Hiiragi, Miyu Irino, Mari Natsuki, Takashi Naito',
    keywords: 'anime, studio ghibli, spirits, bathhouse, magic',
    original_language: 'ja',
    origin_country: ['JP'],
    industry: 'anime',
    trailer_key: 'ByXuk9QqQkk',
    trailer_url: 'https://www.youtube.com/watch?v=ByXuk9QqQkk',
    genres: [{ id: 'genre-animation', name: 'Animation' }, { id: 'genre-fantasy', name: 'Fantasy' }, { id: 'genre-adventure', name: 'Adventure' }],
  },
  {
    id: '302',
    external_id: 'tmdb-372058',
    title: 'Your Name.',
    overview: 'Two high school students, Mitsuha and Taki, suddenly swap bodies across time and space, setting off an unforgettable romance and mystery.',
    tagline: 'I feel like I am always searching for someone.',
    release_date: '2016-08-26',
    runtime: 106,
    rating: 8.6,
    poster_url: 'https://image.tmdb.org/t/p/w500/q719jXXEzvjAHm2qjNp7W9w8fG.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/dIWwZWijPjRsRfvR7981G827g.jpg',
    director: 'Makoto Shinkai',
    cast_list: 'Ryunosuke Kamiki, Mone Kamishiraishi, Ryo Narita, Aoi Yuki',
    keywords: 'body swap, comet, time travel, romance, shinto',
    original_language: 'ja',
    origin_country: ['JP'],
    industry: 'anime',
    trailer_key: 'TYku4P7MHdo',
    trailer_url: 'https://www.youtube.com/watch?v=TYku4P7MHdo',
    genres: [{ id: 'genre-animation', name: 'Animation' }, { id: 'genre-romance', name: 'Romance' }, { id: 'genre-fantasy', name: 'Fantasy' }, { id: 'genre-drama', name: 'Drama' }],
  },

  // ── Korean Cinema ─────────────────────────────────────────────────────────
  {
    id: '401',
    external_id: 'tmdb-496243',
    title: 'Parasite',
    overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
    tagline: 'Act like you own the place.',
    release_date: '2019-05-30',
    runtime: 132,
    rating: 8.5,
    poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg',
    director: 'Bong Joon-ho',
    cast_list: 'Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong, Choi Woo-shik, Park So-dam',
    keywords: 'class conflict, dark comedy, architecture, deception, thriller',
    original_language: 'ko',
    origin_country: ['KR'],
    industry: 'korean',
    trailer_key: '5xH0R_228XE',
    trailer_url: 'https://www.youtube.com/watch?v=5xH0R_228XE',
    genres: [{ id: 'genre-comedy', name: 'Comedy' }, { id: 'genre-thriller', name: 'Thriller' }, { id: 'genre-drama', name: 'Drama' }],
  },
  {
    id: '402',
    external_id: 'tmdb-396535',
    title: 'Train to Busan',
    overview: 'While a zombie virus breaks out in South Korea, passengers struggle to survive on the train from Seoul to Busan.',
    tagline: 'Life-or-death survival on the high-speed train.',
    release_date: '2016-07-20',
    runtime: 118,
    rating: 8.0,
    poster_url: 'https://image.tmdb.org/t/p/w500/vVpEOvdxVBP29VYYR1m7wbte8.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/71F1nQ9uR6024nB720g0.jpg',
    director: 'Yeon Sang-ho',
    cast_list: 'Gong Yoo, Jung Yu-mi, Ma Dong-seok, Kim Su-an',
    keywords: 'zombie outbreak, train, father daughter, survival horror',
    original_language: 'ko',
    origin_country: ['KR'],
    industry: 'korean',
    trailer_key: 'pyWuHv2-Abk',
    trailer_url: 'https://www.youtube.com/watch?v=pyWuHv2-Abk',
    genres: [{ id: 'genre-action', name: 'Action' }, { id: 'genre-horror', name: 'Horror' }, { id: 'genre-thriller', name: 'Thriller' }],
  },
];

let _seedingPromise = null;

export async function seedMoviesToFirestore(db) {
  if (_seedingPromise) return _seedingPromise;

  _seedingPromise = (async () => {
    try {
      const moviesSnap = await getDocs(collection(db, 'movies'));
      if (!moviesSnap.empty) {
        return; // Already seeded
      }

      console.info('Seeding initial movie catalog and genres into Firestore...');
      const batch = writeBatch(db);

      // Seed genres
      for (const genre of INITIAL_GENRES) {
        const genreRef = doc(db, 'genres', genre.id);
        batch.set(genreRef, genre);
      }

      // Seed movies
      for (const movie of INITIAL_MOVIES) {
        const movieRef = doc(db, 'movies', movie.id);
        batch.set(movieRef, movie);
      }

      await batch.commit();
      console.info('Firestore movie catalog successfully seeded!');
    } catch (error) {
      console.warn('Could not seed movies to Firestore (may need permissions or network):', error);
    }
  })();

  return _seedingPromise;
}
