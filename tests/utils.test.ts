import { templateLiteral } from '../src/utils';

describe(templateLiteral, () => {
  it('handles string variables', () => {
    expect(templateLiteral('Hello, {name}!', { name: 'World' })).toBe('Hello, World!');
  });
});
