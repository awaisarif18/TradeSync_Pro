import { Card, CardBody, Skeleton } from '../ui';

export default function TraderCardSkeleton() {
  return (
    <Card>
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton variant="circle" width={38} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton variant="line" width="60%" />
              <Skeleton variant="line" width="42%" height={10} />
            </div>
            <Skeleton variant="line" width={72} height={22} />
          </div>
          <Skeleton variant="rect" height={64} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Skeleton variant="line" height={34} />
            <Skeleton variant="line" height={34} />
            <Skeleton variant="line" height={34} />
          </div>
          <Skeleton variant="line" height={13} />
          <Skeleton variant="line" width="86%" height={13} />
          <Skeleton variant="rect" height={38} />
        </div>
      </CardBody>
    </Card>
  );
}
