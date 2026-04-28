import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService.verifyNode', () => {
  const makeService = () => {
    const userRepository = {
      findOne: jest.fn(),
    } as any;
    const tradeLogRepository = {};
    const tradeGateway = {};
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };

    const service = new AuthService(
      userRepository,
      tradeLogRepository as any,
      tradeGateway as any,
      jwtService as any,
    );
    return { service, userRepository };
  };

  it('verifies MASTER by license key when active', async () => {
    const { service, userRepository } = makeService();
    userRepository.findOne.mockResolvedValue({
      id: 'm1',
      role: 'MASTER',
      fullName: 'Master One',
      isActive: true,
    });

    const result = await service.verifyNode('MASTER', 'TSP-AAAA-BBBB');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { licenseKey: 'TSP-AAAA-BBBB', role: 'MASTER' },
    });
    expect(result.role).toBe('MASTER');
    expect(result.fullName).toBe('Master One');
    expect(result.trace_id).toBeDefined();
  });

  it('verifies SLAVE by email when active', async () => {
    const { service, userRepository } = makeService();
    userRepository.findOne.mockResolvedValue({
      id: 's1',
      role: 'SLAVE',
      fullName: 'Slave One',
      isActive: true,
    });

    const result = await service.verifyNode('SLAVE', 'slave@example.com');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'slave@example.com', role: 'SLAVE' },
    });
    expect(result.role).toBe('SLAVE');
    expect(result.trace_id).toBeDefined();
  });

  it('rejects inactive node', async () => {
    const { service, userRepository } = makeService();
    userRepository.findOne.mockResolvedValue({
      id: 's2',
      role: 'SLAVE',
      fullName: 'Disabled Slave',
      isActive: false,
    });

    await expect(
      service.verifyNode('SLAVE', 'disabled@example.com'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects unknown identifier', async () => {
    const { service, userRepository } = makeService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.verifyNode('MASTER', 'BAD-KEY')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
