import { Controller, Post, Body, Param, Delete, Put, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { PromotionAnnouncementService } from '../services/promotion-announcement.service';
import { PromotionAnnouncement } from '../schemas/promotion-announcement.schema';

@ApiTags('promotion-announcements')
@Controller('promotion-announcements')
export class PromotionAnnouncementController {
  constructor(private readonly promotionAnnouncementService: PromotionAnnouncementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new promotion announcement' })
  @ApiResponse({
    status: 201,
    description: 'The announcement has been successfully created.',
    type: PromotionAnnouncement,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(@Body() dto: CreatePromotionAnnouncementDto): Promise<PromotionAnnouncement> {
    return this.promotionAnnouncementService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a promotion announcement' })
  @ApiParam({ name: 'id', description: 'Announcement ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'The announcement has been successfully updated.',
    type: PromotionAnnouncement,
  })
  @ApiResponse({ status: 404, description: 'Promotion Announcement not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionAnnouncementDto,
  ): Promise<PromotionAnnouncement> {
    return this.promotionAnnouncementService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a promotion announcement' })
  @ApiParam({ name: 'id', description: 'Announcement ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Announcement deleted successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Promotion Announcement not found' })
  async remove(@Param('id') id: string): Promise<{ statusCode: number; message: string }> {
    await this.promotionAnnouncementService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Deleted successfully',
    };
  }
}
