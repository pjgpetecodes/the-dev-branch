import { expect, test, type Page } from '@playwright/test';

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

async function createRoom(page: Page, playerName: string): Promise<string> {
  await page.goto('/');
  await page.fill('#playerName', playerName);
  await page.click('#createRoomBtn');
  await expect(page.locator('#welcomeHeader')).toBeVisible();
  await expect(page.locator('#roomIdDisplay')).not.toHaveText('');
  return (await page.locator('#roomIdDisplay').innerText()).trim();
}

test.describe('The Dev Branch - Playwright E2E', () => {
  test('lobby validations, deck selection load, and create-room flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#deckSelect option')).toHaveCount(3);
    await expect(page.locator('#deckSelect option').first()).toContainText('Default Dev Deck');

    await page.fill('#playerName', uniqueName('Joiner'));
    await page.locator('button.tab-btn', { hasText: 'Join Room' }).click();
    await page.fill('#roomCode', 'ab');
    await page.click('#joinRoomBtn');
    await expect(page.locator('#roomIdErrorMain')).toBeVisible();
    await expect(page.locator('#roomIdErrorMain')).toContainText('exactly 5 alphanumeric');

    await page.locator('button.tab-btn', { hasText: 'Create Room' }).click();
    await page.fill('#playerName', '');
    await page.click('#createRoomBtn');
    await expect(page.locator('#nameErrorMain')).toBeVisible();
    await expect(page.locator('#nameErrorMain')).toContainText('Please enter your name');

    await page.fill('#playerName', uniqueName('Creator'));
    await page.click('#createRoomBtn');

    await expect(page.locator('#welcomeHeader')).toBeVisible();
    await expect(page.locator('#shareLinkSection')).toBeVisible();
    await expect(page.locator('#shareLinkInput')).toHaveValue(/room=[A-Z0-9]{5}/);
    await expect(page.locator('#lobbyStatus')).toContainText('Players in room: 1');
  });

  test('share-link join shows duplicate-name error, then allows unique join', async ({ browser, page }) => {
    const hostName = uniqueName('Host');
    const roomCode = await createRoom(page, hostName);

    const context2 = await browser.newContext();
    const guest = await context2.newPage();

    await guest.goto(`/?room=${roomCode}`);
    await expect(guest.locator('#nameEntryModal')).toBeVisible();

    await guest.fill('#modalPlayerName', hostName);
    await guest.click('#confirmNameBtn');
    await expect(guest.locator('#nameErrorModal')).toBeVisible();
    await expect(guest.locator('#nameErrorModal')).toContainText('Name already taken');

    await guest.fill('#modalPlayerName', uniqueName('Guest'));
    await guest.click('#confirmNameBtn');
    await expect(guest.locator('#welcomeHeader')).toBeVisible();
    await expect(guest.locator('#welcomeHeader')).toContainText(roomCode);
    await expect(guest.locator('#lobbyStatus')).toContainText('Players in room: 2');
  });

  test('demo mode full round flow: start, submit, judge winner, next round', async ({ page }) => {
    await page.goto('/');

    await page.fill('#playerName', uniqueName('DemoHost'));
    await page.locator('button.tab-btn', { hasText: 'Join Room' }).click();
    await page.fill('#roomCode', 'D3M0X');
    await page.click('#joinRoomBtn');

    await expect(page.locator('#demoControls')).toBeVisible();
    await expect(page.locator('#roundsModal')).toBeVisible();
    await page.fill('#roundsModalInput', '2');
    await page.click('#confirmRoundsBtn');

    await expect(page.locator('#roundsModal')).toHaveClass(/hidden/);
    await page.locator('#testPlayerButtons button').first().click();
    await page.locator('#testPlayerButtons button').first().click();

    await expect(page.locator('#lobbyStatus')).toContainText('Ready to start');
    await expect(page.locator('#startGameBtn')).toBeEnabled();
    await page.click('#startGameBtn');

    await expect(page.locator('#gameBoard')).toBeVisible();
    await expect(page.locator('#demoPlayerSwitcherPanel')).toBeVisible();
    await expect(page.locator('#roundNumber')).toHaveText('1');
    await expect(page.locator('#totalRoundsDisplay')).toHaveText('2');

    const switcherButtons = page.locator('#demoPanelPlayers button');
    await expect(switcherButtons.first()).toBeVisible();
    const names = await switcherButtons.allTextContents();
    const nonCzarPlayers = names.filter((name) => !name.includes('♠')).slice(0, 2);
    const czarPlayer = names.find((name) => name.includes('♠'));

    expect(nonCzarPlayers.length).toBeGreaterThanOrEqual(2);
    expect(czarPlayer).toBeTruthy();

    for (const playerName of nonCzarPlayers) {
      await page.locator('#demoPanelPlayers button', { hasText: playerName }).first().click();
      await expect(page.locator('#statusMessage')).toContainText(`Now controlling: ${playerName}`);
      await expect(page.locator('#handContainer .white-card.mini-card').first()).toBeVisible();

      const alreadySubmitted = (await page.locator('#statusMessage').innerText()).includes('Cards submitted');
      if (!alreadySubmitted) {
        const handCards = page.locator('#handContainer .white-card.mini-card');
        const selectable = Math.min(await handCards.count(), 3);
        for (let i = 0; i < selectable; i++) {
          await handCards.nth(i).click();
          if (await page.locator('#submitCardsBtn').isEnabled()) {
            break;
          }
        }

        if (await page.locator('#submitCardsBtn').isEnabled()) {
          await page.click('#submitCardsBtn');
          await expect(page.locator('#statusMessage')).toContainText('Cards submitted');
        }
      }
    }

    await page.locator('#demoPanelPlayers button', { hasText: czarPlayer! }).first().click();
    await expect(page.locator('#statusMessage')).toContainText('Now controlling');

    await expect(page.locator('#submittedCardsContainer .submitted-card-group').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('#submittedCardsContainer .submitted-card-group').first().click();

    await expect(page.locator('#statusMessage')).toContainText('wins this round', { timeout: 20_000 });
    await expect(page.locator('#nextRoundBtn')).toBeVisible({ timeout: 20_000 });

    await page.click('#nextRoundBtn');
    await expect(page.locator('#roundNumber')).toHaveText('2', { timeout: 20_000 });
    await expect(page.locator('#statusMessage')).toContainText(/Select|Card Czar|Waiting/i);
  });
});
