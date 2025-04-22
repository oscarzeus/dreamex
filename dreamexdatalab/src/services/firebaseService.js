import { db } from '../firebase/config';
import { collection, addDoc, getDocs, onSnapshot, query } from 'firebase/firestore';

// ...existing code...

// Add a new inspection to Firebase
export const addInspection = async (inspectionData) => {
  try {
    const docRef = await addDoc(collection(db, 'inspections'), inspectionData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding inspection: ', error);
    throw error;
  }
};

// Get all inspections once
export const getInspections = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'inspections'));
    const inspections = [];
    querySnapshot.forEach((doc) => {
      inspections.push({ id: doc.id, ...doc.data() });
    });
    return inspections;
  } catch (error) {
    console.error('Error getting inspections: ', error);
    throw error;
  }
};

// Subscribe to real-time updates on inspections
export const subscribeToInspections = (callback) => {
  const q = query(collection(db, 'inspections'));
  return onSnapshot(q, (querySnapshot) => {
    const inspections = [];
    querySnapshot.forEach((doc) => {
      inspections.push({ id: doc.id, ...doc.data() });
    });
    callback(inspections);
  });
};

// ...existing code...
