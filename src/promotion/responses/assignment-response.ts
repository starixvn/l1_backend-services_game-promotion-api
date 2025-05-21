import { ApiProperty } from '@nestjs/swagger';

export class AssignmentResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Promotion assigned successfully',
  })
  message: string;
}
