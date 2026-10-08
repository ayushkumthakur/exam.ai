"""Browser end-to-end test. Usage: BASE=http://localhost:3112 python3 tests/ui.py  (needs playwright + chromium)"""
import os, re, sys, datetime
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:3112')
OUT = os.environ.get('SHOTS', '/tmp/claude-0/shots'); os.makedirs(OUT, exist_ok=True)
errors = []
def check(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: errors.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
    for name, vp in [('mobile', {'width': 390, 'height': 800}), ('desktop', {'width': 1280, 'height': 850})]:
        ctx = b.new_context(viewport=vp); pg = ctx.new_page()
        logs = []; pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: logs.append(str(e)))
        email = f'{name}{datetime.datetime.now().timestamp():.0f}@test.com'
        pg.goto(BASE); pg.wait_for_selector('input[type=email]')
        pg.fill('input[type=email]', email); pg.click('text=Send OTP')
        pg.wait_for_selector('#dev')
        code = re.search(r'(\d{6})', pg.inner_text('#dev')).group(1)
        pg.screenshot(path=f'{OUT}/{name}-1-otp.png')
        for i, ch in enumerate(code): pg.locator('.otp input').nth(i).fill(ch)
        pg.wait_for_selector('text=What are you preparing for?')
        check(True, f'{name}: OTP login works')
        pg.fill('input[type=search]', 'chsl'); pg.click('text=SSC CHSL (Tier 1)')
        pg.screenshot(path=f'{OUT}/{name}-2-exam.png')
        pg.click('text=Continue'); pg.wait_for_selector('text=A few quick details')
        pg.fill('input[placeholder="Your name"]', 'Ayush'); pg.click('.chip:text-is("Intermediate")')
        pg.fill('input[type=date]', (datetime.date.today() + datetime.timedelta(days=120)).isoformat()); pg.click('.chip:text-is("2 hours")')
        pg.click('text=Create my plan'); pg.wait_for_selector('text=Your preparation plan is ready!')
        pg.click('text=Go to my dashboard'); pg.wait_for_selector('text=Preparing for SSC CHSL')
        check('120 days remaining' in pg.inner_text('body') or '119 days remaining' in pg.inner_text('body'), f'{name}: dashboard shows days remaining')
        check('What should I do now?' in pg.inner_text('body'), f'{name}: single recommendation card')
        pg.screenshot(path=f'{OUT}/{name}-3-home.png', full_page=True)
        # practice
        pg.goto(BASE + '/#/practice?subject=Quantitative%20Aptitude&start=1'); pg.wait_for_selector('.q-text')
        pg.locator('.opt').nth(0).click(); pg.click('text=Check Answer'); pg.wait_for_selector('text=Next Question')
        body = pg.inner_text('body'); check('Correct Answer' in body, f'{name}: answer shows Correct Answer + explanation')
        pg.screenshot(path=f'{OUT}/{name}-4-practice.png', full_page=True)
        # test flow
        pg.goto(BASE + '/#/tests'); pg.wait_for_selector('text=Create My Test'); pg.click('.chip:text-is("Subject Test")')
        pg.click('text=Start Test'); pg.wait_for_selector('.timer')
        pg.locator('.opt').nth(1).click(); pg.reload(); pg.wait_for_selector('.timer')
        check(pg.locator('.opt.sel').count() == 1, f'{name}: answer survives refresh (resume)')
        pg.screenshot(path=f'{OUT}/{name}-5-test.png')
        pg.once('dialog', lambda d: d.accept()); pg.click('#submitBtn'); pg.wait_for_selector('text=AI Analysis')
        check('Follow AI Recommendation' in pg.inner_text('body'), f'{name}: result shows AI coaching + follow button')
        pg.screenshot(path=f'{OUT}/{name}-6-result.png', full_page=True)
        for route in ['revision', 'pyqs', 'ca', 'tutor', 'plan', 'progress', 'profile', 'library', 'more', 'search?q=percent']:
            pg.goto(BASE + '/#/' + route); pg.wait_for_selector('h1'); pg.wait_for_timeout(250)
            check(pg.locator('.err').count() == 0, f'{name}: /{route} renders without error')
        if name == 'mobile':
            check(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'mobile: no horizontal scroll')
        check(not [l for l in logs if 'favicon' not in l], f'{name}: no console errors ' + str(logs[:2]))
        ctx.close()
    b.close()
print('\nALL PASSED' if not errors else f'\n{len(errors)} FAILED'); sys.exit(1 if errors else 0)