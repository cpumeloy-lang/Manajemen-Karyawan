import DOMPurify from 'dompurify';

/**
 * XSS SANITIZATION UTILITY
 * Sanitizes user input to prevent XSS attacks using DOMPurify
 * 
 * Note: React automatically escapes JSX content by default.
 * This utility is primarily for:
 * - URL sanitization (javascript: protocol prevention)
 * - Custom HTML rendering (if any)
 * - Additional safety layer for user inputs
 */

// Default DOMPurify configuration
const defaultConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param html - HTML string to sanitize
 * @param config - Optional custom DOMPurify config
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string, config = defaultConfig): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text (removes all HTML tags)
 * @param text - Text to sanitize
 * @returns Plain text without HTML tags
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize object properties recursively
 * @param obj - Object to sanitize
 * @param fields - Array of field names to sanitize (if not provided, sanitizes all string fields)
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fields?: (keyof T)[]
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj } as T;

  const fieldsToSanitize = fields || (Object.keys(obj) as (keyof T)[]);

  for (const field of fieldsToSanitize) {
    const value = obj[field];
    if (typeof value === 'string') {
      // Sanitize as text (remove HTML) for most fields
      sanitized[field] = sanitizeText(value) as any;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[field] = sanitizeObject(value) as any;
    }
  }

  return sanitized;
}

/**
 * Sanitize array of objects
 * @param arr - Array of objects to sanitize
 * @param fields - Array of field names to sanitize
 * @returns Sanitized array
 */
export function sanitizeArray<T extends Record<string, any>>(
  arr: T[],
  fields?: (keyof T)[]
): T[] {
  if (!Array.isArray(arr)) {
    return arr;
  }

  return arr.map(item => sanitizeObject(item, fields));
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const sanitized = sanitizeText(url.trim());
  
  // Block dangerous protocols
  const lowerUrl = sanitized.toLowerCase();
  if (lowerUrl.startsWith('javascript:') || 
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:')) {
    return '';
  }

  return sanitized;
}

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeObject,
  sanitizeArray,
  sanitizeURL,
};
