export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-wrap items-stretch">{children}</div>;
}
