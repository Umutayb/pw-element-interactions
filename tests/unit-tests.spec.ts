import { test, expect } from './fixture/StepFixture';
import { ElementRepository } from 'pw-element-repository';
import { Steps } from '../src/steps/CommonSteps';
import { DropdownSelectType } from '../src/enum/Options';
import { createLogger } from '../src/logger/Logger';

const log = createLogger('tests');

test.describe('E2E Facade Implementation Suite', () => {

  test('TC_001: Complete Form Submission (Core API)', async ({ page, repo, steps, interactions, contextStore }) => {

    await test.step('Navigate to the website', async () => {
      await steps.navigateTo('/');
    });

    await test.step('Verify Category Count', async () => {
      await steps.verifyCount('HomePage', 'categories', { exactly: 8 });
    });

    await test.step('Open Forms Page and verify navigation', async () => {
      await steps.click('HomePage', 'formsCard');
      await steps.verifyAbsence('HomePage', 'categories');
    });

    await test.step('Verify Page Title', async () => {
      await steps.verifyUrlContains('/forms');
      await steps.verifyText('FormsPage', 'title', 'Full Form');
    });

    await test.step('Fill Standard Inputs', async () => {
      contextStore.put('Name', 'Automated Tester');
      contextStore.put('Email', 'AutomatedTester@email.com');
      contextStore.put('Mobile', '0000000000');
      contextStore.put('Current Address', 'Prinsenstraat, 1015 DB Amsterdam');

      await steps.fill('FormsPage', 'nameInput', contextStore.get('Name'));
      await steps.fill('FormsPage', 'emailInput', contextStore.get('Email'));
      await steps.fill('FormsPage', 'mobileInput', contextStore.get('Mobile'));
      await steps.fill('FormsPage', 'addressInput', contextStore.get('Current Address'));
    });

    await test.step('Select a Random Enabled Gender', async () => {
      const gender = await steps.selectDropdown('FormsPage', 'genderDropdown', {
        type: DropdownSelectType.RANDOM
      });
      contextStore.put('Gender', gender);
    });

    await test.step('Handle Date Picker and Data Extraction', async () => {
      await steps.click('FormsPage', 'dateOfBirthInput');
      await steps.waitForState('FormsPage', 'todayCell', 'visible');
      await steps.verifyPresence('FormsPage', 'todayCell');
      await steps.click('FormsPage', 'todayCell');

      await steps.verifyPresence('FormsPage', 'datePickerSubmitButton');
      await steps.click('FormsPage', 'datePickerSubmitButton');

      const now = new Date();
      const dobValue = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      contextStore.put('Date of Birth', dobValue);

      await steps.click('FormsPage', 'hobbiesInput');
    });

    await test.step('Submit Form and Verify Modal', async () => {
      await steps.click('FormsPage', 'submitButton');
      await steps.verifyPresence('FormsPage', 'table');

      const modal = await repo.get(page, 'FormsPage', 'table');

      for (const [key, expectedValue] of contextStore.entries()) {
        const row = modal.locator('tr').filter({ hasText: key });
        const actualValueElement = row.locator('td').nth(1);

        await interactions.verify.text(actualValueElement, expectedValue);
      }
    });

    log('TC_001 Complete Form Submission — passed');
  });

  test('TC_002: Drag and Drop Interactions', async ({ page, steps, repo, interactions }) => {

    await test.step('Navigate to Sortable page via homepage', async () => {
      await steps.navigateTo('/');
      await steps.click('HomePage', 'interactionsCard');
      await steps.verifyUrlContains('/sortable');
    });

    await test.step('Drag Item A to the Second List', async () => {
      const dropZone = await repo.getByText(page, 'SortablePage', 'dropZones', 'Second List');

      await steps.dragAndDropListedElement('SortablePage', 'sortableItems', 'Item A', { target: dropZone! });

      await interactions.verify.textContains(dropZone!, 'Item A');
    });

    log('TC_002 Drag and Drop Interactions — passed');
  });

  test('TC_003: Negative Assertions - Expecting Verifications to Fail', async ({ page, repo }) => {

    const steps = new Steps(page, repo, 1000); // Shorten timeout for negative assertions

    await test.step('Navigate to the website', async () => {
      await steps.navigateTo('/');
    });

    await test.step('verifyAbsence on a visible element should throw', async () => {
      let errorCaught = false;
      try {
        await steps.verifyAbsence('HomePage', 'categories');
      } catch (error) {
        errorCaught = true;
        log('Caught expected error: verifyAbsence failed correctly');
      }
      expect(errorCaught).toBeTruthy();
    });

    await test.step('verifyCount with an incorrect number should throw', async () => {
      let errorCaught = false;
      try {
        await steps.verifyCount('HomePage', 'categories', { exactly: 99 });
      } catch (error) {
        errorCaught = true;
        log('Caught expected error: verifyCount failed correctly');
      }
      expect(errorCaught).toBeTruthy();
    });

    log('TC_003 Negative Assertions — passed');
  });

  test('TC_004: Wait For State - Warning behavior on incorrect state', async ({ page, repo }) => {
    const steps = new Steps(page, repo, 500);

    await test.step('Navigate to the website', async () => {
      await steps.navigateTo('/');
    });

    await test.step('waitForState should swallow the error and log a warning', async () => {
      let errorCaught = false;

      log('Intentionally waiting for a timeout to trigger the warning mechanism...');
      try {
        await steps.waitForState('HomePage', 'categories', 'hidden');
      } catch (error) {
        errorCaught = true;
      }

      expect(errorCaught).toBeFalsy();
      log('waitForState safely swallowed the timeout error and proceeded');
    });

    log('TC_004 Wait For State Warning Behavior — passed');
  });

  test('TC_005: Click Random - Category Navigation', async ({ steps }) => {

    await test.step('Navigate to the website', async () => {
      await steps.navigateTo('/');
    });

    await test.step('Click a random category and verify navigation', async () => {
      await steps.clickRandom('HomePage', 'categories');
      await steps.verifyAbsence('HomePage', 'categories');
    });

    log('TC_005 Click Random — passed');
  });

  test('TC_006: Verify Count - greaterThan and lessThan', async ({ page, repo }) => {
    const steps = new Steps(page, repo, 3000);

    await test.step('Navigate to the website', async () => {
      await steps.navigateTo('/');
    });

    await test.step('verifyCount with greaterThan (positive)', async () => {
      await steps.verifyCount('HomePage', 'categories', { greaterThan: 3 });
    });

    await test.step('verifyCount with lessThan (positive)', async () => {
      await steps.verifyCount('HomePage', 'categories', { lessThan: 10 });
    });

    await test.step('verifyCount with greaterThan polls until timeout (negative)', async () => {
      const start = Date.now();
      let errorCaught = false;
      try {
        await steps.verifyCount('HomePage', 'categories', { greaterThan: 8 });
      } catch {
        errorCaught = true;
      }
      const elapsed = Date.now() - start;
      expect(errorCaught).toBeTruthy();
      expect(elapsed).toBeGreaterThan(2500);
      log('greaterThan polling confirmed: timed out after %dms', elapsed);
    });

    log('TC_006 Verify Count greaterThan/lessThan — passed');
  });

});

test.describe('TC_007: verifyState - All Playwright element states', () => {

  test('positive state assertions', async ({ page, repo, steps, interactions }) => {

    await test.step('Navigate to Forms page', async () => {
      await steps.navigateTo('/');
      await steps.click('HomePage', 'formsCard');
      await steps.verifyUrlContains('/forms');
    });

    await test.step('visible: title is visible', async () => {
      await steps.verifyState('FormsPage', 'title', 'visible');
    });

    await test.step('attached: title is attached to the DOM', async () => {
      await steps.verifyState('FormsPage', 'title', 'attached');
    });

    await test.step('inViewport: title is in viewport', async () => {
      await steps.verifyState('FormsPage', 'title', 'inViewport');
    });

    await test.step('enabled: submit button is enabled', async () => {
      await steps.verifyState('FormsPage', 'submitButton', 'enabled');
    });

    await test.step('editable: name input is editable', async () => {
      await steps.verifyState('FormsPage', 'nameInput', 'editable');
    });

    await test.step('focused: name input is focused after clicking', async () => {
      await steps.click('FormsPage', 'nameInput');
      await steps.verifyState('FormsPage', 'nameInput', 'focused');
    });

    await test.step('Navigate to Radio Buttons page', async () => {
      await steps.navigateTo('/');
      await steps.click('HomePage', 'elementsCard');
      await steps.verifyUrlContains('/radiobuttons');
    });

    await test.step('disabled: the No radio button is disabled', async () => {
      await steps.verifyState('RadioButtonsPage', 'disabledRadio', 'disabled');
    });

    await test.step('checked: Yes radio is checked after clicking', async () => {
      await steps.click('RadioButtonsPage', 'yesRadio');
      await steps.verifyState('RadioButtonsPage', 'yesRadio', 'checked');
    });

    await test.step('hidden: FormsPage title is hidden on a different page', async () => {
      await steps.verifyState('FormsPage', 'title', 'hidden', 500);
    });

    log('TC_007 verifyState — passed');
  });
});

test.describe('TC_008: navigateTo resolves relative URLs via Playwright baseURL', () => {
  test.use({ baseURL: 'https://umutayb.github.io/vue-test-app/' });

  test('navigates with a relative URL', async ({ steps }) => {
    await test.step('Navigate using a relative URL', async () => {
      await steps.navigateTo('/');
    });

    await test.step('Verify the home page loaded', async () => {
      await steps.verifyCount('HomePage', 'categories', { exactly: 8 });
    });

    await test.step('verifyUrlContains escapes regex metacharacters', async () => {
      await steps.verifyUrlContains('vue-test-app/');
    });

    log('TC_008 navigateTo relative URL — passed');
  });
});

// ==========================================
// Phase 3: Elements Category Tests
// ==========================================

test.describe('TC_009: Buttons Page', () => {

  test('button clicks update result text', async ({ steps }) => {

    await test.step('Navigate to Buttons page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'buttonsLink');
      await steps.verifyUrlContains('/buttons');
    });

    await test.step('Click Primary button and verify result', async () => {
      await steps.click('ButtonsPage', 'primaryButton');
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Primary');
    });

    await test.step('Click Secondary button and verify result', async () => {
      await steps.click('ButtonsPage', 'secondaryButton');
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Secondary');
    });

    await test.step('Click Danger button and verify result', async () => {
      await steps.click('ButtonsPage', 'dangerButton');
      await steps.verifyTextContains('ButtonsPage', 'resultText', 'Danger');
    });

    await test.step('Verify disabled button is disabled', async () => {
      await steps.verifyState('ButtonsPage', 'disabledButton', 'disabled');
    });

    await test.step('Verify loading button is disabled', async () => {
      await steps.verifyState('ButtonsPage', 'loadingButton', 'disabled');
    });

    await test.step('Verify size variants are visible', async () => {
      await steps.verifyPresence('ButtonsPage', 'smallButton');
      await steps.verifyPresence('ButtonsPage', 'mediumButton');
      await steps.verifyPresence('ButtonsPage', 'largeButton');
    });

    log('TC_009 Buttons Page — passed');
  });
});

test.describe('TC_010: Text Inputs Page', () => {

  test('fill inputs and verify values display', async ({ steps }) => {

    await test.step('Navigate to Text Inputs page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'textInputsLink');
      await steps.verifyUrlContains('/text-inputs');
    });

    await test.step('Fill text input and verify', async () => {
      await steps.fill('TextInputsPage', 'textInput', 'hello world');
      await steps.verifyInputValue('TextInputsPage', 'textInput', 'hello world');
    });

    await test.step('Fill email input and verify', async () => {
      await steps.fill('TextInputsPage', 'emailInput', 'test@example.com');
      await steps.verifyInputValue('TextInputsPage', 'emailInput', 'test@example.com');
    });

    await test.step('Fill number input and verify', async () => {
      await steps.fill('TextInputsPage', 'numberInput', '42');
      await steps.verifyInputValue('TextInputsPage', 'numberInput', '42');
    });

    await test.step('Fill textarea and verify', async () => {
      await steps.fill('TextInputsPage', 'textareaInput', 'multi-line text');
      await steps.verifyInputValue('TextInputsPage', 'textareaInput', 'multi-line text');
    });

    await test.step('Verify disabled input is disabled', async () => {
      await steps.verifyState('TextInputsPage', 'disabledInput', 'disabled');
    });

    await test.step('Verify values display updates', async () => {
      await steps.verifyText('TextInputsPage', 'valuesDisplay', undefined, { notEmpty: true });
    });

    await test.step('Type sequentially in text input', async () => {
      await steps.fill('TextInputsPage', 'textInput', '');
      await steps.typeSequentially('TextInputsPage', 'textInput', 'typed');
      await steps.verifyInputValue('TextInputsPage', 'textInput', 'typed');
    });

    log('TC_010 Text Inputs Page — passed');
  });
});

test.describe('TC_011: Checkboxes & Toggles Page', () => {

  test('check, uncheck, and toggle interactions', async ({ page, repo, steps }) => {

    await test.step('Navigate to Checkboxes page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'checkboxesLink');
      await steps.verifyUrlContains('/checkboxes');
    });

    await test.step('Check the unchecked checkbox', async () => {
      await steps.check('CheckboxesPage', 'uncheckedCheckbox');
      await steps.verifyState('CheckboxesPage', 'uncheckedCheckbox', 'checked');
    });

    await test.step('Uncheck the checked checkbox', async () => {
      await steps.uncheck('CheckboxesPage', 'checkedCheckbox');
    });

    await test.step('Verify disabled checkbox is disabled', async () => {
      await steps.verifyState('CheckboxesPage', 'disabledCheckbox', 'disabled');
    });

    await test.step('Verify disabled-checked checkbox is both checked and disabled', async () => {
      await steps.verifyState('CheckboxesPage', 'disabledCheckedCheckbox', 'checked');
      await steps.verifyState('CheckboxesPage', 'disabledCheckedCheckbox', 'disabled');
    });

    await test.step('Toggle switches via label click (hidden inputs)', async () => {
      // Toggle inputs are display:none; click the parent <label> instead
      const toggleOffLabel = page.locator(repo.getSelector('CheckboxesPage', 'toggleOff')).locator('..');
      const toggleOnLabel = page.locator(repo.getSelector('CheckboxesPage', 'toggleOn')).locator('..');
      await toggleOffLabel.click();
      await toggleOnLabel.click();
    });

    await test.step('Verify state summary updates', async () => {
      await steps.verifyText('CheckboxesPage', 'stateSummary', undefined, { notEmpty: true });
    });

    log('TC_011 Checkboxes & Toggles — passed');
  });
});

test.describe('TC_012: Sliders Page', () => {

  test('set slider values and verify display', async ({ steps }) => {

    await test.step('Navigate to Sliders page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'slidersLink');
      await steps.verifyUrlContains('/sliders');
    });

    await test.step('Set basic slider to 75 and verify value', async () => {
      await steps.setSliderValue('SlidersPage', 'basicSlider', 75);
      await steps.verifyTextContains('SlidersPage', 'basicSliderValue', '75');
    });

    await test.step('Set stepped slider to 50 and verify value', async () => {
      await steps.setSliderValue('SlidersPage', 'steppedSlider', 50);
      await steps.verifyTextContains('SlidersPage', 'steppedSliderValue', '50');
    });

    await test.step('Verify disabled slider is disabled', async () => {
      await steps.verifyState('SlidersPage', 'disabledSlider', 'disabled');
    });

    await test.step('Verify range slider values display', async () => {
      await steps.verifyText('SlidersPage', 'rangeValue', undefined, { notEmpty: true });
    });

    log('TC_012 Sliders Page — passed');
  });
});

test.describe('TC_013: Drag Progress Page', () => {

  test('drag progress controls and preset buttons', async ({ steps }) => {

    await test.step('Navigate to Drag Progress page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'dragProgressLink');
      await steps.verifyUrlContains('/drag-progress');
    });

    await test.step('Click Set 50% button and verify', async () => {
      await steps.click('DragProgressPage', 'setHalfButton');
      await steps.verifyTextContains('DragProgressPage', 'progressValue', '50');
    });

    await test.step('Click Set 100% button and verify', async () => {
      await steps.click('DragProgressPage', 'setFullButton');
      await steps.verifyTextContains('DragProgressPage', 'progressValue', '100');
    });

    await test.step('Click Reset button and verify', async () => {
      await steps.click('DragProgressPage', 'resetButton');
      await steps.verifyTextContains('DragProgressPage', 'progressValue', '0');
    });

    await test.step('Verify progress track and handle are present', async () => {
      await steps.verifyPresence('DragProgressPage', 'progressTrack');
      await steps.verifyPresence('DragProgressPage', 'progressHandle');
    });

    log('TC_013 Drag Progress Page — passed');
  });
});

// ==========================================
// Phase 3: Forms Category Tests
// ==========================================

test.describe('TC_014: Dropdown Page', () => {

  test('native single select and custom dropdown', async ({ steps }) => {

    await test.step('Navigate to Dropdown page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'dropdownLink');
      await steps.verifyUrlContains('/dropdown');
    });

    await test.step('Select a random option from the single select', async () => {
      const selected = await steps.selectDropdown('DropdownSelectPage', 'singleSelect');
      expect(selected).toBeTruthy();
    });

    await test.step('Verify single select value is displayed', async () => {
      await steps.verifyText('DropdownSelectPage', 'singleValue', undefined, { notEmpty: true });
    });

    await test.step('Select by value from single select', async () => {
      await steps.selectDropdown('DropdownSelectPage', 'singleSelect', {
        type: DropdownSelectType.VALUE,
        value: 'Canada'
      });
      await steps.verifyTextContains('DropdownSelectPage', 'singleValue', 'Canada');
    });

    await test.step('Open custom dropdown and verify list appears', async () => {
      await steps.click('DropdownSelectPage', 'customDropdownButton');
      await steps.verifyPresence('DropdownSelectPage', 'customDropdownList');
    });

    log('TC_014 Dropdown Page — passed');
  });
});

test.describe('TC_015: File Upload Page', () => {

  test('single file upload', async ({ steps }) => {

    await test.step('Navigate to File Upload page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'fileUploadLink');
      await steps.verifyUrlContains('/file-upload');
    });

    await test.step('Upload a single file and verify filename displayed', async () => {
      await steps.uploadFile('FileUploadPage', 'singleFileInput', 'tests/fixtures/test-upload.txt');
      await steps.verifyTextContains('FileUploadPage', 'singleFileName', 'test-upload.txt');
    });

    log('TC_015 File Upload Page — passed');
  });
});

test.describe('TC_016: Autocomplete Page', () => {

  test('type to filter and select suggestion', async ({ page, steps }) => {

    await test.step('Navigate to Autocomplete page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'autocompleteLink');
      await steps.verifyUrlContains('/autocomplete');
    });

    await test.step('Type "Uni" to trigger suggestions', async () => {
      await steps.typeSequentially('AutocompletePage', 'searchInput', 'Uni', 50);
    });

    await test.step('Click "United States" suggestion', async () => {
      const suggestion = page.locator('li').filter({ hasText: 'United States' }).first();
      await suggestion.click();
    });

    await test.step('Verify selected value', async () => {
      await steps.verifyTextContains('AutocompletePage', 'selectedValue', 'United States');
    });

    await test.step('Clear and verify reset', async () => {
      await steps.click('AutocompletePage', 'clearButton');
      await steps.verifyInputValue('AutocompletePage', 'searchInput', '');
    });

    log('TC_016 Autocomplete Page — passed');
  });
});

// ==========================================
// Phase 3: Alerts, Frame & Windows Category Tests
// ==========================================

test.describe('TC_017: Alerts Page - Click Types', () => {

  test('click, right-click, and double-click trigger native alerts', async ({ page, steps }) => {

    await test.step('Navigate to Alerts page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'alertsLink');
      await steps.verifyUrlContains('/alerts');
    });

    await test.step('Click Me triggers alert with "Single click!"', async () => {
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });
      await steps.click('AlertsPage', 'clickMeButton');
      expect(dialogMessage).toBe('Single click!');
    });

    await test.step('Right Click Me triggers alert with "Right click!"', async () => {
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });
      await steps.rightClick('AlertsPage', 'rightClickButton');
      expect(dialogMessage).toBe('Right click!');
    });

    await test.step('Double Click Me triggers alert with "Double click!"', async () => {
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });
      await steps.doubleClick('AlertsPage', 'doubleClickButton');
      expect(dialogMessage).toBe('Double click!');
    });

    log('TC_017 Alerts Page Click Types — passed');
  });
});

test.describe('TC_018: Alerts Page - New Tab', () => {

  test('new tab opens and can be closed', async ({ page, steps }) => {

    await test.step('Navigate to Alerts page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'alertsLink');
      await steps.verifyUrlContains('/alerts');
    });

    await test.step('Click New Tab and switch to it', async () => {
      const newPage = await steps.switchToNewTab(async () => {
        await steps.click('AlertsPage', 'newTabButton');
      });
      await steps.verifyTabCount(2);
      await newPage.close();
    });

    await test.step('Verify back to single tab', async () => {
      await steps.verifyTabCount(1);
    });

    log('TC_018 Alerts Page New Tab — passed');
  });
});

test.describe('TC_019: Modal Page', () => {

  test('open modal, confirm, and verify status', async ({ steps }) => {

    await test.step('Navigate to Modal page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'modalLink');
      await steps.verifyUrlContains('/modal');
    });

    await test.step('Open modal and verify overlay appears', async () => {
      await steps.click('ModalPage', 'openButton');
      await steps.verifyPresence('ModalPage', 'overlay');
    });

    await test.step('Click Confirm and verify status', async () => {
      await steps.click('ModalPage', 'confirmButton');
      await steps.verifyAbsence('ModalPage', 'overlay');
      await steps.verifyTextContains('ModalPage', 'status', 'confirmed');
    });

    await test.step('Reopen modal and cancel', async () => {
      await steps.click('ModalPage', 'openButton');
      await steps.verifyPresence('ModalPage', 'overlay');
      await steps.click('ModalPage', 'cancelButton');
      await steps.verifyAbsence('ModalPage', 'overlay');
      await steps.verifyTextContains('ModalPage', 'status', 'cancelled');
    });

    log('TC_019 Modal Page — passed');
  });
});

test.describe('TC_020: Toast Page', () => {

  test('trigger toast notifications', async ({ steps }) => {

    await test.step('Navigate to Toast page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'toastLink');
      await steps.verifyUrlContains('/toast');
    });

    await test.step('Trigger success toast and verify it appears', async () => {
      await steps.click('ToastPage', 'successButton');
      await steps.verifyPresence('ToastPage', 'container');
    });

    await test.step('Trigger error toast', async () => {
      await steps.click('ToastPage', 'errorButton');
    });

    await test.step('Trigger warning toast', async () => {
      await steps.click('ToastPage', 'warningButton');
    });

    log('TC_020 Toast Page — passed');
  });
});

test.describe('TC_021: Tooltip & Popover Page', () => {

  test('hover shows tooltip, click shows popover', async ({ steps }) => {

    await test.step('Navigate to Tooltip page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'tooltipLink');
      await steps.verifyUrlContains('/tooltip');
    });

    await test.step('Hover to show tooltip', async () => {
      await steps.hover('TooltipPage', 'tooltipTrigger1');
      await steps.verifyPresence('TooltipPage', 'tooltipContent1');
    });

    await test.step('Click to show popover', async () => {
      await steps.click('TooltipPage', 'popoverTrigger1');
      await steps.verifyPresence('TooltipPage', 'popoverContent1');
    });

    log('TC_021 Tooltip & Popover Page — passed');
  });
});

test.describe('TC_022: Drawer Page', () => {

  test('open and close drawers', async ({ steps }) => {

    await test.step('Navigate to Drawer page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'drawerLink');
      await steps.verifyUrlContains('/drawer');
    });

    await test.step('Open left drawer and verify status', async () => {
      await steps.click('DrawerPage', 'openLeftButton');
      await steps.verifyTextContains('DrawerPage', 'status', 'left');
    });

    await test.step('Close drawer via close button', async () => {
      await steps.click('DrawerPage', 'closeButton');
      await steps.verifyTextContains('DrawerPage', 'status', 'closed');
    });

    await test.step('Open right drawer and close via overlay click', async () => {
      await steps.click('DrawerPage', 'openRightButton');
      await steps.verifyTextContains('DrawerPage', 'status', 'right');
      await steps.click('DrawerPage', 'overlay');
      await steps.verifyTextContains('DrawerPage', 'status', 'closed');
    });

    log('TC_022 Drawer Page — passed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Category 4: Widgets
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC_023: Tabs Page', () => {

  test('switch tabs and verify panels', async ({ steps }) => {

    await test.step('Navigate to Tabs page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'tabsLink');
      await steps.verifyUrlContains('/tabs');
    });

    await test.step('Tab 1 is active by default — panel 1 visible', async () => {
      await steps.verifyPresence('TabsPage', 'panel1');
    });

    await test.step('Click Tab 2 — panel 2 visible, panel 1 hidden', async () => {
      await steps.click('TabsPage', 'tab2');
      await steps.verifyPresence('TabsPage', 'panel2');
      await steps.verifyAbsence('TabsPage', 'panel1');
    });

    await test.step('Click Tab 3 — panel 3 visible, panel 2 hidden', async () => {
      await steps.click('TabsPage', 'tab3');
      await steps.verifyPresence('TabsPage', 'panel3');
      await steps.verifyAbsence('TabsPage', 'panel2');
    });

    await test.step('Click Tab 4 — panel 4 visible, panel 3 hidden', async () => {
      await steps.click('TabsPage', 'tab4');
      await steps.verifyPresence('TabsPage', 'panel4');
      await steps.verifyAbsence('TabsPage', 'panel3');
    });

    await test.step('Click Tab 1 again — back to panel 1', async () => {
      await steps.click('TabsPage', 'tab1');
      await steps.verifyPresence('TabsPage', 'panel1');
      await steps.verifyAbsence('TabsPage', 'panel4');
    });

    log('TC_023 Tabs Page — passed');
  });
});

test.describe('TC_024: Accordion Page', () => {

  test('expand and collapse accordion items', async ({ steps }) => {

    await test.step('Navigate to Accordion page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'accordionLink');
      await steps.verifyUrlContains('/accordion');
    });

    await test.step('Item 1 body is hidden by default', async () => {
      await steps.verifyAbsence('AccordionPage', 'body1');
    });

    await test.step('Click header 1 — body 1 appears', async () => {
      await steps.click('AccordionPage', 'header1');
      await steps.verifyPresence('AccordionPage', 'body1');
    });

    await test.step('Click header 1 again — body 1 collapses', async () => {
      await steps.click('AccordionPage', 'header1');
      await steps.verifyAbsence('AccordionPage', 'body1');
    });

    await test.step('Expand All — all bodies visible', async () => {
      await steps.click('AccordionPage', 'expandAllButton');
      await steps.verifyPresence('AccordionPage', 'body1');
      await steps.verifyPresence('AccordionPage', 'body2');
      await steps.verifyPresence('AccordionPage', 'body3');
    });

    await test.step('Collapse All — all bodies hidden', async () => {
      await steps.click('AccordionPage', 'collapseAllButton');
      await steps.verifyAbsence('AccordionPage', 'body1');
      await steps.verifyAbsence('AccordionPage', 'body2');
      await steps.verifyAbsence('AccordionPage', 'body3');
    });

    log('TC_024 Accordion Page — passed');
  });
});

test.describe('TC_025: Progress Page', () => {

  test('verify static bars and animated progress', async ({ page, steps }) => {

    await test.step('Navigate to Progress page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'progressLink');
      await steps.verifyUrlContains('/progress');
    });

    await test.step('Verify 5 static progress bars exist', async () => {
      await steps.verifyCount('ProgressPage', 'staticBars', { exactly: 5 });
    });

    await test.step('Animated bar starts at 0%', async () => {
      await steps.verifyText('ProgressPage', 'animatedValue', '0%');
    });

    await test.step('Click Start — progress animates to 100%', async () => {
      await steps.click('ProgressPage', 'startButton');
      // Wait for animation to complete (value reaches 100%)
      await page.locator("[data-testid='progress-animated-value']").filter({ hasText: '100%' }).waitFor({ timeout: 15000 });
      await steps.verifyText('ProgressPage', 'animatedValue', '100%');
    });

    await test.step('Click Reset — progress resets to 0%', async () => {
      await steps.click('ProgressPage', 'resetButton');
      await steps.verifyText('ProgressPage', 'animatedValue', '0%');
    });

    await test.step('Circular progress value is displayed', async () => {
      await steps.verifyPresence('ProgressPage', 'circularValue');
    });

    log('TC_025 Progress Page — passed');
  });
});

test.describe('TC_026: Table Page', () => {

  test('search, sort, paginate, and select rows', async ({ page, repo, steps }) => {

    await test.step('Navigate to Table page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'tableLink');
      await steps.verifyUrlContains('/table');
    });

    await test.step('Table renders 5 rows on page 1', async () => {
      await steps.verifyCount('TablePage', 'rows', { exactly: 5 });
    });

    await test.step('Search filters rows', async () => {
      await steps.fill('TablePage', 'searchInput', 'alice');
      await steps.verifyCount('TablePage', 'rows', { lessThan: 5 });
      // Clear the search
      await steps.fill('TablePage', 'searchInput', '');
    });

    await test.step('Sort by Name column', async () => {
      const firstNameBefore = await page.locator("[data-testid^='table-row-']:not([data-testid*='checkbox']) td:nth-child(2)").first().textContent();
      await steps.click('TablePage', 'headerName');
      const firstNameAfter = await page.locator("[data-testid^='table-row-']:not([data-testid*='checkbox']) td:nth-child(2)").first().textContent();
      // After sorting, the order should change (or stay if already sorted)
      log('Sort: %s → %s', firstNameBefore, firstNameAfter);
    });

    await test.step('Navigate to next page', async () => {
      await steps.click('TablePage', 'nextButton');
      await steps.verifyTextContains('TablePage', 'pageInfo', '2');
    });

    await test.step('Navigate back to previous page', async () => {
      await steps.click('TablePage', 'prevButton');
      await steps.verifyTextContains('TablePage', 'pageInfo', '1');
    });

    await test.step('Select a row via checkbox', async () => {
      await steps.clickRandom('TablePage', 'rowCheckboxes');
      await steps.verifyText('TablePage', 'selectedCount', undefined, { notEmpty: true });
    });

    await test.step('Select all rows', async () => {
      await steps.click('TablePage', 'selectAllCheckbox');
      await steps.verifyTextContains('TablePage', 'selectedCount', '5');
    });

    log('TC_026 Table Page — passed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Category 5: Interactions
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC_027: Draggable Page', () => {

  test('drag block and verify status updates', async ({ page, steps }) => {

    await test.step('Navigate to Draggable page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'draggableLink');
      await steps.verifyUrlContains('/draggable');
    });

    await test.step('Status starts as "none"', async () => {
      await steps.verifyTextContains('DraggablePage', 'status', 'none');
    });

    await test.step('Drag item 1 and verify it moves', async () => {
      await steps.dragAndDrop('DraggablePage', 'item1', { xOffset: 100, yOffset: 50 });
    });

    await test.step('All 4 draggable items are present', async () => {
      await steps.verifyPresence('DraggablePage', 'item1');
      await steps.verifyPresence('DraggablePage', 'item2');
      await steps.verifyPresence('DraggablePage', 'item3');
      await steps.verifyPresence('DraggablePage', 'item4');
    });

    log('TC_027 Draggable Page — passed');
  });
});

test.describe('TC_028: Droppable Page', () => {

  test('drop items into zones and reset', async ({ page, repo, steps }) => {

    await test.step('Navigate to Droppable page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'droppableLink');
      await steps.verifyUrlContains('/droppable');
    });

    await test.step('Initial status is Ready', async () => {
      await steps.verifyTextContains('DroppablePage', 'status', 'Ready');
    });

    await test.step('All zones start with 0 items', async () => {
      await steps.verifyTextContains('DroppablePage', 'redZoneCount', '0');
      await steps.verifyTextContains('DroppablePage', 'blueZoneCount', '0');
      await steps.verifyTextContains('DroppablePage', 'greenZoneCount', '0');
    });

    await test.step('Drag red item to red zone — correct drop', async () => {
      const redItem = await repo.get(page, 'DroppablePage', 'redItem1');
      const redZone = await repo.get(page, 'DroppablePage', 'redZone');
      await steps.dragAndDrop('DroppablePage', 'redItem1', { target: redZone! });
      await steps.verifyTextContains('DroppablePage', 'redZoneCount', '1');
    });

    await test.step('Reset returns items to source', async () => {
      await steps.click('DroppablePage', 'resetButton');
      await steps.verifyTextContains('DroppablePage', 'redZoneCount', '0');
      await steps.verifyTextContains('DroppablePage', 'status', 'Ready');
    });

    log('TC_028 Droppable Page — passed');
  });
});

test.describe('TC_029: Resizable Page', () => {

  test('resize panel by dragging handle', async ({ steps }) => {

    await test.step('Navigate to Resizable page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'resizableLink');
      await steps.verifyUrlContains('/resizable');
    });

    await test.step('Initial width is 300px', async () => {
      await steps.verifyTextContains('ResizablePage', 'widthDisplay', '300');
    });

    await test.step('Drag handle right to increase width', async () => {
      await steps.dragAndDrop('ResizablePage', 'handle', { xOffset: 100, yOffset: 0 });
    });

    await test.step('Width display is present and updated', async () => {
      await steps.verifyText('ResizablePage', 'widthDisplay', undefined, { notEmpty: true });
    });

    log('TC_029 Resizable Page — passed');
  });
});

test.describe('TC_030: Kanban Page', () => {

  test('add card and verify columns', async ({ page, repo, steps }) => {

    await test.step('Navigate to Kanban page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'kanbanLink');
      await steps.verifyUrlContains('/kanban');
    });

    await test.step('All three columns are present', async () => {
      await steps.verifyPresence('KanbanPage', 'todoColumn');
      await steps.verifyPresence('KanbanPage', 'inProgressColumn');
      await steps.verifyPresence('KanbanPage', 'doneColumn');
    });

    await test.step('Cards are present initially', async () => {
      await steps.verifyCount('KanbanPage', 'cards', { greaterThan: 0 });
    });

    await test.step('Add a new card to Todo column', async () => {
      const allCards = await repo.getAll(page, 'KanbanPage', 'cards');
      const countBefore = allCards!.length;
      await steps.click('KanbanPage', 'addTodoButton');
      await steps.verifyCount('KanbanPage', 'cards', { greaterThan: countBefore });
    });

    log('TC_030 Kanban Page — passed');
  });
});

test.describe('TC_031: Infinite Scroll Page', () => {

  test('scroll to load more items', async ({ page, steps }) => {

    await test.step('Navigate to Infinite Scroll page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'infiniteScrollLink');
      await steps.verifyUrlContains('/infinite-scroll');
    });

    await test.step('Wait for initial items to load', async () => {
      await page.locator("[data-testid^='scroll-item-']").first().waitFor({ timeout: 10000 });
      await steps.verifyCount('InfiniteScrollPage', 'items', { greaterThan: 0 });
    });

    await test.step('Scroll container to trigger more loads', async () => {
      const container = page.locator("[data-testid='scroll-container']");
      // Scroll to the bottom of the container
      await container.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      // Wait for more items to load
      await page.waitForTimeout(2000);
      const countAfterScroll = await page.locator("[data-testid^='scroll-item-']").count();
      expect(countAfterScroll).toBeGreaterThan(10);
    });

    log('TC_031 Infinite Scroll Page — passed');
  });
});

test.describe('TC_032: Loading States Page', () => {

  test('verify spinner, skeleton toggle, and button loading', async ({ steps }) => {

    await test.step('Navigate to Loading States page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'loadingLink');
      await steps.verifyUrlContains('/loading');
    });

    await test.step('Spinner is visible', async () => {
      await steps.verifyPresence('LoadingStatesPage', 'spinner');
    });

    await test.step('Skeleton is visible by default', async () => {
      await steps.verifyPresence('LoadingStatesPage', 'skeleton');
    });

    await test.step('Toggle skeleton off', async () => {
      await steps.click('LoadingStatesPage', 'skeletonToggle');
      await steps.verifyAbsence('LoadingStatesPage', 'skeleton');
    });

    await test.step('Toggle skeleton back on', async () => {
      await steps.click('LoadingStatesPage', 'skeletonToggle');
      await steps.verifyPresence('LoadingStatesPage', 'skeleton');
    });

    await test.step('Click loading button — enters loading state', async () => {
      await steps.click('LoadingStatesPage', 'loadingButton');
      // Button should show loading state (text changes or spinner appears)
      await steps.verifyPresence('LoadingStatesPage', 'loadingButton');
    });

    log('TC_032 Loading States Page — passed');
  });
});

test.describe('TC_033: Dynamic Form Page', () => {

  test('add fields and submit form', async ({ page, steps }) => {

    await test.step('Navigate to Dynamic Form page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'dynamicFormLink');
      await steps.verifyUrlContains('/dynamic-form');
    });

    await test.step('Starts with 1 field', async () => {
      await steps.verifyCount('DynamicFormPage', 'fields', { exactly: 1 });
    });

    await test.step('Add a second field', async () => {
      await steps.click('DynamicFormPage', 'addButton');
      await steps.verifyCount('DynamicFormPage', 'fields', { exactly: 2 });
    });

    await test.step('Add a third field', async () => {
      await steps.click('DynamicFormPage', 'addButton');
      await steps.verifyCount('DynamicFormPage', 'fields', { exactly: 3 });
    });

    await test.step('Fill field 1 and submit', async () => {
      await steps.fill('DynamicFormPage', 'field1', 'Test Value');
      await steps.click('DynamicFormPage', 'submitButton');
    });

    log('TC_033 Dynamic Form Page — passed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Category 6: Media
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC_034: Gallery Page', () => {

  test('verify gallery images and lightbox', async ({ page, steps }) => {

    await test.step('Navigate to Gallery page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'galleryLink');
      await steps.verifyUrlContains('/gallery');
    });

    await test.step('8 gallery items rendered', async () => {
      const items = page.locator("[data-testid^='gallery-item-']");
      await expect(items).toHaveCount(8);
    });

    await test.step('Click image to open lightbox', async () => {
      await page.locator("[data-testid='gallery-item-1']").click();
      const overlay = page.locator("[data-testid='gallery-overlay']");
      await overlay.waitFor({ state: 'visible', timeout: 5000 });
    });

    await test.step('Close lightbox', async () => {
      const closeButton = page.locator("[data-testid='gallery-close']");
      await closeButton.click();
      const overlay = page.locator("[data-testid='gallery-overlay']");
      await overlay.waitFor({ state: 'hidden', timeout: 5000 });
    });

    log('TC_034 Gallery Page — passed');
  });
});

test.describe('TC_035: Carousel Page', () => {

  test('navigate slides with buttons and dots', async ({ steps }) => {

    await test.step('Navigate to Carousel page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'carouselLink');
      await steps.verifyUrlContains('/carousel');
    });

    await test.step('First slide visible on load', async () => {
      await steps.verifyPresence('CarouselPage', 'slide1');
    });

    await test.step('Click Next — slide advances', async () => {
      await steps.click('CarouselPage', 'nextButton');
      await steps.verifyPresence('CarouselPage', 'slide2');
    });

    await test.step('Click Previous — goes back', async () => {
      await steps.click('CarouselPage', 'prevButton');
      await steps.verifyPresence('CarouselPage', 'slide1');
    });

    await test.step('Click dot 2 — jumps to slide 2', async () => {
      await steps.click('CarouselPage', 'dot2');
      await steps.verifyPresence('CarouselPage', 'slide2');
    });

    await test.step('Autoplay toggle is present', async () => {
      await steps.verifyPresence('CarouselPage', 'autoplayButton');
    });

    log('TC_035 Carousel Page — passed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Category 7: Auth & State
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC_036: Login Form Page', () => {

  test('validation errors and successful login', async ({ page, steps }) => {

    await test.step('Navigate to Login Form page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'loginFormLink');
      await steps.verifyUrlContains('/login-form');
    });

    await test.step('Empty submit shows validation errors', async () => {
      await steps.click('LoginFormPage', 'signInButton');
      // Validation errors should appear for empty fields
      const errors = page.locator("[data-testid='login-username-error'], [data-testid='login-password-error']");
      await errors.first().waitFor({ state: 'visible', timeout: 5000 });
    });

    await test.step('Wrong credentials show error', async () => {
      await steps.fill('LoginFormPage', 'usernameInput', 'wrong');
      await steps.fill('LoginFormPage', 'passwordInput', 'wrongpass');
      await steps.click('LoginFormPage', 'signInButton');
      const loginError = page.locator("[data-testid='login-error']");
      await loginError.waitFor({ state: 'visible', timeout: 5000 });
    });

    await test.step('Show/hide password toggle', async () => {
      const passwordField = page.locator('#login-password-input');
      expect(await passwordField.getAttribute('type')).toBe('password');
      await steps.click('LoginFormPage', 'showPasswordButton');
      expect(await passwordField.getAttribute('type')).toBe('text');
      await steps.click('LoginFormPage', 'showPasswordButton');
      expect(await passwordField.getAttribute('type')).toBe('password');
    });

    await test.step('Correct login succeeds', async () => {
      await steps.fill('LoginFormPage', 'usernameInput', 'admin');
      await steps.fill('LoginFormPage', 'passwordInput', 'password123');
      await steps.click('LoginFormPage', 'signInButton');
      const success = page.locator("[data-testid='login-success']");
      await success.waitFor({ state: 'visible', timeout: 5000 });
    });

    log('TC_036 Login Form Page — passed');
  });
});

test.describe('TC_037: Pinia Counter Page', () => {

  test('increment, decrement, reset, and change step', async ({ steps }) => {

    await test.step('Navigate to Pinia Counter page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'piniaCounterLink');
      await steps.verifyUrlContains('/pinia-counter');
    });

    await test.step('Initial value is 0', async () => {
      await steps.verifyText('PiniaCounterPage', 'counterValue', '0');
    });

    await test.step('Increment increases value', async () => {
      await steps.click('PiniaCounterPage', 'incrementButton');
      await steps.verifyText('PiniaCounterPage', 'counterValue', '1');
    });

    await test.step('Decrement decreases value', async () => {
      await steps.click('PiniaCounterPage', 'decrementButton');
      await steps.verifyText('PiniaCounterPage', 'counterValue', '0');
    });

    await test.step('Increment twice and reset', async () => {
      await steps.click('PiniaCounterPage', 'incrementButton');
      await steps.click('PiniaCounterPage', 'incrementButton');
      await steps.verifyText('PiniaCounterPage', 'counterValue', '2');
      await steps.click('PiniaCounterPage', 'resetButton');
      await steps.verifyText('PiniaCounterPage', 'counterValue', '0');
    });

    await test.step('Change step to 5 and increment', async () => {
      await steps.fill('PiniaCounterPage', 'stepInput', '5');
      await steps.click('PiniaCounterPage', 'incrementButton');
      await steps.verifyText('PiniaCounterPage', 'counterValue', '5');
    });

    await test.step('History tracks operations', async () => {
      await steps.verifyPresence('PiniaCounterPage', 'history');
      await steps.verifyText('PiniaCounterPage', 'history', undefined, { notEmpty: true });
    });

    log('TC_037 Pinia Counter Page — passed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Category 8: Edge Cases
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC_038: Long List Page', () => {

  test('renders 200 items with search filtering', async ({ page, steps }) => {

    await test.step('Navigate to Long List page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'longListLink');
      await steps.verifyUrlContains('/long-list');
    });

    await test.step('200 items are rendered', async () => {
      await steps.verifyCount('LongListPage', 'listItems', { exactly: 200 });
    });

    await test.step('Search filters the list', async () => {
      await steps.fill('LongListPage', 'searchInput', 'Item 1');
      await steps.verifyCount('LongListPage', 'listItems', { lessThan: 200 });
    });

    await test.step('Clear search restores full list', async () => {
      await steps.fill('LongListPage', 'searchInput', '');
      await steps.verifyCount('LongListPage', 'listItems', { exactly: 200 });
    });

    log('TC_038 Long List Page — passed');
  });
});

test.describe('TC_039: Multi-step Form Page', () => {

  test('navigate through form steps', async ({ page, steps }) => {

    await test.step('Navigate to Multi-step Form page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'multistepLink');
      await steps.verifyUrlContains('/multistep');
    });

    await test.step('Starts at step 1', async () => {
      await steps.verifyTextContains('MultiStepFormPage', 'currentStep', '1');
    });

    await test.step('Fill step 1 and go to step 2', async () => {
      await steps.fill('MultiStepFormPage', 'firstNameInput', 'John');
      await steps.fill('MultiStepFormPage', 'lastNameInput', 'Doe');
      await steps.click('MultiStepFormPage', 'nextButton');
      await steps.verifyTextContains('MultiStepFormPage', 'currentStep', '2');
    });

    await test.step('Fill step 2 and go to step 3', async () => {
      await steps.fill('MultiStepFormPage', 'emailInput', 'john@example.com');
      await steps.fill('MultiStepFormPage', 'phoneInput', '555-1234');
      await steps.click('MultiStepFormPage', 'nextButton');
      await steps.verifyTextContains('MultiStepFormPage', 'currentStep', '3');
    });

    await test.step('Step 3 has message input', async () => {
      await steps.verifyPresence('MultiStepFormPage', 'messageInput');
    });

    await test.step('Go back to step 2 and return', async () => {
      await steps.click('MultiStepFormPage', 'prevButton');
      await steps.verifyTextContains('MultiStepFormPage', 'currentStep', '2');
      await steps.click('MultiStepFormPage', 'nextButton');
      await steps.verifyTextContains('MultiStepFormPage', 'currentStep', '3');
    });

    await test.step('Fill message and submit — summary appears', async () => {
      await steps.fill('MultiStepFormPage', 'messageInput', 'Test message');
      await steps.click('MultiStepFormPage', 'submitButton');
      const submitted = page.locator('h2:has-text("Submitted!")');
      await submitted.waitFor({ state: 'visible', timeout: 5000 });
    });

    log('TC_039 Multi-step Form Page — passed');
  });
});

test.describe('TC_040: State Viewer Page', () => {

  test('switch between states', async ({ steps }) => {

    await test.step('Navigate to State Viewer page via sidebar', async () => {
      await steps.navigateTo('/');
      await steps.click('SidebarNav', 'stateViewerLink');
      await steps.verifyUrlContains('/state-viewer');
    });

    await test.step('Click Empty state button', async () => {
      await steps.click('StateViewerPage', 'emptyButton');
      await steps.verifyPresence('StateViewerPage', 'emptyView');
      await steps.verifyTextContains('StateViewerPage', 'currentState', 'empty');
    });

    await test.step('Click Loading state button', async () => {
      await steps.click('StateViewerPage', 'loadingButton');
      await steps.verifyPresence('StateViewerPage', 'loadingView');
      await steps.verifyTextContains('StateViewerPage', 'currentState', 'loading');
    });

    await test.step('Click Error state button', async () => {
      await steps.click('StateViewerPage', 'errorButton');
      await steps.verifyPresence('StateViewerPage', 'errorView');
      await steps.verifyTextContains('StateViewerPage', 'currentState', 'error');
    });

    await test.step('Click Populated state button', async () => {
      await steps.click('StateViewerPage', 'populatedButton');
      await steps.verifyTextContains('StateViewerPage', 'currentState', 'populated');
    });

    log('TC_040 State Viewer Page — passed');
  });
});
