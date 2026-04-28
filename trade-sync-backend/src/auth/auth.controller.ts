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
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { UpdateMasterProfileDto } from './dto/auth.dto';
import { TradeGateway } from '../trade/trade.gateway';
import { Public } from './decorators/public.decorator';
import type { JwtUser } from './types/jwt-user';

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
      const saved = await this.authService.register(body as never);
      return await this.authService.buildAuthResponse(saved);
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
