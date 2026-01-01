import { Controller, Post, Body, Res, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/GoogleAuth.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

 @Post('google-login')
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
   console.log( 'loging' + new Date().toLocaleString());

    return this.authService.handleGoogleLogin(dto, res);
  
  }
@Post('logout')
logout(@Res({ passthrough: true }) res: Response , @Req() req) {
  console.log(req.cookies);
  console.log('descodnne')
  return this.authService.logoutResponse(res);
}

@Post('refresh')
async refresh(
  @Res({ passthrough: true }) res: Response,
  @Req() req: Request,            // obligatoire
  @Body('token') token?: string    // optionnel


) {
  const refreshToken = token || (req as any).cookies?.refresh_token;

  if (!refreshToken) {
    throw new UnauthorizedException('No refresh token provided');
  }

  return this.authService.refreshToken(refreshToken, res);
}



}