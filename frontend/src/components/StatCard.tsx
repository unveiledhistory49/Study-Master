export default function StatCard({ title, value, icon, subtitle }: { title: string, value: string | number, icon: string, subtitle?: string }) {
  return (
    <div className="glass-card p-6 flex items-start gap-4">
      <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border)] text-2xl">
        {icon}
      </div>
      <div>
        <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
        {subtitle && <p className="text-[var(--text-muted)] text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
