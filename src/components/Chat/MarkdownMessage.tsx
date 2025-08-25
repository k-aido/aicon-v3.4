import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  const { isDarkMode } = useDarkMode();
  return (
    <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      components={{
        // Customize heading styles
        h1: ({ children }) => <h1 className={`text-xl font-bold mb-3 mt-4 ${isDarkMode ? 'text-white' : ''}`}>{children}</h1>,
        h2: ({ children }) => <h2 className={`text-lg font-bold mb-2 mt-3 ${isDarkMode ? 'text-white' : ''}`}>{children}</h2>,
        h3: ({ children }) => <h3 className={`text-base font-semibold mb-2 mt-2 ${isDarkMode ? 'text-white' : ''}`}>{children}</h3>,
        
        // Customize paragraph
        p: ({ children }) => <p className={`mb-3 leading-relaxed ${isDarkMode ? 'text-gray-100' : ''}`}>{children}</p>,
        
        // Customize lists
        ul: ({ children }) => <ul className={`list-disc pl-5 mb-3 space-y-1 ${isDarkMode ? 'text-gray-100' : ''}`}>{children}</ul>,
        ol: ({ children }) => <ol className={`list-decimal pl-5 mb-3 space-y-1 ${isDarkMode ? 'text-gray-100' : ''}`}>{children}</ol>,
        li: ({ children }) => <li className={`leading-relaxed ${isDarkMode ? 'text-gray-100' : ''}`}>{children}</li>,
        
        // Customize code blocks
        code: (props: any) => {
          const { inline, children, className } = props;
          if (inline) {
            return (
              <code className={`px-1.5 py-0.5 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} rounded text-sm font-mono`}>
                {children}
              </code>
            );
          }
          return (
            <code className={`block p-3 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-900 text-gray-100'} rounded-lg text-sm font-mono overflow-x-auto mb-3`}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-3">{children}</pre>,
        
        // Customize blockquotes
        blockquote: ({ children }) => (
          <blockquote className={`border-l-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} pl-4 py-1 mb-3 italic ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {children}
          </blockquote>
        ),
        
        // Customize links
        a: ({ href, children }) => (
          <a href={href} className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} underline`} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        
        // Customize horizontal rules
        hr: () => <hr className={`my-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} />,
        
        // Customize emphasis
        strong: ({ children }) => <strong className={`font-semibold ${isDarkMode ? 'text-white' : ''}`}>{children}</strong>,
        em: ({ children }) => <em className={`italic ${isDarkMode ? 'text-gray-100' : ''}`}>{children}</em>,
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};