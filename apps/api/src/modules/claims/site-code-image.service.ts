import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import eng = require('@tesseract.js-data/eng');
import Tesseract = require('tesseract.js');

@Injectable()
export class SiteCodeImageService implements OnModuleDestroy {
  private schedulerPromise?: Promise<Tesseract.Scheduler>;

  constructor(private readonly config: ConfigService) {}

  async contains(url: string, siteCode: string) {
    if (!this.isAllowedUrl(url)) return false;

    const scheduler = await this.getScheduler();
    const result = await scheduler.addJob('recognize', url);
    const imageText = this.normalize(result.data.text);
    const expectedCode = this.normalize(siteCode);
    return imageText.includes(expectedCode);
  }

  async onModuleDestroy() {
    if (!this.schedulerPromise) return;

    const scheduler = await this.schedulerPromise;
    await scheduler.terminate();
  }

  private getScheduler() {
    if (!this.schedulerPromise) {
      this.schedulerPromise = this.createScheduler();
    }
    return this.schedulerPromise;
  }

  private async createScheduler() {
    const worker = await Tesseract.createWorker(
      eng.code,
      Tesseract.OEM.LSTM_ONLY,
      {
        cacheMethod: 'none',
        gzip: eng.gzip,
        langPath: eng.langPath,
      },
    );
    const scheduler = Tesseract.createScheduler();
    scheduler.addWorker(worker);
    return scheduler;
  }

  private normalize(value: string) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private isAllowedUrl(value: string) {
    const storageUrl = this.config.get<string>('SUPABASE_URL');
    if (!storageUrl) return false;

    try {
      return new URL(value).hostname === new URL(storageUrl).hostname;
    } catch {
      return false;
    }
  }
}
