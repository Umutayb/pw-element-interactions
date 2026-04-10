import { test, expect } from './fixture/StepFixture';

test.describe('StepOptions — element resolution + modifiers', () => {

  test.beforeEach(async ({ steps }) => {
    await steps.navigateTo('/');
    await steps.click('SidebarNav', 'buttonsLink');
    await steps.verifyUrlContains('/buttons');
  });

  test('click with default (no options)', async ({ steps }) => {
    await steps.click('ButtonsPage', 'primaryButton');
    await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
  });

  test('click with strategy: first', async ({ steps }) => {
    await steps.click('ButtonsPage', 'primaryButton', { strategy: 'first' });
    await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
  });

  test('click with strategy: index, index: 0', async ({ steps }) => {
    await steps.click('ButtonsPage', 'primaryButton', { strategy: 'index', index: 0 });
    await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
  });

  test('click with withoutScrolling', async ({ steps }) => {
    await steps.click('ButtonsPage', 'primaryButton', { withoutScrolling: true });
    await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
  });

  test('click with ifPresent returns true for visible element', async ({ steps }) => {
    const result = await steps.click('ButtonsPage', 'primaryButton', { ifPresent: true });
    expect(result).toBe(true);
  });

  test('hover with StepOptions', async ({ steps }) => {
    await steps.hover('ButtonsPage', 'primaryButton', { strategy: 'first' });
  });

  test('verifyPresence with StepOptions', async ({ steps }) => {
    await steps.verifyPresence('ButtonsPage', 'primaryButton', { strategy: 'first' });
  });

  test('getText with StepOptions', async ({ steps }) => {
    const text = await steps.getText('ButtonsPage', 'primaryButton', { strategy: 'first' });
    expect(text).toBeTruthy();
  });

  test('getAttribute with StepOptions', async ({ steps }) => {
    const cls = await steps.getAttribute('ButtonsPage', 'primaryButton', 'class', { strategy: 'first' });
    expect(cls).toBeTruthy();
  });

  test('getCount with StepOptions', async ({ steps }) => {
    const count = await steps.getCount('ButtonsPage', 'primaryButton', { strategy: 'first' });
    expect(count).toBeGreaterThan(0);
  });

  test('fill with StepOptions', async ({ steps }) => {
    await steps.navigateTo('/');
    await steps.click('SidebarNav', 'textInputsLink');
    await steps.fill('TextInputsPage', 'textInput', 'StepOptions test', { strategy: 'first' });
  });

  test('check with StepOptions', async ({ steps }) => {
    await steps.navigateTo('/');
    await steps.click('SidebarNav', 'checkboxesLink');
    await steps.check('CheckboxesPage', 'uncheckedCheckbox', { strategy: 'first' });
  });
});
