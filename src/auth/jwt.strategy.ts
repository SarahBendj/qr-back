import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

function jwtFromRequest(req: Request): string | null {
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (bearer) return bearer;

  const cookie = req.cookies?.nest_token;
  return typeof cookie === 'string' ? cookie : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret =
      process.env.NEST_JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('NEST_JWT_SECRET or NEXTAUTH_SECRET must be set');
    }

    super({
      jwtFromRequest: jwtFromRequest,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
