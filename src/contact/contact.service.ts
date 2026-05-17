import { Injectable } from '@nestjs/common';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly mailService: SmartQRUserMailing) {}

  async submit(dto: ContactDto) {
    await this.mailService.sendContactInquiry(
      dto.email,
      dto.topic,
      dto.message,
    );
    return { ok: true, message: 'Message sent successfully' };
  }
}
