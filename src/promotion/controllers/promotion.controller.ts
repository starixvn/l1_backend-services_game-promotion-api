import { Controller, Get, Post, Body, Param, Delete, Put, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PromotionService } from '../services/promotion.service';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { Promotion } from '../schemas/promotion.schema';
import { PromotionFilterDto, PromotionStatus } from '../models/promotion-filter.dto';

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
    description: 'Filter by promotion code (exact match)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns promotions based on the provided filters',
    type: [Promotion],
  })
  async findAll(@Query() filterDto: PromotionFilterDto): Promise<Promotion[]> {
    return this.promotionService.findAll(filterDto);
  }

  /**
   * Get a single promotion by ID
   * @param id - The promotion ID
   * @returns The found promotion
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  @ApiParam({
    name: 'id',
    description: 'Promotion ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the requested promotion',
    type: Promotion,
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async findOne(@Param('id') id: string): Promise<Promotion> {
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
  @ApiParam({
    name: 'id',
    description: 'Promotion ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The promotion has been successfully updated',
    type: Promotion,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async update(
    @Param('id') id: string,
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
  @ApiParam({
    name: 'id',
    description: 'Promotion ID',
    type: String,
  })
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
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async remove(@Param('id') id: string): Promise<{ statusCode: number; message: string }> {
    await this.promotionService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: `Promotion with ID ${id} deleted successfully`,
    };
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
        message: { type: 'string', example: 'Promotion API test endpoint is working' },
      },
    },
  })
  async test(): Promise<{ status: string; message: string }> {
    return {
      status: 'ok',
      message: 'Promotion API test endpoint is working',
    };
  }
}
