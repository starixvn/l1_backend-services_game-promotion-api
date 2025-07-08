import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PromotionTicketService } from '../services/promotion-ticket.service';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { UpdatePromotionTicketDto } from '../models/update-promotion-ticket.dto';
import {
  CreatePromotionTicketResponse,
  UpdatePromotionTicketResponse,
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

  @Post('total-win')
  @ApiOperation({ summary: 'Get total win amount for a player by promotion, operator, and site' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total win amount',
    type: Number,
  })
  async calculateTotalWin(@Body() totalWinDto: TotalWinDto): Promise<number> {
    return this.promotionTicketService.calculateTotalWin(totalWinDto);
  }
}
