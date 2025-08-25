import { ScrapedContent } from './apifyService';

interface LongFormAnalysisResult {
  summary: string;
  keyPoints: string[];
  chapters?: Array<{
    title: string;
    startTime: number;
    endTime?: number;
    summary?: string;
  }>;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  engagementFactors: string[];
  recommendations: string[];
  // Chunk-based analysis
  chunkAnalysis?: Array<{
    chunkIndex: number;
    text: string;
    keyPoints: string[];
    topics: string[];
  }>;
}

interface ChunkAnalysisPrompt {
  chunkIndex: number;
  totalChunks: number;
  chunkText: string;
  videoTitle: string;
  videoType: 'long-form' | 'regular' | 'short';
}

class YouTubeLongFormAnalyzer {
  /**
   * Analyze long-form YouTube content with special handling for chunked transcripts
   */
  async analyzeLongFormContent(
    content: ScrapedContent,
    analysisPrompt?: string
  ): Promise<LongFormAnalysisResult> {
    console.log('[YouTubeLongFormAnalyzer] Starting analysis for:', {
      title: content.title,
      duration: content.duration,
      videoType: content.videoType,
      hasChapters: !!(content.chapters && content.chapters.length > 0),
      transcriptLength: content.transcript?.length || 0
    });

    // Check if content has chunked transcript
    const isChunked = content.rawData?.isChunked && content.rawData?.transcriptChunks;
    
    if (isChunked) {
      return this.analyzeChunkedContent(content, analysisPrompt);
    } else {
      return this.analyzeRegularContent(content, analysisPrompt);
    }
  }

  /**
   * Analyze content with chunked transcript
   */
  private async analyzeChunkedContent(
    content: ScrapedContent,
    analysisPrompt?: string
  ): Promise<LongFormAnalysisResult> {
    const chunks = content.rawData.transcriptChunks as string[];
    console.log(`[YouTubeLongFormAnalyzer] Analyzing ${chunks.length} chunks`);

    // Analyze each chunk
    const chunkAnalyses = await Promise.all(
      chunks.map((chunk, index) => 
        this.analyzeChunk({
          chunkIndex: index,
          totalChunks: chunks.length,
          chunkText: chunk,
          videoTitle: content.title || 'Untitled',
          videoType: content.videoType || 'long-form'
        })
      )
    );

    // Combine chunk analyses into overall analysis
    return this.combineChunkAnalyses(content, chunkAnalyses);
  }

  /**
   * Analyze a single chunk of transcript
   */
  private async analyzeChunk(prompt: ChunkAnalysisPrompt): Promise<any> {
    // This is where you would call your AI analysis service
    // For now, returning a structured placeholder
    return {
      chunkIndex: prompt.chunkIndex,
      keyPoints: [
        `Key point from chunk ${prompt.chunkIndex + 1}`,
        `Another insight from this section`
      ],
      topics: ['topic1', 'topic2'],
      summary: `Summary of chunk ${prompt.chunkIndex + 1} of ${prompt.totalChunks}`
    };
  }

  /**
   * Combine multiple chunk analyses into a comprehensive result
   */
  private combineChunkAnalyses(
    content: ScrapedContent,
    chunkAnalyses: any[]
  ): LongFormAnalysisResult {
    // Aggregate key points from all chunks
    const allKeyPoints = chunkAnalyses.flatMap(analysis => analysis.keyPoints);
    
    // Aggregate topics and deduplicate
    const allTopics = [...new Set(chunkAnalyses.flatMap(analysis => analysis.topics))];
    
    // Create chapter summaries if chapters exist
    const chaptersWithSummaries = content.chapters?.map(chapter => ({
      ...chapter,
      summary: `Chapter covering ${chapter.title}`
    }));

    return {
      summary: `Long-form video "${content.title}" analyzed across ${chunkAnalyses.length} sections. The content covers ${allTopics.join(', ')}.`,
      keyPoints: this.selectTopKeyPoints(allKeyPoints, 10),
      chapters: chaptersWithSummaries,
      topics: allTopics,
      sentiment: 'neutral', // Would be determined by actual analysis
      engagementFactors: [
        'Comprehensive coverage of topic',
        'Well-structured with clear chapters',
        `${content.duration ? Math.floor(content.duration / 60) : 'Unknown'} minutes of detailed content`
      ],
      recommendations: [
        'Consider creating shorter highlight videos for key sections',
        'Add timestamps in description for better navigation',
        'Create summary posts for social media promotion'
      ],
      chunkAnalysis: chunkAnalyses.map((analysis, index) => ({
        chunkIndex: index,
        text: content.rawData.transcriptChunks[index],
        keyPoints: analysis.keyPoints,
        topics: analysis.topics
      }))
    };
  }

  /**
   * Analyze regular (non-chunked) content
   */
  private async analyzeRegularContent(
    content: ScrapedContent,
    analysisPrompt?: string
  ): Promise<LongFormAnalysisResult> {
    // For regular content, analyze as a whole
    const analysis = {
      summary: `Analysis of "${content.title}"`,
      keyPoints: ['Key insight 1', 'Key insight 2'],
      chapters: content.chapters,
      topics: ['main topic'],
      sentiment: 'neutral' as const,
      engagementFactors: ['Factor 1'],
      recommendations: ['Recommendation 1']
    };

    return analysis;
  }

  /**
   * Select the most important key points from all chunks
   */
  private selectTopKeyPoints(allKeyPoints: string[], limit: number): string[] {
    // In a real implementation, this would use importance scoring
    // For now, just return the first N unique points
    const uniquePoints = [...new Set(allKeyPoints)];
    return uniquePoints.slice(0, limit);
  }

  /**
   * Generate content strategy recommendations for long-form content
   */
  generateContentStrategy(analysis: LongFormAnalysisResult): string[] {
    const strategies: string[] = [];

    // Based on video length and chapters
    if (analysis.chapters && analysis.chapters.length > 5) {
      strategies.push('Create a video series breaking down each major chapter');
      strategies.push('Extract individual chapters as standalone short videos');
    }

    // Based on topics covered
    if (analysis.topics.length > 3) {
      strategies.push('Create topic-specific playlists to organize related content');
      strategies.push('Develop supplementary content for each major topic');
    }

    // For very long content
    if (analysis.chunkAnalysis && analysis.chunkAnalysis.length > 10) {
      strategies.push('Create a "highlights" or "best moments" compilation');
      strategies.push('Develop a companion blog post with key takeaways');
      strategies.push('Create an infographic summarizing the main points');
    }

    // Engagement strategies
    strategies.push('Use key points as social media posts to drive traffic');
    strategies.push('Create Q&A content addressing topics from the video');
    
    return strategies;
  }
}

export default YouTubeLongFormAnalyzer;
export type { LongFormAnalysisResult, ChunkAnalysisPrompt };