const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const config = require('./config');
const fs = require('fs');
const path = require('path');

async function createDriver() {
  const options = new chrome.Options();
  // options.addArguments('--headless');
  
  const driver = await new Builder()
    .forBrowser(config.browser)
    .setChromeOptions(options)
    .build();
    
  await driver.manage().window().maximize(); // Kiểm tra giao diện trên toàn màn hình
  await driver.manage().setTimeouts({ implicit: config.timeout });
  return driver;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms || config.delayBetweenSteps));

async function typeWhenReady(driver, selector, text) {
  const element = await driver.wait(until.elementIsVisible(driver.findElement(selector)), config.timeout);
  await element.clear();
  await element.sendKeys(text);
  await sleep(); // Nghỉ sau khi nhập
}

async function clickWhenReady(driver, selector) {
  const element = await driver.wait(until.elementIsVisible(driver.findElement(selector)), config.timeout);
  await element.click();
  await sleep(); // Nghỉ sau khi click
}

function readCsv(fileName) {
  const filePath = path.join(__dirname, fileName);
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => obj[header.trim()] = values[i].trim());
    return obj;
  });
}

module.exports = {
  createDriver,
  sleep,
  typeWhenReady,
  clickWhenReady,
  readCsv
};
