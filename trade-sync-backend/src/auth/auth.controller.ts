import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UpdateMasterProfileDto } from './dto/auth.dto';
import { TradeGateway } from '../trade/trade.gateway';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tradeGateway: TradeGateway,
  ) {}

  // --- EXISTING ROUTES ---
  @Post('register')
  async register(@Body() body: any) {
    try {
      return await this.authService.register(body);
    } catch (e) {
      throw new BadRequestException(`Registration Failed: ${e.message}`);
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    return await this.authService.login(body.email, body.password);
  }

  // --- NEW ADMIN ROUTES ---

  // GET: http://localhost:3000/auth/users
  @Get('users')
  async getAllUsers() {
    return await this.authService.getAllUsers();
  }

  // POST: http://localhost:3000/auth/users/UUID/license
  @Post('users/:id/license')
  async generateLicense(@Param('id') id: string) {
    return await this.authService.generateLicense(id);
  }

  // PATCH: http://localhost:3000/auth/users/UUID/toggle-status
  @Patch('users/:id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    return await this.authService.toggleUserStatus(id);
  }

  // POST: http://localhost:3000/auth/verify-node
  // Used by the Python Desktop Client before connecting to MT5
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

  // --- MARKETPLACE ROUTES ---

  // GET: http://localhost:3000/auth/masters
  @Get('masters')
  async getActiveMasters() {
    return await this.authService.getActiveMasters();
  }

  @Get('masters/live')
  getLiveMasters() {
    return { liveIds: this.tradeGateway.getConnectedMasterIds() };
  }

  // GET: http://localhost:3000/auth/masters/UUID/profile
  @Get('masters/:id/profile')
  async getMasterProfile(@Param('id') id: string) {
    return await this.authService.getMasterProfile(id);
  }

  @Get('masters/:masterId/subscribers')
  async getMasterSubscribers(@Param('masterId') masterId: string) {
    return await this.authService.getMasterSubscribers(masterId);
  }

  @Patch('masters/:id/profile')
  async updateMasterProfile(
    @Param('id') id: string,
    @Body() body: UpdateMasterProfileDto,
  ) {
    return await this.authService.updateMasterProfile(id, body);
  }

  @Get('masters/:id/dashboard')
  async getMasterDashboard(@Param('id') id: string) {
    return await this.authService.getMasterDashboard(id);
  }

  @Get('top-masters')
  async getTopMasters() {
    return await this.authService.getTopMasters();
  }

  // PATCH: http://localhost:3000/auth/users/UUID/subscribe
  // Body: { "masterId": "UUID" } or { "masterId": null } to unsubscribe
  @Patch('users/:id/subscribe')
  async updateSubscription(
    @Param('id') slaveId: string,
    @Body() body: { masterId: string | null },
  ) {
    return await this.authService.updateSubscription(slaveId, body.masterId);
  }
}
