// DashboardSkeleton — loading states for all dashboard sections
// Server component — no 'use client'

import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-3', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2 w-16" />
    </div>
  )
}

export function StatsSectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function NutritionSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* MacroProgress skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <Skeleton className="h-3 w-28" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Calorie chart skeleton */}
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-[160px] w-full rounded-lg" />
      </div>
    </div>
  )
}

export function TrainingSectionSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <Skeleton className="h-3 w-32" />
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 space-y-2 text-center">
            <Skeleton className="h-2.5 w-16 mx-auto" />
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-5 w-20 mx-auto rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function WeightSectionSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-[180px] w-full rounded-lg" />
    </div>
  )
}
