import { type Database } from '../sqlite';

export interface IDbManager {
  runInitialTableCreation(db: Database): Promise<void>;
}
