import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { PromotionService } from '../services/promotion.service';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { Promotion, PromotionExpiryDocument } from '../schemas/promotion.schema';
import { PromotionFilterDto, PromotionStatus } from '../models/promotion-filter.dto';
import { PROMOTION_NOT_FOUND_DESCRIPTION } from '../../constants/api-messages';
import { PaginationResponse } from '../responses/pagination.response';
import { ParseMongoIdPipe } from '../../core/pipes/parse-mongo-id.pipe';
import { PromotionPerformanceResponse } from '../responses/performance-promotion.response';

const PROMOTION_ID_PARAM = {
  name: 'id',
  description: 'Promotion ID',
  type: String,
};
@ApiTags('promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  /**
   * Create a new promotion
   * @param createPromotionDto - The promotion data
   * @returns The created promotion
   */
  @Post()
  @ApiOperation({ summary: 'Create a new promotion' })
  @ApiResponse({
    status: 201,
    description: 'The promotion has been successfully created.',
    type: Promotion,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data.' })
  async create(@Body() createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    return this.promotionService.createPromotion(createPromotionDto);
  }

  /**
   * Get all promotions with optional filtering
   * @param filterDto - Filters for promotions
   * @returns Array of promotions
   */
  @Get()
  @ApiOperation({ summary: 'Get all promotions with filtering options' })
  @ApiQuery({
    name: 'operatorIds',
    required: false,
    description: 'Filter by operator IDs (comma-separated or multiple parameters)',
    type: String,
    isArray: true,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by promotion status',
    enum: PromotionStatus,
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Filter by promotion code (partial match)',
    type: String,
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
    description: 'Number of items per page (minimum 1)',
    type: Number,
    minimum: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated promotions based on the provided filters',
    schema: {
      properties: {
        promotions: {
          type: 'array',
          items: { $ref: getSchemaPath(Promotion) },
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
  async findAll(@Query() filterDto: PromotionFilterDto): Promise<PaginationResponse<Promotion>> {
    return this.promotionService.findAll(filterDto);
  }

  /**
   * Get running promotions sorted by priority
   * @param operatorId - Operator ID to filter by (optional - if provided, filter by operatorId, otherwise get all)
   * @param gameId - Game ID to filter by (optional - if provided, filter by gameId, otherwise get all)
   * @returns Array of running promotions sorted by priority rules
   */
  @Get('expiring')
  @ApiOperation({ summary: 'Get running promotions sorted by priority' })
  @ApiQuery({
    name: 'gameId',
    required: true,
    description: 'Filter by game ID (optional - if provided, filter by gameId, otherwise get all)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns running promotions sorted by priority (earliest end date first)',
    type: [Promotion],
  })
  async getExpiringPromotions(@Query('gameId') gameId: string): Promise<PromotionExpiryDocument[]> {
    if (!gameId) {
      throw new BadRequestException('gameId is required');
    }
    return this.promotionService.getExpiringPromotions(gameId);
  }

  /**
   * Get running promotions sorted by priority
   * @param operatorId - Operator ID to filter by (optional - if provided, filter by operatorId, otherwise get all)
   * @param gameId - Game ID to filter by (optional - if provided, filter by gameId, otherwise get all)
   * @returns Array of running promotions sorted by priority rules
   */
  @Get('running')
  @ApiOperation({ summary: 'Get running promotions sorted by priority' })
  @ApiQuery({
    name: 'operatorId',
    required: false,
    description:
      'Filter by operator ID (optional - if provided, filter by operatorId, otherwise get all)',
    type: String,
  })
  @ApiQuery({
    name: 'gameId',
    required: false,
    description: 'Filter by game ID (optional - if provided, filter by gameId, otherwise get all)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns running promotions sorted by priority (earliest end date first)',
    type: [Promotion],
  })
  async getRunningPromotions(
    @Query('operatorId') operatorId?: string,
    @Query('gameId') gameId?: string,
  ): Promise<Promotion[]> {
    return this.promotionService.getRunningPromotions(operatorId, gameId);
  }

  /**
   * Get all promotions sorted by priority (running)
   * @returns Array of running promotions sorted by priority rules
   */
  @Get('all-promotions-running')
  @ApiOperation({ summary: 'Get all promotions sorted by priority (running)' })
  async getAllPromotionsRunning(): Promise<Promotion[]> {
    return this.promotionService.getAllPromotionsRunning();
  }

  @Get('check-code')
  @ApiOperation({ summary: 'Check if promotion code already exists' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'The promotion code to check',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the promotion code exists',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - code is required' })
  async checkCodeExists(@Query('code') code: string): Promise<{ exists: boolean }> {
    if (!code) {
      throw new BadRequestException('code is required');
    }

    const exists = await this.promotionService.doesCodeExist(code);
    return { exists };
  }

  /**
   * Get promotion summary statistics
   * @param query - Summary parameters
   * @returns Promotion summary data
   */
  @Get('performance')
  @ApiOperation({ summary: 'Get promotion performance statistics' })
  @ApiQuery({
    name: 'promotionId',
    required: true,
    description: 'Promotion ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns promotion performance statistics',
    type: PromotionPerformanceResponse,
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async getPromotionPerformance(
    @Query('promotionId', ParseMongoIdPipe) promotionId: string,
  ): Promise<PromotionPerformanceResponse> {
    return this.promotionService.getPromotionPerformance({ promotionId });
  }

  /**
   * Get promotions that are NOT_STARTED and not mapped to any announcement
   * @returns Array of unmapped NOT_STARTED promotions
   */
  @Post('unmapped-not-started')
  @ApiOperation({ summary: 'Get NOT_STARTED promotions that are not mapped to any announcement' })
  @ApiResponse({
    status: 200,
    description: 'Returns unmapped NOT_STARTED promotions',
    type: [Promotion],
  })
  async getUnmappedNotStartedPromotions(): Promise<Promotion[]> {
    return this.promotionService.getUnmappedNotStartedPromotions();
  }

  /**
   * Get a single promotion by ID
   * @param id - The promotion ID
   * @returns The found promotion
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  @ApiParam(PROMOTION_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'Returns the requested promotion',
    type: Promotion,
  })
  @ApiResponse({ status: 404, description: PROMOTION_NOT_FOUND_DESCRIPTION })
  async findOne(@Param('id', ParseMongoIdPipe) id: string): Promise<Promotion> {
    return this.promotionService.findOne(id);
  }

  /**
   * Update a promotion by ID
   * @param id - The promotion ID
   * @param updatePromotionDto - The updated promotion data
   * @returns The updated promotion
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update promotion by ID' })
  @ApiParam(PROMOTION_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'The promotion has been successfully updated',
    type: Promotion,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: PROMOTION_NOT_FOUND_DESCRIPTION })
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionService.update(id, updatePromotionDto);
  }

  /**
   * Delete a promotion by ID
   * @param id - The promotion ID
   * @returns Success message
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete promotion by ID' })
  @ApiParam(PROMOTION_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'The promotion has been successfully deleted',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Promotion with ID 60d21b4667d0d01ce67a7e3b deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: PROMOTION_NOT_FOUND_DESCRIPTION })
  async remove(
    @Param('id', ParseMongoIdPipe) id: string,
  ): Promise<{ statusCode: number; message: string }> {
    await this.promotionService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: `Promotion with ID ${id} deleted successfully`,
    };
  }
}
