'use client';

import { useMemo, useState } from 'react';
import { CvFormatThumbnail } from '@/components/CvFormatThumbnail';
import {
  CV_TEMPLATE_CATEGORIES,
  CV_TEMPLATE_LIBRARY,
  searchCvTemplates,
  type CvTemplateDefinition,
  type CvTemplateFilter,
  type CvTemplateId,
} from '@/lib/cvTemplateLibrary';

const FEATURED_IDS: CvTemplateId[] = ['classic', 'executive', 'modern', 'engineer'];

type CvFormatPickerProps = {
  value: CvTemplateId;
  onSelect: (id: CvTemplateId) => void;
};

export function CvFormatPicker({ value, onSelect }: CvFormatPickerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CvTemplateFilter>('all');

  const filtered = useMemo(() => {
    const results = searchCvTemplates(query, category);
    if (category === 'all' && !query.trim()) {
      return results.filter((template) => !FEATURED_IDS.includes(template.id));
    }
    return results;
  }, [query, category]);

  const featured = useMemo(
    () => CV_TEMPLATE_LIBRARY.filter((template) => FEATURED_IDS.includes(template.id)),
    []
  );

  const showFeatured = category === 'all' && !query.trim();

  function renderCard(template: CvTemplateDefinition) {
    const active = value === template.id;

    return (
      <button
        key={template.id}
        type="button"
        role="radio"
        aria-checked={active}
        title={template.description}
        className={`cv-format-card${active ? ' cv-format-card-active' : ''}`}
        onClick={() => onSelect(template.id)}
      >
        <CvFormatThumbnail template={template} />
        <span className="cv-format-card-copy">
          <span className="cv-format-card-title">{template.label}</span>
          <span className="cv-format-card-desc">{template.description}</span>
          <span className="cv-format-card-tags">
            {template.bestFor.slice(0, 2).map((tag) => (
              <span key={tag} className="cv-format-card-tag">
                {tag}
              </span>
            ))}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="cv-format-picker" role="radiogroup" aria-label="CV formats">
      <label className="cv-format-search">
        <span className="sr-only">Search formats</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search formats…"
          className="cv-format-search-input"
        />
      </label>

      <div className="cv-format-filters" role="tablist" aria-label="Format categories">
        <button
          type="button"
          role="tab"
          aria-selected={category === 'all'}
          className={`cv-format-filter${category === 'all' ? ' cv-format-filter-active' : ''}`}
          onClick={() => setCategory('all')}
        >
          All
        </button>
        {CV_TEMPLATE_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            className={`cv-format-filter${category === item.id ? ' cv-format-filter-active' : ''}`}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showFeatured ? (
        <div className="cv-format-featured">
          <p className="cv-format-section-label">Featured</p>
          <div className="cv-format-grid">{featured.map(renderCard)}</div>
        </div>
      ) : null}

      <div className="cv-format-results">
        {!showFeatured ? (
          <p className="cv-format-section-label">
            {filtered.length} format{filtered.length === 1 ? '' : 's'}
          </p>
        ) : (
          <p className="cv-format-section-label">All formats</p>
        )}
        {filtered.length > 0 ? (
          <div className="cv-format-grid">{filtered.map(renderCard)}</div>
        ) : (
          <p className="cv-format-empty">No formats match your search.</p>
        )}
      </div>
    </div>
  );
}
