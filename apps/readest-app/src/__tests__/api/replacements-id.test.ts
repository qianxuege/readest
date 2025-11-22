import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '@/pages/api/replacements/[id]';
import { mockReq, mockRes } from '../helpers/mock-next';

// ------------------------------
// AUTH MOCK
// ------------------------------
vi.mock('@/utils/access', () => ({
  validateUserAndToken: vi.fn(async () => ({
    user: { id: 'user-1' },
    token: 'token-abc',
  })),
}));

// ------------------------------
// SIMPLE SUPABASE MOCK
// ------------------------------
const mockSelect = vi.fn(async () => ({
  data: [
    {
      id: 'r-1',
      user_id: 'user-1',
      book_hash: 'b1',
      original: 'old',
      replacement: 'updated-text',
      updated_at: new Date().toISOString(),
    },
  ],
  error: null,
}));

const mockUpdateChain = {
  update: vi.fn(() => mockMatchChain),
};
const mockMatchChain = {
  match: vi.fn(() => ({ select: mockSelect })),
};

const supabaseMock = {
  from: vi.fn(() => mockUpdateChain),
};

vi.mock('@/utils/supabase', () => ({
  createSupabaseClient: vi.fn(() => supabaseMock),
}));

// ------------------------------
vi.mock('@/utils/cors', () => ({
  runMiddleware: vi.fn(async () => {}),
  corsAllMethods: {},
}));

// ------------------------------
// TESTS
// ------------------------------
describe('/api/replacements/[id] (PATCH)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates a replacement', async () => {
    const req = mockReq({
      method: 'PATCH',
      url: '/api/replacements/r-1',
      headers: { authorization: 'Bearer token' },
      body: { replacement: 'updated-text' },
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 if id is missing', async () => {
    const req = mockReq({
      method: 'PATCH',
      url: '/api/replacements/',
      headers: { authorization: 'Bearer token' },
      body: { replacement: 'x' },
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('/api/replacements/[id] (DELETE)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes a replacement', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/replacements/r-1',
      headers: { authorization: 'Bearer token' },
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 if id is missing', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/replacements/',
      headers: { authorization: 'Bearer token' },
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
