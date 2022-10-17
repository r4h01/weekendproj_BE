import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  AppService,
  ClaimPaymentDTO,
  Mint,
  PaymentOrder,
  ReferenceBlock,
  VotePower,
} from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('total-supply')
  getTotalSupply() {
    return this.appService.getTotalSupply();
  }

  @Get('allowance')
  getAllowance(@Query('from') from: string, @Query('to') to: string) {
    return this.appService.getAllowance(from, to);
  }

  @Post('create-order')
  createOrder(@Body() body: PaymentOrder) {
    return this.appService.postCreatePaymentOrder(body);
  }

  @Post('mint')
  mint(@Body() body: Mint) {
    return this.appService.mint(body);
  }

  @Post('reference-block')
  referenceBlock(@Body() body: ReferenceBlock) {
    return this.appService.referenceBlock(body);
  }

  @Post('claim-payment')
  claimPayment(@Body() body: ClaimPaymentDTO) {
    return this.appService.claimPayment(body);
  }

  @Get('payment-order-by-id')
  getPaymentOrderById(@Query('id') id: string) {
    return this.appService.getPaymentOrderById(id);
  }

  @Get('payment-list')
  listPaymentOrders() {
    return this.appService.listPaymentOrders();
  }

  @Get('vote-power')
  getVotePower(@Body() body: VotePower) {
    return this.appService.getVotePower(body);
  }

  @Get('vote-number')
  getVote(@Body() body: VotePower) {
    return this.appService.getVote(body);
  }

  @Post('delegate')
  delegate(@Body() body: VotePower) {
    return this.appService.delegate(body);
  }
}
