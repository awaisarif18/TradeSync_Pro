'use client';
import {
  Logo,
  Button,
  Input,
  Pill,
  StatusPill,
  Card,
  CardBody,
  Avatar,
  RoleBadge,
  Skeleton,
  EmptyState,
  SectionEyebrow,
} from '../../components/ui';

export default function TestUI() {
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
      <Logo />
      <Logo size="lg" />
      <Button variant="primary">Primary Button</Button>
      <Button variant="ghost-mint">Ghost Mint</Button>
      <Button variant="ghost-danger" loading>Loading</Button>
      <Input label="Email" placeholder="you@email.com" hint="Enter your email" />
      <Input label="Error field" error="This field is required" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill variant="mint">Mint</Pill>
        <Pill variant="violet">Violet</Pill>
        <Pill variant="outline-danger">Outline Danger</Pill>
        <StatusPill status="live" />
        <StatusPill status="idle" />
        <StatusPill status="disconnected" />
      </div>
      <Card><CardBody>Card body content</CardBody></Card>
      <div style={{ display: 'flex', gap: 8 }}>
        <Avatar name="Pablo Escobar" size={40} />
        <Avatar name="Jane Smith" size={40} />
        <Avatar name="Liu Chen" size={40} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <RoleBadge role="MASTER" />
        <RoleBadge role="SLAVE" />
        <RoleBadge role="ADMIN" />
      </div>
      <Skeleton variant="line" width={200} />
      <Skeleton variant="rect" height={60} />
      <EmptyState
        title="No results found"
        description="Try adjusting your filters"
        action={<Button variant="ghost-mint" size="sm">Clear filters</Button>}
      />
      <SectionEyebrow color="mint">Marketplace</SectionEyebrow>
    </div>
  );
}
