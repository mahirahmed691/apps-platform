export type IndustryTemplate = {
  id: string;
  name: string;
  summary: string;
  tooling: string[];
  domains: string[];
  methodologies: string[];
  rolePatterns: string[];
  hiringSignals: string;
  accentColor: string;
};

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'fintech',
    name: 'Fintech & banking',
    summary: 'Regulated financial products, payments, and platform engineering at pace.',
    tooling: ['AWS', 'Kubernetes', 'PostgreSQL', 'Java', 'Python', 'TypeScript', 'React', 'Kafka', 'Terraform'],
    domains: ['fintech', 'banking', 'payments', 'compliance', 'platform'],
    methodologies: ['Agile', 'product-led', 'incident response', 'continuous delivery'],
    rolePatterns: ['software engineer', 'platform engineer', 'product manager', 'data engineer'],
    hiringSignals: 'Values ownership, regulatory awareness, and evidence of shipping in high-trust systems.',
    accentColor: '#2563eb',
  },
  {
    id: 'healthcare',
    name: 'Healthcare & life sciences',
    summary: 'Clinical, digital health, and research systems with safety and privacy at the core.',
    tooling: ['Python', 'AWS', 'PostgreSQL', 'HL7', 'FHIR', 'React', 'TypeScript', 'Docker'],
    domains: ['healthcare', 'clinical', 'digital health', 'research', 'compliance'],
    methodologies: ['Agile', 'GDPR', 'clinical governance', 'user-centred design'],
    rolePatterns: ['software engineer', 'data analyst', 'product manager', 'clinical informaticist'],
    hiringSignals: 'Prefers patient impact, data privacy literacy, and cross-functional clinical collaboration.',
    accentColor: '#059669',
  },
  {
    id: 'consulting',
    name: 'Consulting & professional services',
    summary: 'Client delivery across transformation, technology, and advisory engagements.',
    tooling: ['Excel', 'PowerPoint', 'SQL', 'Python', 'Azure', 'AWS', 'Salesforce', 'Jira'],
    domains: ['consulting', 'transformation', 'strategy', 'implementation', 'stakeholder management'],
    methodologies: ['structured problem solving', 'workshops', 'Agile delivery', 'client management'],
    rolePatterns: ['consultant', 'business analyst', 'project manager', 'technology consultant'],
    hiringSignals: 'Looks for structured thinking, client communication, and measurable engagement outcomes.',
    accentColor: '#7c3aed',
  },
  {
    id: 'retail-ecommerce',
    name: 'Retail & e-commerce',
    summary: 'Omnichannel commerce, supply chain, and customer experience at scale.',
    tooling: ['Java', 'Python', 'AWS', 'PostgreSQL', 'React', 'TypeScript', 'Kubernetes', 'SQL'],
    domains: ['retail', 'e-commerce', 'supply chain', 'merchandising', 'customer experience'],
    methodologies: ['Agile', 'seasonal planning', 'A/B testing', 'continuous delivery'],
    rolePatterns: ['software engineer', 'product manager', 'data analyst', 'operations manager'],
    hiringSignals: 'Wants commercial impact, operational awareness, and customer-centric delivery stories.',
    accentColor: '#ea580c',
  },
  {
    id: 'media-entertainment',
    name: 'Media & entertainment',
    summary: 'Content platforms, streaming, and audience products with experimentation culture.',
    tooling: ['Python', 'Java', 'GCP', 'AWS', 'React', 'TypeScript', 'PostgreSQL', 'Kafka'],
    domains: ['media', 'streaming', 'content', 'advertising', 'audience growth'],
    methodologies: ['Agile', 'squads', 'experimentation', 'A/B testing'],
    rolePatterns: ['software engineer', 'product manager', 'data engineer', 'content strategist'],
    hiringSignals: 'Prefers creative collaboration, experimentation, and audience or revenue impact.',
    accentColor: '#db2777',
  },
  {
    id: 'public-sector',
    name: 'Public sector & govtech',
    summary: 'Digital public services with accessibility, reliability, and inclusive design.',
    tooling: ['Ruby', 'Python', 'AWS', 'PostgreSQL', 'Docker', 'React', 'TypeScript'],
    domains: ['public sector', 'accessibility', 'service design', 'citizen services'],
    methodologies: ['Agile', 'user research', 'service standards', 'continuous delivery'],
    rolePatterns: ['software engineer', 'delivery manager', 'content designer', 'service designer'],
    hiringSignals: 'Values public impact, inclusive design, and evidence of service delivery.',
    accentColor: '#1d70b8',
  },
  {
    id: 'energy',
    name: 'Energy & utilities',
    summary: 'Grid, renewables, and consumer energy products with operational reliability.',
    tooling: ['Python', 'SCADA', 'AWS', 'Azure', 'SQL', 'Java', 'IoT', 'GIS'],
    domains: ['energy', 'utilities', 'renewables', 'operations', 'sustainability'],
    methodologies: ['safety-first', 'operational excellence', 'Agile', 'asset management'],
    rolePatterns: ['engineer', 'analyst', 'project manager', 'operations specialist'],
    hiringSignals: 'Expects safety awareness, operational rigour, and long-horizon project delivery.',
    accentColor: '#ca8a04',
  },
  {
    id: 'legal',
    name: 'Legal & compliance',
    summary: 'Law firms and in-house teams blending legal expertise with technology.',
    tooling: ['Microsoft 365', 'SQL', 'document automation', 'React', 'Python', 'SharePoint'],
    domains: ['legal', 'compliance', 'risk', 'contracts', 'regulatory'],
    methodologies: ['matter management', 'quality review', 'client service', 'Agile'],
    rolePatterns: ['paralegal', 'legal technologist', 'compliance analyst', 'knowledge manager'],
    hiringSignals: 'Values precision, confidentiality, and clear written communication.',
    accentColor: '#475569',
  },
  {
    id: 'education',
    name: 'Education & edtech',
    summary: 'Learning platforms, assessment, and institutional digital transformation.',
    tooling: ['Python', 'JavaScript', 'React', 'PostgreSQL', 'AWS', 'LMS', 'Moodle'],
    domains: ['education', 'edtech', 'learning', 'assessment', 'student experience'],
    methodologies: ['pedagogy-led', 'user research', 'Agile', 'accessibility'],
    rolePatterns: ['software engineer', 'instructional designer', 'product manager', 'education consultant'],
    hiringSignals: 'Prefers learner impact, inclusive design, and curriculum or platform delivery evidence.',
    accentColor: '#0891b2',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & industrial',
    summary: 'Production systems, supply chain, and industrial engineering at scale.',
    tooling: ['SAP', 'Python', 'SQL', 'CAD', 'PLC', 'Azure', 'IoT', 'Six Sigma'],
    domains: ['manufacturing', 'supply chain', 'quality', 'operations', 'engineering'],
    methodologies: ['Lean', 'Six Sigma', 'continuous improvement', 'safety-first'],
    rolePatterns: ['engineer', 'operations manager', 'quality analyst', 'supply chain planner'],
    hiringSignals: 'Wants process improvement, quality metrics, and cross-functional production experience.',
    accentColor: '#64748b',
  },
  {
    id: 'telecom',
    name: 'Telecom & connectivity',
    summary: 'Network infrastructure, consumer services, and large-scale platform operations.',
    tooling: ['Java', 'Python', 'Kubernetes', 'AWS', 'network automation', 'SQL', 'Linux'],
    domains: ['telecom', 'network', 'infrastructure', 'B2C services', 'platform'],
    methodologies: ['ITIL', 'on-call', 'Agile', 'incident management'],
    rolePatterns: ['network engineer', 'software engineer', 'sre', 'product manager'],
    hiringSignals: 'Looks for reliability, scale, and operational ownership in complex systems.',
    accentColor: '#4f46e5',
  },
  {
    id: 'marketplace-logistics',
    name: 'Marketplace & logistics',
    summary: 'Two-sided marketplaces, fulfilment, and real-time operational systems.',
    tooling: ['Go', 'Ruby', 'Python', 'AWS', 'Kubernetes', 'PostgreSQL', 'React', 'TypeScript'],
    domains: ['marketplace', 'logistics', 'operations', 'mobile', 'consumer'],
    methodologies: ['Agile', 'product-led', 'on-call', 'continuous delivery'],
    rolePatterns: ['software engineer', 'operations manager', 'data analyst', 'product manager'],
    hiringSignals: 'Wants practical delivery in high-traffic, operationally complex products.',
    accentColor: '#00ccbc',
  },
];

export function getIndustryTemplate(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((template) => template.id === id);
}

export function industryRowToTemplate(row: Record<string, unknown>): IndustryTemplate {
  return {
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name : '',
    summary: typeof row.summary === 'string' ? row.summary : '',
    tooling: Array.isArray(row.tooling) ? row.tooling.filter((item): item is string => typeof item === 'string') : [],
    domains: Array.isArray(row.domains) ? row.domains.filter((item): item is string => typeof item === 'string') : [],
    methodologies: Array.isArray(row.methodologies)
      ? row.methodologies.filter((item): item is string => typeof item === 'string')
      : [],
    rolePatterns: Array.isArray(row.role_patterns)
      ? row.role_patterns.filter((item): item is string => typeof item === 'string')
      : [],
    hiringSignals: typeof row.hiring_signals === 'string' ? row.hiring_signals : '',
    accentColor: typeof row.accent_color === 'string' ? row.accent_color : '#64748b',
  };
}
