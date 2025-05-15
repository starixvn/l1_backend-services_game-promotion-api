import { Controller, Post, Body, Param, Delete, Put, HttpStatus, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { PromotionAnnouncementService } from '../services/promotion-announcement.service';
import { PromotionAnnouncement } from '../schemas/promotion-announcement.schema';
import { ANNOUNCEMENT_NOT_FOUND_DESCRIPTION } from 'src/constants/api-messages';
import {
  PromotionAnnouncementFilterDto,
  PromotionAnnouncementStatus,
} from '../models/promotion-announcement-filter.dto';
import { PaginationResponse } from 'src/promotion/responses/pagination.response';

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
      message: `Promotion announcement with ID ${id} deleted successfully`,
    };
  }

  /**
   * Get all promotions with optional filtering
   * @param filterDto - Filters for promotions announcements
   * @returns Array of promotions
   */
  @Get()
  @ApiOperation({ summary: 'Get all promotion announcements with filtering options' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by promotion status',
    enum: PromotionAnnouncementStatus,
  })
  @ApiQuery({
    name: 'pageIndex',
    required: false,
    description: 'Page number (1-based)',
    type: Number,
    minimum: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Number of items per page (1-100)',
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all promotion announcements',
    type: [PromotionAnnouncement],
    schema: {
      properties: {
        promotions: {
          type: 'array',
          items: { $ref: getSchemaPath(PromotionAnnouncement) },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            pageIndex: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  async findAll(
    @Query() filterDto: PromotionAnnouncementFilterDto,
  ): Promise<PaginationResponse<PromotionAnnouncement>> {
    return this.promotionAnnouncementService.findAll(filterDto);
  }

  /**
   * Finds a promotion announcement by ID
   * @param id - The ID of the announcement to find
   * @returns The found promotion announcement
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a promotion announcement by ID' })
  @ApiParam(ANNOUNCEMENT_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'Returns the requested promotion',
    type: PromotionAnnouncement,
  })
  @ApiResponse({ status: 404, description: ANNOUNCEMENT_NOT_FOUND_DESCRIPTION })
  async findById(@Param('id') id: string): Promise<PromotionAnnouncement> {
    return this.promotionAnnouncementService.findById(id);
  }
}
