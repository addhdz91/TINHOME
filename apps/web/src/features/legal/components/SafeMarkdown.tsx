import Markdown, { type Components } from 'react-markdown';

/**
 * FR-57 — legal texts are Markdown rendered **without HTML** (`skipHtml`): raw HTML in a
 * document is dropped, never injected. Only http(s), mailto and relative links are kept.
 */
const components: Components = {
  a: ({ href, children }) => {
    const safe = typeof href === 'string' && /^(https?:|mailto:|\/|#)/.test(href);
    if (!safe) return <span>{children}</span>;
    const external = href.startsWith('http');
    return (
      <a
        href={href}
        className="text-link underline"
        rel={external ? 'noopener noreferrer' : undefined}
        target={external ? '_blank' : undefined}
      >
        {children}
      </a>
    );
  },
  img: () => null,
};

export function SafeMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="legal-prose flex flex-col gap-4 [&_blockquote]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:border-warning [&_blockquote]:bg-surface [&_blockquote]:p-3 [&_h1]:text-h1 [&_h2]:mt-4 [&_h2]:text-h2 [&_h3]:text-h3 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
      <Markdown skipHtml components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
