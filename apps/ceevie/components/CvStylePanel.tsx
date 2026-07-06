'use client';

import type { ReactNode } from 'react';
import { CvFormatPicker } from '@/components/CvFormatPicker';
import {
  CV_COLOR_PRESETS,
  findMatchingColorPreset,
  styleConfigFromTemplate,
  type CvDensity,
  type CvHeaderRule,
  type CvStyleConfig,
} from '@/lib/cvStyleConfig';
import type { CvContentFormat } from '@/lib/cvContentFormat';
import {
  type CvFontFamily,
  type CvLabelStyle,
  type CvLayout,
  type CvTemplate,
} from '@/lib/cvThemes';

type CvStylePanelProps = {
  value: CvStyleConfig;
  onChange: (next: CvStyleConfig) => void;
  variant?: 'inline' | 'rail';
};

type StyleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

function StyleSection({ title, defaultOpen = false, children }: StyleSectionProps) {
  return (
    <details className="cv-style-section cv-style-section-collapsible" {...(defaultOpen ? { open: true } : {})}>
      <summary className="cv-style-section-summary">
        <span className="cv-style-section-title">{title}</span>
        <svg className="cv-style-section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="cv-style-section-body">{children}</div>
    </details>
  );
}

export function CvStylePanel({ value, onChange, variant = 'rail' }: CvStylePanelProps) {
  const isRail = variant === 'rail';
  const activeColorPreset = findMatchingColorPreset(value);

  function patch(partial: Partial<CvStyleConfig>) {
    onChange({ ...value, ...partial });
  }

  function applyPreset(presetId: CvTemplate) {
    onChange(styleConfigFromTemplate(presetId));
  }

  function applyColorPreset(presetId: string) {
    const preset = CV_COLOR_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    patch({
      headerColor: preset.headerColor,
      roleColor: preset.roleColor,
      accentColor: preset.accentColor,
      sectionLabelColor: preset.sectionLabelColor,
      bodyColor: preset.bodyColor,
    });
  }

  return (
    <div className={`cv-style-panel${isRail ? ' cv-style-panel-rail' : ''}`}>
      {isRail ? <p className="preview-style-rail-label">Style</p> : null}

      <StyleSection title="Formats" defaultOpen>
        <CvFormatPicker value={value.presetId} onSelect={applyPreset} />
      </StyleSection>

      <StyleSection title="Layout" defaultOpen>
        <div className="cv-style-segmented" role="radiogroup" aria-label="CV layout">
          {(
            [
              ['standard', 'Standard'],
              ['sidebar', 'Sidebar'],
              ['centered', 'Centred'],
            ] as const
          ).map(([layout, label]) => (
            <button
              key={layout}
              type="button"
              role="radio"
              aria-checked={value.layout === layout}
              className={`cv-style-segment${value.layout === layout ? ' cv-style-segment-active' : ''}`}
              onClick={() => patch({ layout })}
            >
              {label}
            </button>
          ))}
        </div>
      </StyleSection>

      <StyleSection title="Typography">
        <label className="cv-style-field">
          <span>Heading</span>
          <select
            value={value.headingFont}
            onChange={(event) => patch({ headingFont: event.target.value as CvFontFamily })}
          >
            <option value="serif">Serif</option>
            <option value="sans">Sans-serif</option>
          </select>
        </label>
        <label className="cv-style-field">
          <span>Body</span>
          <select value={value.bodyFont} onChange={(event) => patch({ bodyFont: event.target.value as CvFontFamily })}>
            <option value="sans">Sans-serif</option>
            <option value="serif">Serif</option>
          </select>
        </label>
        <label className="cv-style-field">
          <span>Labels</span>
          <select
            value={value.labelStyle}
            onChange={(event) => patch({ labelStyle: event.target.value as CvLabelStyle })}
          >
            <option value="uppercase">Uppercase</option>
            <option value="sentence">Sentence case</option>
          </select>
        </label>
      </StyleSection>

      <StyleSection title="Colours">
        <div className="cv-style-color-grid" role="radiogroup" aria-label="Colour palette">
          {CV_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={activeColorPreset === preset.id}
              title={preset.label}
              className={`cv-style-color-btn${activeColorPreset === preset.id ? ' cv-style-color-btn-active' : ''}`}
              onClick={() => applyColorPreset(preset.id)}
            >
              <span className="cv-style-color-stack" aria-hidden="true">
                <span style={{ background: preset.headerColor }} />
                <span style={{ background: preset.accentColor }} />
              </span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
        <div className="cv-style-color-inputs">
          <label className="cv-style-color-input">
            <span>Header</span>
            <input
              type="color"
              value={value.headerColor}
              onChange={(event) => patch({ headerColor: event.target.value })}
              aria-label="Header colour"
            />
          </label>
          <label className="cv-style-color-input">
            <span>Accent</span>
            <input
              type="color"
              value={value.accentColor}
              onChange={(event) => patch({ accentColor: event.target.value })}
              aria-label="Accent colour"
            />
          </label>
        </div>
      </StyleSection>

      <StyleSection title="Content format">
        <div className="cv-style-segmented" role="radiogroup" aria-label="Content format">
          {(
            [
              ['bullets', 'Bullets'],
              ['paragraph', 'Paragraph'],
              ['mixed', 'Mixed'],
            ] as const
          ).map(([format, label]) => (
            <button
              key={format}
              type="button"
              role="radio"
              aria-checked={value.contentFormat === format}
              className={`cv-style-segment${value.contentFormat === format ? ' cv-style-segment-active' : ''}`}
              onClick={() => patch({ contentFormat: format as CvContentFormat })}
            >
              {label}
            </button>
          ))}
        </div>
      </StyleSection>

      <StyleSection title="Spacing">
        <div className="cv-style-segmented" role="radiogroup" aria-label="CV density">
          {(
            [
              ['compact', 'Compact'],
              ['regular', 'Regular'],
              ['airy', 'Airy'],
            ] as const
          ).map(([density, label]) => (
            <button
              key={density}
              type="button"
              role="radio"
              aria-checked={value.density === density}
              className={`cv-style-segment${value.density === density ? ' cv-style-segment-active' : ''}`}
              onClick={() => patch({ density: density as CvDensity })}
            >
              {label}
            </button>
          ))}
        </div>
      </StyleSection>

      <StyleSection title="Header rule">
        <div className="cv-style-segmented" role="radiogroup" aria-label="Header rule">
          {(
            [
              ['none', 'None'],
              ['hairline', 'Line'],
              ['bold', 'Bold'],
            ] as const
          ).map(([rule, label]) => (
            <button
              key={rule}
              type="button"
              role="radio"
              aria-checked={value.headerRule === rule}
              className={`cv-style-segment${value.headerRule === rule ? ' cv-style-segment-active' : ''}`}
              onClick={() => patch({ headerRule: rule as CvHeaderRule })}
            >
              {label}
            </button>
          ))}
        </div>
      </StyleSection>
    </div>
  );
}
