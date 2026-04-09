import { test, expect } from './fixture/StepFixture';

test.describe('Fluent API — steps.on()', () => {

  test.describe('Strategy selectors', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
    });

    test('default (no strategy) clicks first element', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').click();
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });

    test('.first() explicitly selects first', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').first().click();
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });

    test('.nth(0) selects element at index', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').nth(0).click();
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });
  });

  test.describe('Terminal — interactions', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
    });

    test('click()', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').click();
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });

    test('click({ withoutScrolling: true })', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').click({ withoutScrolling: true });
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });

    test('clickIfPresent() returns true for visible', async ({ steps }) => {
      const result = await steps.on('primaryButton', 'ButtonsPage').clickIfPresent();
      expect(result).toBe(true);
    });

    test('clickIfPresent() returns boolean', async ({ steps }) => {
      const result = await steps.on('secondaryButton', 'ButtonsPage').clickIfPresent();
      expect(typeof result).toBe('boolean');
    });

    test('hover()', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').hover();
    });

    test('doubleClick()', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').doubleClick();
    });

    test('scrollIntoView()', async ({ steps }) => {
      await steps.on('loadingButton', 'ButtonsPage').scrollIntoView();
    });
  });

  test.describe('Terminal — text inputs', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'textInputsLink');
      await steps.verifyUrlContains('/text-inputs');
    });

    test('fill()', async ({ steps }) => {
      await steps.on('textInput', 'TextInputsPage').fill('Fluent API test');
    });

    test('clearInput()', async ({ steps }) => {
      await steps.on('textInput', 'TextInputsPage').fill('temp');
      await steps.on('textInput', 'TextInputsPage').clearInput();
    });

    test('typeSequentially()', async ({ steps }) => {
      await steps.on('textInput', 'TextInputsPage').typeSequentially('abc', 50);
    });
  });

  test.describe('Terminal — checkboxes', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'checkboxesLink');
      await steps.verifyUrlContains('/checkboxes');
    });

    test('check()', async ({ steps }) => {
      await steps.on('uncheckedCheckbox', 'CheckboxesPage').check();
    });

    test('uncheck()', async ({ steps }) => {
      await steps.on('checkedCheckbox', 'CheckboxesPage').uncheck();
    });
  });

  test.describe('Terminal — verifications', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
    });

    test('verifyPresence()', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').verifyPresence();
    });

    test('isPresent() returns true', async ({ steps }) => {
      const result = await steps.on('primaryButton', 'ButtonsPage').isPresent();
      expect(result).toBe(true);
    });

    test('verifyText({ notEmpty: true })', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').verifyText(undefined, { notEmpty: true });
    });

    test('verifyTextContains()', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').verifyTextContains('Primary');
    });

    test('verifyAttribute()', async ({ steps }) => {
      await steps.on('disabledButton', 'ButtonsPage').verifyState('disabled');
    });
  });

  test.describe('Terminal — extractions', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
    });

    test('getText()', async ({ steps }) => {
      const text = await steps.on('primaryButton', 'ButtonsPage').getText();
      expect(text).toBeTruthy();
    });

    test('getAttribute()', async ({ steps }) => {
      const cls = await steps.on('primaryButton', 'ButtonsPage').getAttribute('class');
      expect(cls).toBeTruthy();
    });

    test('getCount()', async ({ steps }) => {
      const count = await steps.on('primaryButton', 'ButtonsPage').getCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Terminal — waiting', () => {

    test.beforeEach(async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
    });

    test('waitForState(visible)', async ({ steps }) => {
      await steps.on('primaryButton', 'ButtonsPage').waitForState('visible');
    });
  });

  test.describe('Chaining combinations', () => {

    test('strategy + withoutScrolling', async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.on('primaryButton', 'ButtonsPage').first().click({ withoutScrolling: true });
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });

    test('nth + verification', async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.on('primaryButton', 'ButtonsPage').nth(0).verifyPresence();
    });

    test('first + extraction', async ({ steps }) => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      const text = await steps.on('primaryButton', 'ButtonsPage').first().getText();
      expect(text).toBeTruthy();
    });
  });
});
