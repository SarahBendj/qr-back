import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { welcomeTemplate } from './templates/welcome.template';
import { joinEvent } from './templates/joinEvent.template';
import { eventNames } from 'process';

@Injectable()
export class SmartQRUserMailing {
  private readonly resend = new Resend(process.env.API_KEY_MAIL);
  private readonly logger = new Logger(SmartQRUserMailing.name);

  async sendWelcomeToClient(email: string, name: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: process.env.EMAIL_SENDER ?? 'SmartQR <no-reply@smartqr.com>',
        to: email,
        subject: 'Welcome to SmartQR ',
        html: welcomeTemplate(name),
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error('Email sending failed', error);
      throw error;
    }
  }


  async confirmEventJoin(email: string, name: string , eventTitle :string , confirmUrl : string): Promise<void> {

     try {
      await this.resend.emails.send({
        from: process.env.EMAIL_SENDER ?? 'SmartQR-EVENT <no-reply@smartqr.com>',
        to: email,
        subject: 'Join an event ! ',
        html: joinEvent(name ,eventTitle, confirmUrl),
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error('Email sending failed', error);
      throw error;
    }


  }
}
