export type MembershipStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface ProfileDto {
  id: string;
  name: string;
  email: string;
  membershipStatus: MembershipStatus;
  /** Account creation date, shown as "Member since". */
  joinedAt: string;
}
