const { schemas } = require('../../api/_shared/validation');

describe('Booking Validation Schemas', () => {
  describe('bookingCreation schema - Clinical Skills', () => {
    const baseData = {
      contact_id: '123456',
      mock_exam_id: '789012',
      student_id: '1598999',
      name: 'Test Student',
      email: 'test@example.com',
      exam_date: '2025-10-15',
      mock_type: 'Clinical Skills'
    };

    test('should require dominant_hand for Clinical Skills', () => {
      const { error } = schemas.bookingCreation.validate(baseData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Dominant hand');
      expect(error.details[0].message).toContain('required');
    });

    test('should accept valid dominant_hand=true for Clinical Skills', () => {
      const data = { ...baseData, dominant_hand: true };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeUndefined();
    });

    test('should accept valid dominant_hand=false for Clinical Skills', () => {
      const data = { ...baseData, dominant_hand: false };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeUndefined();
    });

    test('should reject attending_location for Clinical Skills', () => {
      const data = {
        ...baseData,
        dominant_hand: true,
        attending_location: 'mississauga'
      };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('only applicable');
    });

    test('should reject invalid dominant_hand type', () => {
      const data = { ...baseData, dominant_hand: 'yes' };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('boolean.base');
    });
  });

  describe('bookingCreation schema - Situational Judgment', () => {
    const baseData = {
      contact_id: '123456',
      mock_exam_id: '789012',
      student_id: '1598999',
      name: 'Test Student',
      email: 'test@example.com',
      exam_date: '2025-10-15',
      mock_type: 'Situational Judgment'
    };

    test('should require attending_location for Situational Judgment', () => {
      const { error } = schemas.bookingCreation.validate(baseData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('attending_location');
    });

    test('should accept valid attending_location', () => {
      const data = { ...baseData, attending_location: 'mississauga' };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeUndefined();
    });

    test('should accept all valid locations', () => {
      const validLocations = [
        'mississauga',
        'calgary',
        'vancouver',
        'montreal',
        'richmond_hill'
      ];

      validLocations.forEach(location => {
        const data = { ...baseData, attending_location: location };
        const { error } = schemas.bookingCreation.validate(data);

        expect(error).toBeUndefined();
      });
    });

    test('should reject invalid attending_location', () => {
      const data = { ...baseData, attending_location: 'invalid_city' };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });

    test('should reject dominant_hand for Situational Judgment', () => {
      const data = {
        ...baseData,
        attending_location: 'mississauga',
        dominant_hand: true
      };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('only applicable');
    });
  });

  describe('bookingCreation schema - Mini-mock', () => {
    const baseData = {
      contact_id: '123456',
      mock_exam_id: '789012',
      student_id: '1598999',
      name: 'Test Student',
      email: 'test@example.com',
      exam_date: '2025-10-15',
      mock_type: 'Mini-mock'
    };

    test('should require attending_location for Mini-mock', () => {
      const { error } = schemas.bookingCreation.validate(baseData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('attending_location');
    });

    test('should accept valid attending_location for Mini-mock', () => {
      const data = { ...baseData, attending_location: 'calgary' };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeUndefined();
    });

    test('should reject dominant_hand for Mini-mock', () => {
      const data = {
        ...baseData,
        attending_location: 'calgary',
        dominant_hand: false
      };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('only applicable');
    });
  });

  describe('bookingCreation schema - Common fields', () => {
    test('should validate all required fields are present', () => {
      const data = {};
      const { error } = schemas.bookingCreation.validate(data, { abortEarly: false });

      expect(error).toBeDefined();
      const missingFields = error.details.map(d => d.path[0]);
      expect(missingFields).toContain('contact_id');
      expect(missingFields).toContain('mock_exam_id');
      expect(missingFields).toContain('student_id');
      expect(missingFields).toContain('name');
      expect(missingFields).toContain('email');
      expect(missingFields).toContain('exam_date');
      expect(missingFields).toContain('mock_type');
    });

    test('should validate email format', () => {
      const data = {
        contact_id: '123456',
        mock_exam_id: '789012',
        student_id: '1598999',
        name: 'Test Student',
        email: 'invalid-email',
        exam_date: '2025-10-15',
        mock_type: 'Clinical Skills',
        dominant_hand: true
      };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('string.email');
    });

    test('should validate student_id format', () => {
      const data = {
        contact_id: '123456',
        mock_exam_id: '789012',
        student_id: 'abc-123', // Invalid - lowercase and special characters not allowed
        name: 'Test Student',
        email: 'test@example.com',
        exam_date: '2025-10-15',
        mock_type: 'Clinical Skills',
        dominant_hand: true
      };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('uppercase');
    });

    test('should validate mock_type enum', () => {
      const data = {
        contact_id: '123456',
        mock_exam_id: '789012',
        student_id: '1598999',
        name: 'Test Student',
        email: 'test@example.com',
        exam_date: '2025-10-15',
        mock_type: 'Invalid Exam Type'
      };
      const { error } = schemas.bookingCreation.validate(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });
  });
});
