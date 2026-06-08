import { getFirebaseDatabaseUrl } from '@/config/firebase';

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseResourcesDb] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

export interface ResourceSuggestion {
  title: string;
  url: string;
  company?: string | null;
  skills: string[];
  submittedByUserId?: string | null;
  submittedByUsername?: string | null;
  createdAt: string;
  status: 'PENDING_REVIEW';
}

/**
 * Pushes a new resource suggestion to Firebase RTDB /suggestedResources
 */
export async function postFirebaseResourceSuggestion(suggestion: {
  title: string;
  url: string;
  company?: string | null;
  skills: string[];
  submittedByUserId?: string | null;
  submittedByUsername?: string | null;
}): Promise<boolean> {
  const database = getDb();
  if (!database) {
    console.warn('[firebaseResourcesDb] DB connection failed, suggestion not saved to Firebase.');
    return false;
  }

  try {
    const suggestionsRef = database.ref('/suggestedResources');
    const newRef = suggestionsRef.push();
    
    const data: ResourceSuggestion = {
      title: suggestion.title.trim(),
      url: suggestion.url.trim(),
      company: suggestion.company?.trim() || null,
      skills: suggestion.skills,
      submittedByUserId: suggestion.submittedByUserId || null,
      submittedByUsername: suggestion.submittedByUsername || null,
      createdAt: new Date().toISOString(),
      status: 'PENDING_REVIEW',
    };

    await newRef.set(data);
    return true;
  } catch (error) {
    console.warn('[firebaseResourcesDb] Failed to write resource suggestion:', error);
    throw error;
  }
}
