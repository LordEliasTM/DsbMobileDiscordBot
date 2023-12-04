import puppeteer from 'puppeteer';
import "dotenv/config";

/** @param {import("puppeteer").Browser} browser @param {string} url */
const parsePlanFromUrl = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url)

  const days = await page.$$eval('center:has(.mon_title)', dayCenterElems => dayCenterElems.map(e => {
    /** @type {string} */
    const day = e.querySelector(".mon_title").innerText
    /** @type {HTMLTableRowElement[]} */
    const entries = e.querySelector(".mon_list").querySelectorAll("tr.list")
    
    const mappedEntries = entries.map(e => {
      /** @type {HTMLTableCellElement[]} */
      const children = Array.from(e.children)
      return {
        klasse: children[0].innerText,
        stunde: children[1].innerText,
        vertretung: children[2].innerText,
        raum: children[3].innerText,
        lehrer: children[4].innerText,
        fach: children[5].innerText,
        notiz: children[6].innerText,
        entfall: children[7].innerText == "x",
      }
    })

    return {
      day,
      entries: mappedEntries,
    }
  }))

  page.close();

  //const filtered = days.filter(e => e.klasse.includes(process.env.GRADE));
  return days;
}

/** @param {import("puppeteer").Page} page */
const doLoginStuff = async (page) => {
  await page.type('#txtUser', process.env.USER)
  await page.type('#txtPass', process.env.PASS)
  await page.click('input.login')
}

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  // Navigate the page to a URL
  await page.goto('https://www.dsbmobile.de/');

  // Set screen size
  await page.setViewport({width: 1080, height: 1024});

  // do login stuff
  if(page.url().endsWith("Login.aspx")) doLoginStuff(page);

  const planLinks = [];

  for (let i = 0; i <= 1; i++) {
    const planSelector = `.timetableView .timetable-element[data-index="${i}"]`
    await page.waitForSelector(planSelector)
    await page.click(planSelector)
    const iframe = await page.waitForSelector('.iframe-wrapper iframe')
    const planLink = await iframe.evaluate(el => el.src);
    planLinks.push(planLink);
    await page.click('#close-btn')
  }

  console.log(await parsePlanFromUrl(browser, planLinks[0]))

  //await browser.close();
})();
