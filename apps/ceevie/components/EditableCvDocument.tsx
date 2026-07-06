'use client';

import { useMemo } from 'react';
import {
  CV_PREVIEW_SECTION_ORDER,
  CV_SIDEBAR_COLUMN_SECTIONS,
  CV_SIDEBAR_MAIN_SECTIONS,
  type CvPreviewDocument,
  type PreviewSectionKey,
} from '@/lib/cvPreviewDocument';
import { previewSectionId } from '@/lib/previewSectionScroll';
import type { UserProfile } from '@/lib/userProfile';
import { CvContactBar } from '@/components/CvContactBar';
import { CvExperienceEditor } from '@/components/CvExperienceEditor';
import { CvRecentRoleEditor } from '@/components/CvRecentRoleEditor';
import { CvSectionContent } from '@/components/CvSectionContent';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { resolveCvThemeTokens } from '@/lib/cvStyleConfig';
import { cvThemeToStyleVars } from '@/lib/cvThemeStyles';

type EditableCvDocumentProps = {
  document: CvPreviewDocument;
  editable?: boolean;
  profile?: UserProfile;
  onProfilePatch?: (patch: Partial<UserProfile>) => void;
  onDocumentChange?: (next: CvPreviewDocument) => void;
};

export function EditableCvDocument({
  document,
  editable = false,
  profile,
  onProfilePatch,
  onDocumentChange,
}: EditableCvDocumentProps) {
  const { prefs } = useStudioPreferences();
  const cvThemeTokens = useMemo(() => resolveCvThemeTokens(prefs.cvStyle), [prefs.cvStyle]);
  const cvThemeVars = cvThemeToStyleVars(cvThemeTokens);
  const isSidebarLayout = cvThemeTokens.layout === 'sidebar';

  function updateHeader(field: 'fullName' | 'targetRole' | 'recentRole', value: string) {
    onDocumentChange?.({ ...document, [field]: value });
  }

  function updateSection(key: PreviewSectionKey, value: string) {
    onDocumentChange?.({
      ...document,
      sections: document.sections.map((section) =>
        section.key === key ? { ...section, value, generated: false } : section
      ),
    });
  }

  function renderHeader(headerClassName?: string) {
    return (
      <header
        id={previewSectionId('header')}
        className={`preview-doc-header${headerClassName ? ` ${headerClassName}` : ''}`}
      >
        {editable ? (
          <>
            <input
              className="preview-doc-name-input"
              value={document.fullName}
              onChange={(event) => updateHeader('fullName', event.target.value)}
              aria-label="Full name"
              placeholder="Your name"
            />
            <input
              className="preview-doc-title-input"
              value={document.targetRole}
              onChange={(event) => updateHeader('targetRole', event.target.value)}
              aria-label="Target role"
              placeholder="Target role"
            />
            {editable ? (
              <CvRecentRoleEditor
                value={document.recentRole}
                onChange={(next) => updateHeader('recentRole', next)}
                ariaLabel="Recent role"
                compact
              />
            ) : !isSidebarLayout && document.recentRole ? (
              <p className="preview-doc-subtitle">{document.recentRole}</p>
            ) : null}
          </>
        ) : (
          <>
            {document.fullName ? <h3>{document.fullName}</h3> : null}
            {document.targetRole ? <p className="preview-doc-role-line">{document.targetRole}</p> : null}
            {!isSidebarLayout && document.recentRole ? (
              <p className="preview-doc-subtitle">{document.recentRole}</p>
            ) : null}
          </>
        )}

        {profile ? (
          <CvContactBar
            profile={profile}
            editable={Boolean(onProfilePatch)}
            onProfileChange={onProfilePatch}
          />
        ) : null}
      </header>
    );
  }

  function renderSection(key: PreviewSectionKey) {
    const section = document.sections.find((item) => item.key === key);
    if (!section?.value.trim()) return null;

    return (
      <section key={key} id={previewSectionId(key)} className="preview-section preview-section-filled">
        <h4>{section.label}</h4>
        {editable ? (
          key === 'experience' ? (
            <CvExperienceEditor
              value={section.value}
              onChange={(next) => updateSection('experience', next)}
              ariaLabel={section.label}
            />
          ) : (
            <textarea
              className="preview-edit-field preview-doc-field"
              value={section.value}
              rows={Math.max(3, section.value.split('\n').length + 1)}
              onChange={(event) => updateSection(key, event.target.value)}
              aria-label={section.label}
            />
          )
        ) : (
          <CvSectionContent
            value={section.value}
            sectionKey={key}
            format={prefs.cvStyle.contentFormat}
            generated={section.generated}
          />
        )}
      </section>
    );
  }

  return (
    <article
      data-cv-export-root="true"
      className={`preview-doc preview-doc-live preview-doc-theme-${prefs.cvStyle.presetId} preview-doc-layout-${cvThemeTokens.layout} preview-doc-divider-${cvThemeTokens.sectionDivider} preview-doc-density-${prefs.cvStyle.density}`}
      style={cvThemeVars}
    >
      {isSidebarLayout ? (
        <div className="preview-doc-sidebar-grid">
          <aside className="preview-doc-sidebar">
            {renderHeader('preview-doc-header-sidebar')}
            <div className="preview-sections preview-sections-sidebar">
              {CV_SIDEBAR_COLUMN_SECTIONS.map(renderSection)}
            </div>
          </aside>
          <div className="preview-doc-main">
            <div className="preview-sections">{CV_SIDEBAR_MAIN_SECTIONS.map(renderSection)}</div>
          </div>
        </div>
      ) : (
        <>
          {renderHeader()}
          <div className="preview-sections">{CV_PREVIEW_SECTION_ORDER.map(renderSection)}</div>
        </>
      )}
    </article>
  );
}
