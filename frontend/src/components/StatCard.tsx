export default function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
}) {
  return (
    <div className="border border-[#2f2f2f] bg-[#121212] p-4 rounded-md flex items-start justify-between">
      <div>
        <span className="text-[11px] text-[#8e8e8e] font-medium block uppercase tracking-wider mb-1">
          {title}
        </span>
        <div className="text-xl font-bold text-white tracking-tight">{value}</div>
        {subtitle && <p className="text-[10px] text-[#666666] mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-lg opacity-80">{icon}</span>
    </div>
  );
}
