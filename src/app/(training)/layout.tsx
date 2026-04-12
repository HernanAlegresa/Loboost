export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0A0A0A',
        color: '#F0F0F0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        overscrollBehavior: 'none',
      }}
    >
      {children}
    </div>
  )
}
