
import { IsInt, IsPositive, isString, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @IsString()
  userId : string
  @IsString()
  productId : string
  @IsPositive()
  amount: number;
  @IsString()
  currency: string;
  @IsString()
  type : PaymentType;
  
}



export class CreateSubscriptionDto {
  @IsString()
  priceId: string;   
    @IsString()
  type : PaymentType;
  @IsString()
  productId : string;
  
}


export class CancelSubscriptionDto {
  @IsString()
  subscriptionId: string;
}

export enum PaymentType {
  PORTFOLIO = 'portfolio',
  PRIVACY_EVENT = 'privacy_event',
  PRIVACY_CANDIDATE = 'privacy_candidate',
}
