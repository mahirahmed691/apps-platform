import type { CSSProperties } from 'react';
import type { CvTemplateDefinition } from '@/lib/cvTemplateLibrary';

type CvFormatThumbnailProps = {
  template: CvTemplateDefinition;
};

export function CvFormatThumbnail({ template }: CvFormatThumbnailProps) {
  const { tokens, id } = template;
  const isAccent = id === 'accent';
  const layout = tokens.layout;

  const style = {
    '--ft-accent': tokens.accentColor,
    '--ft-header': tokens.headerColor,
    '--ft-paper': tokens.paperBg,
    '--ft-label': tokens.sectionLabelColor,
  } as CSSProperties;

  if (layout === 'sidebar') {
    return (
      <div className="cv-format-thumb cv-format-thumb-sidebar" style={style} aria-hidden="true">
        <div className="cv-format-thumb-side">
          <span className="cv-format-thumb-name" />
          <span className="cv-format-thumb-role cv-format-thumb-role-short" />
          <span className="cv-format-thumb-label" />
          <span className="cv-format-thumb-line cv-format-thumb-line-short" />
        </div>
        <div className="cv-format-thumb-main">
          <span className="cv-format-thumb-label" />
          <span className="cv-format-thumb-line" />
          <span className="cv-format-thumb-line" />
          <span className="cv-format-thumb-label" />
          <span className="cv-format-thumb-line cv-format-thumb-line-short" />
        </div>
      </div>
    );
  }

  if (isAccent) {
    return (
      <div className="cv-format-thumb cv-format-thumb-accent" style={style} aria-hidden="true">
        <div className="cv-format-thumb-band">
          <span className="cv-format-thumb-name cv-format-thumb-name-light" />
          <span className="cv-format-thumb-role cv-format-thumb-role-light" />
        </div>
        <div className="cv-format-thumb-body">
          <span className="cv-format-thumb-label" />
          <span className="cv-format-thumb-line" />
          <span className="cv-format-thumb-line" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cv-format-thumb cv-format-thumb-standard${layout === 'centered' ? ' cv-format-thumb-centered' : ''}`}
      style={style}
      aria-hidden="true"
    >
      <div className="cv-format-thumb-header">
        <span className="cv-format-thumb-name" />
        <span className="cv-format-thumb-role" />
        {tokens.headerBorder !== 'none' ? <span className="cv-format-thumb-rule" /> : null}
      </div>
      <div className="cv-format-thumb-body">
        <span className="cv-format-thumb-label" />
        <span className="cv-format-thumb-line" />
        <span className="cv-format-thumb-line" />
        <span className="cv-format-thumb-label" />
        <span className="cv-format-thumb-line cv-format-thumb-line-short" />
      </div>
    </div>
  );
}
