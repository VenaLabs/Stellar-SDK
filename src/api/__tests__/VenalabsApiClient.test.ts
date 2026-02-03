import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { VenalabsApiClient } from '../VenalabsApiClient';
import { VenalabsApiError, VenalabsErrorCodes } from '../errors';
import type { VenalabsMap, VenalabsCourse, VenalabsProgress } from '../../types';

// Mock data
const mockMaps: VenalabsMap[] = [
  {
    id: 'map-1',
    organizationId: 'org-1',
    name: 'Test Map',
    description: 'A test map',
    imageUrl: 'https://example.com/map.png',
    nodes: [
      {
        id: 'node-1',
        courseId: 'course-1',
        courseName: { en: 'Test Course' },
        totalSteps: 3,
        x: 0,
        y: 0,
      },
    ],
    connections: [],
    status: 'PUBLISHED',
    createdOn: '2024-01-01T00:00:00Z',
  },
];

const mockCourse: VenalabsCourse = {
  id: 'course-1',
  organizationId: 'org-1',
  title: { en: 'Test Course' },
  description: { en: 'A test course' },
  steps: [
    {
      id: 'step-1',
      title: { en: 'Step 1' },
      type: 'TEXT',
      order: 0,
      textContent: { content: { en: ['Hello world'] } },
    },
  ],
  status: 'PUBLISHED',
  createdOn: '2024-01-01T00:00:00Z',
};

const mockProgress: VenalabsProgress[] = [
  {
    id: 'progress-1',
    organizationId: 'org-1',
    externalUserId: 'user-1',
    courseId: 'course-1',
    courseName: { en: 'Test Course' },
    status: 'IN_PROGRESS',
    stepProgress: [
      {
        stepId: 'step-1',
        stepTitle: { en: 'Step 1' },
        status: 'COMPLETED',
        completedOn: '2024-01-02T00:00:00Z',
      },
    ],
    startedOn: '2024-01-01T00:00:00Z',
  },
];

// MSW Server setup
const BASE_URL = 'https://api.test.com';

const server = setupServer(
  // GET /maps
  http.get(`${BASE_URL}/api/v1/sdk/maps`, ({ request }) => {
    const apiKey = request.headers.get('X-Api-Key');
    const auth = request.headers.get('Authorization');

    if (!apiKey || apiKey === 'invalid-key') {
      return HttpResponse.json(
        { code: 403, type: 'INVALID_API_KEY', message: 'Invalid API key' },
        { status: 403 }
      );
    }

    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json(
        { code: 401, type: 'INVALID_TOKEN', message: 'Missing token' },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockMaps);
  }),

  // GET /courses/:courseId
  http.get(`${BASE_URL}/api/v1/sdk/courses/:courseId`, ({ params, request }) => {
    const apiKey = request.headers.get('X-Api-Key');
    if (!apiKey) {
      return HttpResponse.json({ message: 'Invalid API key' }, { status: 403 });
    }

    if (params.courseId === 'not-found') {
      return HttpResponse.json(
        { code: 404, type: 'NOT_FOUND', message: 'Course not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(mockCourse);
  }),

  // POST /courses/:courseId/start
  http.post(`${BASE_URL}/api/v1/sdk/courses/:courseId/start`, ({ request }) => {
    const apiKey = request.headers.get('X-Api-Key');
    if (!apiKey) {
      return HttpResponse.json({ message: 'Invalid API key' }, { status: 403 });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // POST /courses/:courseId/steps/:stepId/complete
  http.post(
    `${BASE_URL}/api/v1/sdk/courses/:courseId/steps/:stepId/complete`,
    ({ request }) => {
      const apiKey = request.headers.get('X-Api-Key');
      if (!apiKey) {
        return HttpResponse.json({ message: 'Invalid API key' }, { status: 403 });
      }

      return HttpResponse.json({
        success: true,
        progress: mockProgress[0],
      });
    }
  ),

  // GET /progress
  http.get(`${BASE_URL}/api/v1/sdk/progress`, ({ request }) => {
    const apiKey = request.headers.get('X-Api-Key');
    if (!apiKey) {
      return HttpResponse.json({ message: 'Invalid API key' }, { status: 403 });
    }

    return HttpResponse.json(mockProgress);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// Helper to create a token provider
const createTokenProvider = (token: string) => async () => token;

describe('VenalabsApiClient', () => {
  describe('constructor', () => {
    it('should throw if apiKey is missing', () => {
      expect(() => {
        new VenalabsApiClient({
          apiKey: '',
          getAccessToken: createTokenProvider('token'),
        });
      }).toThrow('apiKey is required');
    });

    it('should throw if getAccessToken is missing', () => {
      expect(() => {
        new VenalabsApiClient({
          apiKey: 'key',
          getAccessToken: undefined as any,
        });
      }).toThrow('getAccessToken is required');
    });

    it('should create client with valid config', () => {
      const client = new VenalabsApiClient({
        apiKey: 'test-key',
        getAccessToken: createTokenProvider('test-token'),
        baseUrl: BASE_URL,
      });

      expect(client).toBeInstanceOf(VenalabsApiClient);
    });
  });

  describe('getMaps', () => {
    it('should fetch maps successfully', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      const maps = await client.getMaps();

      expect(maps).toEqual(mockMaps);
      expect(maps).toHaveLength(1);
      expect(maps[0]!.name).toBe('Test Map');
    });

    it('should send correct headers', async () => {
      let capturedHeaders: Headers | null = null;

      server.use(
        http.get(`${BASE_URL}/api/v1/sdk/maps`, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json(mockMaps);
        })
      );

      const client = new VenalabsApiClient({
        apiKey: 'my-api-key',
        getAccessToken: createTokenProvider('my-user-token'),
        baseUrl: BASE_URL,
      });

      await client.getMaps();

      expect(capturedHeaders!.get('X-Api-Key')).toBe('my-api-key');
      expect(capturedHeaders!.get('Authorization')).toBe('Bearer my-user-token');
      expect(capturedHeaders!.get('Content-Type')).toBe('application/json');
    });

    it('should throw VenalabsApiError on invalid API key', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'invalid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.getMaps()).rejects.toThrow(VenalabsApiError);
      await expect(client.getMaps()).rejects.toMatchObject({
        code: VenalabsErrorCodes.INVALID_API_KEY,
        status: 403,
      });
    });

    it('should refresh token on 401 and retry', async () => {
      let requestCount = 0;
      let tokenFetchCount = 0;

      server.use(
        http.get(`${BASE_URL}/api/v1/sdk/maps`, ({ request }) => {
          requestCount++;
          const auth = request.headers.get('Authorization');

          if (auth === 'Bearer expired-token') {
            return HttpResponse.json(
              { code: 401, type: 'TOKEN_EXPIRED', message: 'Token expired' },
              { status: 401 }
            );
          }

          return HttpResponse.json(mockMaps);
        })
      );

      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: async () => {
          tokenFetchCount++;
          // First call returns expired token, second returns valid token
          return tokenFetchCount === 1 ? 'expired-token' : 'fresh-token';
        },
        baseUrl: BASE_URL,
      });

      const maps = await client.getMaps();

      expect(maps).toEqual(mockMaps);
      expect(requestCount).toBe(2); // Initial request + retry
      expect(tokenFetchCount).toBe(2); // Initial fetch + refresh
    });
  });

  describe('getCourse', () => {
    it('should fetch a course by ID', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      const course = await client.getCourse('course-1');

      expect(course).toEqual(mockCourse);
      expect(course.id).toBe('course-1');
    });

    it('should throw on missing courseId', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.getCourse('')).rejects.toThrow('courseId is required');
    });

    it('should throw NOT_FOUND for non-existent course', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.getCourse('not-found')).rejects.toMatchObject({
        code: VenalabsErrorCodes.NOT_FOUND,
        status: 404,
      });
    });
  });

  describe('startCourse', () => {
    it('should start a course successfully', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.startCourse('course-1')).resolves.toBeUndefined();
    });

    it('should throw on missing courseId', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.startCourse('')).rejects.toThrow('courseId is required');
    });
  });

  describe('completeStep', () => {
    it('should complete a step successfully', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      const result = await client.completeStep('course-1', 'step-1');

      expect(result.success).toBe(true);
      expect(result.progress).toBeDefined();
    });

    it('should send request body for quiz answers', async () => {
      let capturedBody: unknown = null;

      server.use(
        http.post(
          `${BASE_URL}/api/v1/sdk/courses/:courseId/steps/:stepId/complete`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ success: true });
          }
        )
      );

      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await client.completeStep('course-1', 'step-1', { selectedOptionIndex: 2 });

      expect(capturedBody).toEqual({ selectedOptionIndex: 2 });
    });

    it('should throw on missing courseId', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.completeStep('', 'step-1')).rejects.toThrow(
        'courseId is required'
      );
    });

    it('should throw on missing stepId', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      await expect(client.completeStep('course-1', '')).rejects.toThrow(
        'stepId is required'
      );
    });
  });

  describe('getProgress', () => {
    it('should fetch user progress', async () => {
      const client = new VenalabsApiClient({
        apiKey: 'valid-key',
        getAccessToken: createTokenProvider('valid-token'),
        baseUrl: BASE_URL,
      });

      const progress = await client.getProgress();

      expect(progress).toEqual(mockProgress);
      expect(progress).toHaveLength(1);
      expect(progress[0]!.status).toBe('IN_PROGRESS');
    });
  });
});

describe('VenalabsApiError', () => {
  describe('fromResponse', () => {
    it('should create error from 401 response', () => {
      const error = VenalabsApiError.fromResponse(401, {
        type: 'INVALID_TOKEN',
        message: 'Invalid token',
      });

      expect(error.code).toBe(VenalabsErrorCodes.INVALID_TOKEN);
      expect(error.status).toBe(401);
      expect(error.message).toBe('Invalid token');
    });

    it('should create error from 401 with TOKEN_EXPIRED', () => {
      const error = VenalabsApiError.fromResponse(401, {
        type: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });

      expect(error.code).toBe(VenalabsErrorCodes.TOKEN_EXPIRED);
    });

    it('should create error from 403 response', () => {
      const error = VenalabsApiError.fromResponse(403);

      expect(error.code).toBe(VenalabsErrorCodes.INVALID_API_KEY);
      expect(error.status).toBe(403);
    });

    it('should create error from 404 response', () => {
      const error = VenalabsApiError.fromResponse(404);

      expect(error.code).toBe(VenalabsErrorCodes.NOT_FOUND);
      expect(error.status).toBe(404);
    });

    it('should create error from 429 response', () => {
      const error = VenalabsApiError.fromResponse(429);

      expect(error.code).toBe(VenalabsErrorCodes.RATE_LIMITED);
      expect(error.status).toBe(429);
    });

    it('should create error from 500 response', () => {
      const error = VenalabsApiError.fromResponse(500);

      expect(error.code).toBe(VenalabsErrorCodes.SERVER_ERROR);
      expect(error.status).toBe(500);
    });
  });

  describe('isAuthError', () => {
    it('should return true for auth errors', () => {
      expect(
        new VenalabsApiError(VenalabsErrorCodes.INVALID_API_KEY, 403, 'test').isAuthError()
      ).toBe(true);
      expect(
        new VenalabsApiError(VenalabsErrorCodes.INVALID_TOKEN, 401, 'test').isAuthError()
      ).toBe(true);
      expect(
        new VenalabsApiError(VenalabsErrorCodes.TOKEN_EXPIRED, 401, 'test').isAuthError()
      ).toBe(true);
    });

    it('should return false for non-auth errors', () => {
      expect(
        new VenalabsApiError(VenalabsErrorCodes.NOT_FOUND, 404, 'test').isAuthError()
      ).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      expect(
        new VenalabsApiError(VenalabsErrorCodes.NETWORK_ERROR, 0, 'test').isRetryable()
      ).toBe(true);
      expect(
        new VenalabsApiError(VenalabsErrorCodes.TIMEOUT, 0, 'test').isRetryable()
      ).toBe(true);
      expect(
        new VenalabsApiError(VenalabsErrorCodes.SERVER_ERROR, 500, 'test').isRetryable()
      ).toBe(true);
      expect(
        new VenalabsApiError(VenalabsErrorCodes.RATE_LIMITED, 429, 'test').isRetryable()
      ).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(
        new VenalabsApiError(VenalabsErrorCodes.NOT_FOUND, 404, 'test').isRetryable()
      ).toBe(false);
    });
  });
});

describe('fetchWithRetry', () => {
  it('should retry on 5xx errors', async () => {
    let requestCount = 0;

    server.use(
      http.get(`${BASE_URL}/api/v1/sdk/maps`, () => {
        requestCount++;
        if (requestCount < 2) {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 });
        }
        return HttpResponse.json(mockMaps);
      })
    );

    const client = new VenalabsApiClient({
      apiKey: 'valid-key',
      getAccessToken: createTokenProvider('valid-token'),
      baseUrl: BASE_URL,
    });

    const maps = await client.getMaps();

    expect(requestCount).toBe(2);
    expect(maps).toEqual(mockMaps);
  });

  it('should not retry on 4xx errors', async () => {
    let requestCount = 0;

    server.use(
      http.get(`${BASE_URL}/api/v1/sdk/maps`, () => {
        requestCount++;
        return HttpResponse.json({ message: 'Bad request' }, { status: 400 });
      })
    );

    const client = new VenalabsApiClient({
      apiKey: 'valid-key',
      getAccessToken: createTokenProvider('valid-token'),
      baseUrl: BASE_URL,
    });

    await expect(client.getMaps()).rejects.toThrow(VenalabsApiError);
    expect(requestCount).toBe(1);
  });

  it('should handle timeout', async () => {
    server.use(
      http.get(`${BASE_URL}/api/v1/sdk/maps`, async () => {
        // Delay longer than timeout
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json(mockMaps);
      })
    );

    const client = new VenalabsApiClient({
      apiKey: 'valid-key',
      getAccessToken: createTokenProvider('valid-token'),
      baseUrl: BASE_URL,
      timeout: 100, // 100ms timeout
    });

    await expect(client.getMaps()).rejects.toMatchObject({
      code: VenalabsErrorCodes.TIMEOUT,
    });
  }, 10000);
});
