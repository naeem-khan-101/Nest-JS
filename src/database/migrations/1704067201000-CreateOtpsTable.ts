import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOtpsTable1704067201000 implements MigrationInterface {
  name = 'CreateOtpsTable1704067201000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'otps',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '6',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'isUsed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Index creation removed as requested
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.dropTable('otps');
  }
}
