export function Skeleton({ variant = 'text', width, height, style = {} }) {
  return (
    <span
      className={`skeleton skeleton--${variant}`}
      style={{ width, height, display: 'block', ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="product-card" style={{ pointerEvents: 'none' }}>
      <Skeleton variant="card" style={{ borderRadius: '12px 12px 0 0', height: 180 }} />
      <div className="product-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="title" width="80%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="row" style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 12px' }}>
          <Skeleton variant="text" width={i === 0 ? '60%' : '80%'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonKpi() {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <Skeleton variant="text" width="60%" style={{ marginBottom: 12 }} />
      <Skeleton variant="title" width="40%" style={{ height: 38 }} />
    </div>
  );
}
