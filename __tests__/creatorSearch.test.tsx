import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { CreatorSearchPanel } from '../src/components/Canvas/CreatorSearchPanel.enhanced';
import { CreatorContentElement } from '../src/components/Canvas/CreatorContentElement.enhanced';
import type { CreatorContent } from '../src/types/creator-search';
import type { CreatorContentElementType } from '../lib/canvas/creatorContentHelpers';

// Mock implementations
jest.mock('../src/components/ui/Toast', () => ({
  useToast: () => ({
    addToast: jest.fn()
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../lib/rateLimit', () => ({
  useCreatorSearchRateLimit: () => ({
    canSearch: true,
    searchesRemaining: 15,
    isLimitReached: false,
    recordSearch: jest.fn(() => true),
    wasRecentlySearched: jest.fn(() => false),
    getTimeUntilResetString: jest.fn(() => '45m')
  })
}));

jest.mock('../lib/searchCache', () => ({
  useSearchCache: () => ({
    getCached: jest.fn(() => null),
    setCached: jest.fn()
  })
}));

// Mock Apify responses for testing
const mockAlexHormoziContent: CreatorContent[] = [
  {
    id: 'alex_1',
    content_url: 'https://instagram.com/p/CxYzAbc123/',
    thumbnail_url: 'https://scontent-lax3-2.cdninstagram.com/v/t51.2885-15/123456789_mock.jpg',
    likes: 45672,
    comments: 892,
    views: 125000,
    caption: 'The #1 mistake entrepreneurs make when scaling their business...',
    posted_at: '2024-01-15T10:30:00Z',
    media_type: 'image',
    hashtags: ['#entrepreneurship', '#businessgrowth', '#scaling']
  },
  {
    id: 'alex_2', 
    content_url: 'https://instagram.com/p/CxYzDef456/',
    thumbnail_url: 'https://scontent-lax3-2.cdninstagram.com/v/t51.2885-15/987654321_mock.jpg',
    likes: 32145,
    comments: 567,
    views: 89000,
    caption: 'How I built a $100M company by focusing on these 3 things only...',
    posted_at: '2024-01-14T14:20:00Z',
    media_type: 'video',
    duration: 60,
    hashtags: ['#business', '#entrepreneur', '#success']
  },
  {
    id: 'alex_3',
    content_url: 'https://instagram.com/p/CxYzGhi789/',
    thumbnail_url: 'https://scontent-lax3-2.cdninstagram.com/v/t51.2885-15/555666777_mock.jpg',
    likes: 28934,
    comments: 434,
    views: 67000,
    caption: 'The psychology behind why people buy - understanding customer behavior',
    posted_at: '2024-01-13T09:15:00Z',
    media_type: 'carousel',
    hashtags: ['#psychology', '#sales', '#marketing']
  }
];

const mockSuccessResponse = {
  searchId: 'test-search-123',
  status: 'completed',
  resultsCount: 3,
  sampleContent: mockAlexHormoziContent,
  message: 'Search completed successfully'
};

const mockErrorResponses = {
  invalidHandle: {
    searchId: null,
    status: 'failed',
    error: 'Invalid Instagram handle format',
    message: 'Please provide a valid Instagram username or URL'
  },
  privateAccount: {
    searchId: null,
    status: 'failed', 
    error: 'This account is private and cannot be accessed',
    message: 'The requested account is private or restricted'
  },
  rateLimitExceeded: {
    searchId: null,
    status: 'failed',
    error: 'Rate limit exceeded. Please try again later',
    message: 'Too many requests. Please wait before trying again'
  },
  networkFailure: {
    searchId: null,
    status: 'failed',
    error: 'Network error. Please check your connection',
    message: 'Unable to connect to Instagram services'
  }
};

// Mock fetch for API calls
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Creator Search Integration Tests', () => {
  const mockViewport = { x: 0, y: 0, zoom: 1 };
  const mockOnClose = jest.fn();
  const mockOnAddContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('CreatorSearchPanel', () => {
    it('renders with initial state', () => {
      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      expect(screen.getByText('Search Creators')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('@username or instagram.com/username')).toBeInTheDocument();
      expect(screen.getByText('Search Creator')).toBeInTheDocument();
    });

    it('shows tutorial on first use', () => {
      // Clear tutorial flag for this test
      localStorage.removeItem('creator_search_tutorial_shown');

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      expect(screen.getByText('Welcome to Creator Search!')).toBeInTheDocument();
      expect(screen.getByText(/Try searching for "@alexhormozi"/)).toBeInTheDocument();
    });

    it('performs successful search for Alex Hormozi', async () => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ searchId: 'test-search-123', status: 'processing' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        } as Response);

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      // Enter Alex Hormozi's handle
      fireEvent.change(searchInput, { target: { value: '@alexhormozi' } });
      
      // Wait for debounce and click search
      await waitFor(() => {
        fireEvent.click(searchButton);
      });

      // Should show searching state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // Should show results after polling completes
      await waitFor(() => {
        expect(screen.getByText('Results (3)')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify content is displayed
      expect(screen.getByText('@alexhormozi')).toBeInTheDocument();
      expect(screen.getByText('45.7K')).toBeInTheDocument(); // Formatted likes
      expect(screen.getByText('892')).toBeInTheDocument(); // Comments
    });
  });

  describe('Error Scenarios', () => {
    it('handles invalid handle format', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Invalid Instagram handle format'));

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      fireEvent.change(searchInput, { target: { value: 'invalid@handle!' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid Instagram username/)).toBeInTheDocument();
      });
    });

    it('handles private account response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => mockErrorResponses.privateAccount
      } as Response);

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      fireEvent.change(searchInput, { target: { value: '@privateaccount' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/This account is private/)).toBeInTheDocument();
      });
    });

    it('handles rate limit exceeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => mockErrorResponses.rateLimitExceeded
      } as Response);

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      fireEvent.change(searchInput, { target: { value: '@testuser' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      fireEvent.change(searchInput, { target: { value: '@testuser' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('UI Interactions', () => {
    it('opens and closes panel correctly', () => {
      const { rerender } = render(
        <CreatorSearchPanel
          isOpen={false}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      // Panel should be closed (not visible)
      expect(screen.queryByText('Search Creators')).not.toBeInTheDocument();

      // Open panel
      rerender(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      expect(screen.getByText('Search Creators')).toBeInTheDocument();

      // Close via X button
      const closeButton = screen.getByLabelText('Close panel');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('disables search button with invalid input', () => {
      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchButton = screen.getByText('Search Creator');
      
      // Button should be disabled initially
      expect(searchButton).toBeDisabled();

      // Enter invalid input
      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(searchButton).toBeDisabled();
    });

    it('enables search button with valid input', async () => {
      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      fireEvent.change(searchInput, { target: { value: '@validusername' } });

      // Wait for debounce
      await waitFor(() => {
        expect(searchButton).not.toBeDisabled();
      });
    });

    it('adds content to canvas successfully', async () => {
      // Mock successful search first
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ searchId: 'test-search-123', status: 'processing' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        } as Response);

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      fireEvent.change(searchInput, { target: { value: '@alexhormozi' } });

      const searchButton = screen.getByText('Search Creator');
      fireEvent.click(searchButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Results (3)')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click add to canvas button (appears on hover)
      const addButtons = screen.getAllByTitle('Add to canvas');
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(mockOnAddContent).toHaveBeenCalled();
      });
    });

    it('shows loading states correctly', async () => {
      // Mock delayed response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ searchId: 'test-search-123', status: 'processing' })
      } as Response);

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      const searchButton = screen.getByText('Search Creator');

      fireEvent.change(searchInput, { target: { value: '@testuser' } });
      fireEvent.click(searchButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
        expect(screen.getByText('Scraping content...')).toBeInTheDocument();
      });

      // Should show skeleton cards
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(6);
    });
  });

  describe('CreatorContentElement', () => {
    const mockElement: CreatorContentElementType = {
      id: '1',
      type: 'creator-content',
      x: 100,
      y: 100,
      width: 320,
      height: 400,
      zIndex: 1,
      title: 'Test Content',
      url: 'https://instagram.com/p/test123',
      thumbnail: 'https://example.com/thumbnail.jpg',
      platform: 'instagram',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        likes: 1250,
        comments: 45,
        views: 3500,
        postedDate: '2024-01-15T10:30:00Z',
        isAnalyzing: false,
        isAnalyzed: false
      }
    };

    it('renders content element correctly', () => {
      render(
        <CreatorContentElement
          element={mockElement}
          selected={false}
          connecting={null}
          connections={[]}
          onSelect={jest.fn()}
          onUpdate={jest.fn()}
          onDelete={jest.fn()}
          onConnectionStart={jest.fn()}
        />
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('1.3K')).toBeInTheDocument(); // Formatted likes
      expect(screen.getByText('45')).toBeInTheDocument(); // Comments
    });

    it('handles image loading errors with fallback', async () => {
      render(
        <CreatorContentElement
          element={mockElement}
          selected={false}
          connecting={null}
          connections={[]}
          onSelect={jest.fn()}
          onUpdate={jest.fn()}
          onDelete={jest.fn()}
          onConnectionStart={jest.fn()}
        />
      );

      const image = screen.getByAltText('Content thumbnail');
      
      // Simulate image load error
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('shows analysis status correctly', () => {
      const analyzingElement = {
        ...mockElement,
        metadata: {
          ...mockElement.metadata,
          isAnalyzing: true
        }
      };

      render(
        <CreatorContentElement
          element={analyzingElement}
          selected={true}
          connecting={null}
          connections={[]}
          onSelect={jest.fn()}
          onUpdate={jest.fn()}
          onDelete={jest.fn()}
          onConnectionStart={jest.fn()}
        />
      );

      expect(screen.getByText('Analyzing')).toBeInTheDocument();
      expect(screen.getByText('Analyzing...')).toBeInTheDocument(); // In overlay
    });

    it('handles retry analysis on error', async () => {
      const mockOnAnalyze = jest.fn();
      const errorElement = {
        ...mockElement,
        metadata: {
          ...mockElement.metadata,
          analysisError: 'Analysis failed',
          analysisRetryCount: 1
        }
      };

      render(
        <CreatorContentElement
          element={errorElement}
          selected={true}
          connecting={null}
          connections={[]}
          onSelect={jest.fn()}
          onUpdate={jest.fn()}
          onDelete={jest.fn()}
          onConnectionStart={jest.fn()}
          onAnalyze={mockOnAnalyze}
        />
      );

      const retryButton = screen.getByText('Click to retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockOnAnalyze).toHaveBeenCalledWith(errorElement);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('closes panel with Escape key', () => {
      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('triggers search with Enter key when input is valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ searchId: 'test-search-123', status: 'processing' })
      } as Response);

      render(
        <CreatorSearchPanel
          isOpen={true}
          onClose={mockOnClose}
          onAddContentToCanvas={mockOnAddContent}
          viewport={mockViewport}
        />
      );

      const searchInput = screen.getByPlaceholderText('@username or instagram.com/username');
      fireEvent.change(searchInput, { target: { value: '@testuser' } });

      // Wait for debounce then press Enter
      await waitFor(() => {
        fireEvent.keyDown(document, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});