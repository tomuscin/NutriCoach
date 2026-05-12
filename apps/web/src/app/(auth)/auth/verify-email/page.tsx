// Verify email page — handles ?token=… from email link
// States: pending check | success | expired | invalid | resend prompt

import type { Metadata } from 'next'
import { VerifyEmailClient } from '@/components/auth/VerifyEmailClient'

export const metadata: Metadata = {
  title: 'Weryfikacja email',
}

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams
  return <VerifyEmailClient token={params.token} errorCode={params.error} />
}
