import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiResponsePaginated = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved paginated data',
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              total: {
                type: 'number',
                description: 'Total number of items',
              },
              page: {
                type: 'number',
                description: 'Current page number',
              },
              limit: {
                type: 'number',
                description: 'Number of items per page',
              },
            },
          },
        ],
      },
    }),
  );
};
