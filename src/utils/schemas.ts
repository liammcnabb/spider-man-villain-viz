/**
 * Zod schemas for data validation throughout the pipeline
 * Validates RawVillainData, ProcessedData, and SerializedProcessedData
 */

import { z } from 'zod';
import { RawVillainData, ProcessedData, SerializedProcessedData } from '../types';

/**
 * Schema for Antagonist - character appearing in an issue
 */
export const AntagonistSchema = z.object({
  name: z.string().min(1, 'Antagonist name cannot be empty'),
  url: z.string().url('Invalid URL').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  kind: z.enum(['individual', 'group']).optional(),
});

/**
 * Schema for IssueData - a single comic issue
 */
export const IssueDataSchema = z.object({
  issueNumber: z.number().positive('Issue number must be positive'),
  title: z.string().min(1, 'Issue title cannot be empty'),
  publicationDate: z.string().optional(),
  releaseDate: z.string().optional(),
  chronologicalPlacementHint: z.string().optional(),
  antagonists: z.array(AntagonistSchema).min(1, 'Each issue must have at least one antagonist'),
});

/**
 * Schema for RawVillainData - raw scraped data from a series
 */
export const RawVillainDataSchema = z.object({
  series: z.string().min(1, 'Series name cannot be empty'),
  baseUrl: z.string().url('Invalid base URL'),
  issues: z.array(IssueDataSchema).min(1, 'Must have at least one issue'),
}) as z.ZodType<RawVillainData>;

/**
 * Schema for ProcessedVillain - a processed character entity
 */
export const ProcessedVillainSchema = z.object({
  id: z.string().min(1, 'Villain ID cannot be empty'),
  name: z.string().min(1, 'Villain name cannot be empty'),
  names: z.array(z.string().min(1)).min(1, 'Must have at least one name variant'),
  url: z.string().url('Invalid URL').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  identitySource: z.enum(['url', 'name']),
  firstAppearance: z.number().positive('First appearance issue must be positive'),
  appearances: z.array(z.number().positive()).min(1, 'Must have at least one appearance'),
  frequency: z.number().positive('Frequency must be positive'),
  kind: z.enum(['individual', 'group']).optional(),
});

/**
 * Schema for TimelineData - villain data for a specific issue
 */
export const TimelineDataSchema = z.object({
  issue: z.number().positive(),
  releaseDate: z.string().optional(),
  series: z.string().optional(),
  chronologicalPosition: z.number().optional(),
  chronologicalPlacementHint: z.string().optional(),
  villains: z.array(ProcessedVillainSchema),
  villainCount: z.number().nonnegative(),
  groups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        issue: z.number(),
        members: z.array(z.string()),
      })
    )
    .optional(),
});

/**
 * Schema for VillainStats - statistics about villain appearances
 */
export const VillainStatsSchema = z.object({
  totalVillains: z.number().nonnegative(),
  mostFrequent: ProcessedVillainSchema,
  averageFrequency: z.number().nonnegative(),
  firstAppearances: z.instanceof(Map),
});

/**
 * Schema for ProcessedData - fully processed data from one series
 */
export const ProcessedDataSchema = z.object({
  series: z.string().min(1),
  processedAt: z.string(),
  villains: z.array(ProcessedVillainSchema),
  timeline: z.array(TimelineDataSchema),
  stats: VillainStatsSchema,
  groups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        appearances: z.array(z.number()),
        frequency: z.number(),
      })
    )
    .optional(),
}) as z.ZodType<ProcessedData>;

/**
 * Schema for SerializedProcessedData - JSON-serializable output
 */
export const SerializedProcessedDataSchema = z.object({
  series: z.string().min(1, 'Series name cannot be empty'),
  processedAt: z.string(),
  stats: z.object({
    totalVillains: z.number().nonnegative(),
    mostFrequent: z.string(),
    mostFrequentCount: z.number().nonnegative(),
    averageFrequency: z.number().nonnegative(),
  }),
  villains: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      aliases: z.array(z.string()),
      url: z.string().optional(),
      imageUrl: z.string().optional(),
      identitySource: z.enum(['url', 'name']),
      firstAppearance: z.number(),
      appearances: z.array(z.number()),
      frequency: z.number(),
    })
  ),
  timeline: z.array(
    z.object({
      issue: z.number(),
      releaseDate: z.string().optional(),
      chronologicalPlacementHint: z.string().optional(),
      villainCount: z.number(),
      villains: z.array(z.string()),
      villainUrls: z.array(z.string().optional()),
      villainIds: z.array(z.string()),
      series: z.string().optional(),
      chronologicalPosition: z.number().optional(),
      groups: z
        .array(
          z.object({
            name: z.string(),
            members: z.array(z.string()),
          })
        )
        .optional(),
    })
  ),
  groups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        appearances: z.array(z.number()),
        frequency: z.number(),
      })
    )
    .optional(),
}) as z.ZodType<SerializedProcessedData>;

/**
 * Validation helper functions
 */
export const validators = {
  /**
   * Validate raw villain data from scraper
   */
  validateRawVillainData: (data: unknown): RawVillainData => {
    return RawVillainDataSchema.parse(data);
  },

  /**
   * Safely validate raw villain data, returning errors if invalid
   */
  validateRawVillainDataSafe: (data: unknown) => {
    return RawVillainDataSchema.safeParse(data);
  },

  /**
   * Validate processed data
   */
  validateProcessedData: (data: unknown): ProcessedData => {
    return ProcessedDataSchema.parse(data);
  },

  /**
   * Safely validate processed data
   */
  validateProcessedDataSafe: (data: unknown) => {
    return ProcessedDataSchema.safeParse(data);
  },

  /**
   * Validate serialized output
   */
  validateSerializedData: (data: unknown): SerializedProcessedData => {
    return SerializedProcessedDataSchema.parse(data);
  },

  /**
   * Safely validate serialized output
   */
  validateSerializedDataSafe: (data: unknown) => {
    return SerializedProcessedDataSchema.safeParse(data);
  },

  /**
   * Validate a single issue
   */
  validateIssue: (data: unknown) => {
    return IssueDataSchema.safeParse(data);
  },

  /**
   * Validate a single antagonist
   */
  validateAntagonist: (data: unknown) => {
    return AntagonistSchema.safeParse(data);
  },
};
