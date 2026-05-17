import {
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/** One-time payment (e.g. private event) */
export class CreatePaymentDto {
  @IsString()
  planId: string;

  @IsPositive()
  amount: number;

  @IsString()
  currency: string;

  /** When paying to unlock a private event, pass the event id */
  @IsOptional()
  @IsString()
  eventId?: string;

  /** Optional custom limits (legacy) */
  @IsOptional()
  @IsPositive()
  maxEvents?: number;

  /** Optional custom email quota per month (legacy) */
  @IsOptional()
  @IsPositive()
  maxEmails?: number;
}

/** Subscription checkout for a catalog plan */
export class CreateSubscriptionDto {
  @IsString()
  planId: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  /** Si false (défaut), l'abonnement reste actif jusqu'à la fin de la période en cours */
  @IsOptional()
  @IsBoolean()
  immediately?: boolean;
}

export class ChangeSubscriptionDto {
  @IsString()
  planId: string;
}
