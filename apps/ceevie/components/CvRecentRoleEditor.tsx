'use client';

import {
  parseRecentRoleFields,
  serializeRecentRoleFields,
  type CvRecentRoleFields,
} from '@/lib/cvRecentRoleFields';

type CvRecentRoleEditorProps = {
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
  compact?: boolean;
};

export function CvRecentRoleEditor({
  value,
  onChange,
  ariaLabel = 'Recent role',
  compact = false,
}: CvRecentRoleEditorProps) {
  const fields = parseRecentRoleFields(value);

  function commit(next: CvRecentRoleFields) {
    onChange(serializeRecentRoleFields(next));
  }

  return (
    <div className={`cv-recent-role-editor${compact ? ' cv-recent-role-editor-compact' : ''}`} aria-label={ariaLabel}>
      <div className="cv-experience-fields">
        <label className="cv-experience-field">
          <span>Job title</span>
          <input
            type="text"
            value={fields.title}
            onChange={(event) => commit({ ...fields, title: event.target.value })}
            placeholder="e.g. Software Engineer"
          />
        </label>
        <label className="cv-experience-field">
          <span>Company</span>
          <input
            type="text"
            value={fields.company}
            onChange={(event) => commit({ ...fields, company: event.target.value })}
            placeholder="e.g. Monzo"
          />
        </label>
        <label className="cv-experience-field">
          <span>Dates</span>
          <input
            type="text"
            value={fields.dates}
            onChange={(event) => commit({ ...fields, dates: event.target.value })}
            placeholder="e.g. 2021 – Present"
          />
        </label>
      </div>
      <label className="cv-experience-field cv-experience-field-full">
        <span>What you do</span>
        <textarea
          value={fields.duties}
          rows={Math.max(2, fields.duties.split('\n').length + 1)}
          onChange={(event) => commit({ ...fields, duties: event.target.value })}
          placeholder="Main responsibilities and focus areas…"
        />
      </label>
    </div>
  );
}
