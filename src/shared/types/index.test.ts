import { describe, it, expectTypeOf } from 'vitest';
import type { User, Project, UserRole } from './index';

describe('core types', () => {
  it('User has required fields', () => {
    expectTypeOf<User>().toHaveProperty('id');
    expectTypeOf<User>().toHaveProperty('role');
    expectTypeOf<User>().toHaveProperty('is_active');
  });

  it('UserRole is a union of valid roles', () => {
    const role: UserRole = 'admin';
    expectTypeOf(role).toEqualTypeOf<UserRole>();
  });

  it('Project has required fields', () => {
    expectTypeOf<Project>().toHaveProperty('id');
    expectTypeOf<Project>().toHaveProperty('name');
    expectTypeOf<Project>().toHaveProperty('owner_id');
  });
});
