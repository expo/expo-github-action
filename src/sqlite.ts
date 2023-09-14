import { group } from '@actions/core';
import assert from 'assert';
import path from 'path';
import type sqlite3Types from 'sqlite3';
import { promisify } from 'util';

import { restoreFromCache, saveToCache } from './cacher';
import { installPackage, resolvePackage } from './packager';
import { addGlobalNodeSearchPath, findTool } from './worker';

/**
 * A database object with async methods.
 */
export interface Database extends sqlite3Types.Database {
  closeAsync: () => Promise<void>;
  runAsync: (sql: string, ...params: any[]) => Promise<sqlite3Types.RunResult>;
  execAsync: (sql: string) => Promise<void>;
  prepareAsync: (sql: string, ...params: any[]) => Promise<sqlite3Types.Statement>;
  getAsync: <T>(sql: string, ...params: any[]) => Promise<T>;
  allAsync: <T>(sql: string, ...params: any[]) => Promise<T[]>;
}

/**
 * Open a database and return a promise that resolves to a database object.
 */
export function openDatabaseAsync(filename: string): Promise<Database> {
  return new Promise<sqlite3Types.Database>((resolve, reject) => {
    const sqlite3 = require('sqlite3') as typeof import('sqlite3');
    const db = new sqlite3.Database(filename, err => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  }).then(db => {
    return {
      ...db,
      closeAsync: promisify(db.close.bind(db)),
      runAsync: promisify(db.run.bind(db)),
      execAsync: promisify(db.exec.bind(db)),
      prepareAsync: promisify(db.prepare.bind(db)),
      getAsync: promisify(db.get.bind(db)),
      allAsync: promisify(db.all.bind(db)),
    } as Database;
  });
}

/**
 * Install the sqlite3
 */
export async function installSQLiteAsync(packager: string): Promise<string> {
  const sqliteVersion = require('../package.json').dependencies.sqlite3;
  assert(sqliteVersion);
  const packageName = 'sqlite3';
  const version = await resolvePackage(packageName, sqliteVersion);
  const message = `Installing ${packageName} (${version}) from cache or with ${packager}`;

  return await group(message, async () => {
    let libRoot = findTool(packageName, version) || null;
    if (!libRoot) {
      libRoot = await restoreFromCache(packageName, version, packager);
    }
    if (!libRoot) {
      libRoot = await installPackage(packageName, version, packager);
      await saveToCache(packageName, version, packager);
    }

    addGlobalNodeSearchPath(path.join(libRoot, 'node_modules'));
    return libRoot;
  });
}
