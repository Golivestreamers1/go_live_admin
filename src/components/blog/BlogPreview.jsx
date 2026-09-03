import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/blog-preview.css';

/**
 * Renders a draft the way the landing page will.
 *
 * The HTML is first-party content the admin just authored, and the server
 * sanitizes it again on save, so injecting it here is safe.
 */
export default function BlogPreview({ post }) {
  const cover = post.coverPreviewUrl || post.coverImage;

  return (
    <div className="overflow-hidden rounded-xl bg-[#0e1116]">
      <div className="px-8 pt-8">
        {post.categoryLabel && (
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-[#ff6b35]">
            {post.categoryLabel}
          </div>
        )}
        <h1 className="mt-3 font-['Anton',sans-serif] text-4xl uppercase leading-[.96] tracking-[.01em] text-white">
          {post.title || 'Untitled post'}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[.1em] text-white/45">
          <span>{post.authorName || 'GoLive Team'}</span>
          <span className="opacity-40">·</span>
          <span>{post.readingMinutes || 1} min read</span>
          {post.status && (
            <>
              <span className="opacity-40">·</span>
              <span>{post.status}</span>
            </>
          )}
        </div>
        {cover && (
          <img
            src={cover}
            alt={post.coverImageAlt || ''}
            className="mt-6 aspect-[16/9] w-full rounded-xl border border-white/10 object-cover"
          />
        )}
      </div>

      <div
        className="blog-preview"
        dangerouslySetInnerHTML={{
          __html: post.content || '<p style="opacity:.5">Nothing written yet.</p>',
        }}
      />
    </div>
  );
}

BlogPreview.propTypes = {
  post: PropTypes.shape({
    title: PropTypes.string,
    content: PropTypes.string,
    categoryLabel: PropTypes.string,
    authorName: PropTypes.string,
    readingMinutes: PropTypes.number,
    status: PropTypes.string,
    coverImage: PropTypes.string,
    coverPreviewUrl: PropTypes.string,
    coverImageAlt: PropTypes.string,
  }).isRequired,
};
