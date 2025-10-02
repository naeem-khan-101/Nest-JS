import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @ApiProperty({
    description: 'User unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @Column({ unique: true, nullable: true })
  @Index('IDX_USER_EMAIL')
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @Column({ nullable: true })
  name: string;

  @ApiProperty({
    description: 'User password (hashed)',
    example: 'hashedPassword123',
  })
  @Column({ nullable: true, select: false })
  @Exclude()
  password: string;

  @ApiProperty({
    description: 'Whether user email is verified',
    example: false,
  })
  @Column({ default: false, nullable: true })
  emailVerified: boolean;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
