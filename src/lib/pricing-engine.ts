/**
 * AVO-Beta V1.0.0 — Dynamic Pricing Engine
 * 
 * Two pricing modes:
 * 1. Dynamic: multiplier-based pricing per time-of-day, day-of-week, and demand
 * 2. Premium Fixed: flat rate for tutors with isPremium = true
 * 
 * Rules are stored in PricingRule table and cached at startup.
 */

import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PricingInput {
  serviceType: 'video' | 'domicilio';
  isPremium: boolean;
  requestTime: Date;
  distanceKm?: number; // Only for domicilio
  onlineVetCount?: number; // For demand-based surge
}

export interface PricingResult {
  basePrice: number;
  multiplier: number;
  finalPrice: number;
  tier: string;
  breakdown: PricingBreakdownItem[];
  currency: 'ARS';
}

interface PricingBreakdownItem {
  label: string;
  amount: number;
  type: 'base' | 'multiplier' | 'surcharge' | 'discount';
}

interface CachedRule {
  serviceType: string;
  tier: string;
  basePrice: number;
  multiplier: number;
  startHour: number | null;
  endHour: number | null;
  daysOfWeek: number[] | null;
  priority: number;
}

// ─────────────────────────────────────────────
// Default Pricing Rules (fallback if DB empty)
// ─────────────────────────────────────────────

const DEFAULT_RULES: CachedRule[] = [
  // Video
  { serviceType: 'video', tier: 'base', basePrice: 15000, multiplier: 1.0, startHour: 8, endHour: 20, daysOfWeek: [1, 2, 3, 4, 5], priority: 0 },
  { serviceType: 'video', tier: 'extended_hours', basePrice: 15000, multiplier: 1.3, startHour: 20, endHour: 23, daysOfWeek: null, priority: 1 },
  { serviceType: 'video', tier: 'night', basePrice: 15000, multiplier: 1.6, startHour: 23, endHour: 8, daysOfWeek: null, priority: 2 },
  { serviceType: 'video', tier: 'weekend', basePrice: 15000, multiplier: 1.4, startHour: null, endHour: null, daysOfWeek: [0, 6], priority: 1 },
  { serviceType: 'video', tier: 'premium_fixed', basePrice: 12000, multiplier: 1.0, startHour: null, endHour: null, daysOfWeek: null, priority: 10 },

  // Domicilio
  { serviceType: 'domicilio', tier: 'base', basePrice: 25000, multiplier: 1.0, startHour: 8, endHour: 20, daysOfWeek: [1, 2, 3, 4, 5], priority: 0 },
  { serviceType: 'domicilio', tier: 'extended_hours', basePrice: 25000, multiplier: 1.3, startHour: 20, endHour: 23, daysOfWeek: null, priority: 1 },
  { serviceType: 'domicilio', tier: 'night', basePrice: 25000, multiplier: 1.8, startHour: 23, endHour: 8, daysOfWeek: null, priority: 2 },
  { serviceType: 'domicilio', tier: 'weekend', basePrice: 25000, multiplier: 1.5, startHour: null, endHour: null, daysOfWeek: [0, 6], priority: 1 },
  { serviceType: 'domicilio', tier: 'premium_fixed', basePrice: 20000, multiplier: 1.0, startHour: null, endHour: null, daysOfWeek: null, priority: 10 },
];

// ─────────────────────────────────────────────
// Rule Loading
// ─────────────────────────────────────────────

let cachedRules: CachedRule[] | null = null;

async function loadRules(): Promise<CachedRule[]> {
  if (cachedRules) return cachedRules;

  try {
    const dbRules = await prisma.pricingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    if (dbRules.length > 0) {
      cachedRules = dbRules.map((r) => ({
        serviceType: r.serviceType,
        tier: r.tier,
        basePrice: r.basePrice,
        multiplier: r.multiplier,
        startHour: r.startHour,
        endHour: r.endHour,
        daysOfWeek: r.daysOfWeek ? JSON.parse(r.daysOfWeek) : null,
        priority: r.priority,
      }));
    } else {
      cachedRules = DEFAULT_RULES;
    }
  } catch {
    cachedRules = DEFAULT_RULES;
  }

  return cachedRules;
}

/**
 * Invalidate cached rules (call after admin updates PricingRule table).
 */
export function invalidatePricingCache(): void {
  cachedRules = null;
}

// ─────────────────────────────────────────────
// Matching Logic
// ─────────────────────────────────────────────

function isHourInRange(hour: number, startHour: number | null, endHour: number | null): boolean {
  if (startHour === null || endHour === null) return true;

  if (startHour < endHour) {
    // Normal range: 8-20
    return hour >= startHour && hour < endHour;
  }
  // Overnight range: 23-8
  return hour >= startHour || hour < endHour;
}

function isDayMatch(dayOfWeek: number, daysOfWeek: number[] | null): boolean {
  if (daysOfWeek === null) return true;
  return daysOfWeek.includes(dayOfWeek);
}

function findMatchingRule(
  rules: CachedRule[],
  serviceType: string,
  hour: number,
  dayOfWeek: number
): CachedRule | null {
  const candidates = rules
    .filter(
      (r) =>
        r.serviceType === serviceType &&
        r.tier !== 'premium_fixed' &&
        isHourInRange(hour, r.startHour, r.endHour) &&
        isDayMatch(dayOfWeek, r.daysOfWeek)
    )
    .sort((a, b) => b.priority - a.priority);

  return candidates[0] || null;
}

function findPremiumRule(rules: CachedRule[], serviceType: string): CachedRule | null {
  return rules.find((r) => r.serviceType === serviceType && r.tier === 'premium_fixed') || null;
}

// ─────────────────────────────────────────────
// Distance Surcharge (Domicilio only)
// ─────────────────────────────────────────────

function calculateDistanceSurcharge(distanceKm: number): number {
  // Free under 5 km, $500 ARS per km after that, capped at $5000
  if (distanceKm <= 5) return 0;
  const extraKm = distanceKm - 5;
  return Math.min(Math.round(extraKm * 500), 5000);
}

// ─────────────────────────────────────────────
// Demand Surge (low supply = higher price)
// ─────────────────────────────────────────────

function calculateDemandMultiplier(onlineVetCount: number): number {
  // Very few vets online = surge pricing
  if (onlineVetCount <= 2) return 1.5;
  if (onlineVetCount <= 5) return 1.2;
  if (onlineVetCount <= 10) return 1.1;
  return 1.0;
}

// ─────────────────────────────────────────────
// Main Pricing Function
// ─────────────────────────────────────────────

export async function calculatePrice(input: PricingInput): Promise<PricingResult> {
  const rules = await loadRules();
  const hour = input.requestTime.getHours();
  const dayOfWeek = input.requestTime.getDay(); // 0 = Sunday

  const breakdown: PricingBreakdownItem[] = [];

  // Premium fixed pricing
  if (input.isPremium) {
    const premiumRule = findPremiumRule(rules, input.serviceType);
    if (premiumRule) {
      breakdown.push({
        label: 'Tarifa Premium Fija',
        amount: premiumRule.basePrice,
        type: 'base',
      });

      return {
        basePrice: premiumRule.basePrice,
        multiplier: 1.0,
        finalPrice: premiumRule.basePrice,
        tier: 'premium_fixed',
        breakdown,
        currency: 'ARS',
      };
    }
  }

  // Dynamic pricing
  const matchedRule = findMatchingRule(rules, input.serviceType, hour, dayOfWeek);

  if (!matchedRule) {
    // Absolute fallback
    const fallbackPrice = input.serviceType === 'video' ? 15000 : 25000;
    breakdown.push({ label: 'Tarifa base (fallback)', amount: fallbackPrice, type: 'base' });
    return {
      basePrice: fallbackPrice,
      multiplier: 1.0,
      finalPrice: fallbackPrice,
      tier: 'base',
      breakdown,
      currency: 'ARS',
    };
  }

  const basePrice = matchedRule.basePrice;
  let finalMultiplier = matchedRule.multiplier;

  breakdown.push({ label: 'Tarifa base', amount: basePrice, type: 'base' });

  if (matchedRule.multiplier > 1.0) {
    breakdown.push({
      label: `Recargo ${matchedRule.tier} (x${matchedRule.multiplier})`,
      amount: Math.round(basePrice * (matchedRule.multiplier - 1)),
      type: 'multiplier',
    });
  }

  // Demand surge
  if (input.onlineVetCount !== undefined) {
    const demandMult = calculateDemandMultiplier(input.onlineVetCount);
    if (demandMult > 1.0) {
      finalMultiplier *= demandMult;
      breakdown.push({
        label: `Alta demanda (x${demandMult})`,
        amount: Math.round(basePrice * matchedRule.multiplier * (demandMult - 1)),
        type: 'multiplier',
      });
    }
  }

  let finalPrice = Math.round(basePrice * finalMultiplier);

  // Distance surcharge (domicilio only)
  if (input.serviceType === 'domicilio' && input.distanceKm) {
    const distSurcharge = calculateDistanceSurcharge(input.distanceKm);
    if (distSurcharge > 0) {
      finalPrice += distSurcharge;
      breakdown.push({
        label: `Distancia extra (${(input.distanceKm - 5).toFixed(1)} km)`,
        amount: distSurcharge,
        type: 'surcharge',
      });
    }
  }

  return {
    basePrice,
    multiplier: finalMultiplier,
    finalPrice,
    tier: matchedRule.tier,
    breakdown,
    currency: 'ARS',
  };
}
