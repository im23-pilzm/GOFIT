const request = require('supertest');
const express = require('express');
const workoutRoutes = require('./routes/workouts');
const { supabase } = require('./supabaseClient');

// Mocking supabase client
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockRange = jest.fn();

const mockUserClient = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockUserClient),
}));

const app = express();
app.use(express.json());
app.use('/api/workouts', workoutRoutes);

describe('Workout Exercises API', () => {
  const mockUser = { id: '550e8400-e29b-41d4-a716-446655440001', email: 'test@example.com' };
  const mockToken = 'valid-token';
  const workoutId = '550e8400-e29b-41d4-a716-446655440002';
  const exerciseId = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    
    // Default chain returns
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, order: mockOrder, select: mockSelect, single: mockSingle });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockOrder.mockReturnValue({ limit: mockLimit, select: mockSelect });
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });
  });

  describe('GET /api/workouts/:workoutId/exercises', () => {
    it('should return 404 if workout not found or not owned', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const res = await request(app)
        .get(`/api/workouts/${workoutId}/exercises`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Workout not found');
    });

    it('should return 200 and list exercises if workout exists', async () => {
      // Mock workout check
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: workoutId, user_id: mockUser.id }, error: null });
      // Mock exercises fetch
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ order: mockOrder });
      mockOrder.mockResolvedValueOnce({ data: [{ exercise_id: exerciseId, position: 0 }], error: null });

      const res = await request(app)
        .get(`/api/workouts/${workoutId}/exercises`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].exercise_id).toBe(exerciseId);
    });
  });

  describe('POST /api/workouts/:workoutId/exercises', () => {
    it('should add exercise with auto-position if not provided', async () => {
      // Mock workout check
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: workoutId, user_id: mockUser.id }, error: null });
      // Mock max position check
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ order: mockOrder });
      mockOrder.mockReturnValueOnce({ limit: mockLimit });
      mockLimit.mockReturnValueOnce({ maybeSingle: mockMaybeSingle });
      mockMaybeSingle.mockResolvedValueOnce({ data: { position: 5 }, error: null });
      // Mock insert
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: { exercise_id: exerciseId, position: 6 }, error: null });

      const res = await request(app)
        .post(`/api/workouts/${workoutId}/exercises`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ exercise_id: exerciseId });

      if (res.status === 400) console.log(res.body);

      expect(res.status).toBe(201);
      expect(res.body.position).toBe(6);
    });
  });

  describe('PUT /api/workouts/:workoutId/exercises/:exerciseId', () => {
    it('should update exercise in workout', async () => {
      // Mock workout check
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: workoutId, user_id: mockUser.id }, error: null });
      // Mock update
      mockUpdate.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ select: mockSelect });
      mockSelect.mockResolvedValueOnce({ data: [{ exercise_id: exerciseId, position: 10 }], error: null });

      const res = await request(app)
        .put(`/api/workouts/${workoutId}/exercises/${exerciseId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ position: 10 });

      if (res.status === 400) console.log(res.body);

      expect(res.status).toBe(200);
      expect(res.body[0].position).toBe(10);
    });
  });

  describe('DELETE /api/workouts/:workoutId/exercises/:exerciseId', () => {
    it('should remove exercise from workout', async () => {
      // Mock workout check
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: workoutId, user_id: mockUser.id }, error: null });
      // Mock delete
      mockDelete.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });

      const res = await request(app)
        .delete(`/api/workouts/${workoutId}/exercises/${exerciseId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      if (res.status === 400) console.log(res.body);

      expect(res.status).toBe(204);
    });
  });
});
