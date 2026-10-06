import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClassifyRequestBody, parseClassifyBody } from './classify.dto';
import { RequestStatus } from './customer-request.entity';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  list() {
    return this.requestsService.list();
  }

  @Get('history')
  history(@Query('category') category?: string) {
    return this.requestsService.listHistory(category);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.requestsService.getById(id);
  }

  @Post()
  create(@Body() body: { message?: string }) {
    if (!body?.message || typeof body.message !== 'string') {
      return { error: 'message is required' };
    }
    return this.requestsService.create(body.message);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status?: RequestStatus }) {
    if (!body?.status) {
      return { error: 'status is required' };
    }
    return this.requestsService.updateStatus(id, body.status);
  }

  @Post('classify')
  classify(@Body() body: ClassifyRequestBody) {
    return this.requestsService.classify(parseClassifyBody(body));
  }
}
