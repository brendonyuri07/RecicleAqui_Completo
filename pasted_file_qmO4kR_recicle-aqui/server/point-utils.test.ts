import { describe, expect, it } from "vitest";
import { getQuickPointStatus } from "../client/src/lib/domain";
import {
  parseEstimatedKilograms,
  sumEstimatedKilograms,
} from "../shared/metrics";

describe("estimated waste metrics", () => {
  it("converts explicit mass units to kilograms", () => {
    expect(parseEstimatedKilograms("~100 kg/semana")).toBe(100);
    expect(parseEstimatedKilograms("750 g por semana")).toBe(0.75);
    expect(parseEstimatedKilograms("1,5 toneladas/mês")).toBeCloseTo(1500 / 4.345);
    expect(parseEstimatedKilograms("14 kg/dia")).toBe(98);
    expect(parseEstimatedKilograms("520 kg/ano")).toBe(10);
    expect(parseEstimatedKilograms("Volume variável")).toBe(0);
  });

  it("sums estimates without interpreting values lacking units", () => {
    expect(sumEstimatedKilograms(["20 kg/semana", "500 g", "até 40 litros"])).toBe(
      20.5
    );
  });
});

describe("quick collection-point status", () => {
  it("uses posted weekdays and hours before capacity status", () => {
    const mondayMorning = new Date(2026, 8, 28, 10, 0);
    const mondayAfternoon = new Date(2026, 8, 28, 14, 0);
    const mondayEvening = new Date(2026, 8, 28, 18, 0);
    const saturdayMorning = new Date(2026, 9, 3, 10, 0);

    expect(getQuickPointStatus("ativo", "Seg–Sex · 08h–17h", mondayMorning)).toBe(
      "disponivel"
    );
    expect(
      getQuickPointStatus(
        "ativo",
        "Seg–Sex · 08h–12h, 13h–17h",
        mondayAfternoon
      )
    ).toBe("disponivel");
    expect(getQuickPointStatus("lotado", "Seg–Sex · 08h–17h", mondayMorning)).toBe(
      "lotado"
    );
    expect(getQuickPointStatus("ativo", "Seg–Sex · 08h–17h", mondayEvening)).toBe(
      "fechado"
    );
    expect(getQuickPointStatus("ativo", "Seg–Sex · 08h–17h", saturdayMorning)).toBe(
      "fechado"
    );
  });
});