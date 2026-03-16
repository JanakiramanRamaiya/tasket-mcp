import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  scopes: string[];
}

export function createVerifier(jwksUri: string, issuer: string) {
  const client = jwksClient({
    jwksUri,
    cache: true,
    rateLimit: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600_000,
  });

  return function verifyToken(token: string): Promise<AuthPayload> {
    return new Promise((resolve, reject) => {
      const header = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64url').toString(),
      );
      client.getSigningKey(header.kid, (err, key) => {
        if (err) return reject(err);
        const pubKey = key!.getPublicKey();
        jwt.verify(
          token,
          pubKey,
          { algorithms: ['RS256'], issuer },
          (err2, decoded: any) => {
            if (err2) return reject(err2);
            resolve({
              userId: decoded.sub,
              email: decoded.email ?? '',
              scopes: decoded.scopes ?? [],
            });
          },
        );
      });
    });
  };
}
