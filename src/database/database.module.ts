import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../modules/users/entities/user.entity';
import { Otp } from '../modules/auth/entities/otp.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [User, Otp, RefreshToken],
        synchronize: process.env.NODE_ENV === 'development', // Only in development
        logging: process.env.NODE_ENV === 'development', // Only in development
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: process.env.NODE_ENV === 'production', // Run migrations in production
        timezone: 'Z', // UTC timezone
        charset: 'utf8mb4',
        extra: {
          connectionLimit: 10,
          acquireTimeout: 60000,
          timeout: 60000,
          reconnect: true,
          charset: 'utf8mb4',
          timezone: 'Z',
        },
        // Custom connection logging
        onConnectionCreate: () => {
          console.log('🔄 Connecting to database...');
        },
        onConnectionReady: () => {
          console.log('✅ Database connected successfully!');
        },
        onConnectionError: (error) => {
          console.log('❌ Database connection failed:', error.message);
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
