import { IsIn } from 'class-validator';

/** Mission status for accept/refuse flow. Matches schema: pending | accepted | rejected */
export class UpdateMissionDto {
  @IsIn(['accepted', 'rejected'], {
    message: 'status must be "accepted" or "rejected"',
  })
  status: 'accepted' | 'rejected';
}
