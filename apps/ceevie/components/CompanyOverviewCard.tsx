'use client';

import type { CSSProperties } from 'react';
import type { CompanyAlignment, CompanyProfile } from '@/lib/companies';
import { getIndustryLabel } from '@/lib/companies';
import { CompanyLogo } from '@/components/CompanyLogo';

type CompanyOverviewCardProps = {
  company: CompanyProfile;
  industryName?: string;
  alignment?: CompanyAlignment | null;
  following?: boolean;
  workedAt?: boolean;
  selected?: boolean;
  expanded?: boolean;
  onSelect?: () => void;
  onToggleFollow?: () => void;
  onToggleWorkedAt?: () => void;
};

function dataSourceLabel(source: CompanyProfile['dataSource']): string {
  if (source === 'curated') return 'Curated profile';
  if (source === 'enriched') return 'AI-enriched';
  return 'Industry template';
}

function TagList({ items, variant = 'default' }: { items: string[]; variant?: 'default' | 'match' | 'gap' }) {
  if (!items.length) return null;
  return (
    <div className={`company-overview-tags${variant !== 'default' ? ` company-overview-tags-${variant}` : ''}`}>
      {items.map((item) => (
        <span key={item} className="company-overview-tag">
          {item}
        </span>
      ))}
    </div>
  );
}

export function CompanyOverviewCard({
  company,
  industryName,
  alignment,
  following = false,
  workedAt = false,
  selected = false,
  expanded = false,
  onSelect,
  onToggleFollow,
  onToggleWorkedAt,
}: CompanyOverviewCardProps) {
  const label = industryName ?? getIndustryLabel(company.industryId);
  const score = alignment?.score;

  return (
    <article
      className={`company-overview-card${selected ? ' company-overview-card-selected' : ''}${expanded ? ' company-overview-card-expanded' : ''}${workedAt ? ' company-overview-card-worked' : ''}`}
      style={{ '--company-accent': company.accentColor } as CSSProperties}
    >
      <button type="button" className="company-overview-card-main" onClick={onSelect}>
        <div className="company-overview-card-header">
          <CompanyLogo company={company} size={expanded ? 'md' : 'md'} />
          <div className="company-overview-card-titleblock">
            <div className="company-overview-card-title-row">
              <h4>{company.name}</h4>
              {company.isFeatured ? <span className="company-overview-badge">Featured</span> : null}
            </div>
            <p className="company-overview-card-industry">
              {label}
              {company.region ? ` · ${company.region.toUpperCase()}` : ''}
            </p>
          </div>
          {typeof score === 'number' ? (
            <div className="company-overview-fit" aria-label={`${score}% alignment`}>
              <span className="company-overview-fit-value">{score}%</span>
              <span className="company-overview-fit-label">fit</span>
            </div>
          ) : (
            <div className="company-overview-fit company-overview-fit-pending">
              <span className="company-overview-fit-label">Select to score</span>
            </div>
          )}
        </div>

        <p className="company-overview-summary">{company.summary}</p>

        {expanded ? (
          <div className="company-overview-sections">
            <div className="company-overview-section">
              <p className="company-overview-section-label">Tooling & stack</p>
              <TagList items={company.tooling.slice(0, 10)} />
            </div>
            <div className="company-overview-section">
              <p className="company-overview-section-label">Domains</p>
              <TagList items={company.domains} />
            </div>
            <div className="company-overview-section">
              <p className="company-overview-section-label">Ways of working</p>
              <TagList items={company.methodologies} />
            </div>
            <div className="company-overview-section">
              <p className="company-overview-section-label">Typical roles</p>
              <TagList items={company.rolePatterns} />
            </div>
            {company.hiringSignals ? (
              <div className="company-overview-hiring">
                <p className="company-overview-section-label">What they look for</p>
                <p>{company.hiringSignals}</p>
              </div>
            ) : null}

            {alignment ? (
              <div className="company-overview-alignment">
                <p className="company-overview-section-label">Your overlap</p>
                <p className="company-overview-alignment-summary">{alignment.summary}</p>
                {alignment.matched.tooling.length > 0 ? (
                  <TagList items={alignment.matched.tooling} variant="match" />
                ) : null}
                {alignment.gaps.tooling.length > 0 ? (
                  <TagList items={alignment.gaps.tooling.slice(0, 4).map((item) => `Add ${item}`)} variant="gap" />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="company-overview-preview-tags">
            <TagList items={company.tooling.slice(0, 4)} />
          </div>
        )}

        <div className="company-overview-meta-row">
          <span className="company-overview-source">{dataSourceLabel(company.dataSource)}</span>
        </div>
      </button>

      <div className="company-overview-actions">
        <button
          type="button"
          className={`company-overview-action${workedAt ? ' company-overview-action-active' : ''}`}
          aria-pressed={workedAt}
          onClick={(event) => {
            event.stopPropagation();
            onToggleWorkedAt?.();
          }}
        >
          {workedAt ? 'Worked here' : "I've worked here"}
        </button>
        <button
          type="button"
          className={`company-overview-action${following ? ' company-overview-action-active' : ''}`}
          aria-pressed={following}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFollow?.();
          }}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
    </article>
  );
}
