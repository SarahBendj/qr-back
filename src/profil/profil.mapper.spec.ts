import { mapProfilResponse, mapSmartQrToCandidate } from './profil.mapper';

describe('profil.mapper', () => {
  const planStatus = { planPaid: true, planActive: false };

  it('splits name into firstname and lastname', () => {
    const result = mapProfilResponse(
      {
        id: 'u1',
        name: 'Sarah Bendj',
        email: 'a@b.com',
        picture: null,
        role: 'user',
        plan: 'GROWTH',
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
        smartQrs: [],
      },
      planStatus,
    );

    expect(result.firstname).toBe('Sarah');
    expect(result.lastname).toBe('Bendj');
    expect(result.planPaid).toBe(true);
    expect(result.planActive).toBe(false);
    expect(result).not.toHaveProperty('eventPlan');
    expect(result).not.toHaveProperty('subscription');
    expect(result.model).toBeNull();
  });

  it('maps first smartQr to legacy candidate', () => {
    const qr = {
      id: 'qr1',
      slug: 'abc123',
      qrText: 'Mon profil',
      x: 0,
      y: 0,
      size: 100,
      pageCount: 1,
      createdAt: new Date(),
      userId: 'u1',
    };

    expect(mapSmartQrToCandidate(qr).slug).toBe('abc123');
    expect(mapSmartQrToCandidate(qr).title).toBe('Mon profil');

    const result = mapProfilResponse(
      {
        id: 'u1',
        name: 'Test',
        email: 'a@b.com',
        picture: null,
        role: 'user',
        plan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
        smartQrs: [qr],
      },
      planStatus,
    );

    expect(result.candidate?.slug).toBe('abc123');
    expect(result.candidates).toHaveLength(1);
  });

  it('hides plan tier until payment is confirmed', () => {
    const result = mapProfilResponse(
      {
        id: 'u1',
        name: 'Test',
        email: 'a@b.com',
        picture: null,
        role: 'user',
        plan: 'GROWTH',
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
        smartQrs: [],
      },
      { planPaid: false, planActive: false },
    );

    expect(result.plan).toBeNull();
    expect(result.planPaid).toBe(false);
  });
});
