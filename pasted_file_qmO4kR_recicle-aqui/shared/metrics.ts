export function parseEstimatedKilograms(value: string | null | undefined) {
  const normalized = value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = normalized?.match(
    /(-?\d[\d.,]*)\s*(quilogramas?|quilos?|kg|gramas?|g|toneladas?|ton|t)\b/i
  );
  if (!match) return 0;

  const amount = normalizeAmount(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return 0;

  const unit = match[2].toLowerCase();
  const kilograms = unit === "g" || unit.startsWith("grama")
    ? amount / 1000
    : unit === "t" || unit === "ton" || unit.startsWith("tonelada")
      ? amount * 1000
      : amount;
  const cadence = normalized?.slice((match.index ?? 0) + match[0].length).match(
    /^\s*(?:\/|\bpor\s+)(dia|dias|semana|semanas|mes|meses|ano|anos)\b/i
  )?.[1]?.toLowerCase();

  if (cadence === "dia" || cadence === "dias") return kilograms * 7;
  if (cadence === "mes" || cadence === "meses") return kilograms / 4.345;
  if (cadence === "ano" || cadence === "anos") return kilograms / 52;
  return kilograms;
}

export function sumEstimatedKilograms(values: Array<string | null | undefined>) {
  return values.reduce((total, value) => total + parseEstimatedKilograms(value), 0);
}

function normalizeAmount(value: string) {
  if (value.includes(",") && value.includes(".")) {
    return Number(
      value.lastIndexOf(",") > value.lastIndexOf(".")
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "")
    );
  }

  const separator = value.includes(",") ? "," : ".";
  if (value.includes(separator)) {
    const parts = value.split(separator);
    if (parts.at(-1)?.length === 3) return Number(parts.join(""));
    return Number(value.replace(separator, "."));
  }
  return Number(value);
}