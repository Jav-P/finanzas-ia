import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClaudeService } from './claude.service';
import { OcrController } from './ocr.controller';

@Module({
  imports: [ConfigModule],
  controllers: [OcrController],
  providers: [ClaudeService],
})
export class OcrModule {}
