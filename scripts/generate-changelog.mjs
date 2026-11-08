// Writes CHANGELOG.md from the Conventional Commits on the current branch: pnpm changelog
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const log = execSync('git log --no-merges --date=short --pretty=format:%ad%x09%s', {
  encoding: 'utf8',
})

const SECTIONS = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['test', 'Tests'],
  ['build', 'Build'],
  ['ci', 'CI'],
  ['chore', 'Chores'],
]
const TITLE = Object.fromEntries(SECTIONS)
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const byMonth = new Map()
for (const line of log.split('\n')) {
  const [date, subject] = line.split('\t')
  if (!subject) continue
  // GitHub titles some squash merges after the branch, e.g. "Feat/motion everywhere (#27)".
  const branch = /^(\w+)\/(.+?) \((#\d+)\)$/.exec(subject)
  const match = branch
    ? [
        subject,
        branch[1].toLowerCase(),
        undefined,
        `${branch[2].replaceAll('-', ' ')} (${branch[3]})`,
      ]
    : /^(\w+)(?:\(([^)]+)\))?!?: (.+)$/.exec(subject)
  if (!match) continue
  const [, type, scope, text] = match
  if (!TITLE[type]) continue
  const month = date.slice(0, 7)
  const sections = byMonth.get(month) ?? new Map()
  const entries = sections.get(type) ?? []
  entries.push(scope ? `**${scope}:** ${text}` : text)
  sections.set(type, entries)
  byMonth.set(month, sections)
}

const lines = [
  '# Changelog',
  '',
  'Generated from the [Conventional Commits](https://www.conventionalcommits.org/) history, newest first. Each pull request is squash-merged into `main` and deployed.',
  '',
]
for (const [month, sections] of [...byMonth].sort((a, b) => b[0].localeCompare(a[0]))) {
  const [year, number] = month.split('-')
  lines.push(`## ${MONTHS[Number(number) - 1]} ${year}`, '')
  for (const [type, title] of SECTIONS) {
    const entries = sections.get(type)
    if (!entries) continue
    lines.push(`### ${title}`, '', ...entries.map((entry) => `- ${entry}`), '')
  }
}
writeFileSync('CHANGELOG.md', lines.join('\n'))
process.stdout.write(`CHANGELOG.md: ${String(byMonth.size)} months\n`)
