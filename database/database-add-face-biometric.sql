-- Add face descriptor column for biometric verification
-- This stores the face embedding vector for face recognition

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS face_verification_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN employees.face_descriptor IS 'Face embedding vector for biometric verification (128-dimensional float array)';
COMMENT ON COLUMN employees.face_verified_at IS 'Timestamp when face was last verified/enrolled';
COMMENT ON COLUMN employees.face_verification_enabled IS 'Whether face verification is enabled for this employee';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_employees_face_verification_enabled
ON employees(face_verification_enabled)
WHERE face_verification_enabled = true;