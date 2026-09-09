import { SignJWT, jwtVerify } from "jose";

const ACCESS_TOKEN_TTL = "7d";

export interface AccessTokenClaims {
  sub: string;
  role: string;
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  const secret = new TextEncoder().encode(requireAuthSecret());

  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const secret = new TextEncoder().encode(requireAuthSecret());
  const { payload } = await jwtVerify(token, secret);

  if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
    throw new Error("Access token is missing required claims.");
  }

  return { sub: payload.sub, role: payload.role };
}

function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to your environment.");
  }
  return secret;
}
