import { z } from 'zod';

const CheckResultSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100),

  reason: z
    .string()
    .min(1),

  ruleReference: z
    .string()
    .min(1),

  sourceQuote: z
    .string(),

  uncertainty: z
    .string(),
});

export const ComplianceResultSchema = z.object({
  foreignLogo:
    CheckResultSchema,

  brandCompliance:
    CheckResultSchema,

  masAdvertising:
    CheckResultSchema,
});

export type ComplianceResult = z.infer<
  typeof ComplianceResultSchema
>;
