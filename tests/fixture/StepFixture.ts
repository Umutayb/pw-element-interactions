import { test as base } from '@playwright/test';
import { baseFixture } from '../../src/fixture/BaseFixture';

// Use the vue-test-app page-repository for new tests
export const test = baseFixture(base, 'tests/data/page-repository.json');
export { expect } from '@playwright/test';