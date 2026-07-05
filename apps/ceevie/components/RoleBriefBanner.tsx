import type { PublicRoleBrief } from '@/lib/roleBrief';

type RoleBriefBannerProps = {
  brief: PublicRoleBrief;
};

export function RoleBriefBanner({ brief }: RoleBriefBannerProps) {
  return (
    <div className="role-brief-banner" role="status">
      <div className="role-brief-banner-label">Recruiter brief</div>
      <div className="role-brief-banner-title">
        {brief.title}
        {brief.company ? <span className="role-brief-banner-company"> · {brief.company}</span> : null}
      </div>
      {brief.description ? <p className="role-brief-banner-copy">{brief.description}</p> : null}
    </div>
  );
}
