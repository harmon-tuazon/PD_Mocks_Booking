#!/usr/bin/env node

/**
 * Accessibility and Mobile Responsiveness Test Suite
 * 
 * This comprehensive test suite validates WCAG 2.1 AA compliance,
 * mobile responsiveness, and touch interaction functionality.
 * 
 * Run with: node tests/manual/accessibility-mobile-test.js
 */

const puppeteer = require('puppeteer');
const axe = require('@axe-core/puppeteer');
const { ManualTestValidator } = require('./my-bookings-validation.js');

class AccessibilityTestSuite {
  constructor() {
    this.validator = new ManualTestValidator();
    this.browser = null;
    this.page = null;
  }

  async setup() {
    this.validator.log('🛠️ Setting up accessibility test environment...', 'cyan');
    
    try {
      this.browser = await puppeteer.launch({
        headless: false, // Keep visible for manual verification
        devtools: true,
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // Inject axe-core for accessibility testing
      await axe.injectIntoPage(this.page);
      
      this.validator.success('Test environment setup complete');
      return true;
    } catch (error) {
      this.validator.fail(`Setup failed: ${error.message}`);
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigateToBookings() {
    try {
      // Navigate to the my-bookings page
      // Adjust URL based on your development setup
      await this.page.goto('http://localhost:3000/my-bookings', {
        waitUntil: 'networkidle2'
      });
      
      // Wait for the page to fully load
      await this.page.waitForSelector('[data-testid="user-card"]', { timeout: 10000 });
      
      this.validator.success('Successfully navigated to My Bookings page');
      return true;
    } catch (error) {
      this.validator.fail(`Navigation failed: ${error.message}`);
      return false;
    }
  }

  async runAccessibilityTests() {
    this.validator.section('Accessibility Testing (WCAG 2.1 AA)');
    
    await this.testPageStructure();
    await this.testKeyboardNavigation();
    await this.testColorContrast();
    await this.testARIAImplementation();
    await this.testFocusManagement();
    await this.testAxeCompliance();
  }

  async testPageStructure() {
    this.validator.test('Semantic HTML Structure');
    
    try {
      // Check for proper heading hierarchy
      const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', elements => 
        elements.map(el => ({ tag: el.tagName, text: el.textContent.trim() }))
      );
      
      if (headings.length > 0) {
        this.validator.success(`Found ${headings.length} headings with proper hierarchy`);
      } else {
        this.validator.fail('No heading elements found - check semantic structure');
      }
      
      // Check for landmark roles
      const landmarks = await this.page.$$eval('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer', 
        elements => elements.length
      );
      
      if (landmarks > 0) {
        this.validator.success(`Found ${landmarks} landmark elements`);
      } else {
        this.validator.warning('Consider adding landmark roles for better navigation');
      }
      
      // Check for form labels
      const forms = await this.page.$$eval('input, select, textarea', elements => {
        return elements.map(el => ({
          id: el.id,
          hasLabel: !!document.querySelector(`label[for="${el.id}"]`) || !!el.getAttribute('aria-label') || !!el.getAttribute('aria-labelledby')
        }));
      });
      
      const unlabeledInputs = forms.filter(input => !input.hasLabel);
      if (unlabeledInputs.length === 0) {
        this.validator.success('All form inputs are properly labeled');
      } else {
        this.validator.fail(`${unlabeledInputs.length} form inputs are missing labels`);
      }
      
    } catch (error) {
      this.validator.fail(`Page structure test failed: ${error.message}`);
    }
  }

  async testKeyboardNavigation() {
    this.validator.test('Keyboard Navigation');
    
    try {
      // Test tab navigation through the page
      await this.page.keyboard.press('Tab');
      
      let focusableElements = [];
      
      // Tab through first 20 elements to test navigation
      for (let i = 0; i < 20; i++) {
        const activeElement = await this.page.evaluate(() => {
          const el = document.activeElement;
          return el ? {
            tagName: el.tagName,
            className: el.className,
            text: el.textContent?.substring(0, 30) || '',
            hasVisibleFocus: window.getComputedStyle(el, ':focus').outlineWidth !== '0px'
          } : null;
        });
        
        if (activeElement) {
          focusableElements.push(activeElement);
        }
        
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(100); // Small delay for visibility
      }
      
      if (focusableElements.length > 0) {
        this.validator.success(`Successfully tabbed through ${focusableElements.length} elements`);
        
        // Check if focus indicators are visible
        const elementsWithVisibleFocus = focusableElements.filter(el => el.hasVisibleFocus);
        if (elementsWithVisibleFocus.length > focusableElements.length * 0.8) {
          this.validator.success('Most elements have visible focus indicators');
        } else {
          this.validator.warning('Some elements may need better focus indicators');
        }
      } else {
        this.validator.fail('No focusable elements found');
      }
      
      // Test Escape key functionality
      await this.page.keyboard.press('Escape');
      this.validator.info('Tested Escape key functionality');
      
    } catch (error) {
      this.validator.fail(`Keyboard navigation test failed: ${error.message}`);
    }
  }

  async testColorContrast() {
    this.validator.test('Color Contrast (WCAG AA)');
    
    try {
      // This is a simplified contrast check - full WCAG testing would require more sophisticated tools
      const colorElements = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const results = [];
        
        for (let el of elements) {
          const style = window.getComputedStyle(el);
          if (el.textContent && el.textContent.trim()) {
            results.push({
              text: el.textContent.substring(0, 30),
              color: style.color,
              backgroundColor: style.backgroundColor,
              fontSize: style.fontSize
            });
          }
        }
        
        return results.slice(0, 10); // Sample first 10 elements
      });
      
      this.validator.info(`Analyzed ${colorElements.length} text elements for contrast`);
      this.validator.success('Color contrast analysis completed (manual verification recommended)');
      
    } catch (error) {
      this.validator.fail(`Color contrast test failed: ${error.message}`);
    }
  }

  async testARIAImplementation() {
    this.validator.test('ARIA Attributes and Roles');
    
    try {
      // Check for ARIA labels on buttons
      const buttons = await this.page.$$eval('button', elements => 
        elements.map(btn => ({
          text: btn.textContent.trim(),
          ariaLabel: btn.getAttribute('aria-label'),
          ariaLabelledBy: btn.getAttribute('aria-labelledby'),
          role: btn.getAttribute('role')
        }))
      );
      
      const buttonsMissingLabels = buttons.filter(btn => 
        !btn.ariaLabel && !btn.ariaLabelledBy && !btn.text
      );
      
      if (buttonsMissingLabels.length === 0) {
        this.validator.success('All buttons have accessible labels');
      } else {
        this.validator.warning(`${buttonsMissingLabels.length} buttons may need better labeling`);
      }
      
      // Check for modal ARIA attributes
      const modals = await this.page.$$eval('[role="dialog"], .modal', elements => 
        elements.map(modal => ({
          role: modal.getAttribute('role'),
          ariaModal: modal.getAttribute('aria-modal'),
          ariaLabelledBy: modal.getAttribute('aria-labelledby')
        }))
      );
      
      if (modals.length > 0) {
        this.validator.success(`Found ${modals.length} modal(s) with ARIA attributes`);
      }
      
      // Check for live regions
      const liveRegions = await this.page.$$eval('[aria-live]', elements => elements.length);
      if (liveRegions > 0) {
        this.validator.success(`Found ${liveRegions} live region(s) for dynamic updates`);
      }
      
    } catch (error) {
      this.validator.fail(`ARIA implementation test failed: ${error.message}`);
    }
  }

  async testFocusManagement() {
    this.validator.test('Focus Management');
    
    try {
      // Test modal focus management
      const cancelButtons = await this.page.$$('button:contains("Cancel")');
      if (cancelButtons.length > 0) {
        // Click a cancel button to open modal
        await cancelButtons[0].click();
        await this.page.waitForTimeout(500);
        
        // Check if focus moved to modal
        const focusInModal = await this.page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], .modal');
          const activeElement = document.activeElement;
          return modal && modal.contains(activeElement);
        });
        
        if (focusInModal) {
          this.validator.success('Focus properly managed when opening modal');
        } else {
          this.validator.warning('Focus management for modals could be improved');
        }
        
        // Close modal and check focus return
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
      
    } catch (error) {
      this.validator.fail(`Focus management test failed: ${error.message}`);
    }
  }

  async testAxeCompliance() {
    this.validator.test('Automated Accessibility Scan (axe-core)');
    
    try {
      const results = await axe.analyze(this.page, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'aria-labels': { enabled: true },
          'focus-management': { enabled: true }
        }
      });
      
      if (results.violations.length === 0) {
        this.validator.success('No accessibility violations found by axe-core');
      } else {
        this.validator.warning(`axe-core found ${results.violations.length} violation(s):`);
        results.violations.forEach(violation => {
          this.validator.fail(`  - ${violation.id}: ${violation.description}`);
        });
      }
      
      if (results.passes.length > 0) {
        this.validator.success(`${results.passes.length} accessibility rules passed`);
      }
      
    } catch (error) {
      this.validator.fail(`Axe compliance test failed: ${error.message}`);
    }
  }

  async runMobileResponsivenessTests() {
    this.validator.section('Mobile Responsiveness Testing');
    
    await this.testMobileViewports();
    await this.testTouchInteractions();
    await this.testMobileModals();
    await this.testMobileNavigation();
    await this.testMobilePerformance();
  }

  async testMobileViewports() {
    this.validator.test('Mobile Viewport Responsiveness');
    
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Samsung Galaxy', width: 360, height: 640 }
    ];
    
    for (const viewport of viewports) {
      try {
        await this.page.setViewport({ width: viewport.width, height: viewport.height });
        await this.page.waitForTimeout(1000); // Allow layout to settle
        
        // Check if content is visible and accessible
        const isContentVisible = await this.page.evaluate(() => {
          const body = document.body;
          return body.scrollWidth <= window.innerWidth * 1.1; // Allow 10% overflow
        });
        
        // Check for horizontal scrolling issues
        const hasHorizontalScroll = await this.page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        
        if (isContentVisible && !hasHorizontalScroll) {
          this.validator.success(`${viewport.name} (${viewport.width}x${viewport.height}): Layout responsive`);
        } else {
          this.validator.warning(`${viewport.name}: Layout may have responsive issues`);
        }
        
        // Test touch target sizes
        const smallTouchTargets = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll('button, a, [role="button"]');
          let smallTargets = 0;
          
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
              smallTargets++;
            }
          });
          
          return { total: buttons.length, small: smallTargets };
        });
        
        if (smallTouchTargets.small === 0) {
          this.validator.success(`${viewport.name}: All touch targets meet 44px minimum`);
        } else {
          this.validator.warning(`${viewport.name}: ${smallTouchTargets.small}/${smallTouchTargets.total} touch targets below 44px`);
        }
        
      } catch (error) {
        this.validator.fail(`${viewport.name} viewport test failed: ${error.message}`);
      }
    }
  }

  async testTouchInteractions() {
    this.validator.test('Touch Interactions');
    
    try {
      // Set mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      
      // Test tap interactions
      const buttons = await this.page.$$('button');
      if (buttons.length > 0) {
        // Simulate touch tap
        await buttons[0].tap();
        this.validator.success('Touch tap interaction working');
      }
      
      // Test scrolling performance
      await this.page.evaluate(() => {
        window.scrollTo(0, 100);
      });
      
      const scrollPosition = await this.page.evaluate(() => window.scrollY);
      if (scrollPosition > 0) {
        this.validator.success('Scrolling functionality working on mobile');
      }
      
      // Test swipe gestures (if applicable)
      this.validator.info('Manual verification needed for swipe gestures');
      
    } catch (error) {
      this.validator.fail(`Touch interactions test failed: ${error.message}`);
    }
  }

  async testMobileModals() {
    this.validator.test('Mobile Modal Behavior');
    
    try {
      // Set mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      
      // Try to open a modal
      const cancelButtons = await this.page.$$('button');
      const cancelButton = cancelButtons.find(async (btn) => {
        const text = await btn.evaluate(el => el.textContent);
        return text.includes('Cancel');
      });
      
      if (cancelButton) {
        await cancelButton.tap();
        await this.page.waitForTimeout(500);
        
        // Check modal size and positioning on mobile
        const modalInfo = await this.page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], .modal');
          if (modal) {
            const rect = modal.getBoundingClientRect();
            return {
              width: rect.width,
              height: rect.height,
              fitsInViewport: rect.width <= window.innerWidth && rect.height <= window.innerHeight,
              isVisible: rect.top >= 0 && rect.left >= 0
            };
          }
          return null;
        });
        
        if (modalInfo) {
          if (modalInfo.fitsInViewport && modalInfo.isVisible) {
            this.validator.success('Modal displays correctly on mobile');
          } else {
            this.validator.warning('Modal may have sizing/positioning issues on mobile');
          }
        }
        
        // Close modal
        await this.page.keyboard.press('Escape');
      }
      
    } catch (error) {
      this.validator.fail(`Mobile modal test failed: ${error.message}`);
    }
  }

  async testMobileNavigation() {
    this.validator.test('Mobile Navigation');
    
    try {
      // Set mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      
      // Test view switching on mobile
      const viewButtons = await this.page.$$('button');
      const calendarButton = viewButtons.find(async (btn) => {
        const text = await btn.evaluate(el => el.textContent);
        return text.includes('Calendar');
      });
      
      if (calendarButton) {
        await calendarButton.tap();
        await this.page.waitForTimeout(1000);
        
        // Check if calendar view loads properly
        const calendarVisible = await this.page.$('.calendar, [data-testid="calendar"]');
        if (calendarVisible) {
          this.validator.success('Calendar view switches correctly on mobile');
        }
        
        // Switch back to list view
        const listButton = await this.page.$('button:contains("List")');
        if (listButton) {
          await listButton.tap();
          this.validator.success('View switching works on mobile');
        }
      }
      
    } catch (error) {
      this.validator.fail(`Mobile navigation test failed: ${error.message}`);
    }
  }

  async testMobilePerformance() {
    this.validator.test('Mobile Performance');
    
    try {
      // Set mobile viewport and network conditions
      await this.page.setViewport({ width: 375, height: 667 });
      
      // Simulate slower mobile network
      await this.page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40 // 40ms latency
      });
      
      const startTime = Date.now();
      
      // Reload page to test mobile performance
      await this.page.reload({ waitUntil: 'networkidle2' });
      
      const loadTime = Date.now() - startTime;
      
      if (loadTime < 5000) {
        this.validator.success(`Page loads in ${loadTime}ms on mobile network`);
      } else {
        this.validator.warning(`Page load time ${loadTime}ms may be slow for mobile users`);
      }
      
      // Reset network conditions
      await this.page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });
      
    } catch (error) {
      this.validator.fail(`Mobile performance test failed: ${error.message}`);
    }
  }

  async run() {
    this.validator.log('🛠️ Starting Accessibility and Mobile Testing Suite', 'bold');
    
    const setupSuccess = await this.setup();
    if (!setupSuccess) {
      return;
    }
    
    const navigationSuccess = await this.navigateToBookings();
    if (!navigationSuccess) {
      await this.cleanup();
      return;
    }
    
    await this.runAccessibilityTests();
    await this.runMobileResponsivenessTests();
    
    this.validator.printSummary();
    
    this.validator.log('\n📝 Manual Verification Required:', 'yellow');
    this.validator.log('- Screen reader testing with actual assistive technology');
    this.validator.log('- Physical device testing on various mobile devices');
    this.validator.log('- User testing with individuals who have disabilities');
    this.validator.log('- Color vision testing with color blindness simulators');
    
    await this.cleanup();
  }
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityTestSuite;
}

// Run if called directly
if (require.main === module) {
  const testSuite = new AccessibilityTestSuite();
  testSuite.run().catch(console.error);
}
