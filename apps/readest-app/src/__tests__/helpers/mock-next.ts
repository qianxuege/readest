import type { NextApiRequest, NextApiResponse } from 'next';
import { vi } from 'vitest';

export function mockReq(data: Partial<NextApiRequest>): NextApiRequest {
  return data as NextApiRequest;
}

export function mockRes(): NextApiResponse {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  } as any;
}