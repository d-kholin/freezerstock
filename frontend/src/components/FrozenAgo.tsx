const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  frozenDate: string; // YYYY-MM
}

export default function FrozenAgo({ frozenDate }: Props) {
  const [year, month] = frozenDate.split('-').map(Number);
  const frozen = new Date(year, month - 1, 1);
  const now = new Date();

  const months =
    (now.getFullYear() - frozen.getFullYear()) * 12 +
    (now.getMonth() - frozen.getMonth());

  const dateLabel = `${MONTHS[month - 1]} ${year}`;

  let relLabel: string;
  if (months <= 0) {
    relLabel = 'this month';
  } else if (months < 12) {
    relLabel = `${months}mo ago`;
  } else {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    relLabel = `${years}y${rem > 0 ? ` ${rem}mo` : ''} ago`;
  }

  const isOld = months >= 6;
  const isVeryOld = months >= 12;

  return (
    <span
      className={`text-xs font-medium ${
        isVeryOld
          ? 'text-red-500'
          : isOld
          ? 'text-amber-500'
          : 'text-gray-400'
      }`}
    >
      {dateLabel} · {relLabel}
    </span>
  );
}
