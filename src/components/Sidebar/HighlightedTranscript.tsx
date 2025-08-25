import React from 'react';
import { Target, Folder, Flag } from 'lucide-react';

interface TranscriptSection {
  type: 'hook' | 'body' | 'cta' | 'other';
  text: string;
  startTime?: number;
  endTime?: number;
}

interface HighlightedTranscriptProps {
  sections: TranscriptSection[];
  fullTranscript?: string;
}

const sectionColors = {
  hook: {
    bg: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-400',
    icon: Target,
    label: 'Hook'
  },
  body: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    icon: Folder,
    label: 'Body'
  },
  cta: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-400',
    icon: Flag,
    label: 'Call to Action'
  },
  other: {
    bg: '',
    border: '',
    text: 'text-gray-400',
    icon: null,
    label: ''
  }
};

export const HighlightedTranscript: React.FC<HighlightedTranscriptProps> = ({
  sections,
  fullTranscript
}) => {
  // If we have sections, use them; otherwise parse the full transcript
  const displaySections = sections.length > 0 ? sections : parseTranscriptIntoSections(fullTranscript || '');

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        {(['hook', 'body', 'cta'] as const).map(type => {
          const config = sectionColors[type];
          const Icon = config.icon;
          return (
            <div key={type} className="flex items-center gap-1">
              {Icon && <Icon className={`w-3 h-3 ${config.text}`} />}
              <span className={config.text}>{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Transcript with highlights */}
      <div className="space-y-2">
        {displaySections.map((section, index) => {
          const config = sectionColors[section.type];
          
          if (section.type === 'other') {
            return (
              <p key={index} className="text-xs text-gray-400 leading-relaxed">
                {section.text}
              </p>
            );
          }

          return (
            <div
              key={index}
              className={`relative rounded-lg p-3 ${config.bg} border-l-4 ${config.border}`}
            >
              {/* Section label */}
              <div className="flex items-center gap-1 mb-2">
                {config.icon && <config.icon className={`w-4 h-4 ${config.text}`} />}
                <span className={`text-xs font-semibold uppercase ${config.text}`}>
                  {config.label}
                </span>
                {section.startTime !== undefined && (
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatTime(section.startTime)}
                    {section.endTime && ` - ${formatTime(section.endTime)}`}
                  </span>
                )}
              </div>
              
              {/* Section text */}
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {section.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Basic parser to split transcript into sections (fallback if no sections provided)
function parseTranscriptIntoSections(transcript: string): TranscriptSection[] {
  if (!transcript) return [];
  
  // This is a simple heuristic-based approach
  // In production, this would be done by the AI backend
  const lines = transcript.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const sections: TranscriptSection[] = [];
  const totalLines = lines.length;
  
  // First 15-20% is typically the hook
  const hookEnd = Math.floor(totalLines * 0.2);
  // Last 10-15% is typically the CTA
  const ctaStart = Math.floor(totalLines * 0.85);
  
  // Hook section
  if (hookEnd > 0) {
    sections.push({
      type: 'hook',
      text: lines.slice(0, hookEnd).join('\n')
    });
  }
  
  // Body section
  if (ctaStart > hookEnd) {
    sections.push({
      type: 'body',
      text: lines.slice(hookEnd, ctaStart).join('\n')
    });
  }
  
  // CTA section
  if (ctaStart < totalLines) {
    sections.push({
      type: 'cta',
      text: lines.slice(ctaStart).join('\n')
    });
  }
  
  return sections;
}