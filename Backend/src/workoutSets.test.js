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

const mockUserClient = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
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

describe('Workout Sets API', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUser = { id: userId, email: 'test@example.com' };
  const mockToken = 'valid-token';
  const workoutId = '550e8400-e29b-41d4-a716-446655440002';
  const exerciseId = '550e8400-e29b-41d4-a716-446655440003';
  const workoutExerciseId = '550e8400-e29b-41d4-a716-446655440004';
  const setId = '550e8400-e29b-41d4-a716-446655440005';

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

  const mockOwnershipSuccess = () => {
    // The checkWorkoutExerciseOwnership calls select -> eq -> eq -> maybeSingle
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ maybeSingle: mockMaybeSingle });
    mockMaybeSingle.mockResolvedValueOnce({ 
      data: { 
        id: workoutExerciseId, 
        workout_id: workoutId, 
        workouts: { user_id: userId } 
      }, 
      error: null 
    });
  };

  describe('GET /api/workouts/:workoutId/exercises/:exerciseId/sets', () => {
    it('should list sets if owned', async () => {
      mockOwnershipSuccess();
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ order: mockOrder });
      mockOrder.mockResolvedValueOnce({ data: [{ id: setId, reps: 10 }], error: null });

      const res = await request(app)
        .get(`/api/workouts/${workoutId}/exercises/${exerciseId}/sets`)
        .set('Authorization', `Bearer ${mockToken}`);

      if (res.status === 500) console.log(res.body);

      expect(res.status).toBe(200);
      expect(res.body[0].id).toBe(setId);
    });
  });

  describe('POST /api/workouts/:workoutId/exercises/:exerciseId/sets', () => {
    it('should add a set', async () => {
      mockOwnershipSuccess();
      // Mock max position: select -> eq -> order -> limit -> maybeSingle
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ order: mockOrder });
      mockOrder.mockReturnValueOnce({ limit: mockLimit });
      mockLimit.mockReturnValueOnce({ maybeSingle: mockMaybeSingle });
      mockMaybeSingle.mockResolvedValueOnce({ data: { position: 1 }, error: null });
      // Mock insert: insert -> select -> single
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: { id: setId, position: 2 }, error: null });

      const res = await request(app)
        .post(`/api/workouts/${workoutId}/exercises/${exerciseId}/sets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ weight_kg: 50, reps: 10 });

      if (res.status === 500) console.log(res.body);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(setId);
    });
  });

  describe('PUT /api/workouts/:workoutId/exercises/:exerciseId/sets/:setId', () => {
    it('should update a set', async () => {
      mockOwnershipSuccess();
      // Mock update: update -> eq -> eq -> select -> single
      mockUpdate.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ select: mockSelect });
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: { id: setId, reps: 12 }, error: null });

      const res = await request(app)
        .put(`/api/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reps: 12 });

      if (res.status === 500) console.log(res.body);

      expect(res.status).toBe(200);
      expect(res.body.reps).toBe(12);
    });
  });

  describe('DELETE /api/workouts/:workoutId/exercises/:exerciseId/sets/:setId', () => {
    it('should delete a set', async () => {
      mockOwnershipSuccess();
      // Mock delete: delete -> eq -> eq
      mockDelete.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });

      const res = await request(app)
        .delete(`/api/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      if (res.status === 500) console.log(res.body);

      expect(res.status).toBe(204);
    });
  });
});
