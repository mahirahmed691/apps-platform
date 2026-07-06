import { sectionUsesBullets, splitIntoBulletItems, type CvContentFormat } from '@/lib/cvContentFormat';

type CvSectionContentProps = {
  value: string;
  sectionKey: string;
  format: CvContentFormat;
  generated?: boolean;
};

export function CvSectionContent({ value, sectionKey, format, generated }: CvSectionContentProps) {
  if (!sectionUsesBullets(sectionKey, format)) {
    return <p className={generated ? 'preview-generated-copy' : undefined}>{value}</p>;
  }

  const items = splitIntoBulletItems(value, sectionKey);

  if (items.length <= 1) {
    return <p className={generated ? 'preview-generated-copy' : undefined}>{value}</p>;
  }

  return (
    <ul className={`preview-section-list${generated ? ' preview-section-list-generated' : ''}`}>
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  );
}
