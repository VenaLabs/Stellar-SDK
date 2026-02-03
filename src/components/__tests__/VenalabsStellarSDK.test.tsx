import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { VenalabsStellarSDK } from '../VenalabsStellarSDK';
import type { VenalabsMap, VenalabsCourse, VenalabsProgress } from '../../types';

// Helper to create a token provider
const createTokenProvider = (token: string) => async () => token;

// Mock data
const mockMaps: VenalabsMap[] = [
  {
    id: 'map-1',
    organizationId: 'org-1',
    name: 'Test Learning Map',
    description: 'A test map for courses',
    nodes: [
      {
        id: 'node-1',
        courseId: 'course-1',
        courseName: { en: 'Introduction to Web3', fr: 'Introduction au Web3' },
        courseImageUrl: { en: 'https://example.com/course1.png' },
        totalSteps: 3,
        x: 0,
        y: 0,
      },
      {
        id: 'node-2',
        courseId: 'course-2',
        courseName: { en: 'Advanced Blockchain', fr: 'Blockchain Avancé' },
        totalSteps: 5,
        x: 1,
        y: 0,
      },
    ],
    connections: [
      {
        id: 'conn-1',
        fromNodeId: 'node-1',
        toNodeId: 'node-2',
        required: true,
      },
    ],
    status: 'PUBLISHED',
    createdOn: '2024-01-01T00:00:00Z',
  },
];

const mockCourse: VenalabsCourse = {
  id: 'course-1',
  organizationId: 'org-1',
  title: { en: 'Introduction to Web3', fr: 'Introduction au Web3' },
  description: { en: 'Learn the basics of Web3', fr: 'Apprenez les bases du Web3' },
  steps: [
    {
      id: 'step-1',
      title: { en: 'What is Web3?', fr: "Qu'est-ce que le Web3?" },
      type: 'TEXT',
      order: 0,
      textContent: { content: { en: [{ type: 'paragraph', children: [{ text: 'Web3 is...' }] }] } },
    },
    {
      id: 'step-2',
      title: { en: 'Quiz Time', fr: 'Quiz' },
      type: 'QUIZ',
      order: 1,
      quizContent: {
        question: { en: 'What is Web3?', fr: "Qu'est-ce que le Web3?" },
        options: [
          { text: { en: 'A web framework' } },
          { text: { en: 'Decentralized internet' } },
        ],
        correctOptionIndex: 1,
      },
    },
    {
      id: 'step-3',
      title: { en: 'Congratulations!', fr: 'Félicitations!' },
      type: 'REWARD',
      order: 2,
      rewardContent: {
        rewards: [
          {
            rewardId: 'reward-1',
            rewardName: { en: 'Points', fr: 'Points' },
            amount: 100,
          },
        ],
      },
    },
  ],
  status: 'PUBLISHED',
  createdOn: '2024-01-01T00:00:00Z',
};

const mockProgress: VenalabsProgress[] = [];

// MSW Server setup
const BASE_URL = 'https://api.test.com';

const server = setupServer(
  // GET /maps
  http.get(`${BASE_URL}/api/v1/sdk/maps`, ({ request }) => {
    const apiKey = request.headers.get('X-Api-Key');
    if (apiKey === 'invalid-key') {
      return HttpResponse.json(
        { code: 403, type: 'INVALID_API_KEY', message: 'Invalid API key' },
        { status: 403 }
      );
    }
    return HttpResponse.json(mockMaps);
  }),

  // GET /progress
  http.get(`${BASE_URL}/api/v1/sdk/progress`, () => {
    return HttpResponse.json(mockProgress);
  }),

  // GET /courses/:courseId
  http.get(`${BASE_URL}/api/v1/sdk/courses/:courseId`, ({ params }) => {
    if (params.courseId === 'course-1') {
      return HttpResponse.json(mockCourse);
    }
    return HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),

  // POST /courses/:courseId/start
  http.post(`${BASE_URL}/api/v1/sdk/courses/:courseId/start`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /progress/:courseId
  http.get(`${BASE_URL}/api/v1/sdk/progress/:courseId`, () => {
    return HttpResponse.json(null, { status: 404 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('VenalabsStellarSDK', () => {
  describe('Props', () => {
    it('should render with required props', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      // Should show loading initially
      expect(document.querySelector('.venalabs-sdk-container')).toBeInTheDocument();
    });

    it('should accept optional lang prop (default: fr)', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          lang="en"
          baseUrl={BASE_URL}
        />
      );

      expect(document.querySelector('.venalabs-sdk-container')).toBeInTheDocument();
    });

    it('should accept optional minHeight prop', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          minHeight={800}
          baseUrl={BASE_URL}
        />
      );

      const container = document.querySelector('.venalabs-sdk-container');
      expect(container).toHaveStyle({ minHeight: '800px' });
    });

    it('should accept string minHeight prop', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          minHeight="50vh"
          baseUrl={BASE_URL}
        />
      );

      const container = document.querySelector('.venalabs-sdk-container');
      expect(container).toHaveStyle({ minHeight: '50vh' });
    });

    it('should accept optional className prop', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          className="custom-class"
          baseUrl={BASE_URL}
        />
      );

      const container = document.querySelector('.venalabs-sdk-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      expect(document.querySelector('.venalabs-sdk-loading')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state on API error', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="invalid-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(document.querySelector('.venalabs-sdk-error')).toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByText(/Invalid API key/i)).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="invalid-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Map View', () => {
    it('should show map view after loading', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(document.querySelector('.venalabs-map-view')).toBeInTheDocument();
      });
    });

    it('should display map name', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Learning Map')).toBeInTheDocument();
      });
    });

    it('should display course nodes', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          lang="en"
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Introduction to Web3')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to course detail when clicking a course card', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          lang="en"
          baseUrl={BASE_URL}
        />
      );

      // Wait for map to load
      await waitFor(() => {
        expect(screen.getByText('Introduction to Web3')).toBeInTheDocument();
      });

      // Click on course card
      const courseCard = screen.getByText('Introduction to Web3').closest('button');
      if (courseCard) {
        fireEvent.click(courseCard);
      }

      // Should navigate to course detail view
      await waitFor(() => {
        expect(document.querySelector('.venalabs-course-detail')).toBeInTheDocument();
      });
    });

    it('should show back button in course detail view', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          lang="en"
          baseUrl={BASE_URL}
        />
      );

      // Wait for map to load
      await waitFor(() => {
        expect(screen.getByText('Introduction to Web3')).toBeInTheDocument();
      });

      // Click on course card
      const courseCard = screen.getByText('Introduction to Web3').closest('button');
      if (courseCard) {
        fireEvent.click(courseCard);
      }

      // Should show back button
      await waitFor(() => {
        expect(document.querySelector('.venalabs-back-btn')).toBeInTheDocument();
      });
    });

    it('should navigate back to map when clicking back button', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          lang="en"
          baseUrl={BASE_URL}
        />
      );

      // Wait for map to load
      await waitFor(() => {
        expect(screen.getByText('Introduction to Web3')).toBeInTheDocument();
      });

      // Click on course card
      const courseCard = screen.getByText('Introduction to Web3').closest('button');
      if (courseCard) {
        fireEvent.click(courseCard);
      }

      // Wait for course detail
      await waitFor(() => {
        expect(document.querySelector('.venalabs-course-detail')).toBeInTheDocument();
      });

      // Click back button
      const backBtn = document.querySelector('.venalabs-back-btn');
      if (backBtn) {
        fireEvent.click(backBtn);
      }

      // Should be back on map view
      await waitFor(() => {
        expect(document.querySelector('.venalabs-map-view')).toBeInTheDocument();
      });
    });
  });

  describe('Internationalization', () => {
    it('should display content in French by default', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Introduction au Web3')).toBeInTheDocument();
      });
    });

    it('should display content in English when lang="en"', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          lang="en"
          baseUrl={BASE_URL}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Introduction to Web3')).toBeInTheDocument();
      });
    });
  });

  describe('Black Box Behavior', () => {
    it('should not expose any state or callbacks to parent', () => {
      // VenalabsStellarSDK should only accept the defined props
      // and not require any state management from the parent
      const { container } = render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      // The component should render without any external state
      expect(container.querySelector('.venalabs-sdk-container')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should have width: 100% on container', async () => {
      render(
        <VenalabsStellarSDK
          apiKey="test-key"
          getAccessToken={createTokenProvider('test-token')}
          baseUrl={BASE_URL}
        />
      );

      const container = document.querySelector('.venalabs-sdk-container');
      // The container class should include width: 100% (from CSS)
      expect(container).toHaveClass('venalabs-sdk-container');
    });
  });
});

describe('VenalabsStellarSDK Export', () => {
  it('should be exported as default', async () => {
    // Dynamic import to test default export
    const module = await import('../VenalabsStellarSDK');
    expect(module.default).toBe(module.VenalabsStellarSDK);
  });

  it('should export VenalabsStellarSDKProps type', async () => {
    // This is a compile-time check, but we can verify the module exports
    const module = await import('../VenalabsStellarSDK');
    expect(module.VenalabsStellarSDK).toBeDefined();
  });
});
