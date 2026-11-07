/**
 * Architecture boundaries (see docs/decisions/0002-monorepo-boundaries.md).
 * CI fails when any rule is broken.
 */
module.exports = {
  forbidden: [
    {
      name: 'clients-only-through-contracts',
      comment: 'Web and mobile reach the backend only through @film/contracts over HTTPS.',
      severity: 'error',
      from: { path: '^apps/(web|mobile)/' },
      to: { path: '^(packages/db|apps/api)/' },
    },
    {
      name: 'apps-are-leaves',
      comment: 'No app imports another app.',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'packages-never-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'only-api-touches-db',
      comment: 'Only apps/api may depend on packages/db.',
      severity: 'error',
      from: { path: '^packages/(contracts|ui|domain)/' },
      to: { path: '^packages/db/' },
    },
    {
      name: 'domain-is-pure',
      comment: 'packages/domain depends on no other workspace package.',
      severity: 'error',
      from: { path: '^packages/domain/' },
      to: { path: '^packages/(?!domain/)' },
    },
    {
      name: 'ui-is-standalone',
      severity: 'error',
      from: { path: '^packages/ui/' },
      to: { path: '^packages/(?!ui/)' },
    },
    {
      name: 'api-has-no-ui',
      severity: 'error',
      from: { path: '^apps/api/' },
      to: { path: '^packages/ui/' },
    },
    {
      name: 'mobile-no-node-builtins',
      comment: 'React Native has no Node.js runtime.',
      severity: 'error',
      from: { path: '^apps/mobile/(app|src)/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'no-unresolvable',
      comment:
        'Every import resolves; undeclared workspace packages cannot slip past the rules above.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '(^|/)next-env\\.d\\.ts$|(^|/)(node_modules|dist|coverage|\\.next|\\.expo|\\.turbo|test-results|playwright-report)/',
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'react-native', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
