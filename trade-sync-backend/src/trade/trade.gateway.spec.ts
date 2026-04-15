import { TradeGateway } from './trade.gateway';

describe('TradeGateway contract flows', () => {
  const makeGateway = () => {
    const tradeService = {
      logSignal: jest.fn().mockResolvedValue(101),
    } as any;

    const userRepo = {
      findOne: jest.fn(),
    } as any;

    const tradeLogRepo = {
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    } as any;

    const gateway = new TradeGateway(tradeService, userRepo, tradeLogRepo);

    const emit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit }),
    };

    return { gateway, tradeService, userRepo, tradeLogRepo, emit };
  };

  it('register_node joins master room and stores user context', async () => {
    const { gateway, userRepo } = makeGateway();
    userRepo.findOne.mockResolvedValue({
      id: 'master-1',
      role: 'MASTER',
      fullName: 'Master One',
    });

    const client = {
      join: jest.fn(),
      data: {},
    } as any;

    await gateway.handleRegisterNode(client, {
      role: 'MASTER',
      identifier: 'TSP-1234-5678',
    });

    expect(client.join).toHaveBeenCalledWith('room_master_master-1');
    expect(client.data.user).toEqual(
      expect.objectContaining({ id: 'master-1', role: 'MASTER' }),
    );
  });

  it('register_node joins slave to subscribed master room', async () => {
    const { gateway, userRepo } = makeGateway();
    userRepo.findOne.mockResolvedValue({
      id: 'slave-1',
      role: 'SLAVE',
      fullName: 'Slave One',
      subscribedToId: 'master-9',
    });

    const client = {
      join: jest.fn(),
      data: {},
    } as any;

    await gateway.handleRegisterNode(client, {
      role: 'SLAVE',
      identifier: 'slave@example.com',
    });

    expect(client.join).toHaveBeenCalledWith('room_master_master-9');
  });

  it('test_signal propagates to trade_execution room with required keys', async () => {
    const { gateway, emit, tradeLogRepo } = makeGateway();

    const client = {
      data: {
        user: {
          id: 'master-2',
          role: 'MASTER',
          fullName: 'Master Two',
        },
      },
    } as any;

    const payload = {
      event: 'OPEN',
      master_ticket: 12345,
      symbol: 'XAUUSD',
      action: 'BUY',
      volume: 0.1,
    };

    await gateway.handleTestSignal(client, payload);

    expect(tradeLogRepo.save).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      'trade_execution',
      expect.objectContaining({
        event: 'OPEN',
        master_ticket: 12345,
        symbol: 'XAUUSD',
        action: 'BUY',
        volume: 0.1,
        signalId: 101,
      }),
    );
  });
});
