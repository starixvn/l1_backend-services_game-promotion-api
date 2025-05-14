import { Controller, Post, Body, Param, Delete, Put, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { PromotionAnnouncementService } from '../services/promotion-announcement.service';
import { PromotionAnnouncement } from '../schemas/promotion-announcement.schema';

const ANNOUNCEMENT_ID_PARAM = {
  name: 'id',
  description: 'Announcement ID',
  type: String,
};

@ApiTags('promotion-announcements')
@Controller('promotion-announcements')
export class PromotionAnnouncementController {
  constructor(private readonly promotionAnnouncementService: PromotionAnnouncementService) {}

  /**
   * Creates a new promotion announcement
   * @param dto - The promotion announcement data
   * @returns The created promotion announcement
   */
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

  /**
   * Updates a promotion announcement
   * @param id - The ID of the announcement to update
   * @param dto - The updated announcement data
   * @returns The updated promotion announcement
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a promotion announcement' })
  @ApiParam(ANNOUNCEMENT_ID_PARAM)
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

  /**
   * Deletes a promotion announcement
   * @param id - The ID of the announcement to delete
   * @returns The deleted announcement
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a promotion announcement' })
  @ApiParam(ANNOUNCEMENT_ID_PARAM)
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

  /**
   * Finds all promotion announcements
   * @returns All promotion announcements
   */
  @Get()
  @ApiOperation({ summary: 'Get all promotion announcements' })
  @ApiResponse({
    status: 200,
    description: 'Returns all promotion announcements',
    type: [PromotionAnnouncement],
  })
  async findAll(): Promise<PromotionAnnouncement[]> {
    return this.promotionAnnouncementService.findAll();
  }

  /**
   * Finds a promotion announcement by ID
   * @param id - The ID of the announcement to find
   * @returns The found promotion announcement
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a promotion announcement by ID' })
  @ApiParam(ANNOUNCEMENT_ID_PARAM)
  async findById(@Param('id') id: string): Promise<PromotionAnnouncement> {
    return this.promotionAnnouncementService.findById(id);
  }
}
