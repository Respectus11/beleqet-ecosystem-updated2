import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
@Injectable()
export class DateHelper {
  constructor(private readonly i18n: I18nService) {}

  async validateRange(startTime: Date, endTime: Date): Promise<void> {
    if (endTime <= startTime) {
      throw new BadRequestException(
        await this.i18n.translate('interview.availability.invalidRange'),
      );
    }
  }
}
