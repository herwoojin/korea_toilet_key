import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** env 미설정 시 앱은 데모(목업) 모드로 동작한다 */
export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId
);

let app: FirebaseApp | null = null;

function getClientApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase가 설정되지 않았습니다. .env.local의 NEXT_PUBLIC_FIREBASE_* 값을 채워주세요."
    );
  }
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

export function getDb(): Firestore {
  return getFirestore(getClientApp());
}
