import {Controller, Get} from '@nestjs/common';
import {AppService} from '@/app.service';
import {ApiTags, ApiOperation, ApiResponse} from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the application'
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'string',
      example: 'Healthy'
    }
  })
  @Get()
  healthCheck(): string {
    return this.appService.health();
  }
}
