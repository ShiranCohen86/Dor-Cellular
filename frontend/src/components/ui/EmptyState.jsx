export default function EmptyState({ icon, title, sub, children }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      {title && <div className="empty-state__title">{title}</div>}
      {sub   && <div className="empty-state__sub">{sub}</div>}
      {children}
    </div>
  );
}
