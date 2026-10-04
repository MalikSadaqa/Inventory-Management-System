type ValidationIssue = {
  loc?: Array<string | number>
  msg?: string
  type?: string
}

const VALUE_ERROR_PREFIX = 'Value error, '

function describeIssue(issue: ValidationIssue): string | null {
  if (!issue.msg) {
    return null
  }

  // Messages from the backend's own validators already name the field.
  if (issue.msg.startsWith(VALUE_ERROR_PREFIX)) {
    return issue.msg.slice(VALUE_ERROR_PREFIX.length)
  }

  // Built-in messages ("Input should be ...") need the field to make sense.
  const field = [...(issue.loc ?? [])]
    .reverse()
    .find((part): part is string => typeof part === 'string' && part !== 'body' && part !== 'query')
  if (!field) {
    return issue.msg
  }

  const label = field.replace(/_/g, ' ')
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${issue.msg}`
}

/**
 * Turns a FastAPI error `detail` into a readable message. App errors send a string;
 * request validation errors (422) send a list of issues.
 */
export function formatErrorDetail(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail || null
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue) => describeIssue((issue ?? {}) as ValidationIssue))
      .filter((message): message is string => Boolean(message))
    return messages.length > 0 ? messages.join(' ') : null
  }

  return null
}
