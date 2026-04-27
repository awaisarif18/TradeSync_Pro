import { roleColor, roleDisplay } from '../../lib/role-display';
import Pill from './Pill';

type RoleBadgeProps = {
  role: string;
  className?: string;
};

export default function RoleBadge({ role, className }: RoleBadgeProps) {
  const color = roleColor(role);
  const variant =
    color === 'mint'
      ? 'outline-mint'
      : color === 'violet'
        ? 'outline-violet'
        : color === 'danger'
          ? 'outline-danger'
          : 'default';

  return (
    <Pill variant={variant} className={className}>
      {roleDisplay(role).toUpperCase()}
    </Pill>
  );
}
