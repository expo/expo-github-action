const rules = [
  { type: 'feat', release: 'minor', title: 'New features' },
  { type: 'feature', release: 'minor', title: 'New features' },
  { type: 'fix', release: 'patch', title: 'Bug fixes' },
  { type: 'refactor', release: 'patch', title: 'Code changes' },
  { type: 'chore', release: 'patch', title: 'Other chores' },
  { type: 'docs', release: 'patch', title: 'Documentation changes' },
];

// Simple mapping to order the commit groups
const sortMap = Object.fromEntries(rules.map((rule, index) => [rule.title, index]));

// Set by the release workflow to force a patch or minor release, ignoring the commit types
const forcedBump = ['patch', 'minor'].includes(process.env.RELEASE_BUMP) ? process.env.RELEASE_BUMP : null;

const commitAnalyzer = forcedBump
  ? { analyzeCommits: () => forcedBump }
  : ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
				{ breaking: true, release: 'major' },
				{ revert: true, release: 'patch' },
			].concat(
				rules.map(({ type, release, breaking }) => ({ type, release, breaking }))
			),
    }];

module.exports = {
  branches: ['main'],
  tagFormat: '${version}',
  plugins: [
    commitAnalyzer,
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: rules.map(({ type, title }) => ({ type, section: title })),
      },
      writerOpts: {
        commitGroupsSort: (a, z) => sortMap[a.title] - sortMap[z.title],
      },
    }],
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }],
    ["@semantic-release/exec", { publishCmd: 'yarn build' }],
    ['@semantic-release/git', {
      message: 'chore: create new release ${nextRelease.version}\n\n${nextRelease.notes}',
      assets: ['package.json', 'CHANGELOG.md', 'build/*'],
    }],
    '@semantic-release/github',
  ],
};
