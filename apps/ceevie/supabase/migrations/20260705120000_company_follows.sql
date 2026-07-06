create table if not exists companies (
  id text primary key,
  name text not null,
  slug text not null unique,
  logo_url text not null default '',
  accent_color text not null default '#ffffff',
  summary text not null default '',
  tooling text[] not null default '{}',
  domains text[] not null default '{}',
  methodologies text[] not null default '{}',
  role_patterns text[] not null default '{}',
  hiring_signals text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists company_follows (
  user_id uuid not null references profiles(id) on delete cascade,
  company_id text not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index if not exists company_follows_user_id_idx on company_follows(user_id);

alter table company_follows enable row level security;

create policy "Users read own company follows"
  on company_follows for select
  using (auth.uid() = user_id);

create policy "Users manage own company follows"
  on company_follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into companies (id, name, slug, accent_color, summary, tooling, domains, methodologies, role_patterns, hiring_signals)
values
  (
    'monzo',
    'Monzo',
    'monzo',
    '#ff4f58',
    'Digital bank scaling cloud-native product engineering across mobile and platform teams.',
    array['AWS', 'Kubernetes', 'Go', 'Python', 'PostgreSQL', 'Terraform', 'CI/CD', 'React', 'TypeScript'],
    array['fintech', 'banking', 'payments', 'mobile', 'platform'],
    array['Agile', 'product-led', 'incident response', 'pairing'],
    array['platform engineer', 'backend engineer', 'mobile engineer', 'sre', 'product manager'],
    'Values ownership, customer impact, and evidence of shipping in regulated environments.'
  ),
  (
    'revolut',
    'Revolut',
    'revolut',
    '#0075ff',
    'Global fintech with fast-moving product squads and strong emphasis on delivery velocity.',
    array['Java', 'Kotlin', 'Python', 'AWS', 'Kubernetes', 'PostgreSQL', 'Kafka', 'React', 'TypeScript'],
    array['fintech', 'payments', 'crypto', 'banking', 'growth'],
    array['Agile', 'data-driven', 'cross-functional squads'],
    array['software engineer', 'devops engineer', 'data engineer', 'product analyst'],
    'Looks for breadth, speed, and measurable outcomes across product and ops.'
  ),
  (
    'spotify',
    'Spotify',
    'spotify',
    '#1db954',
    'Product and platform org focused on experimentation, data, and large-scale consumer systems.',
    array['Java', 'Python', 'GCP', 'Kubernetes', 'React', 'TypeScript', 'PostgreSQL', 'Kafka'],
    array['consumer', 'streaming', 'recommendations', 'platform', 'data'],
    array['Agile', 'squads', 'experimentation', 'A/B testing'],
    array['backend engineer', 'data engineer', 'ml engineer', 'product manager'],
    'Prefers impact stories, experimentation, and collaboration across squads.'
  ),
  (
    'deliveroo',
    'Deliveroo',
    'deliveroo',
    '#00ccbc',
    'Marketplace engineering with logistics, real-time systems, and mobile-first product delivery.',
    array['Ruby', 'Go', 'Python', 'AWS', 'Kubernetes', 'PostgreSQL', 'React', 'TypeScript'],
    array['marketplace', 'logistics', 'mobile', 'operations', 'consumer'],
    array['Agile', 'product-led', 'on-call', 'continuous delivery'],
    array['software engineer', 'devops engineer', 'mobile engineer', 'data analyst'],
    'Wants practical delivery stories in high-traffic, operationally complex products.'
  ),
  (
    'govuk',
    'GOV.UK',
    'govuk',
    '#1d70b8',
    'Public-sector digital services with accessibility, reliability, and user-centred design at the core.',
    array['Ruby', 'Python', 'AWS', 'PostgreSQL', 'Docker', 'React', 'TypeScript'],
    array['public sector', 'accessibility', 'service design', 'platform'],
    array['Agile', 'user research', 'service standards', 'continuous delivery'],
    array['software engineer', 'platform engineer', 'delivery manager', 'content designer'],
    'Values public impact, inclusive design, and clear evidence of service delivery.'
  ),
  (
    'amazon',
    'Amazon',
    'amazon',
    '#ff9900',
    'Large-scale distributed systems, ownership culture, and customer-obsessed engineering.',
    array['Java', 'Python', 'AWS', 'DynamoDB', 'Kubernetes', 'TypeScript', 'SQL'],
    array['e-commerce', 'cloud', 'logistics', 'platform', 'retail'],
    array['ownership', 'operating reviews', 'bar raiser', 'Agile'],
    array['software development engineer', 'sde', 'devops engineer', 'product manager'],
    'Expects STAR-style impact, ownership, and deep technical depth for level.'
  )
on conflict (id) do update set
  name = excluded.name,
  summary = excluded.summary,
  tooling = excluded.tooling,
  domains = excluded.domains,
  methodologies = excluded.methodologies,
  role_patterns = excluded.role_patterns,
  hiring_signals = excluded.hiring_signals;
