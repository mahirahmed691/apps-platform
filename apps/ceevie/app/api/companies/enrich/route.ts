import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { resolveOrEnrichCompany } from '@/lib/companyEnrichment';
import { getIndustryTemplate, INDUSTRY_TEMPLATES } from '@/lib/industryTemplates';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; industryId?: string; jobInput?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Enter a company name' }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'Company name is too long' }, { status: 400 });
  }

  const industryId = body.industryId?.trim();
  if (industryId && !getIndustryTemplate(industryId) && !INDUSTRY_TEMPLATES.some((item) => item.id === industryId)) {
    return NextResponse.json({ error: 'Invalid industry' }, { status: 400 });
  }

  const jobInput = typeof body.jobInput === 'string' ? body.jobInput.trim().slice(0, 12000) : undefined;

  try {
    const company = await resolveOrEnrichCompany(
      auth.db,
      { name, industryId, jobInput },
      auth.user.id
    );
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: 'Could not build a company profile. Try adding a job posting link.' }, { status: 502 });
  }
}
