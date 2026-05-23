/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with structured errors if validation fails.
 *
 * Usage:  router.post('/foo', validate(mySchema), handler)
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const formatted = (result.error.issues || result.error.errors || []).map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formatted,
    });
  }
  req.body = result.data;
  next();
};
