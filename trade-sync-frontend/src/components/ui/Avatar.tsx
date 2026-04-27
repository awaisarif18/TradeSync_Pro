import { avatarColorFor } from '../../lib/avatar-color';
import { cn } from '../../lib/cn';

type AvatarProps = {
  name: string;
  size?: number;
  src?: string;
  color?: string;
  className?: string;
};

function initialsForName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Avatar({ name, size = 38, src, color, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(className)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return (
    <div
      className={cn(className)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color ?? avatarColorFor(name),
        color: '#000000',
        fontWeight: 700,
        fontSize: Math.round(size / 2.7),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {initialsForName(name)}
    </div>
  );
}
