import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '@/pages/api/replacements/index';
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
// SUPABASE MOCK (simple chain)
// ------------------------------
const mockInsertSelect = vi.fn(async () => ({
  data: [
    {
      id: 'r-1',
      user_id: 'user-1',
      book_hash: 'b1',
      original: 'old',
      replacement: 'new',
      scope: 'single',
      updated_at: new Date().toISOString(),
    },
  ],
  error: null,
}));

const mockInsert = vi.fn(() => ({
  select: mockInsertSelect,
}));

const mockSelect = vi.fn(async () => ({
  data: [
    {
      id: 'r-1',
      user_id: 'user-1',
      book_hash: 'b1',
      original: 'old',
      replacement: 'new',
      updated_at: new Date().toISOString(),
    },
  ],
  error: null,
}));

const mockQueryChain = {
  insert: mockInsert,
  select: vi.fn(() => mockQueryChain),
  eq: vi.fn(() => mockQueryChain),
  or: vi.fn(() => mockQueryChain),
  order: vi.fn(() => mockSelect),
};

vi.mock('@/utils/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryChain),
  })),
}));


// ------------------------------
// CORS MOCK
// ------------------------------
vi.mock('@/utils/cors', () => ({
  runMiddleware: vi.fn(async () => {}),
  corsAllMethods: {},
}));

// ------------------------------
// TESTS
// ------------------------------
describe('/api/replacements (GET)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns replacements for the authenticated user', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/replacements?book_hash=b1',
      headers: { authorization: 'Bearer token' },
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 for invalid "since" parameter', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/replacements?since=not-a-number',
      headers: { authorization: 'Bearer token' },
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('/api/replacements (POST)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a replacement', async () => {
    const req = mockReq({
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        book_hash: 'b1',
        original: 'old',
        replacement: 'new',
        scope: 'single',
      },
      url: '/api/replacements',
    });

    const res = mockRes();

    await handler(req as any, res as any);

    // Expect successful creation
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 if required fields are missing', async () => {
    const req = mockReq({
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { original: 'old' },
      url: '/api/replacements',
    });

    const res = mockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
