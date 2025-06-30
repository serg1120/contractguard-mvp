import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { appLogger } from '../utils/logger';

interface Migration {
  id: string;
  filename: string;
  filepath: string;
  sql: string;
}

interface MigrationRecord {
  id: string;
  filename: string;
  applied_at: Date;
  success: boolean;
}

class DatabaseMigrator {
  private pool: Pool;
  private migrationsDir: string;
  private seedsDir: string;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
    
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.seedsDir = path.join(__dirname, 'seeds');
  }

  // Initialize migration tracking table
  private async initializeMigrationTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        migration_id VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_migration_id ON migrations(migration_id);
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at);
    `;

    try {
      await this.pool.query(createTableQuery);
      appLogger.info('Migration tracking table initialized');
    } catch (error) {
      appLogger.error('Failed to initialize migration table', error);
      throw error;
    }
  }

  // Get list of applied migrations
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await this.pool.query(
        'SELECT migration_id, filename, applied_at, success FROM migrations ORDER BY applied_at'
      );
      return result.rows.map(row => ({
        id: row.migration_id,
        filename: row.filename,
        applied_at: row.applied_at,
        success: row.success,
      }));
    } catch (error) {
      appLogger.error('Failed to get applied migrations', error);
      throw error;
    }
  }

  // Get list of available migrations
  private async getAvailableMigrations(): Promise<Migration[]> {
    try {
      if (!fs.existsSync(this.migrationsDir)) {
        appLogger.warn('Migrations directory does not exist');
        return [];
      }

      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: Migration[] = [];
      
      for (const file of files) {
        const filepath = path.join(this.migrationsDir, file);
        const sql = fs.readFileSync(filepath, 'utf8');
        const id = file.replace('.sql', '');
        
        migrations.push({
          id,
          filename: file,
          filepath,
          sql,
        });
      }

      return migrations;
    } catch (error) {
      appLogger.error('Failed to get available migrations', error);
      throw error;
    }
  }

  // Apply a single migration
  private async applyMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      appLogger.info(`Applying migration: ${migration.filename}`);
      
      // Execute migration SQL
      await client.query(migration.sql);
      
      // Record migration in tracking table
      await client.query(
        'INSERT INTO migrations (migration_id, filename, success) VALUES ($1, $2, $3)',
        [migration.id, migration.filename, true]
      );
      
      await client.query('COMMIT');
      appLogger.info(`Migration applied successfully: ${migration.filename}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Record failed migration
      try {
        await client.query(
          'INSERT INTO migrations (migration_id, filename, success, error_message) VALUES ($1, $2, $3, $4)',
          [migration.id, migration.filename, false, error instanceof Error ? error.message : 'Unknown error']
        );
      } catch (recordError) {
        appLogger.error('Failed to record migration failure', recordError);
      }
      
      appLogger.error(`Migration failed: ${migration.filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Run all pending migrations
  public async migrate(): Promise<void> {
    try {
      appLogger.info('Starting database migration...');
      
      // Initialize migration tracking
      await this.initializeMigrationTable();
      
      // Get applied and available migrations
      const appliedMigrations = await this.getAppliedMigrations();
      const availableMigrations = await this.getAvailableMigrations();
      
      // Find pending migrations
      const appliedIds = new Set(appliedMigrations.map(m => m.id));
      const pendingMigrations = availableMigrations.filter(m => !appliedIds.has(m.id));
      
      if (pendingMigrations.length === 0) {
        appLogger.info('No pending migrations found');
        return;
      }
      
      appLogger.info(`Found ${pendingMigrations.length} pending migrations`);
      
      // Apply pending migrations
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }
      
      appLogger.info('Database migration completed successfully');
      
    } catch (error) {
      appLogger.error('Database migration failed', error);
      throw error;
    }
  }

  // Rollback last migration (careful!)
  public async rollbackLast(): Promise<void> {
    try {
      appLogger.info('Rolling back last migration...');
      
      const appliedMigrations = await this.getAppliedMigrations();
      const lastMigration = appliedMigrations[appliedMigrations.length - 1];
      
      if (!lastMigration) {
        appLogger.info('No migrations to rollback');
        return;
      }
      
      appLogger.warn(`Rolling back migration: ${lastMigration.filename}`);
      
      // Remove migration record (rollback SQL not implemented for safety)
      await this.pool.query(
        'DELETE FROM migrations WHERE migration_id = $1',
        [lastMigration.id]
      );
      
      appLogger.info(`Migration rollback completed: ${lastMigration.filename}`);
      appLogger.warn('Note: Rollback only removes migration record. Manual schema changes may be required.');
      
    } catch (error) {
      appLogger.error('Migration rollback failed', error);
      throw error;
    }
  }

  // Seed database with initial data
  public async seed(): Promise<void> {
    try {
      appLogger.info('Starting database seeding...');
      
      if (!fs.existsSync(this.seedsDir)) {
        appLogger.warn('Seeds directory does not exist');
        return;
      }

      const seedFiles = fs.readdirSync(this.seedsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (seedFiles.length === 0) {
        appLogger.info('No seed files found');
        return;
      }

      for (const file of seedFiles) {
        const filepath = path.join(this.seedsDir, file);
        const sql = fs.readFileSync(filepath, 'utf8');
        
        appLogger.info(`Applying seed: ${file}`);
        
        try {
          await this.pool.query(sql);
          appLogger.info(`Seed applied successfully: ${file}`);
        } catch (error) {
          appLogger.error(`Seed failed: ${file}`, error);
          // Continue with other seeds
        }
      }
      
      appLogger.info('Database seeding completed');
      
    } catch (error) {
      appLogger.error('Database seeding failed', error);
      throw error;
    }
  }

  // Get migration status
  public async status(): Promise<void> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const availableMigrations = await this.getAvailableMigrations();
      
      console.log('\n=== Migration Status ===');
      console.log(`Applied migrations: ${appliedMigrations.length}`);
      console.log(`Available migrations: ${availableMigrations.length}`);
      
      const appliedIds = new Set(appliedMigrations.map(m => m.id));
      const pendingMigrations = availableMigrations.filter(m => !appliedIds.has(m.id));
      
      console.log(`Pending migrations: ${pendingMigrations.length}`);
      
      if (appliedMigrations.length > 0) {
        console.log('\nApplied Migrations:');
        appliedMigrations.forEach(m => {
          console.log(`  ✓ ${m.filename} (${m.applied_at.toISOString()})`);
        });
      }
      
      if (pendingMigrations.length > 0) {
        console.log('\nPending Migrations:');
        pendingMigrations.forEach(m => {
          console.log(`  ○ ${m.filename}`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      appLogger.error('Failed to get migration status', error);
      throw error;
    }
  }

  // Close database connection
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI interface
const runMigration = async () => {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;
      case 'seed':
        await migrator.seed();
        break;
      case 'status':
        await migrator.status();
        break;
      case 'rollback':
        await migrator.rollbackLast();
        break;
      case 'reset':
        await migrator.migrate();
        await migrator.seed();
        break;
      default:
        console.log('Usage: npm run migrate [command]');
        console.log('Commands:');
        console.log('  migrate  - Apply pending migrations');
        console.log('  seed     - Apply seed data');
        console.log('  status   - Show migration status');
        console.log('  rollback - Rollback last migration');
        console.log('  reset    - Run migrations and seeds');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration command failed:', error);
    process.exit(1);
  } finally {
    await migrator.close();
  }
};

// Run if called directly
if (require.main === module) {
  runMigration();
}

export default DatabaseMigrator;