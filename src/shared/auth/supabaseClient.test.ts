import { describe, it, expect } from 'vitest';
import { supabase } from './supabaseClient';

describe('supabaseClient', () => {
  it('exports a supabase client instance', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
  });
});
