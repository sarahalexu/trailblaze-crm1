// src/app/(public)/layout.tsx
// Public layout — no auth required

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
