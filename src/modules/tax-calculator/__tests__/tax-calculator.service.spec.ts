import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaxCurrency } from '../dto/calculate-tax.dto';
import { TaxCalculatorService } from '../tax-calculator.service';

describe('TaxCalculatorService', () => {
  let service: TaxCalculatorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxCalculatorService],
    }).compile();

    service = module.get<TaxCalculatorService>(TaxCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Ethiopia (ET) progressive brackets', () => {
    it('applies 0% within the annual exempt band (≤ 7,200 ETB)', () => {
      const result = service.calculate({
        grossIncome: 720_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
      expect(result.countryCode).toBe('ET');
      expect(result.currency).toBe(TaxCurrency.ETB);
    });

    it('taxes only the slice above 7,200 ETB at 10%', () => {
      const result = service.calculate({
        grossIncome: 720_100,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(10);
    });

    it('calculates tax at the top of the 10% annual band (19,800 ETB)', () => {
      const result = service.calculate({
        grossIncome: 1_980_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(126_000);
    });

    it('calculates tax at the top of the 15% annual band (38,400 ETB)', () => {
      const result = service.calculate({
        grossIncome: 3_840_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(405_000);
    });

    it('calculates tax at the top of the 20% annual band (63,000 ETB)', () => {
      const result = service.calculate({
        grossIncome: 6_300_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(897_000);
    });

    it('calculates tax at the top of the 25% annual band (93,600 ETB)', () => {
      const result = service.calculate({
        grossIncome: 9_360_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(1_662_000);
    });

    it('calculates tax at the top of the 30% annual band (130,800 ETB)', () => {
      const result = service.calculate({
        grossIncome: 13_080_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(2_778_000);
    });

    it('applies 35% on income above 130,800 ETB', () => {
      const result = service.calculate({
        grossIncome: 13_080_100,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(2_778_035);
    });

    it('calculates mid-band progressive tax for 120,000 ETB annual', () => {
      const result = service.calculate({
        grossIncome: 12_000_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(2_454_000);
      expect(result.netIncome).toBe(9_546_000);
    });

    it('calculates high-earner tax for 200,000 ETB annual', () => {
      const result = service.calculate({
        grossIncome: 20_000_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(5_200_000);
    });

    it('normalizes lowercase countryCode to ET', () => {
      const result = service.calculate({
        grossIncome: 720_000,
        currency: TaxCurrency.ETB,
        countryCode: 'et',
      });

      expect(result.countryCode).toBe('ET');
      expect(result.taxAmount).toBe(0);
    });
  });

  describe('United States (US) progressive brackets', () => {
    it('calculates 10% on income at the first-bracket ceiling ($11,925)', () => {
      const result = service.calculate({
        grossIncome: 1_192_500,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(119_250);
      expect(result.countryCode).toBe('US');
      expect(result.currency).toBe(TaxCurrency.USD);
    });

    it('calculates tax at the top of the 12% band ($48,475)', () => {
      const result = service.calculate({
        grossIncome: 4_847_500,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(557_850);
    });

    it('calculates progressive tax for $50,000', () => {
      const result = service.calculate({
        grossIncome: 5_000_000,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(591_400);
    });

    it('calculates progressive tax for $100,000', () => {
      const result = service.calculate({
        grossIncome: 10_000_000,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(1_691_400);
    });

    it('calculates progressive tax for $200,000', () => {
      const result = service.calculate({
        grossIncome: 20_000_000,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(4_106_300);
    });

    it('applies top 37% marginal rate for $700,000', () => {
      const result = service.calculate({
        grossIncome: 70_000_000,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(21_602_025);
    });
  });

  describe('zero and negative income bounds', () => {
    it('returns zero tax and zero effective rate for zero ET income', () => {
      const result = service.calculate({
        grossIncome: 0,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.grossIncome).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.netIncome).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('returns zero tax and zero effective rate for zero US income', () => {
      const result = service.calculate({
        grossIncome: 0,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBe(0);
      expect(result.netIncome).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('treats negative income as non-taxable (defensive bound)', () => {
      const result = service.calculate({
        grossIncome: -100_00,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      expect(result.taxAmount).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
      expect(result.netIncome).toBe(result.grossIncome - result.taxAmount);
    });
  });

  describe('mathematical consistency', () => {
    const fixtures = [
      { grossIncome: 0, currency: TaxCurrency.ETB, countryCode: 'ET' },
      { grossIncome: 720_000, currency: TaxCurrency.ETB, countryCode: 'ET' },
      { grossIncome: 12_000_000, currency: TaxCurrency.ETB, countryCode: 'ET' },
      { grossIncome: 20_000_000, currency: TaxCurrency.ETB, countryCode: 'ET' },
      { grossIncome: 5_000_000, currency: TaxCurrency.USD, countryCode: 'US' },
      { grossIncome: 10_000_000, currency: TaxCurrency.USD, countryCode: 'US' },
      { grossIncome: 70_000_000, currency: TaxCurrency.USD, countryCode: 'US' },
    ] as const;

    it.each(fixtures)(
      'ensures grossIncome - taxAmount === netIncome for $countryCode / $grossIncome',
      (dto) => {
        const result = service.calculate({ ...dto });

        expect(result.netIncome).toBe(result.grossIncome - result.taxAmount);
        expect(result.grossIncome).toBe(dto.grossIncome);
        expect(Number.isInteger(result.taxAmount)).toBe(true);
        expect(Number.isInteger(result.netIncome)).toBe(true);
      },
    );

    it('keeps effectiveTaxRate consistent with taxAmount / grossIncome', () => {
      const result = service.calculate({
        grossIncome: 12_000_000,
        currency: TaxCurrency.ETB,
        countryCode: 'ET',
      });

      const expectedRate =
        Number(
          (BigInt(result.taxAmount) * 1_000_000n +
            BigInt(result.grossIncome) / 2n) /
            BigInt(result.grossIncome),
        ) / 1_000_000;

      expect(result.effectiveTaxRate).toBe(expectedRate);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(1);
    });

    it('never returns a taxAmount greater than grossIncome for non-negative gross', () => {
      const result = service.calculate({
        grossIncome: 1_000_000,
        currency: TaxCurrency.USD,
        countryCode: 'US',
      });

      expect(result.taxAmount).toBeLessThanOrEqual(result.grossIncome);
      expect(result.netIncome).toBeGreaterThanOrEqual(0);
    });
  });

  describe('unsupported jurisdictions', () => {
    it('throws BadRequestException for an unsupported countryCode', () => {
      expect(() =>
        service.calculate({
          grossIncome: 1_000_000,
          currency: TaxCurrency.USD,
          countryCode: 'XX',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.calculate({
          grossIncome: 1_000_000,
          currency: TaxCurrency.USD,
          countryCode: 'XX',
        }),
      ).toThrow(/Unsupported tax jurisdiction/);
    });
  });
});
