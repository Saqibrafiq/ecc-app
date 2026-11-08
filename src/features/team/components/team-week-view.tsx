import { CalendarOff, CheckCircle2 } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { buttonVariants } from '@/shared/ui/button-variants'
import { DateTile } from '@/shared/ui/date-tile'
import { StateCard } from '@/shared/ui/state-card'

import type { TeamWeekResult } from '../server/queries'
import type { SquadStatus, TeamWeek, TeamWeekMatch, TeamWeekPractice } from '../types'
import { TeamAccessState } from './team-access-state'
import { ScreenHeader } from '@/shared/ui/screen-header'

export type TeamWeekViewProps = {
  result: Exclude<TeamWeekResult, { kind: 'signed-out' }>
}

const LINK_CLASS = cn(buttonVariants({ size: 'md' }), 'w-full')
const OUTLINE_LINK_CLASS = cn(buttonVariants({ variant: 'outline', size: 'md' }), 'w-full')

const STATUS_CLASS: Record<SquadStatus, string> = {
  open: 'text-text-muted',
  submitted: 'text-accent-practice',
  approved: 'text-status-going-text',
  returned: 'text-status-missed-text',
}

function TeamCard({
  tone,
  date,
  title,
  subtitle,
  status,
  children,
}: {
  tone: 'match' | 'practice'
  date: Date
  title: string
  subtitle: string
  status: ReactNode
  children: ReactNode
}) {
  return (
    <li className="overflow-hidden rounded-2xl border border-border-default bg-surface-card">
      <div className="grid grid-cols-[4rem_1fr] items-center gap-4 px-4 py-4">
        <DateTile date={date} tone={tone} />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-display text-2xl leading-none font-bold text-balance uppercase">
            {title}
          </h3>
          <span className="text-sm text-text-muted">{subtitle}</span>
          {status}
        </div>
      </div>
      <div className="border-t border-dashed border-border-default px-4 pt-3 pb-4">{children}</div>
    </li>
  )
}

function PracticeItem({ practice }: { practice: TeamWeekPractice }) {
  const t = useTranslations('team.practice')
  const format = useFormatter()
  const { event } = practice
  const date = toDisplayDate(event.date)
  const href = `/team/check-in/${String(practice.practiceId)}`

  let status = t('opens', { day: format.dateTime(date, { weekday: 'long' }) })
  if (practice.isCancelled) status = t('cancelled')
  else if (practice.isRecorded) status = t('recorded')
  else if (practice.canCheckIn) status = t('due')

  return (
    <TeamCard
      tone="practice"
      date={date}
      title={t('title', { team: event.team.name })}
      subtitle={[event.startTime, event.ground].filter(Boolean).join(' · ')}
      status={
        <span
          className={cn(
            'inline-flex items-center gap-1 text-sm font-semibold',
            practice.isRecorded ? 'text-status-going-text' : 'text-accent-practice',
            practice.isCancelled && 'text-text-muted',
          )}
        >
          {practice.isRecorded && <CheckCircle2 aria-hidden="true" className="size-4" />}
          {status}
        </span>
      }
    >
      {practice.canCheckIn ? (
        <Link href={href} className={practice.isRecorded ? OUTLINE_LINK_CLASS : LINK_CLASS}>
          {practice.isRecorded ? t('correct') : t('checkIn')}
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(OUTLINE_LINK_CLASS, 'opacity-50')}>
          {t('checkIn')}
        </span>
      )}
    </TeamCard>
  )
}

function MatchItem({ match }: { match: TeamWeekMatch }) {
  const t = useTranslations('team.match')
  const tEvent = useTranslations('week.event')
  const { event, squadStatus } = match
  const isSelectable = squadStatus === 'open' || squadStatus === 'returned'
  const place = `${event.isHome ? tEvent('home') : tEvent('away')}, ${event.ground}`

  return (
    <TeamCard
      tone="match"
      date={toDisplayDate(event.date)}
      title={t('title', { opponent: event.opponent ?? '' })}
      subtitle={[event.startTime, place].filter(Boolean).join(' · ')}
      status={
        <span className={cn('text-sm font-semibold', STATUS_CLASS[squadStatus])}>
          {t(`status.${squadStatus}`)}
        </span>
      }
    >
      <Link
        href={`/team/squad/${String(match.fixtureId)}`}
        className={isSelectable ? LINK_CLASS : OUTLINE_LINK_CLASS}
      >
        {isSelectable ? t('select') : t('view')}
      </Link>
    </TeamCard>
  )
}

/** An admin standing in for a captain picks the team to work on. */
function TeamSwitcher({ teamWeek }: { teamWeek: TeamWeek }) {
  const t = useTranslations('team')
  return (
    <nav aria-label={t('switcher')} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {teamWeek.choices.map((choice) => {
          const isCurrent = choice.id === teamWeek.team.id
          return (
            <li key={choice.id}>
              <Link
                href={`/team?team=${choice.id}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
                  isCurrent
                    ? 'border-accent-match bg-accent-match text-text-on-accent'
                    : 'border-border-default text-text-muted hover:bg-surface-raised hover:text-text-default',
                )}
              >
                {choice.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** A team's week: practices to check in, matches to select a squad for. */
export function TeamWeekView({ result }: TeamWeekViewProps) {
  const t = useTranslations('team')
  const format = useFormatter()

  if (result.kind === 'not-captain') return <TeamAccessState kind="not-captain" />

  const { teamWeek, isPreview } = result
  const firstEvent = teamWeek.practices[0]?.event ?? teamWeek.matches[0]?.event
  const isQuiet = teamWeek.practices.length === 0 && teamWeek.matches.length === 0

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        eyebrow={
          teamWeek.choices.length > 0
            ? t('eyebrowStandIn', { team: teamWeek.team.name })
            : t('eyebrow', { team: teamWeek.team.name })
        }
        title={t('title')}
        previewNote={
          isPreview && firstEvent
            ? t('preview', {
                date: format.dateTime(toDisplayDate(firstEvent.date), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }),
              })
            : undefined
        }
      >
        {teamWeek.choices.length > 1 && <TeamSwitcher teamWeek={teamWeek} />}
      </ScreenHeader>
      {isQuiet && (
        <StateCard
          icon={<CalendarOff aria-hidden="true" className="size-5" />}
          title={t('quiet.title')}
          text={t('quiet.text', { team: teamWeek.team.name })}
        />
      )}
      {teamWeek.practices.length > 0 && (
        <section aria-labelledby="team-practices" className="flex flex-col gap-3">
          <h2 id="team-practices" className="font-display text-xl font-bold uppercase">
            {t('practices')}
          </h2>
          <ul className="flex flex-col gap-3">
            {teamWeek.practices.map((practice) => (
              <PracticeItem key={practice.practiceId} practice={practice} />
            ))}
          </ul>
        </section>
      )}
      {teamWeek.matches.length > 0 && (
        <section aria-labelledby="team-matches" className="flex flex-col gap-3">
          <h2 id="team-matches" className="font-display text-xl font-bold uppercase">
            {t('matches')}
          </h2>
          <ul className="flex flex-col gap-3">
            {teamWeek.matches.map((match) => (
              <MatchItem key={match.fixtureId} match={match} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
