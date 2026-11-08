/**
 * Architecture rules (arc42 §5, building block view). Violations fail CI.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make modules impossible to reason about in isolation.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'domain/ holds the club rules as framework-free TypeScript (ADR-0005).',
      from: { path: '^src/domain/', pathNot: '\\.test\\.ts$' },
      to: { pathNot: '^src/domain/' },
    },
    {
      name: 'shared-not-to-features-or-app',
      severity: 'error',
      comment: 'shared/ is the lowest layer above domain; it never depends on features or routes.',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|app)/' },
    },
    {
      name: 'features-not-to-app',
      severity: 'error',
      comment: 'Dependencies point inward: app -> features, never the reverse.',
      from: { path: '^src/features/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'feature-public-api-only',
      severity: 'error',
      comment: 'A feature may use another feature only through its index.ts (information hiding).',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/[^/]+/',
        pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'app-uses-feature-public-api',
      severity: 'error',
      comment: 'Routes compose features through their public API only.',
      from: { path: '^src/app/' },
      to: { path: '^src/features/[^/]+/', pathNot: '^src/features/[^/]+/index\\.ts$' },
    },
    {
      name: 'backend-access-is-contained',
      severity: 'error',
      comment:
        'Only features/*/server and job routes may call the backend client (backend-for-frontend, ADR-0002).',
      from: {
        pathNot: ['^src/features/[^/]+/server/', '^src/shared/backend/', '^src/app/api/'],
      },
      to: { path: '^src/shared/backend/' },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Unreferenced modules are usually dead code.',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '\\.(test|stories)\\.tsx?$',
          '^src/app/',
          '^src/proxy\\.ts$',
          '^src/i18n/(request|navigation)\\.ts$',
          '/index\\.ts$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['\\.next/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
