import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpStatus,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
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
import { ANNOUNCEMENT_NOT_FOUND_DESCRIPTION } from '../../constants/api-messages';
import {
  PromotionAnnouncementFilterDto,
  PromotionAnnouncementStatus,
} from '../models/promotion-announcement-filter.dto';
import { PaginationResponse } from 'src/promotion/responses/pagination.response';
import { PromotionService } from '../../promotion/services/promotion.service';
import { PromotionAnnouncementWithMappingsDto } from '../models/promotion-announcement-with-mapping.dto';

const ANNOUNCEMENT_ID_PARAM = {
  name: 'id',
  description: 'Announcement ID',
  type: String,
};

@ApiTags('promotion-announcements')
@Controller('promotion-announcements')
export class PromotionAnnouncementController {
  constructor(
    private readonly promotionAnnouncementService: PromotionAnnouncementService,
    private readonly promotionService: PromotionService,
  ) {}

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
    type: [PromotionAnnouncementWithMappingsDto],
    schema: {
      properties: {
        promotions: {
          type: 'array',
          items: { $ref: getSchemaPath(PromotionAnnouncementWithMappingsDto) },
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
  ): Promise<PaginationResponse<PromotionAnnouncementWithMappingsDto>> {
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
    type: PromotionAnnouncementWithMappingsDto,
  })
  @ApiResponse({ status: 404, description: ANNOUNCEMENT_NOT_FOUND_DESCRIPTION })
  async findById(@Param('id') id: string): Promise<PromotionAnnouncementWithMappingsDto> {
    const announcement = await this.promotionAnnouncementService.findById(id);
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Resolve mappings
    const promotions = await this.promotionService.findManyByCodes(announcement.promotionMappings);
    const codeToOperatorMap = new Map(promotions.map(p => [p.code, p.operatorId]));

    const mappings = (announcement.promotionMappings || [])
      .filter(code => codeToOperatorMap.has(code))
      .map(code => ({
        promotionCode: code,
        operatorId: codeToOperatorMap.get(code)!,
      }));

    return {
      ...announcement,
      mappings,
    };
  }

  /**
   * Finds a promotion announcement by promotion code
   * @param promotionCode - The promotion code to find the announcement for
   * @returns The found promotion announcement
   */
  @Get('by-promotion-code/:promotionCode')
  @ApiOperation({ summary: 'Get a promotion announcement by promotion code' })
  @ApiParam({
    name: 'promotionCode',
    description: 'Promotion code',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the requested promotion announcement',
    type: PromotionAnnouncement,
  })
  @ApiResponse({ status: 404, description: ANNOUNCEMENT_NOT_FOUND_DESCRIPTION })
  async findByPromotionCode(
    @Param('promotionCode') promotionCode: string,
  ): Promise<PromotionAnnouncement> {
    return this.promotionAnnouncementService.findByPromotionCode(promotionCode);
  }

  /**
   * Test endpoint for smoke testing
   * @returns Test message
   */
  @Get('admin/test')
  @ApiOperation({ summary: 'Test endpoint for smoke testing' })
  @ApiResponse({
    status: 200,
    description: 'The API is working properly',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'Promotion announcement API test endpoint is working' },
      },
    },
  })
  async test(): Promise<{ status: string; message: string }> {
    return {
      status: 'ok',
      message: 'Promotion announcement API test endpoint is working',
    };
  }
}
