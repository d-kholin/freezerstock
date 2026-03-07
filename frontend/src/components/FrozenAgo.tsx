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

  let label: string;
  if (months <= 0) {
    label = 'This month';
  } else if (months === 1) {
    label = '1 month ago';
  } else if (months < 12) {
    label = `${months} months ago`;
  } else {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    label = years === 1 ? '1 year' : `${years} years`;
    if (rem > 0) label += ` ${rem}mo`;
    label += ' ago';
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
      {label}
    </span>
  );
}
