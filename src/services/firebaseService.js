import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Save recording to Firebase
export const saveTranscriptionToFirebase = async ({
  audioChunks,
  transcriptEntries,
  summary,
  topics,
  segmentedAnalysis = [], // Add segmentedAnalysis parameter with default
  intents = [], // Add intents parameter
  entities = [], // Add entities parameter
  currentUser,
}) => {
  // Create blob from audio chunks
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

  // Generate unique filename
  const fileName = `recording_${Date.now()}.webm`;
  const storage = getStorage();
  const audioRef = storageRef(
    storage,
    `recordings/${currentUser.uid}/${fileName}`
  );

  // Upload to Firebase Storage
  const uploadResult = await uploadBytes(audioRef, audioBlob);
  const downloadURL = await getDownloadURL(uploadResult.ref);

  // Save reference in Firestore
  const recordingData = {
    fileName: fileName,
    fileURL: downloadURL,
    transcript: transcriptEntries,
    summary: summary,
    topics: topics,
    segmentedAnalysis, // Include segmented analysis data
    intents, // Include intents data
    entities, // Include entities data
    createdAt: serverTimestamp(),
  };

  // Use nested collection path: users/{uid}/meetings/{meetingId}
  const userMeetingsRef = collection(db, "users", currentUser.uid, "meetings");

  // Add to user's meetings subcollection
  const docRef = await addDoc(userMeetingsRef, recordingData);
  console.log("Meeting saved with ID:", docRef.id);

  return docRef.id;
};

// Save a single segment to Firebase
export const saveSegmentToFirebase = async (
  audioChunks,
  segmentNumber,
  currentUser
) => {
  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  // Create blob from audio chunks
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

  // Generate unique filename
  const fileName = `segment_${Date.now()}_${segmentNumber}.webm`;
  const storage = getStorage();
  const audioRef = storageRef(
    storage,
    `segments/${currentUser.uid}/${fileName}`
  );

  // Upload to Firebase Storage
  const uploadResult = await uploadBytes(audioRef, audioBlob);
  const downloadURL = await getDownloadURL(uploadResult.ref);

  return downloadURL;
};
