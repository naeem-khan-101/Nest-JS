import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../modules/users/entities/user.entity';

// Load environment variables
config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  username: process.env.DATABASE_USERNAME || 'root',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'nestjs_starter',
  entities: [User],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // Always false for migrations
  logging: false, // Disabled to reduce console output
  timezone: 'Z',
  charset: 'utf8mb4',
});
