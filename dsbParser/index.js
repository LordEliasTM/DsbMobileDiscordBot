import puppeteer from 'puppeteer';
import chalk from "chalk";
import moment from "moment";
import "dotenv/config";

/**
 * @typedef {{
 *  klasse: string
 *  stunde: string
 *  vertretung: string
 *  raum: string
 *  lehrer: string
 *  fach: string
 *  notiz: string
 *  entfall: boolean
 * }} DayEntry
 * 
 * @typedef {{
 *  date: string
 *  day: string
 *  dayEntries: DayEntry[]
 * }} Day
 */

/** @param {import("puppeteer").Browser} browser @param {string} url */
const parsePlanFromUrl = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url)

  const days = await page.$$eval('center:has(.mon_title)', dayCenterElems => dayCenterElems.map(e => {
    const dateRegex = /\d{1,2}\.\d{1,2}\.\d{1,4}/;
    const dayRegex = /Montag|Dienstag|Mittwoch|Donnerstag|Freitag/;

    /** @type {string} */
    const rawDay = e.querySelector(".mon_title").innerText
    const date = dateRegex.exec(rawDay)[0]
    const day = dayRegex.exec(rawDay)[0]
    /** @type {HTMLTableRowElement[]} */
    const entries = Array.from(e.querySelector(".mon_list").querySelectorAll("tr.list"))
    
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
      date,
      day,
      dayEntries: mappedEntries,
    }
  }))

  page.close();

  return days;
}

/** @param {Day[]} days @param {string} grade */
const filterForGrade = (days, grade) => {
  days.forEach(day => day.dayEntries = day.dayEntries.filter(e => e.klasse.includes(grade)))
  return days
}

/** @param {Day[]} days */
const combineDupes = (days) => {
  days.forEach(day => {
    /** @type {DayEntry[]} */
    const entriesFinal = []
    day.dayEntries.forEach(e => {
      const dupe = day.dayEntries.find(e2 => 
        e2.klasse == e.klasse &&
        e2.vertretung == e.vertretung &&
        e2.raum == e.raum &&
        e2.lehrer == e.lehrer &&
        e2.fach == e.fach &&
        e2.notiz == e.notiz &&
        e2.entfall == e.entfall &&
        e2.stunde != e.stunde
      )
      if(dupe) {
        e.stunde = e.stunde + "+" + dupe.stunde
        day.dayEntries.splice(day.dayEntries.indexOf(dupe), 1);
      }
      entriesFinal.push(e)
    })

    day.dayEntries = entriesFinal;
  })
  return days
}

/** @param {import("puppeteer").Page} page */
const doLoginStuff = async (page) => {
  await page.type('#txtUser', process.env.USER)
  await page.type('#txtPass', process.env.PASS)
  await page.click('input.login')
}

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({headless: "new"});
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

  const kek = await Promise.all([
    parsePlanFromUrl(browser, planLinks[0]), 
    parsePlanFromUrl(browser, planLinks[1])
  ])

  const asd = kek[0].concat(kek[1]);
  const wasd = filterForGrade(asd, process.env.GRADE)
  const asdf = combineDupes(wasd);
  asdf.forEach(day => {
    console.log("\n"+chalk.underline(day.date+" "+day.day))
    day.dayEntries.forEach(e => {
      const base = `${chalk.blue(e.lehrer)} ${e.fach} ${chalk.yellow(e.stunde)}`
      const additive = e.entfall ? chalk.greenBright("entfällt.") : e.lehrer != e.vertretung ? `vertretung ${chalk.red(e.vertretung)} in ${chalk.hex('#FFA500')(e.raum)}` : `raumtausch ${chalk.hex('#FFA500')(e.raum)}`
      const notiz = e.notiz.trim() != "" ? chalk.grey(" ("+e.notiz.trim()+")") : ""
      console.log(base, additive, notiz)
    })
  })

  await browser.close();
})();
