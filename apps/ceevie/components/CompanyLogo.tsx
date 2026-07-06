'use client';

import { useState } from 'react';
import type { CompanyProfile } from '@/lib/companies';
import { resolveCompanyLogoFallbackUrl, resolveCompanyLogoUrl } from '@/lib/companyLogos';

type CompanyLogoProps = {
  company: Pick<CompanyProfile, 'id' | 'name' | 'slug' | 'logoUrl' | 'accentColor'>;
  size?: 'sm' | 'md';
  className?: string;
};

export function CompanyLogo({ company, size = 'md', className = '' }: CompanyLogoProps) {
  const primary = resolveCompanyLogoUrl(company);
  const fallback = resolveCompanyLogoFallbackUrl(company);
  const [src, setSrc] = useState(primary ?? fallback);
  const [failed, setFailed] = useState(!primary && !fallback);

  const sizeClass = size === 'sm' ? ' company-logo-sm' : '';

  if (failed || !src) {
    return (
      <span
        className={`company-follow-logo${sizeClass}${className ? ` ${className}` : ''}`}
        style={{ backgroundColor: company.accentColor }}
        aria-hidden="true"
      >
        {company.name.slice(0, 1)}
      </span>
    );
  }

  return (
    <span className={`company-logo-wrap${sizeClass}${className ? ` ${className}` : ''}`}>
      <img
        src={src}
        alt=""
        className="company-logo-image"
        loading="lazy"
        decoding="async"
        onError={() => {
          if (fallback && src !== fallback) {
            setSrc(fallback);
            return;
          }
          setFailed(true);
        }}
      />
    </span>
  );
}
