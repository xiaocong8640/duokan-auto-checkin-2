// duokan-task.js（完整可运行版本）
const axios = require("axios");
axios.defaults.timeout = 5000;
const timeAsync = ms => new Promise(resolve => setTimeout(resolve, ms));
let result = "【多看阅读每日任务】：";

// 从环境变量获取Cookie（GitHub Actions专用）
const cookie = process.env.DUOKAN_COOKIE || "";
if (!cookie) {
  console.error("❌ 未获取到Cookie，任务终止");
  process.exit(1);
}

const header = {
  headers: {
    cookie: cookie,
    "User-Agent": "Mozilla/5.0 (Linux; Android 14; 22101316C Build/UP1A.231005.007; wv) AppleWebKit/537.36",
  },
};

// 生成请求参数_t和_c
function getc() {
  const t = parseInt(new Date().getTime() / 1000);
  const deviceInfo = cookie.match(/device_id=([^;]+);|os_version=([^;]+);/);
  const deviceId = deviceInfo && deviceInfo[1] ? deviceInfo[1] : "";
  const osVersion = deviceInfo && deviceInfo[2] ? deviceInfo[2] : "";
  const input = `${deviceId}&${t}&${osVersion}`;
  const list = input.split("");
  let c = 0;
  for (let i = 0; i < list.length; i++) {
    c = (c * 131 + list[i].charCodeAt()) % 65536;
  }
  return `_t=${t}&_c=${c}`;
}

// 最新有效签名（需从抓包更新）
const validSigns = [
  "828672d6bc39ccd25e1f6ad34e00b86c",
  "f0ccc1bb1cecea673c197b928fb8dbd9",
  "6b86c490d92a138de9a0ae6847781caa",
  "c707047e8b820ba441d29cf87dff341e",
  "82b2c012a956b18cff2388d24f2574a6",
];

// 体验任务（优化版）
function tiyan2(sign) {
  return new Promise(async (resolve) => {
    try {
      const url = `https://www.duokan.com/growth/user/task/execute`;
      const taskId = "210183"; // 体验任务ID（需根据抓包更新）
      const data = `task_id=${taskId}&action=experience&sign=${sign}&${getc()}`;
      const res = await axios.post(url, data, header);
      
      if (res.data.result === 0) {
        console.log(`✅ 体验任务完成，获得${res.data.coins}书豆`);
        result += `体验+${res.data.coins} `;
      } else if (res.data.msg === "今日已完成") {
        console.log("⚠️ 体验任务今日已完成");
      } else {
        console.log(`❌ 体验任务失败: ${res.data.msg}`);
      }
    } catch (err) {
      console.error("体验任务异常:", err);
      result += "体验失败 ";
    }
    await timeAsync(3000 + Math.random() * 2000); // 随机延迟防爬
    resolve();
  });
}

// 下载任务（优化版）
function download() {
  return new Promise(async (resolve) => {
    try {
      const url = `https://www.duokan.com/events/download_task`;
      const downloadCode = "J18UK6YYAY"; // 下载任务Code（需根据抓包更新）
      const maxChances = 3;
      
      for (let i = 0; i < maxChances; i++) {
        const data = `code=${downloadCode}&chances=1&${getc()}`;
        const res = await axios.post(url, data, header);
        
        if (res.data.result === 0) {
          console.log(`✅ 下载任务完成，获得${res.data.coins}书豆`);
          result += `下载+${res.data.coins} `;
          await timeAsync(5000 + Math.random() * 3000);
        } else if (res.data.msg.includes("超出限制")) {
          console.log("⚠️ 下载任务已达上限");
          break;
        } else {
          console.log(`❌ 下载任务失败: ${res.data.msg}`);
          await timeAsync(2000);
        }
      }
    } catch (err) {
      console.error("下载任务异常:", err);
      result += "下载失败 ";
    }
    resolve();
  });
}

// 查询书豆
function info() {
  return new Promise(async (resolve) => {
    try {
      const url = `https://www.duokan.com/store/v0/award/coin/list`;
      const data = `sandbox=0&${getc()}`;
      const res = await axios.post(url, data, header);
      const list = res.data.data.award;
      let number = 0;
      
      list.forEach(item => {
        number += item.coin;
        if (item.delay === 1) {
          // 书豆延期逻辑（可选）
          // delay(item.expire);
        }
      });
      
      console.log(`📊 当前书豆余额: ${number}`);
      resolve(number);
    } catch (err) {
      console.error("书豆查询异常:", err);
      result += "查询失败 ";
      resolve(0);
    }
  });
}

// 签到
async function dailysign() {
  try {
    const url = "https://www.duokan.com/checkin/v0/checkin";
    const res = await axios.post(url, getc(), header);
    console.log(`✅ 签到结果: ${res.data.msg}`);
    result += `签到${res.data.msg} `;
  } catch (err) {
    console.error("签到异常:", err);
    result += "签到失败 ";
  }
}

// 主任务流程
async function task() {
  try {
    console.log("=== 开始执行多看阅读自动化任务 ===");
    const startTime = Date.now();
    
    // 1. 签到（已确认正常）
    await dailysign();
    
    // 2. 执行体验任务
    console.log("开始执行体验任务...");
    for (const sign of validSigns) {
      await tiyan2(sign);
    }
    
    // 3. 执行下载任务
    console.log("开始执行下载任务...");
    await download();
    
    // 4. 查询最终书豆
    const finalCoins = await info();
    console.log(`=== 任务完成，总计耗时: ${(Date.now() - startTime)/1000} 秒 ===`);
    console.log(`=== 最终书豆余额: ${finalCoins} ===`);
    
    return result;
  } catch (err) {
    console.error("任务主流程异常:", err);
    result += "主流程失败 ";
    return result;
  }
}

task().then(console.log).catch(console.error);
