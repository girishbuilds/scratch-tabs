import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = "prose prose-invert max-w-none p-4 text-sm [&>h1]:mb-2 [&>h2]:mb-2 [&>h3]:mb-2 [&>h4]:mb-2 [&>h5]:mb-2 [&>h6]:mb-2 [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-3 [&>h4]:mt-2 [&>h5]:mt-2 [&>h6]:mt-2 [&>h1]:text-gray-200 [&>h2]:text-gray-200 [&>h3]:text-gray-200 [&>h4]:text-gray-200 [&>h5]:text-gray-200 [&>h6]:text-gray-200",
}) => {
  if (!content) {
    return (
      <div className="text-gray-500 italic p-4">No content to preview</div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            return !inline ? (
              <pre className="bg-gray-800 rounded-md p-4 overflow-x-auto custom-scrollbar">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code
                className="bg-gray-800 px-1 py-0.5 rounded text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Enhanced table styling from Word Count tablet
          table: ({ children }) => (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs border-collapse border border-gray-600 mb-4">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-700/50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="border border-gray-600 px-2 py-1 text-left text-gray-300 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-600 px-2 py-1 text-gray-300">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-800/30 transition-colors">
              {children}
            </tr>
          ),
          // Custom styling for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300">
              {children}
            </blockquote>
          ),
          // Custom styling for links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          // Custom styling for checkboxes
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2"
                />
              );
            }
            return null;
          },
          // Enhanced status icon rendering from Word Count tablet
          p: ({ children }) => {
            if (typeof children === 'string') {
              // Colour the status icons using React nodes (never HTML strings),
              // since the text is untrusted markdown content.
              const iconClass: Record<string, string> = {
                '✅': 'text-green-400',
                '⚠️': 'text-yellow-400',
                '❌': 'text-red-400',
              };
              const parts = children.split(/(✅|⚠️|❌)/g);
              if (parts.length > 1) {
                return (
                  <p>
                    {parts.map((part, index) =>
                      iconClass[part] ? (
                        <span key={index} className={iconClass[part]}>
                          {part}
                        </span>
                      ) : (
                        part
                      ),
                    )}
                  </p>
                );
              }
            }
            return <p>{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
