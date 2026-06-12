

import { useMemo } from 'react';
import type {
  Driver,
  Vehicle,
  Booking,
  DriverShift,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '@/types';
import {
  isAdrValid,
  daysUntilAdrExpiry,
  isDriverOnShift,
  isEvSocSufficient,
} from '@/lib/utils';

interface ValidateAssignmentParams {
  driver?: Driver | null;
  vehicle?: Vehicle | null;
  booking?: Booking | null;
  shifts?: DriverShift[];
  planDate?: string;
  plannedDistanceKm?: number;
}

// Core validation hook — implements all business rules for plan assignment
export function useAssignmentValidation({
  driver,
  vehicle,
  booking,
  shifts = [],
  planDate,
  plannedDistanceKm,
}: ValidateAssignmentParams): ValidationResult {
  return useMemo(() => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!driver || !booking) return { valid: true, errors, warnings };

    // ── Rule 1: Driver must be active ─────────────────────────
    if (!driver.active) {
      errors.push({
        code: 'DRIVER_INACTIVE_ERROR',
        message: `Driver "${driver.name}" is inactive and cannot be assigned.`,
        field: 'driver_id',
      });
    }

    // ── Rule 2: BPA cargo requires ท.4 license ────────────────
    if (booking.is_bpa_cargo && driver.license_type !== 'ท.4') {
      errors.push({
        code: 'HAZMAT_LICENSE_ERROR',
        message: `BPA/Hazardous cargo requires a ท.4 license. Driver "${driver.name}" holds a ${driver.license_type} license.`,
        field: 'driver_id',
      });
    }

    // ── Rule 3: Hazardous cargo requires valid ADR certificate ─
    const requiresAdr = ['Hazardous', 'Chemical', 'BPA', 'ISO_Tank'].includes(
      booking.cargo_type
    );
    if (requiresAdr) {
      if (!driver.adr_certificate_expiry) {
        errors.push({
          code: 'ADR_MISSING_ERROR',
          message: `Driver "${driver.name}" has no ADR certificate on file. Required for ${booking.cargo_type} cargo.`,
          field: 'driver_id',
        });
      } else if (!isAdrValid(driver.adr_certificate_expiry)) {
        errors.push({
          code: 'ADR_EXPIRED_ERROR',
          message: `Driver "${driver.name}"'s ADR certificate expired on ${driver.adr_certificate_expiry}. Renewal required before assignment.`,
          field: 'driver_id',
        });
      } else {
        // Warn if ADR expires within 30 days
        const daysLeft = daysUntilAdrExpiry(driver.adr_certificate_expiry);
        if (daysLeft !== null && daysLeft <= 30) {
          warnings.push({
            code: 'ADR_EXPIRING_SOON',
            message: `ADR certificate for "${driver.name}" expires in ${daysLeft} day(s). Please schedule renewal.`,
          });
        }
      }
    }

    // ── Rule 4: Driver shift availability ─────────────────────
    if (planDate && shifts.length > 0) {
      if (!isDriverOnShift(shifts, planDate)) {
        errors.push({
          code: 'DRIVER_OFF_SHIFT_ERROR',
          message: `Driver "${driver.name}" is scheduled as OFF on ${planDate}. Verify shift roster before assigning.`,
          field: 'driver_id',
        });
      }
    }

    // ── Rule 5: EV battery SOC check ──────────────────────────
    if (vehicle) {
      if (!vehicle.active) {
        errors.push({
          code: 'VEHICLE_INACTIVE_ERROR',
          message: `Vehicle "${vehicle.plate_number}" is inactive.`,
          field: 'vehicle_id',
        });
      }

      if (
        vehicle.powertrain === 'EV' &&
        vehicle.battery_soc != null &&
        plannedDistanceKm
      ) {
        const maxRange = vehicle.range_km ?? 300;
        if (!isEvSocSufficient(vehicle.battery_soc, plannedDistanceKm, maxRange)) {
          const availableKm = ((vehicle.battery_soc / 100) * maxRange).toFixed(0);
          errors.push({
            code: 'EV_LOW_BATTERY_ERROR',
            message: `EV "${vehicle.plate_number}" has ${vehicle.battery_soc}% SOC (~${availableKm} km available). Planned route is ${plannedDistanceKm} km. Charge or substitute vehicle.`,
            field: 'vehicle_id',
          });
        } else if (vehicle.battery_soc < 40) {
          warnings.push({
            code: 'EV_LOW_SOC_WARNING',
            message: `EV "${vehicle.plate_number}" battery at ${vehicle.battery_soc}%. Consider charging before dispatch.`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }, [driver, vehicle, booking, shifts, planDate, plannedDistanceKm]);
}
