import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser, type AuthContext } from '@/lib/apiAuth';
import {
  loadCompaniesFromDb,
  scoreCompaniesForAnswers,
  searchCompanies,
  type CompanyProfile,
} from '@/lib/companies';
import type { CvAnswers } from '@/lib/cvBuilder';

async function loadCompanies(db: AuthContext['db']): Promise<CompanyProfile[]> {
  return loadCompaniesFromDb(db);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const query = params.get('q') ?? undefined;
  const industryId = params.get('industry') ?? undefined;
  const featuredOnly = params.get('featured') === '1';

  const all = await loadCompanies(auth.db);
  const companies = searchCompanies(all, { query, industryId, featuredOnly });

  return NextResponse.json({ companies, total: all.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { answers?: CvAnswers; companyIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.answers || typeof body.answers !== 'object') {
    return NextResponse.json({ error: 'Missing answers' }, { status: 400 });
  }

  const catalog = await loadCompanies(auth.db);
  const selectedIds = body.companyIds?.length ? body.companyIds : catalog.map((company) => company.id);
  const selected = selectedIds
    .map((id) => catalog.find((company) => company.id === id))
    .filter(Boolean) as CompanyProfile[];

  const alignments = scoreCompaniesForAnswers(body.answers, selected.map((company) => company.id), catalog);

  return NextResponse.json({
    companies: selected,
    alignments,
  });
}
