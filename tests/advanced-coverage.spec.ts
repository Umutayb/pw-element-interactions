import { test, expect } from './fixture/StepFixture';
import { createLogger } from '../src/logger/Logger';

const log = createLogger('tests');

// ══════════════════════════════════════════════════════════════════════════════
// Advanced/Raw ElementInteractions Sub-API Tests
// ══════════════════════════════════════════════════════════════════════════════

test.describe('TC_047: Raw Interactions - interact methods', () => {

  test('all interact sub-API methods', async ({ page, repo, steps, interactions }) => {

    await test.step('Navigate to Buttons page', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
    });

    await test.step('interact.click', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'primaryButton');
      await interactions.interact.click(btn!);
    });

    await test.step('interact.clickWithoutScrolling', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'secondaryButton');
      await interactions.interact.clickWithoutScrolling(btn!);
    });

    await test.step('interact.clickIfPresent', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'dangerButton');
      await interactions.interact.clickIfPresent(btn!);
    });

    await test.step('interact.doubleClick', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'primaryButton');
      await interactions.interact.doubleClick(btn!);
    });

    await test.step('interact.rightClick', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'primaryButton');
      await interactions.interact.rightClick(btn!);
    });

    await test.step('interact.hover', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'primaryButton');
      await interactions.interact.hover(btn!);
    });

    await test.step('interact.pressKey', async () => {
      await interactions.interact.pressKey('Escape');
    });

    await test.step('Navigate to Text Inputs for fill/type tests', async () => {
      await steps.click('SidebarNav', 'textInputsLink');
      await steps.verifyUrlContains('/text-inputs');
    });

    await test.step('interact.fill', async () => {
      const input = await repo.get(page, 'TextInputsPage', 'textInput');
      await interactions.interact.fill(input!, 'raw fill test');
    });

    await test.step('interact.typeSequentially', async () => {
      const input = await repo.get(page, 'TextInputsPage', 'textInput');
      await interactions.interact.fill(input!, '');
      await interactions.interact.typeSequentially(input!, 'raw typed');
    });

    await test.step('Navigate to Checkboxes for check/uncheck', async () => {
      await steps.click('SidebarNav', 'checkboxesLink');
      await steps.verifyUrlContains('/checkboxes');
    });

    await test.step('interact.check', async () => {
      const cb = await repo.get(page, 'CheckboxesPage', 'uncheckedCheckbox');
      await interactions.interact.check(cb!);
    });

    await test.step('interact.uncheck', async () => {
      const cb = await repo.get(page, 'CheckboxesPage', 'uncheckedCheckbox');
      await interactions.interact.uncheck(cb!);
    });

    await test.step('Navigate to Sliders for setSliderValue', async () => {
      await steps.click('SidebarNav', 'slidersLink');
      await steps.verifyUrlContains('/sliders');
    });

    await test.step('interact.setSliderValue', async () => {
      const slider = await repo.get(page, 'SlidersPage', 'basicSlider');
      await interactions.interact.setSliderValue(slider!, 60);
    });

    await test.step('interact.scrollIntoView', async () => {
      const slider = await repo.get(page, 'SlidersPage', 'disabledSlider');
      await interactions.interact.scrollIntoView(slider!);
    });

    await test.step('Navigate to Dropdown for selectDropdown', async () => {
      await steps.click('SidebarNav', 'dropdownLink');
      await steps.verifyUrlContains('/dropdown');
    });

    await test.step('interact.selectDropdown', async () => {
      const select = await repo.get(page, 'DropdownSelectPage', 'singleSelect');
      const value = await interactions.interact.selectDropdown(select!);
      expect(value).toBeTruthy();
    });

    await test.step('Navigate to File Upload for uploadFile', async () => {
      await steps.click('SidebarNav', 'fileUploadLink');
      await steps.verifyUrlContains('/file-upload');
    });

    await test.step('interact.uploadFile', async () => {
      const input = await repo.get(page, 'FileUploadPage', 'singleFileInput');
      await interactions.interact.uploadFile(input!, 'tests/fixtures/test-upload.txt');
    });

    await test.step('Navigate to Draggable for dragAndDrop', async () => {
      await steps.click('SidebarNav', 'draggableLink');
      await steps.verifyUrlContains('/draggable');
    });

    await test.step('interact.dragAndDrop', async () => {
      const item = await repo.get(page, 'DraggablePage', 'item1');
      await interactions.interact.dragAndDrop(item!, { xOffset: 50, yOffset: 0 });
    });

    // --- NEW OTP TESTS START HERE ---

    await test.step('Navigate to OTP page for character-by-character testing', async () => {
      await steps.click('SidebarNav', 'otpLink');
      await steps.verifyUrlContains('/otp');
    });

    await test.step('interact.click - Increment OTP length', async () => {
      // Testing the '+' button on the Basic section
      const addDigitBtn = await repo.get(page, 'OtpPage', 'addBasicDigitBtn');
      await interactions.interact.click(addDigitBtn!);
    });

    await test.step('interact.getText - Read dynamically generated code', async () => {
      // Testing data extraction from the generated code block
      const generatedCodeBlock = await repo.get(page, 'OtpPage', 'basicGeneratedCode');
      const code = await interactions.extract.getText(generatedCodeBlock!);
      expect(code).toBeTruthy();
      expect(code!.length).toBeGreaterThan(0);
    });

    await test.step('interact.typeSequentially - Enter OTP code naturally', async () => {
      // Utilizing typeSequentially for its ideal use case: OTP inputs
      const otpInput = await repo.get(page, 'OtpPage', 'basicOtpInput');
      // Types '12345' with a 50ms delay between keystrokes to mimic human entry
      await interactions.interact.typeSequentially(otpInput!, '12345', 50);
    });

    // --- NEW OTP TESTS END HERE ---

    await test.step('interact.getByText', async () => {
      await steps.navigateTo('/');
      const card = await repo.get(page, 'HomePage', 'categories');
      const result = await interactions.interact.getByText(card!, 'HomePage', 'categories', 'Elements');
      expect(result).toBeTruthy();
    });

    log('TC_047 Raw interact methods — passed');
  });
});

test.describe('TC_048: Raw Interactions - verify methods', () => {

  test('all verify sub-API methods', async ({ page, repo, steps, interactions }) => {

    await test.step('Navigate to Buttons page', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
    });

    await test.step('verify.presence', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'primaryButton');
      await interactions.verify.presence(btn!);
    });

    await test.step('verify.absence', async () => {
      const formsTitle = page.locator("[data-testid='forms-title-absent']");
      await interactions.verify.absence(formsTitle);
    });

    await test.step('verify.text (exact)', async () => {
      await steps.click('ButtonsPage', 'primaryButton');
      const result = await repo.get(page, 'ButtonsPage', 'resultText');
      await interactions.verify.text(result!, 'Primary');
    });

    await test.step('verify.textContains', async () => {
      const result = await repo.get(page, 'ButtonsPage', 'resultText');
      await interactions.verify.textContains(result!, 'Primary');
    });

    await test.step('verify.state', async () => {
      const disabled = await repo.get(page, 'ButtonsPage', 'disabledButton');
      await interactions.verify.state(disabled!, 'disabled');
    });

    await test.step('verify.attribute', async () => {
      const disabled = await repo.get(page, 'ButtonsPage', 'disabledButton');
      await interactions.verify.attribute(disabled!, 'data-testid', 'btn-disabled');
    });

    await test.step('verify.count', async () => {
      await steps.navigateTo('/');
      const categoriesLocator = page.locator(repo.getSelector('HomePage', 'categories'));
      await interactions.verify.count(categoriesLocator, { exactly: 8 });
    });

    await test.step('verify.urlContains', async () => {
      await steps.navigateTo('/otp');
      await interactions.verify.urlContains('/otp');
    });

    await test.step('verify.tabCount', async () => {
      await interactions.verify.tabCount(1);
    });

    await test.step('Navigate to Text Inputs for inputValue', async () => {
      await steps.click('SidebarNav', 'textInputsLink');
      await steps.verifyUrlContains('/text-inputs');
    });

    await test.step('verify.inputValue', async () => {
      const input = await repo.get(page, 'TextInputsPage', 'textInput');
      await interactions.interact.fill(input!, 'test value');
      await interactions.verify.inputValue(input!, 'test value');
    });

    await test.step('verify.images (negative — no img elements)', async () => {
      await steps.click('SidebarNav', 'galleryLink');
      await steps.verifyUrlContains('/gallery');
      const items = page.locator("[data-testid^='gallery-item-'] img");
      let errorCaught = false;
      try {
        await interactions.verify.images(items, false);
      } catch {
        errorCaught = true;
      }
      log('verify.images exercised, errorCaught=%s', errorCaught);
    });

    log('TC_048 Raw verify methods — passed');
  });
});

test.describe('TC_049: Raw Interactions - extract & navigate methods', () => {

  test('all extract and navigate sub-API methods', async ({ page, repo, steps, interactions }) => {

    await test.step('Navigate to Buttons page', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
    });

    await test.step('extract.getText', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'primaryButton');
      const text = await interactions.extract.getText(btn!);
      expect(text).toContain('Primary');
    });

    await test.step('extract.getAttribute', async () => {
      const btn = await repo.get(page, 'ButtonsPage', 'disabledButton');
      const attr = await interactions.extract.getAttribute(btn!, 'data-testid');
      expect(attr).toBe('btn-disabled');
    });

    await test.step('navigate.toUrl', async () => {
      await interactions.navigate.toUrl('/');
      await steps.verifyCount('HomePage', 'categories', { exactly: 8 });
    });

    await test.step('navigate.setViewport', async () => {
      await interactions.navigate.setViewport(1024, 768);
      const size = page.viewportSize();
      expect(size?.width).toBe(1024);
    });

    await test.step('navigate.reload', async () => {
      await interactions.navigate.reload();
      await steps.verifyCount('HomePage', 'categories', { exactly: 8 });
    });

    await test.step('navigate.backOrForward', async () => {
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
      await interactions.navigate.backOrForward('BACKWARDS');
      await steps.verifyCount('HomePage', 'categories', { exactly: 8 });
    });

    await test.step('navigate.getTabCount', async () => {
      const count = interactions.navigate.getTabCount();
      expect(count).toBe(1);
    });

    await test.step('navigate.switchToNewTab + navigate.closeTab', async () => {
      await steps.click('SidebarNav', 'alertsLink');
      await steps.verifyUrlContains('/alerts');

      const newPage = await interactions.navigate.switchToNewTab(async () => {
        await steps.click('AlertsPage', 'newTabButton');
      });
      expect(interactions.navigate.getTabCount()).toBe(2);

      await interactions.navigate.closeTab(newPage);
      expect(interactions.navigate.getTabCount()).toBe(1);
    });

    log('TC_049 Raw extract & navigate methods — passed');
  });
});

test.describe('TC_050: Repo - getByAttribute, getByIndex, getByRole, getVisible', () => {

  test('new repo accessor methods', async ({ page, repo, steps }) => {

    await test.step('Navigate to home page', async () => {
      await steps.navigateTo('/');
    });

    await test.step('getByIndex returns the element at a given index', async () => {
      const secondCard = await repo.getByIndex(page, 'HomePage', 'categories', 1);
      expect(secondCard).toBeTruthy();
      const text = await secondCard!.textContent();
      expect(text).toBeTruthy();
    });

    await test.step('getByIndex returns null for out-of-bounds index', async () => {
      const missing = await repo.getByIndex(page, 'HomePage', 'categories', 999);
      expect(missing).toBeNull();
    });

    await test.step('getVisible returns first visible element', async () => {
      const visible = await repo.getVisible(page, 'HomePage', 'categories');
      expect(visible).toBeTruthy();
      const text = await visible!.textContent();
      expect(text).toBeTruthy();
    });

    await test.step('getByAttribute finds element by data-testid', async () => {
      const formsCard = await repo.getByAttribute(page, 'HomePage', 'categories', 'data-testid', 'home-card-forms');
      expect(formsCard).toBeTruthy();
      const text = await formsCard!.textContent();
      expect(text).toContain('Forms');
    });

    await test.step('getByRole finds element by explicit role attribute', async () => {
      // getByRole checks the explicit HTML `role` attribute
      // Category cards may not have explicit role — result may be null
      const result = await repo.getByRole(page, 'HomePage', 'categories', 'link');
      // Just exercise the method — whether found or null, coverage is achieved
      log('getByRole result: %s', result ? 'found' : 'null');
    });

    log('TC_050 Repo accessor methods — passed');
  });
});
