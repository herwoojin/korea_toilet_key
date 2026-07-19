// 서버 전용 모듈 — 클라이언트 번들에 포함 금지 (Route Handler에서만 import)
import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

/**
 * 인증 방법 우선순위:
 * 1. FIREBASE_ADMIN_KEY (서비스 계정 JSON) — 기존 방식
 * 2. Application Default Credentials (gcloud auth application-default login)
 */
export const isAdminConfigured = Boolean(
  process.env.FIREBASE_ADMIN_KEY || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

let app: App | null = null;
const useADC = !process.env.FIREBASE_ADMIN_KEY && Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

function getAdminApp(): App {
  if (!isAdminConfigured) {
    throw new Error("Firebase Admin이 설정되지 않았습니다.");
  }
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else if (process.env.FIREBASE_ADMIN_KEY) {
      const raw = JSON.parse(process.env.FIREBASE_ADMIN_KEY as string);
      if (typeof raw.private_key === "string") {
        raw.private_key = raw.private_key.replace(/\\n/g, "\n");
      }
      app = initializeApp({ credential: cert(raw) });
    } else {
      app = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * ADC 환경에서 createCustomToken 대안 — IAM signBlob API 사용
 * 서비스 계정 키 없이도 Custom Token 발급 가능
 */
export async function createCustomTokenSafe(
  uid: string,
  claims: Record<string, unknown> = {}
): Promise<string> {
  // 서비스 계정 키가 있으면 기본 SDK 사용
  if (!useADC) {
    return getAdminAuth().createCustomToken(uid, claims);
  }

  // ADC 환경: IAM signBlob API로 직접 JWT 서명
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  const serviceAccountEmail = `firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com`;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    sub: serviceAccountEmail,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
    claims,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsignedToken = `${header}.${body}`;

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();

  const response = await client.request({
    url: `https://iam.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:signBlob`,
    method: "POST",
    data: {
      payload: Buffer.from(unsignedToken).toString("base64"),
    },
  });

  const signedBlob = (response.data as { signedBlob: string }).signedBlob;
  // base64 → base64url
  const sig = signedBlob.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

  return `${unsignedToken}.${sig}`;
}
