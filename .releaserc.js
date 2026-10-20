const fs = require('fs');
const path = require('path');

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

module.exports = {
  branches: ['main'],
  tagFormat: '${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
				{ breaking: true, release: 'major' },
				{ revert: true, release: 'patch' },
			].concat(
				rules.map(({ type, release, breaking }) => ({ type, release, breaking }))
			),
    }],
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: rules.map(({ type, title }) => ({ type, section: title })),
      },
      writerOpts: {
        commitGroupsSort: (a, z) => sortMap[a.title] - sortMap[z.title],
      },
    }],
    // `main` only accepts changes through PRs, so the release workflow runs a dry run and opens a release PR with this output.
    // Must stay after the notes generator, so `nextRelease.notes` is filled in.
    {
      generateNotes(pluginConfig, { nextRelease }) {
        const outputDir = process.env.RELEASE_OUTPUT_DIR;
        if (outputDir) {
          fs.mkdirSync(outputDir, { recursive: true });
          fs.writeFileSync(path.join(outputDir, 'version'), nextRelease.version);
          fs.writeFileSync(path.join(outputDir, 'notes.md'), nextRelease.notes.trim() + '\n');
        }
        return '';
      },
    },
  ],
};
