/**
 * Seed credentials
 *
 * Seeded account passwords are read from environment variables so that no
 * login credentials are committed to source control or written to logs.
 *
 * Required when running the staging seeders:
 *   SEED_ADMIN_PASSWORD        - password for the seeded admin accounts
 *   SEED_WORKER_PASSWORD       - password for every seeded worker
 *   SEED_PARTICIPANT_PASSWORD  - password for every seeded participant
 *
 * Optional:
 *   SEED_EMAIL_DOMAIN          - domain for seeded accounts (default: example.com)
 */

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length < 8) {
    throw new Error(
      `${name} must be set (min 8 characters) before running the seeder. ` +
        'Add it to your .env file - see .env.example.'
    );
  }
  return value;
};

export const getSeedPasswords = () => ({
  admin: requireEnv('SEED_ADMIN_PASSWORD'),
  worker: requireEnv('SEED_WORKER_PASSWORD'),
  participant: requireEnv('SEED_PARTICIPANT_PASSWORD'),
});

export const SEED_EMAIL_DOMAIN = process.env.SEED_EMAIL_DOMAIN || 'example.com';
