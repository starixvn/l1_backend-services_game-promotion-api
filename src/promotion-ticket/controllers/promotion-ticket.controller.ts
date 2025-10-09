import { Controller, Post, Body, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PromotionTicketService } from '../services/promotion-ticket.service';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { UpdatePromotionTicketDto } from '../models/update-promotion-ticket.dto';
import { GetPromotionTicketsDto } from '../models/get-promotion-tickets.dto';
import {
  CreatePromotionTicketResponse,
  UpdatePromotionTicketResponse,
  GetPromotionTicketsPlayerResponse,
  PromotionTicketsPlayerResponse,
} from '../responses/promotion-ticket.response';
import { TotalWinDto } from '../models/total-win.dto';

@ApiTags('promotion-tickets')
@Controller('promotion-tickets')
export class PromotionTicketController {
  constructor(private readonly promotionTicketService: PromotionTicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new promotion ticket for tracking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Promotion ticket created successfully',
    type: CreatePromotionTicketResponse,
  })
  async createTicket(
    @Body() createTicketDto: CreatePromotionTicketDto,
  ): Promise<CreatePromotionTicketResponse> {
    return this.promotionTicketService.createTicket(createTicketDto);
  }

  @Post('update-ticket')
  @ApiOperation({ summary: 'Update a promotion ticket' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion ticket updated successfully',
    type: UpdatePromotionTicketResponse,
  })
  async updateTicket(
    @Body() updateTicketDto: UpdatePromotionTicketDto,
  ): Promise<UpdatePromotionTicketResponse> {
    return this.promotionTicketService.updateTicket(updateTicketDto);
  }

  @Get('get-promotion-tickets')
  @ApiOperation({ summary: 'Get promotion tickets by promotionId and playerId with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion tickets retrieved successfully',
    type: GetPromotionTicketsPlayerResponse,
  })
  async getPromotionTickets(
    @Query() query: GetPromotionTicketsDto,
  ): Promise<GetPromotionTicketsPlayerResponse> {
    return this.promotionTicketService.getPromotionTickets(query);
  }

  @Get('export-promotion-tickets')
  @ApiOperation({ summary: 'Export promotion tickets by promotionId and playerId with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion tickets exported successfully',
    type: PromotionTicketsPlayerResponse,
  })
  async exportPromotionTickets(
    @Query() query: GetPromotionTicketsDto,
  ): Promise<PromotionTicketsPlayerResponse> {
    return this.promotionTicketService.exportPromotionTickets(query);
  }

  @Post('total-win')
  @ApiOperation({ summary: 'Get total win amount for a player by promotion, operator, and site' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total win amount',
    type: Number,
  })
  async calculateTotalWin(@Body() totalWinDto: TotalWinDto): Promise<number> {
    return (await this.promotionTicketService.calculateTotalWin(totalWinDto)).totalWinAmount;
  }
}
