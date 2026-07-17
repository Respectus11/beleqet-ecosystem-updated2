import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import {
  CalculateTaxDto,
  TaxCalculationResult,
} from './dto/calculate-tax.dto';
import { TaxCalculatorService } from './tax-calculator.service';

@ApiTags('tax-calculator')
@Controller('tax-calculator')
export class TaxCalculatorController {
  constructor(
    private readonly taxCalculatorService: TaxCalculatorService,
    private readonly i18n: I18nService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate freelancer tax liability',
    description:
      'Estimates progressive tax for ET or US jurisdictions using integer smallest-unit math.',
  })
  @ApiBody({ type: CalculateTaxDto })
  @ApiResponse({ status: 200, description: 'Tax calculation result' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or unsupported tax jurisdiction',
  })
  async calculate(@Body() dto: CalculateTaxDto): Promise<TaxCalculationResult> {
    try {
      return this.taxCalculatorService.calculate(dto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        const message = this.i18n.t('messages.tax.unsupportedJurisdiction', {
          args: { countryCode: dto.countryCode?.toUpperCase?.() ?? dto.countryCode },
          defaultValue: `Unsupported tax jurisdiction "${dto.countryCode}". Supported: ET, US.`,
        });

        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'ERR_TAX_UNSUPPORTED_JURISDICTION',
          message: typeof message === 'string' ? message : String(message),
          countryCode: dto.countryCode?.toUpperCase?.() ?? dto.countryCode,
        });
      }

      if (error instanceof HttpException) {
        throw error;
      }

      const message = this.i18n.t('messages.tax.calculationFailed', {
        defaultValue: 'Tax calculation failed. Please try again.',
      });

      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'ERR_TAX_CALCULATION_FAILED',
        message: typeof message === 'string' ? message : String(message),
      });
    }
  }
}
