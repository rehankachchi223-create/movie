import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { INITIAL_GENRES, INITIAL_MOVIES } from '../src/firebase/seedMovies.js';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error('VITE_FIREBASE_PROJECT_ID is missing from frontend/.env.');
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const firestore = getFirestore();
const datasets = [
  ['genres', INITIAL_GENRES],
  ['movies', INITIAL_MOVIES],
];

for (const [collectionName, records] of datasets) {
  const batch = firestore.batch();
  for (const record of records) {
    batch.set(firestore.collection(collectionName).doc(String(record.id)), record);
  }
  await batch.commit();
  console.info(`Seeded ${records.length} documents into ${collectionName}.`);
}
