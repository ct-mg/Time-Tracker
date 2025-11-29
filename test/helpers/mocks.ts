import { vi } from 'vitest';

/**
 * Mock ChurchTools Client
 * Provides mock implementations for ChurchTools API calls
 */
export const mockChurchtoolsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    deleteApi: vi.fn(),
};

/**
 * Reset all mocks
 */
export function resetMocks() {
    mockChurchtoolsClient.get.mockReset();
    mockChurchtoolsClient.post.mockReset();
    mockChurchtoolsClient.put.mockReset();
    mockChurchtoolsClient.delete.mockReset();
    mockChurchtoolsClient.deleteApi.mockReset();
}

/**
 * Mock successful GET response
 */
export function mockSuccessfulGet(data: any) {
    mockChurchtoolsClient.get.mockResolvedValue(data);
}

/**
 * Mock successful POST response
 */
export function mockSuccessfulPost(data: any) {
    mockChurchtoolsClient.post.mockResolvedValue(data);
}

/**
 * Mock API error
 */
export function mockApiError(message: string) {
    const error = new Error(message);
    mockChurchtoolsClient.get.mockRejectedValue(error);
    mockChurchtoolsClient.post.mockRejectedValue(error);
}
