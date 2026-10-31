import type { ReactNode } from 'react';

type CoverMedia = {
  content: ReactNode;
  href?: string;
  ariaLabel?: string;
};

type Author = {
  firstName?: string;
  lastName?: string;
  alias?: string;
  href?: string;
};

type CoverPageProps = {
  title?: string;
  coverMedia?: CoverMedia;
  date?: string;
  authors?: Author[];
  affiliations?: string[];
};

export function CoverPage({
  title = 'My report',
  coverMedia,
  date = new Date().toLocaleDateString(navigator.languages, { dateStyle: 'long' }),
  authors = [],
  affiliations = [],
}: CoverPageProps) {
  return (
    <section className="cover-page" aria-labelledby="cover-title">
      <h1 id="cover-title">{title}</h1>

      {coverMedia && (
        <div className="cover-media">
          {coverMedia.href ? (
            <a
              href={coverMedia.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={coverMedia.ariaLabel}
            >
              {coverMedia.content}
            </a>
          ) : (
            coverMedia.content
          )}
        </div>
      )}

      <div className="cover-authors">
        <time className="info-line" dateTime={date}>
          {date}
        </time>

        {authors.map((author, index) => {
          const fullName = [author.firstName, author.lastName].filter(Boolean).join(' ');

          const displayName = author.alias ? `${fullName} (${author.alias})` : fullName;

          if (!displayName) return null;

          return (
            <div className="info-line authors" key={author.href ?? index}>
              {author.href ? (
                <a href={author.href} target="_blank" rel="noopener noreferrer">
                  {displayName}
                </a>
              ) : (
                displayName
              )}
            </div>
          );
        })}

        {affiliations.map((affiliation, index) => (
          <div className="info-line" key={`${affiliation}-${index}`}>
            {affiliation}
          </div>
        ))}
      </div>
    </section>
  );
}
