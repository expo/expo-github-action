import { Database, openDatabaseAsync } from '../sqlite';

describe(openDatabaseAsync, () => {
  let db: Database;
  beforeAll(async () => {
    db = await openDatabaseAsync(':memory:');
  });

  afterAll(async () => {
    await db.closeAsync();
  });

  it('should be able to create a table', async () => {
    await db.runAsync('CREATE TABLE lorem (info TEXT)');
    await db.runAsync('INSERT INTO lorem VALUES (?)', 'ipsum');
    const results = await db.allAsync<{ info: string }>('SELECT * FROM lorem');
    expect(results).toEqual([{ info: 'ipsum' }]);
    await db.runAsync('DROP TABLE lorem');
  });

  it('should return first row result from `getAsync`', async () => {
    await db.runAsync('CREATE TABLE lorem (info TEXT)');
    await db.runAsync('INSERT INTO lorem VALUES (?), (?), (?)', '1', '2', '3');
    const results = await db.getAsync<{ info: string }>('SELECT * FROM lorem');
    expect(results).toEqual({ info: '1' });
    await db.runAsync('DROP TABLE lorem');
  });

  it('should support array results from `allAsync`', async () => {
    await db.runAsync('CREATE TABLE lorem (info TEXT)');
    await db.runAsync('INSERT INTO lorem VALUES (?), (?), (?)', '1', '2', '3');
    const results = await db.allAsync<{ info: string }>('SELECT * FROM lorem');
    expect(results).toEqual([{ info: '1' }, { info: '2' }, { info: '3' }]);
    await db.runAsync('DROP TABLE lorem');
  });
});
