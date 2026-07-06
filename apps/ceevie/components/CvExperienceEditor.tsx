'use client';

import {
  createExperienceEntry,
  parseExperienceEntries,
  serializeExperienceEntries,
  type CvExperienceEntry,
} from '@/lib/cvExperienceEntries';

type CvExperienceEditorProps = {
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
};

export function CvExperienceEditor({ value, onChange, ariaLabel = 'Experience' }: CvExperienceEditorProps) {
  const entries = parseExperienceEntries(value);

  function commit(nextEntries: CvExperienceEntry[]) {
    onChange(serializeExperienceEntries(nextEntries));
  }

  function updateEntry(id: string, patch: Partial<CvExperienceEntry>) {
    commit(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function duplicateEntry(id: string) {
    const index = entries.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    const copy = { ...entries[index], id: createExperienceEntry(entries.length).id };
    const next = [...entries];
    next.splice(index + 1, 0, copy);
    commit(next);
  }

  function addEntry() {
    commit([...entries, createExperienceEntry(entries.length)]);
  }

  function removeEntry(id: string) {
    const next = entries.filter((entry) => entry.id !== id);
    commit(next.length ? next : [createExperienceEntry(0)]);
  }

  return (
    <div className="cv-experience-editor" aria-label={ariaLabel}>
      {entries.map((entry, index) => (
        <div key={entry.id} className="cv-experience-entry">
          <div className="cv-experience-entry-header">
            <span className="cv-experience-entry-index">Role {index + 1}</span>
            <div className="cv-experience-entry-actions">
              <button type="button" className="cv-experience-duplicate" onClick={() => duplicateEntry(entry.id)}>
                Duplicate
              </button>
              {entries.length > 1 ? (
                <button type="button" className="cv-experience-remove" onClick={() => removeEntry(entry.id)}>
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="cv-experience-fields">
            <label className="cv-experience-field">
              <span>Job title</span>
              <input
                type="text"
                value={entry.title}
                onChange={(event) => updateEntry(entry.id, { title: event.target.value })}
                placeholder="e.g. Senior Product Manager"
              />
            </label>
            <label className="cv-experience-field">
              <span>Company</span>
              <input
                type="text"
                value={entry.company}
                onChange={(event) => updateEntry(entry.id, { company: event.target.value })}
                placeholder="e.g. Monzo"
              />
            </label>
            <label className="cv-experience-field">
              <span>Dates</span>
              <input
                type="text"
                value={entry.dates}
                onChange={(event) => updateEntry(entry.id, { dates: event.target.value })}
                placeholder="e.g. Jan 2022 – Present"
              />
            </label>
          </div>

          <label className="cv-experience-field cv-experience-field-full">
            <span>Details</span>
            <textarea
              value={entry.details}
              rows={Math.max(3, entry.details.split('\n').length + 1)}
              onChange={(event) => updateEntry(entry.id, { details: event.target.value })}
              placeholder="Responsibilities, achievements, and impact…"
            />
          </label>
        </div>
      ))}

      <button type="button" className="cv-experience-add" onClick={addEntry}>
        + Add another role
      </button>
    </div>
  );
}
