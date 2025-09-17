// src/lib/firebase/firestore.ts
/*
================================================================================
IMPORTANT: FIREBASE SECURITY RULES
================================================================================
The following security rules must be configured in your Firebase project's 
Firestore settings to ensure users can only access their own data.

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // analysisHistory collection
    match /analysisHistory/{docId} {
      // Allow users to read, create, and delete their own history documents.
      allow read, create, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      
      // Allow users to query/list their own documents.
      allow list: if request.auth != null && request.auth.uid == request.query.resource.data.userId;
    }
  }
}
================================================================================
*/
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { app } from './config';
import type { AnalysisResult } from '@/lib/types';

const db = getFirestore(app);

const HISTORY_COLLECTION = 'analysisHistory';

// Add a new analysis document to a user's history
export async function addAnalysisToHistory(
  userId: string,
  analysisData: Omit<AnalysisResult, 'id'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      ...analysisData,
      timestamp: Timestamp.fromDate(new Date(analysisData.timestamp)), // Convert JS Date to Firestore Timestamp
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding document to history: ', error);
    throw new Error('Could not save analysis to history.');
  }
}

// Get all analysis documents for a user
export async function getAnalysisHistory(
  userId: string
): Promise<AnalysisResult[]> {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const history: AnalysisResult[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp back to ISO string for consistency
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      } as AnalysisResult);
    });
    return history;
  } catch (error) {
    console.error('Error getting history: ', error);
    throw new Error('Could not retrieve analysis history.');
  }
}

// Clear all analysis documents for a user
export async function clearAnalysisHistory(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return; // No documents to delete
    }

    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error clearing history: ', error);
    throw new Error('Could not clear analysis history.');
  }
}
