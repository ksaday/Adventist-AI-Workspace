// packages/claims - Claim block parser (SDAWS-CLAIMS-V1) and manual segmentation
export interface ParsedClaim {
  id: string;
  claimText: string;
  purportedSource?: string;
}
