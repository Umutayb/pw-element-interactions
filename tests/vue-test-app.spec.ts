import { test, expect } from './fixture/StepFixture';
import { ElementRepository } from 'pw-element-repository';
import { Steps } from '../src/steps/CommonSteps';
import { createLogger } from '../src/logger/Logger';

const log = createLogger('tests');

test.describe('Vue Test App v2 - Homepage Tests', () => {

  let repo: ElementRepository;

  test.beforeAll(() => {
    repo = new ElementRepository('tests/data/page-repository.json');
  });

  test('TC_001: Homepage loads correctly', async ({ page, steps }) => {
    await test.step('Navigate to the homepage', async () => {
      await steps.navigateTo('/');
    });

    await test.step('Verify page loaded', async () => {
      await expect(page).toHaveTitle(/vue-test-app/);
    });

    log('TC_001 Homepage loads correctly — passed');
  });

  test('TC_002: Verify homepage title', async ({ steps }) => {
    await test.step('Navigate to homepage', async () => {
      await steps.navigateTo('/');
    });

    await test.step('Verify title text', async () => {
      const title = await steps.getText('HomePage', 'pageTitle');
      log('Title: %s', title);
    });

    log('TC_002 Verify homepage title — passed');
  });
});

test.describe('Vue Test App v2 - Forms Tests', () => {

  let repo: ElementRepository;

  test.beforeAll(() => {
    repo = new ElementRepository('tests/data/page-repository.json');
  });

  test('TC_003: Forms page loads correctly', async ({ page, steps }) => {
    await test.step('Navigate to Forms page', async () => {
      await steps.navigateTo('/forms');
    });

    await test.step('Verify page title', async () => {
      const title = await steps.getText('FormsPage', 'formTitle');
      log('Form title: %s', title);
    });

    log('TC_003 Forms page loads correctly — passed');
  });

  test('TC_004: Verify form elements', async ({ steps }) => {
    await test.step('Navigate to Forms page', async () => {
      await steps.navigateTo('/forms');
    });

    await test.step('Verify name input exists', async () => {
      await steps.verifyPresence('FormsPage', 'nameInput');
    });

    await test.step('Verify submit button exists', async () => {
      await steps.verifyPresence('FormsPage', 'submitButton');
    });

    log('TC_004 Verify form elements — passed');
  });
});

test.describe('Vue Test App v2 - Interactions Tests', () => {

  let repo: ElementRepository;

  test.beforeAll(() => {
    repo = new ElementRepository('tests/data/page-repository.json');
  });

  test('TC_005: Interactions page loads correctly', async ({ page, steps }) => {
    await test.step('Navigate to Interactions page', async () => {
      await steps.navigateTo('/sortable');
    });

    await test.step('Verify page loaded', async () => {
      await expect(page).toHaveTitle(/vue-test-app/);
    });

    log('TC_005 Interactions page loads correctly — passed');
  });
});

test.describe('Vue Test App v2 - Elements Tests', () => {

  let repo: ElementRepository;

  test.beforeAll(() => {
    repo = new ElementRepository('tests/data/page-repository.json');
  });

  test('TC_006: Elements page loads correctly', async ({ page, steps }) => {
    await test.step('Navigate to Elements page', async () => {
      await steps.navigateTo('/radiobuttons');
    });

    await test.step('Verify page loaded', async () => {
      await expect(page).toHaveTitle(/vue-test-app/);
    });

    log('TC_006 Elements page loads correctly — passed');
  });
});