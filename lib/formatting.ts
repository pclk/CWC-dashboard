export function renderNamedList(
  items: Array<{ name: string; details?: string }>,
  multiline = true,
) {
  if (!items.length) return "NIL";

  return items
    .map((item, index) => {
      if (!item.details) return `${index + 1}) ${item.name}`;

      return multiline
        ? `${index + 1}) ${item.name}\n(${item.details})`
        : `${index + 1}) ${item.name} - ${item.details}`;
    })
    .join("\n");
}

export function renderLines(lines: string[], fallback = "NIL") {
  return lines.length ? lines.join("\n") : fallback;
}

export function renderTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    const value = values[key];

    if (value === null || value === undefined) return "";
    return String(value);
  });
}

export function buildTextPreview(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
