import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { welcomeTemplate } from './templates/welcome.template';
import { joinEvent } from './templates/joinEvent.template';
import { confirmOrRevokeMissionProposal } from './templates/confrimOrRevokeMissionPorposal';

@Injectable()
export class SmartQRUserMailing {
  private readonly resend = new Resend(process.env.API_KEY_MAIL);
  private readonly logger = new Logger(SmartQRUserMailing.name);

  async sendWelcomeToClient(email: string, name: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'SmartQR <contact@smart-qr.pro>',
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


  async confirmEventJoin(email: string, name: string , eventTitle :string , confirmUrl : string, declineUrl : string): Promise<void> {

     try {
      await this.resend.emails.send({
        from: 'SmartQR-EVENT <contact@smart-qr.pro>',
        to: email,
        subject: 'Join an event ! ',
        html: joinEvent(name ,eventTitle, confirmUrl, declineUrl),
      });

      this.logger.log(`Confirmation email sent to ${email}`);
    } catch (error) {
      this.logger.error('Email sending failed', error);
      throw error;
    }


  }

  async confirmMissionProposal(
    email: string,
    recruiterName: string,
    position: string,
    companyName: string,
    cancelUrl?: string,
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'SmartQR-MISSION <contact@smart-qr.pro>',
        to: email,
        subject: `Mission proposal received: ${position} at ${companyName}`,
        html: confirmOrRevokeMissionProposal(recruiterName, position, companyName, cancelUrl),
      });
      this.logger.log(`Mission proposal confirmation sent to ${email}`);
    } catch (error) {
      this.logger.error('Mission proposal email failed', error);
      throw error;
    }
  }
}
