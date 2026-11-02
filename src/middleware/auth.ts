import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, errors } from 'jose';

export interface AuthUser {
  id?: string;
  email: string;
  name?: string;
  image?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const getJwks = () => {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(process.env.JWKS_URL as string));
  }
  return jwks;
};

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const issuer = process.env.AUTH_ISSUER as string;

    // BetterAuth signs with the issuer/audience set to its base URL
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: issuer,
    });

    if (typeof payload.email !== 'string' || !payload.email) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
    }

    req.user = {
      id: typeof payload.id === 'string' ? payload.id : payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      image: typeof payload.image === 'string' ? payload.image : null,
    };

    next();
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }
    console.error('JWT verification failed:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
