(function () {
  var chicken = {
    name: "卤鸡胸",
    pot: "鸡胸 440 g，干米两碗各 70 g",
    steps: "鸡胸划一刀，加姜蒜、生抽 20 ml、料酒 10 ml、盐 2 g、油 10 g。水到最低水位。高压 8–10 分钟，自然放气 5 分钟。撕条，两盒各浇 2 勺汤。"
  };
  var beef = {
    name: "番茄牛腱",
    pot: "牛腱 360 g，红薯 400 g",
    steps: "牛腱切 3 cm 块，番茄 2 个，姜、生抽 15 ml、盐 2 g、油 10 g。高压 25–30 分钟，自然放气 10 分钟。若买的是牛里脊，改为 12–15 分钟。"
  };
  var leg = {
    name: "香菇鸡腿",
    pot: "去皮鸡腿肉 400 g，干米两碗各 70 g",
    steps: "干香菇 15 g 泡开。鸡腿肉加香菇、姜、生抽 15 ml、盐 2 g、油 10 g。高压 15 分钟。带骨腿要买约 700 g，熟后去骨再分。"
  };
  var pork = {
    name: "卤里脊",
    pot: "里脊 360 g，干米两碗各 70 g",
    steps: "里脊切 2 cm 块，加姜、生抽 15 ml、料酒 10 ml、盐 2 g、油 8 g。高压 12 分钟，自然放气 8 分钟。豆腐不进冷冻，这顿改成里脊。"
  };

  var plates = {
    chicken: [
      ["rice", "袋里的饭", "干米 70 g 煮成"],
      ["meat", "袋里的鸡胸", "生重 220 g"]
    ],
    beef: [
      ["potato", "袋里的红薯", "生重 200 g"],
      ["meat", "袋里的牛腱", "生重 180 g"]
    ],
    leg: [
      ["rice", "袋里的饭", "干米 70 g 煮成"],
      ["meat", "袋里的鸡腿", "生重 200 g"]
    ],
    pork: [
      ["rice", "干米", "70 g"],
      ["meat", "袋里的里脊", "生重 180 g"]
    ]
  };

  var dishes = { chicken: chicken, beef: beef, leg: leg, pork: pork };
  var dinnerKey = { 1: "chicken", 2: "beef", 3: "leg", 4: "pork", 5: "chicken", 6: "beef", 0: "pork" };
  var dayName = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  function rows(prefix, list) {
    return list.map(function (row) {
      return { id: prefix + row[0], name: row[1], amount: row[2] };
    });
  }

  function workout(weekday) {
    if (weekday === 2 || weekday === 4) {
      return {
        title: "快走",
        hint: "能说完整句子，不能唱歌。走到公司再绕一圈，凑够时间。",
        items: [
          ["walk", "快走", "35–45 分钟"],
          ["steps", "全天步数", "8000–10000"]
        ]
      };
    }
    if (weekday === 6) {
      return {
        title: "轻松全身",
        hint: "觉得累就改成快走 40 分钟，两项不用都做满。",
        items: [
          ["squat", "深蹲", "2 × 12"],
          ["pushup", "俯卧撑", "2 × 8"],
          ["bridge", "臀桥", "2 × 12"],
          ["plank", "平板支撑", "2 × 30 秒"],
          ["steps", "全天步数", "8000–10000"]
        ]
      };
    }
    if (weekday === 0) {
      return {
        title: "休息",
        hint: "不上力量。想动就在楼下散步。",
        items: [
          ["easy", "散步", "20 分钟，可不做"],
          ["steps", "全天步数", "8000–10000"]
        ]
      };
    }

    var main = {
      1: {
        title: "力量 · 推",
        hint: "组间休息 90 秒。第 1–2 周用次数下限。床太软就不做臂屈伸，窄距俯卧撑加 2 组。",
        items: [
          ["pushup", "俯卧撑", "4 × 6–12"],
          ["close", "窄距俯卧撑", "3 × 6–10"],
          ["dip", "床沿臂屈伸", "3 × 8–12"],
          ["plank", "平板支撑", "3 × 20–40 秒"],
          ["bug", "死虫", "3 × 每侧 6–8"]
        ]
      },
      3: {
        title: "力量 · 腿",
        hint: "深蹲 3 秒蹲下。膝盖刺痛就改成坐到床沿再站起，弓步取消。",
        items: [
          ["squat", "深蹲", "4 × 10–15"],
          ["lunge", "反向弓步", "3 × 每腿 8"],
          ["bridge", "臀桥", "4 × 12"],
          ["wall", "靠墙静蹲", "3 × 20–40 秒"],
          ["calf", "站姿提踵", "3 × 12–20"]
        ]
      },
      5: {
        title: "力量 · 拉",
        hint: "弹力带绕过脚掌。带子还没到，就把划船和面拉改成趴着做 Y 字、T 字抬臂。",
        items: [
          ["row", "坐姿划船", "4 × 10–15"],
          ["face", "面拉", "3 × 12–15"],
          ["super", "俯卧超人", "3 × 10–12"],
          ["pushup", "俯卧撑", "3 组，留 2 个余力"],
          ["bird", "鸟狗", "3 × 每侧 8"]
        ]
      }
    }[weekday];

    return main;
  }

  function buildDay(iso) {
    var parts = iso.split("-").map(Number);
    var weekday = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
    var dinner = dinnerKey[weekday];
    var lunch = dinnerKey[(weekday + 6) % 7];
    var strength = weekday === 1 || weekday === 3 || weekday === 5;
    var snack = [
      ["apple", "苹果", "200 g"],
      ["egg", "水煮蛋", "1 个"]
    ];
    if (strength) snack.push(["egg2", "再加一个蛋", "饿了再吃"]);

    var heatHint = "前一晚从冷冻拿到冷藏。倒进电热饭盒或碗，加一勺水。饭盒约 20–30 分钟；微波炉每分钟翻一次；只有电压力锅就用蒸碗高压 8 分钟，没解冻的加到 15 分钟。加热到整体冒热气。袋子不进微波炉，也不进锅。";
    var sections = [];

    if (weekday === 0) {
      sections.push({
        id: "mise",
        title: "备菜",
        hint: "先切好、量好再开火。漏了一样就得中途再洗刀。",
        action: "备菜记成完成",
        items: rows("m-", [
          ["beef", "牛腱切块", "720 g，约 3 cm"],
          ["tomato", "番茄切块", "4 个"],
          ["leg", "鸡腿肉备好", "400 g，带骨买 700 g"],
          ["mushroom", "干香菇泡上", "15 g"],
          ["pork", "里脊切块", "720 g，约 2 cm"],
          ["chicken", "鸡胸划一刀", "880 g"],
          ["rice", "干米量出两份", "每份 350 g"],
          ["potato", "红薯去皮切块", "800 g"],
          ["eggs", "鸡蛋拿出", "30 个"],
          ["tool", "调料和袋子放好", "姜蒜、生抽、盐、油、笔"]
        ])
      });
      sections.push({
        id: "cook",
        title: "下锅",
        hint: "只有一个电压力锅，按这个顺序。水要到最低水位。普通自封袋不要放进锅里煮。",
        action: "下锅记成完成",
        items: rows("k-", [
          ["beef", "先卤牛腱，生抽 30 ml，盐 4 g，油 20 g", "25–30 分钟"],
          ["leg", "再卤鸡腿，生抽 15 ml，盐 2 g，油 10 g", "15 分钟"],
          ["pork", "再卤里脊，生抽 30 ml，料酒 15 ml，盐 3 g，油 15 g", "12 分钟"],
          ["chicken", "再卤鸡胸，生抽 40 ml，料酒 20 ml，盐 4 g，油 20 g", "8–10 分钟"],
          ["rice", "米饭两锅", "每锅干米 350 g"],
          ["potato", "蒸红薯", "蒸熟，分成 4 份"],
          ["eggs", "煮鸡蛋", "高压 6 分钟，冷水冲"]
        ])
      });
      sections.push({
        id: "pack",
        title: "装袋",
        hint: "摊开凉到不烫手再装。不要把热菜直接塞进共用冰箱。室温不要超过 2 小时。",
        action: "装袋记成完成",
        items: rows("g-", [
          ["cool", "摊开晾凉", "不烫手再装"],
          ["bag", "一餐一袋", "每袋浇 2 勺卤汁"],
          ["label", "写日期和餐次", "例如周一午餐"],
          ["freeze", "铺平放冷冻", "周一午餐留冷藏"],
          ["eggs", "鸡蛋带壳冷藏", "不要冷冻"]
        ])
      });
    }

    sections.push({
      id: "breakfast",
      title: "早餐",
      hint: "不用占灶。燕麦加热水，不放奶。蛋是周日煮好的。",
      action: "这顿记成完成",
      items: rows("b-", [
        ["oats", "燕麦片", "80 g"],
        ["eggs", "水煮蛋", "3 个"],
        ["veg", "番茄或黄瓜", "150 g"]
      ])
    });

    sections.push({
      id: "water",
      title: "喝水",
      hint: "一共约 2.5 升。到点勾一杯。周日不训练，21:00 那杯照喝。",
      action: "今天的水都喝了",
      items: rows("h-", [
        ["0730", "7:30 起床后", "400 ml"],
        ["1000", "10:00 上午", "400 ml"],
        ["1230", "12:30 午饭前后", "400 ml"],
        ["1530", "15:30 下午", "400 ml"],
        ["1830", "18:30 晚饭前", "400 ml"],
        ["2100", "21:00 练完或睡前", "500 ml"]
      ])
    });

    sections.push({
      id: "lunch",
      title: "午餐 · " + dishes[lunch].name,
      hint: weekday === 0
        ? "吃上周冷冻的这一袋。第一周如果还没有袋子，午饭用 3 个蛋加黄瓜番茄。"
        : heatHint,
      action: "这顿记成完成",
      items: rows("l-", [["heat", "午餐袋加热到冒热气", "加一勺水"]].concat(plates[lunch]).concat([["veg", "黄瓜、番茄或冷冻西兰花", "150 g"]]))
    });

    sections.push({
      id: "dinner",
      title: "晚餐 · " + dishes[dinner].name,
      hint: weekday === 0
        ? "吃今天刚做的，放冷藏，不用冷冻。明天午餐也留一袋在冷藏。"
        : "和午餐一样加热。配生的瓜菜，或加一把冷冻西兰花。",
      action: "这顿记成完成",
      items: rows("d-", [["heat", "晚餐袋加热到冒热气", "加一勺水"]].concat(plates[dinner]).concat([["veg", "黄瓜、番茄或冷冻西兰花", "200 g"]]))
    });
    sections.push({
      id: "snack",
      title: "加餐",
      hint: "午饭和晚饭之间，或练完。不喝含糖饮料。",
      action: "这顿记成完成",
      items: rows("s-", snack)
    });

    if (strength || weekday === 6) {
      sections.push({
        id: "warmup",
        title: "热身",
        hint: "大约 5 分钟，然后再进入正式动作。",
        action: "热身记成完成",
        items: rows("u-", [
          ["shoulder", "肩绕环", "前后各 10 次"],
          ["hip", "髋部画圈", "每侧 10 次"],
          ["squat", "慢深蹲", "10 次"],
          ["wall", "靠墙俯卧撑", "8 次"]
        ])
      });
    }

    var train = workout(weekday);
    sections.push({
      id: "train",
      title: train.title,
      hint: train.hint,
      action: "这组记成完成",
      items: rows("t-", train.items)
    });

    if (strength) {
      sections.push({
        id: "stretch",
        title: "拉伸",
        hint: "每个 30 秒。刺痛就停，肌肉酸可以继续。",
        action: "拉伸记成完成",
        items: rows("c-", [
          ["chest", "门口拉伸胸", "30 秒"],
          ["quad", "弓步拉大腿前侧", "30 秒"],
          ["ham", "坐着拉大腿后侧", "30 秒"],
          ["calf", "站着拉小腿", "30 秒"]
        ])
      });
    }

    return {
      iso: iso,
      weekday: weekday,
      label: dayName[weekday],
      dish: weekday === 0 ? "周日备餐" : dishes[dinner].name,
      pot: weekday === 0
        ? "米饭和卤肉分装冷冻。晚饭吃刚出锅的，其余铺平放冷冻。"
        : "中午热" + dishes[lunch].name + "，晚上热" + dishes[dinner].name + "。倒出来再热，袋子不进锅。",
      weigh: weekday === 0 || weekday === 3,
      sections: sections
    };
  }

  window.MEAL_PLAN = {
    owner: "LeiHeng22",
    repo: "meal-checkin",
    file: "data/checkins.json",
    branch: "main",
    buildDay: buildDay
  };
})();
