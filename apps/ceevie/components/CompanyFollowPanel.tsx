'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CvAnswers } from '@/lib/cvBuilder';
import type { CompanyAlignment, CompanyProfile } from '@/lib/companies';
import { getIndustryLabel } from '@/lib/companies';
import { CompanyOverviewCard } from '@/components/CompanyOverviewCard';
import { useCompanyFollows } from '@/hooks/useCompanyFollows';

type CompanyFollowPanelProps = {
  accessToken?: string;
  answers: CvAnswers;
  onTailorCompanies: (selected: CompanyProfile[], workedAt?: CompanyProfile[]) => void;
  /** inline = always expanded (toolkit). drawer = collapsed trigger + overlay (studio). */
  presentation?: 'inline' | 'drawer';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

type AlignmentResponse = {
  companies: CompanyProfile[];
  alignments: CompanyAlignment[];
};

type ListTab = 'all' | 'following' | 'worked';

export function CompanyFollowPanel({
  accessToken,
  answers,
  onTailorCompanies,
  presentation = 'inline',
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: CompanyFollowPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [listTab, setListTab] = useState<ListTab>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [alignments, setAlignments] = useState<CompanyAlignment[]>([]);
  const [loadingAlignments, setLoadingAlignments] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addIndustry, setAddIndustry] = useState('');
  const [addJobInput, setAddJobInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null as string | null);

  const isDrawer = presentation === 'drawer';
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const {
    companies,
    industries,
    followedIds,
    workedAtIds,
    workedAtCompanies,
    loaded,
    total,
    toggleFollow,
    toggleWorkedAt,
    isFollowing,
    isWorkedAt,
    enrichCompany,
  } = useCompanyFollows(accessToken, { q: debouncedSearch, industry: industryFilter });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (followedIds.length > 0) {
      setSelectedIds((prev) => (prev.length ? prev : followedIds));
    }
  }, [followedIds]);

  const scoreIds = useMemo(() => {
    const merged = new Set([...selectedIds, ...workedAtIds]);
    return Array.from(merged);
  }, [selectedIds, workedAtIds]);

  useEffect(() => {
    if (!accessToken || scoreIds.length === 0) {
      setAlignments([]);
      return;
    }

    let cancelled = false;
    setLoadingAlignments(true);

    void fetch('/api/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ answers, companyIds: scoreIds }),
    })
      .then(async (response) => (response.ok ? ((await response.json()) as AlignmentResponse) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAlignments(data.alignments);
      })
      .finally(() => {
        if (!cancelled) setLoadingAlignments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, answers, scoreIds]);

  const visibleCompanies = useMemo(() => {
    if (listTab === 'following') {
      return companies.filter((company) => followedIds.includes(company.id));
    }
    if (listTab === 'worked') {
      const ids = new Set(workedAtIds);
      const fromSearch = companies.filter((company) => ids.has(company.id));
      const missing = workedAtCompanies.filter((company) => !fromSearch.some((item) => item.id === company.id));
      return [...fromSearch, ...missing];
    }
    return companies;
  }, [companies, followedIds, listTab, workedAtCompanies, workedAtIds]);

  const activeCompany = useMemo(
    () => visibleCompanies.find((company) => company.id === activeId) ?? workedAtCompanies.find((c) => c.id === activeId) ?? null,
    [activeId, visibleCompanies, workedAtCompanies]
  );
  const activeAlignment = useMemo(
    () => alignments.find((item) => item.companyId === activeId) ?? null,
    [activeId, alignments]
  );

  const avgFit = useMemo(() => {
    if (alignments.length === 0) return null;
    return Math.round(alignments.reduce((sum, item) => sum + item.score, 0) / alignments.length);
  }, [alignments]);

  function toggleSelected(companyId: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId];
      setActiveId(companyId);
      return next;
    });
  }

  function handleTailorSelected() {
    const selected = selectedIds
      .map((id) => companies.find((company) => company.id === id) ?? workedAtCompanies.find((c) => c.id === id))
      .filter(Boolean) as CompanyProfile[];
    if (selected.length === 0 && workedAtCompanies.length === 0) return;
    onTailorCompanies(selected, workedAtCompanies);
    if (isDrawer) setOpen(false);
  }

  async function handleAddCompany(event: FormEvent) {
    event.preventDefault();
    setAddError(null);
    const name = addName.trim();
    if (!name) return;

    setAdding(true);
    const company = await enrichCompany({
      name,
      industryId: addIndustry || undefined,
      jobInput: addJobInput.trim() || undefined,
    });
    setAdding(false);

    if (!company) {
      setAddError('Could not build that profile. Try pasting a job link or picking an industry.');
      return;
    }

    setSelectedIds((prev) => (prev.includes(company.id) ? prev : [...prev, company.id]));
    setActiveId(company.id);
    void toggleFollow(company.id);
    setAddName('');
    setAddJobInput('');
    setShowAddForm(false);
  }

  if (!loaded) return null;

  const panelContent = (
    <>
      {!isDrawer ? (
        <div className="company-follow-head">
          <div>
            <h3>Companies</h3>
            <p>
              Follow targets, mark where you&apos;ve worked, and tailor your CV with full company context.
              {total > companies.length ? ` Showing ${companies.length} of ${total}.` : null}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={selectedIds.length === 0 && workedAtCompanies.length === 0}
            onClick={handleTailorSelected}
          >
            Tailor to selection ({selectedIds.length}
            {workedAtCompanies.length > 0 ? ` + ${workedAtCompanies.length} past` : ''})
          </button>
        </div>
      ) : null}

      <div className="company-follow-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search companies or stacks…"
          aria-label="Search companies"
          className="company-follow-search"
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddForm((value) => !value)}>
          {showAddForm ? 'Cancel' : 'Add company'}
        </button>
      </div>

      <div className="company-follow-tabs" role="tablist" aria-label="Company lists">
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'all'}
          className={`company-follow-tab${listTab === 'all' ? ' company-follow-tab-active' : ''}`}
          onClick={() => setListTab('all')}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'following'}
          className={`company-follow-tab${listTab === 'following' ? ' company-follow-tab-active' : ''}`}
          onClick={() => setListTab('following')}
        >
          Following{followedIds.length > 0 ? ` (${followedIds.length})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'worked'}
          className={`company-follow-tab${listTab === 'worked' ? ' company-follow-tab-active' : ''}`}
          onClick={() => setListTab('worked')}
        >
          Worked here{workedAtIds.length > 0 ? ` (${workedAtIds.length})` : ''}
        </button>
      </div>

      {industries.length > 0 ? (
        <div className="company-follow-industries" role="tablist" aria-label="Filter by industry">
          <button
            type="button"
            className={`company-follow-industry-chip${industryFilter === '' ? ' company-follow-industry-chip-active' : ''}`}
            onClick={() => setIndustryFilter('')}
          >
            All industries
          </button>
          {industries.map((industry) => (
            <button
              key={industry.id}
              type="button"
              className={`company-follow-industry-chip${industryFilter === industry.id ? ' company-follow-industry-chip-active' : ''}`}
              onClick={() => setIndustryFilter(industry.id)}
            >
              {industry.name}
            </button>
          ))}
        </div>
      ) : null}

      {showAddForm ? (
        <form className="company-follow-add" onSubmit={handleAddCompany}>
          <p className="company-follow-add-copy">Add any employer — paste a job link for best results.</p>
          <input
            value={addName}
            onChange={(event) => setAddName(event.target.value)}
            placeholder="Company name, e.g. Barclays"
            required
            aria-label="Company name"
          />
          <select value={addIndustry} onChange={(event) => setAddIndustry(event.target.value)} aria-label="Industry">
            <option value="">Auto-detect industry</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
          <textarea
            value={addJobInput}
            onChange={(event) => setAddJobInput(event.target.value)}
            rows={2}
            placeholder="Optional: job posting URL or notes"
          />
          {addError ? <p className="company-follow-add-error">{addError}</p> : null}
          <button type="submit" className="btn btn-secondary btn-sm" disabled={adding || !addName.trim()}>
            {adding ? 'Building profile…' : 'Build & follow'}
          </button>
        </form>
      ) : null}

      <div className="company-follow-grid company-follow-grid-overview">
        {visibleCompanies.map((company) => {
          const selected = selectedIds.includes(company.id);
          const following = isFollowing(company.id);
          const workedAt = isWorkedAt(company.id);
          const alignment = alignments.find((item) => item.companyId === company.id);
          const expanded = activeId === company.id;

          return (
            <CompanyOverviewCard
              key={company.id}
              company={company}
              industryName={getIndustryLabel(company.industryId, industries)}
              alignment={alignment}
              following={following}
              workedAt={workedAt}
              selected={selected}
              expanded={expanded}
              onSelect={() => toggleSelected(company.id)}
              onToggleFollow={() => void toggleFollow(company.id)}
              onToggleWorkedAt={() => void toggleWorkedAt(company.id)}
            />
          );
        })}
      </div>

      {visibleCompanies.length === 0 ? (
        <p className="company-alignment-empty">
          {listTab === 'worked'
            ? 'No past employers yet — open a company and tap “I\'ve worked here”.'
            : listTab === 'following'
              ? 'You are not following any companies yet.'
              : 'No companies match — try another industry or add one by name.'}
        </p>
      ) : null}

      {loadingAlignments ? <p className="company-alignment-loading">Updating alignment scores…</p> : null}

      {activeCompany && activeAlignment && activeAlignment.focusPrompts.length > 0 ? (
        <div className="company-alignment-panel company-alignment-panel-compact" aria-live="polite">
          <div className="company-alignment-head">
            <h4>{activeCompany.name} — interview prompts</h4>
            <span>{activeAlignment.score}% fit</span>
          </div>
          <ul className="company-alignment-prompt-list">
            {activeAlignment.focusPrompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );

  if (isDrawer) {
    return (
      <>
        {showTrigger ? (
          <button
            type="button"
            className="company-follow-trigger"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="company-follow-drawer"
          >
            <span className="company-follow-trigger-label">Companies</span>
            <span className="company-follow-trigger-meta">
              {followedIds.length > 0 ? `${followedIds.length} following` : 'Browse & tailor'}
              {workedAtIds.length > 0 ? ` · ${workedAtIds.length} past` : ''}
              {avgFit !== null ? ` · ${avgFit}% avg fit` : ''}
            </span>
          </button>
        ) : null}

        {open ? (
          <div
            className="company-follow-drawer"
            id="company-follow-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Companies"
          >
            <button type="button" className="company-follow-drawer-backdrop" aria-label="Close companies" onClick={() => setOpen(false)} />
            <div className="company-follow-drawer-panel">
              <div className="company-follow-drawer-head">
                <div>
                  <h3>Companies</h3>
                  <p className="company-follow-drawer-sub">Follow targets, mark past employers, and tailor your CV.</p>
                </div>
                <div className="company-follow-drawer-head-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={selectedIds.length === 0 && workedAtCompanies.length === 0}
                    onClick={handleTailorSelected}
                  >
                    Tailor ({selectedIds.length})
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
              <div className="company-follow-drawer-body">{panelContent}</div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="company-follow-panel company-follow-panel-overview" aria-label="Companies">
      {panelContent}
    </section>
  );
}
