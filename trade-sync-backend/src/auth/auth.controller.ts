import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  BadRequestException,
  ForbiddenException,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
  ResendOtpDto,
  UpdateMasterProfileDto,
  VerifyResetOtpDto,
  VerifySignupOtpDto,
} from './dto/auth.dto';
import { TradeGateway } from '../trade/trade.gateway';
import { Public } from './decorators/public.decorator';
import type { JwtUser } from './types/jwt-user';
import { AVATAR_MAX_BYTES } from './avatar-storage.util';
import type { AvatarUploadFile } from './avatar-storage.util';

type RequestWithJwtUser = Request & { user: JwtUser };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tradeGateway: TradeGateway,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() body: Record<string, unknown>) {
    try {
      return await this.authService.register(body as never);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Registration Failed: ${message}`);
    }
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return await this.authService.login(body.email ?? '', body.password ?? '');
  }

  @Public()
  @Post('otp/verify-signup')
  async verifySignupOtp(@Body() body: VerifySignupOtpDto) {
    return await this.authService.verifySignupOtp(body.email, body.code);
  }

  @Public()
  @Post('otp/resend')
  async resendOtp(@Body() body: ResendOtpDto) {
    return await this.authService.resendOtp(body.email, body.purpose);
  }

  @Public()
  @Post('password-reset/request')
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return await this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Post('password-reset/verify')
  async verifyResetOtp(@Body() body: VerifyResetOtpDto) {
    return await this.authService.verifyResetOtp(body.email, body.code);
  }

  @Public()
  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() body: ConfirmPasswordResetDto) {
    return await this.authService.confirmPasswordReset(
      body.resetToken,
      body.newPassword,
    );
  }

  @Get('users')
  async getAllUsers(@Req() req: RequestWithJwtUser) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return await this.authService.getAllUsers();
  }

  @Post('users/:id/license')
  async generateLicense(
    @Param('id') id: string,
    @Req() req: RequestWithJwtUser,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return await this.authService.generateLicense(id);
  }

  @Patch('users/:id/toggle-status')
  async toggleStatus(
    @Param('id') id: string,
    @Req() req: RequestWithJwtUser,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return await this.authService.toggleUserStatus(id);
  }

  @Public()
  @Post('verify-node')
  async verifyNode(
    @Body() body: { role: string; identifier: string; trace_id?: string },
  ) {
    return await this.authService.verifyNode(
      body.role,
      body.identifier,
      body.trace_id,
    );
  }

  @Public()
  @Post('node-action/revoke-subscriber')
  async revokeSubscriber(
    @Body() body: { masterLicenseKey: string; slaveId: string },
  ) {
    return await this.authService.revokeSubscriber(
      body.masterLicenseKey,
      body.slaveId,
    );
  }

  @Public()
  @Get('masters')
  async getActiveMasters() {
    return await this.authService.getActiveMasters();
  }

  @Public()
  @Get('masters/live')
  getLiveMasters() {
    return { liveIds: this.tradeGateway.getConnectedMasterIds() };
  }

  @Public()
  @Get('masters/:id/profile')
  async getMasterProfile(@Param('id') id: string) {
    return await this.authService.getMasterProfile(id);
  }

  @Public()
  @Get('masters/:masterId/subscribers')
  async getMasterSubscribers(@Param('masterId') masterId: string) {
    return await this.authService.getMasterSubscribers(masterId);
  }

  @Patch('masters/:id/profile')
  async updateMasterProfile(
    @Param('id') id: string,
    @Body() body: UpdateMasterProfileDto,
    @Req() req: RequestWithJwtUser,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new ForbiddenException();
    }
    return await this.authService.updateMasterProfile(id, body);
  }

  @Post('masters/:id/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_BYTES } }),
  )
  async uploadMasterAvatar(
    @Param('id') id: string,
    @UploadedFile() file: AvatarUploadFile | undefined,
    @Req() req: RequestWithJwtUser,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new ForbiddenException();
    }
    return await this.authService.uploadMasterAvatar(id, file);
  }

  @Get('masters/:id/dashboard')
  async getMasterDashboard(
    @Param('id') id: string,
    @Req() req: RequestWithJwtUser,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new ForbiddenException();
    }
    return await this.authService.getMasterDashboard(id);
  }

  @Public()
  @Get('top-masters')
  async getTopMasters() {
    return await this.authService.getTopMasters();
  }

  @Patch('users/:id/subscribe')
  async updateSubscription(
    @Param('id') slaveId: string,
    @Body() body: { masterId: string | null },
    @Req() req: RequestWithJwtUser,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.id !== slaveId) {
      throw new ForbiddenException();
    }
    return await this.authService.updateSubscription(slaveId, body.masterId);
  }
}
