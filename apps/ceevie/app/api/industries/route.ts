import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { INDUSTRY_TEMPLATES, industryRowToTemplate } from '@/lib/industryTemplates';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db.from('industry_templates').select('*').order('name');
  if (error || !data?.length) {
    return NextResponse.json({ industries: INDUSTRY_TEMPLATES });
  }

  return NextResponse.json({
    industries: data.map((row) => industryRowToTemplate(row)),
  });
}
