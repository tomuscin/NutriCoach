// Root page — redirect to login
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function RootPage() {
  redirect('/auth/login')
}
