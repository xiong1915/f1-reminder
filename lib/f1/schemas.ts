// lib/f1/schemas.ts
// Zod schemas for runtime validation of external F1 API responses (Jolpica, OpenF1)

import { z } from 'zod';

// Jolpica MRData Race Schema
export const JolpicaRaceSchema = z.object({
  season: z.string().optional().default('2026'),
  round: z.string().or(z.number()),
  raceName: z.string(),
  Circuit: z.object({
    circuitId: z.string().optional().default('circuit'),
    circuitName: z.string(),
    Location: z.object({
      locality: z.string(),
      country: z.string()
    }).optional()
  }),
  date: z.string(),
  time: z.string().optional(),
  FirstPractice: z.object({ date: z.string(), time: z.string().optional() }).optional(),
  SecondPractice: z.object({ date: z.string(), time: z.string().optional() }).optional(),
  ThirdPractice: z.object({ date: z.string(), time: z.string().optional() }).optional(),
  Qualifying: z.object({ date: z.string(), time: z.string().optional() }).optional(),
  SprintQualifying: z.object({ date: z.string(), time: z.string().optional() }).optional(),
  Sprint: z.object({ date: z.string(), time: z.string().optional() }).optional()
}).passthrough();

export const JolpicaMRDataSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(JolpicaRaceSchema).optional().default([])
    }).optional(),
    StandingsTable: z.object({
      StandingsLists: z.array(z.any()).optional().default([])
    }).optional()
  }).passthrough()
});

// OpenF1 Meeting & Session Schemas
export const OpenF1MeetingSchema = z.object({
  meeting_key: z.number().or(z.string()),
  meeting_name: z.string(),
  meeting_official_name: z.string().optional(),
  location: z.string().optional(),
  country_name: z.string().optional(),
  circuit_key: z.number().or(z.string()).optional(),
  circuit_short_name: z.string().optional(),
  date_start: z.string(),
  year: z.number().optional()
}).passthrough();

export const OpenF1SessionSchema = z.object({
  session_key: z.number().or(z.string()),
  meeting_key: z.number().or(z.string()),
  session_name: z.string(),
  session_type: z.string().optional(),
  date_start: z.string(),
  date_end: z.string().optional(),
  gmt_offset: z.string().optional()
}).passthrough();
