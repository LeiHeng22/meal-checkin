(function () {
  var plan = window.MEAL_PLAN;
  var tokenKey = "meal-checkin-token";
  var cacheKey = "meal-checkin-cache";
  var selected = todayIso();
  var doc = readCache();
  var sha = null;
  var saveTimer = null;
  var chain = Promise.resolve();

  var dateLabel = document.getElementById("date-label");
  var todayBtn = document.getElementById("today-btn");
  var syncEl = document.getElementById("sync");
  var weekEl = document.getElementById("week");
  var heroEl = document.getElementById("hero");
  var sectionsEl = document.getElementById("sections");
  var extraEl = document.getElementById("extra");
  var settingsBtn = document.getElementById("open-settings");
  var dialog = document.getElementById("settings");
  var tokenInput = document.getElementById("token");
  var saveTokenBtn = document.getElementById("save-token");
  var forgetBtn = document.getElementById("forget-token");
  var settingsMsg = document.getElementById("settings-msg");

  document.getElementById("prev").addEventListener("click", function () { shift(-1); });
  document.getElementById("next").addEventListener("click", function () { shift(1); });
  todayBtn.addEventListener("click", function () {
    selected = todayIso();
    render();
  });
  settingsBtn.addEventListener("click", function () {
    tokenInput.value = "";
    settingsMsg.textContent = token() ? "这台设备已经连上。换令牌时再粘贴新的。" : "还没有令牌。按下面的步骤新建一个。";
    dialog.showModal();
  });
  document.getElementById("close-settings").addEventListener("click", function () { dialog.close(); });
  saveTokenBtn.addEventListener("click", saveToken);
  forgetBtn.addEventListener("click", function () {
    localStorage.removeItem(tokenKey);
    settingsMsg.textContent = "这台设备上的令牌已清除。勾选会留在浏览器里，不再写入 GitHub。";
    renderSync();
  });

  render();
  pull().catch(function (error) {
    console.error("读取 GitHub 打卡失败", error);
    setSync("没读到 GitHub 上的记录，先显示这台设备里的", "is-bad");
  });

  function todayIso() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function addDays(iso, n) {
    var p = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }

  function shift(n) {
    selected = addDays(selected, n);
    render();
  }

  function token() {
    return localStorage.getItem(tokenKey) || "";
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(cacheKey);
      if (!raw) return { version: 1, days: {} };
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.days) return { version: 1, days: {} };
      return parsed;
    } catch (error) {
      console.error("本地打卡记录读不出来", error);
      return { version: 1, days: {} };
    }
  }

  function persistLocal() {
    localStorage.setItem(cacheKey, JSON.stringify(doc));
  }

  function dayBag(iso) {
    if (!doc.days[iso]) {
      doc.days[iso] = { items: {}, weight: { value: "", at: 0 }, note: { value: "", at: 0 } };
    }
    return doc.days[iso];
  }

  function isDone(iso, id) {
    var day = doc.days[iso];
    return !!(day && day.items && day.items[id] && day.items[id].done);
  }

  function setDone(iso, id, done) {
    var bag = dayBag(iso);
    bag.items[id] = { done: done, at: Date.now() };
    persistLocal();
    schedulePush();
  }

  function schedulePush() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      chain = chain.then(function () {
        return pushOnce(0);
      }).catch(function (error) {
        console.error("写入 GitHub 失败", error);
        setSync("没写上。勾选还在这台设备，连上后再试", "is-bad");
      });
    }, 700);
  }

  function headers() {
    var h = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (token()) h.Authorization = "Bearer " + token();
    return h;
  }

  function apiUrl() {
    return "https://api.github.com/repos/" + plan.owner + "/" + plan.repo + "/contents/" + plan.file;
  }

  function pull() {
    return fetch(apiUrl() + "?ref=" + encodeURIComponent(plan.branch), { headers: headers(), cache: "no-store" })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("读取失败 " + res.status);
        return res.json();
      })
      .then(function (payload) {
        if (!payload) {
          setSync(token() ? "仓库里还没有记录，勾选后会创建" : "还不能写入。点下方连接 GitHub", "");
          return;
        }
        sha = payload.sha;
        var remote = JSON.parse(decode64(payload.content));
        var merged = mergeDocs(doc, remote);
        var needWrite = stable(merged) !== stable(remote);
        doc = merged;
        persistLocal();
        render();
        if (needWrite && token()) {
          chain = chain.then(function () { return pushOnce(0); });
          return chain;
        }
        setSync(token() ? "已和 GitHub 对齐" : "可以先勾。连接 GitHub 后，手机会和电脑共用这份记录", token() ? "is-ok" : "");
      });
  }

  function pushOnce(retry) {
    if (!token()) {
      setSync("勾选只在这台设备。连接 GitHub 后会上传", "");
      return Promise.resolve();
    }
    setSync("正在写入 GitHub", "");
    var body = {
      message: "打卡 " + selected,
      content: encode64(JSON.stringify(doc, null, 2) + "\n"),
      branch: plan.branch
    };
    if (sha) body.sha = sha;
    return fetch(apiUrl(), {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers()),
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.status === 409 && retry < 3) {
        return fetch(apiUrl() + "?ref=" + encodeURIComponent(plan.branch), { headers: headers(), cache: "no-store" })
          .then(function (again) {
            if (!again.ok) throw new Error("冲突后重读失败 " + again.status);
            return again.json();
          })
          .then(function (payload) {
            sha = payload.sha;
            doc = mergeDocs(doc, JSON.parse(decode64(payload.content)));
            persistLocal();
            render();
            return pushOnce(retry + 1);
          });
      }
      if (!res.ok) {
        return res.text().then(function (text) {
          console.error("GitHub 拒绝写入", res.status, text);
          throw new Error("写入被拒绝 " + res.status);
        });
      }
      return res.json().then(function (payload) {
        sha = payload.content && payload.content.sha;
        setSync("已写入 GitHub", "is-ok");
      });
    });
  }

  function saveToken() {
    var value = tokenInput.value.trim();
    if (!value) {
      settingsMsg.textContent = "先粘贴令牌。";
      return;
    }
    settingsMsg.textContent = "正在确认这个令牌能不能写仓库…";
    fetch("https://api.github.com/repos/" + plan.owner + "/" + plan.repo, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + value,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }).then(function (res) {
      if (res.status === 401) throw new Error("令牌无效");
      if (!res.ok) throw new Error("仓库打不开 " + res.status);
      return res.json();
    }).then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) {
        throw new Error("这个令牌没有写入权限。建令牌时把 Contents 设成读写。");
      }
      localStorage.setItem(tokenKey, value);
      tokenInput.value = "";
      settingsMsg.textContent = "已连上 " + (repo.full_name || plan.repo) + "。接下来的勾选会写入 GitHub。";
      return pull();
    }).catch(function (error) {
      console.error("连接 GitHub 失败", error);
      settingsMsg.textContent = error.message || "没连上";
    });
  }

  function mergeDocs(a, b) {
    var days = {};
    Object.keys(a.days || {}).concat(Object.keys(b.days || {})).forEach(function (iso) {
      days[iso] = true;
    });
    var out = { version: 1, days: {} };
    Object.keys(days).forEach(function (iso) {
      var left = (a.days && a.days[iso]) || {};
      var right = (b.days && b.days[iso]) || {};
      var ids = {};
      Object.keys(left.items || {}).concat(Object.keys(right.items || {})).forEach(function (id) {
        ids[id] = true;
      });
      var items = {};
      Object.keys(ids).forEach(function (id) {
        items[id] = newer(left.items && left.items[id], right.items && right.items[id]);
      });
      out.days[iso] = {
        items: items,
        weight: newer(left.weight, right.weight) || { value: "", at: 0 },
        note: newer(left.note, right.note) || { value: "", at: 0 }
      };
    });
    return out;
  }

  function newer(x, y) {
    if (!x) return y || null;
    if (!y) return x;
    return (x.at || 0) >= (y.at || 0) ? x : y;
  }

  function stable(value) {
    return JSON.stringify(sortValue(value));
  }

  function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce(function (acc, key) {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
    }
    return value;
  }

  function encode64(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function decode64(text) {
    var bin = atob(String(text).replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function render() {
    var day = plan.buildDay(selected);
    var counts = count(day);
    dateLabel.textContent = monthDay(selected) + " " + day.label;
    todayBtn.hidden = selected === todayIso();
    renderWeek();
    heroEl.innerHTML = ""
      + "<h1>" + escapeHtml(day.dish) + "</h1>"
      + "<p class=\"pot\">" + escapeHtml(day.pot) + "</p>"
      + "<p class=\"progress\" id=\"progress\">勾了 " + counts.done + " 项，还剩 " + counts.left + " 项</p>";
    sectionsEl.innerHTML = day.sections.map(function (section) {
      var all = section.items.every(function (item) { return isDone(selected, item.id); });
      return ""
        + "<section class=\"section" + (all ? " is-done" : "") + "\">"
        + "<div class=\"section-head\"><h2>" + escapeHtml(section.title) + "</h2><div class=\"chop\">完成</div></div>"
        + "<p class=\"hint\">" + escapeHtml(section.hint) + "</p>"
        + "<button type=\"button\" class=\"text-btn\" data-section=\"" + section.id + "\">" + (all ? "取消这组勾选" : escapeHtml(section.action)) + "</button>"
        + section.items.map(function (item) {
          var on = isDone(selected, item.id);
          return "<button type=\"button\" class=\"row\" data-item=\"" + item.id + "\" aria-pressed=\"" + (on ? "true" : "false") + "\">"
            + "<span class=\"mark\">" + (on ? "✓" : "") + "</span>"
            + "<span>" + escapeHtml(item.name) + "</span>"
            + "<span class=\"amount\">" + escapeHtml(item.amount) + "</span>"
            + "</button>";
        }).join("")
        + "</section>";
    }).join("");
    renderExtra(day);
    renderSync();
  }

  function renderExtra(day) {
    var bag = doc.days[selected] || { weight: { value: "" }, note: { value: "" } };
    extraEl.innerHTML = ""
      + "<label class=\"field\"><span>" + (day.weigh ? "今天要称体重" : "体重，可空着") + "</span>"
      + "<input id=\"weight\" inputmode=\"decimal\" placeholder=\"kg\" value=\"" + escapeHtml(bag.weight ? bag.weight.value : "") + "\"></label>"
      + "<label class=\"field\"><span>备注</span>"
      + "<input id=\"note\" maxlength=\"80\" placeholder=\"例如：公司食堂午饭\" value=\"" + escapeHtml(bag.note ? bag.note.value : "") + "\"></label>";
    document.getElementById("weight").addEventListener("change", function (event) {
      var bagNow = dayBag(selected);
      bagNow.weight = { value: event.target.value.trim(), at: Date.now() };
      persistLocal();
      schedulePush();
    });
    document.getElementById("note").addEventListener("change", function (event) {
      var bagNow = dayBag(selected);
      bagNow.note = { value: event.target.value.trim(), at: Date.now() };
      persistLocal();
      schedulePush();
    });
  }

  function renderWeek() {
    var monday = addDays(selected, -((weekdayOf(selected) + 6) % 7));
    var html = "";
    for (var i = 0; i < 7; i++) {
      var iso = addDays(monday, i);
      var day = plan.buildDay(iso);
      var counts = count(day);
      var width = counts.total ? Math.round(counts.done / counts.total * 100) : 0;
      var fill = iso === selected ? "#c56a12" : "#1f7a6a";
      var dayNum = Number(iso.slice(8));
      html += "<button type=\"button\" data-date=\"" + iso + "\" class=\""
        + (iso === selected ? "is-selected " : "")
        + (iso === todayIso() ? "is-today" : "")
        + "\"><em>" + day.label.slice(1) + "</em><strong>" + dayNum + "</strong><span style=\"background:linear-gradient(90deg," + fill + " " + width + "%,#d5dee8 " + width + "%)\"></span></button>";
    }
    weekEl.innerHTML = html;
  }

  weekEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-date]");
    if (!btn) return;
    selected = btn.getAttribute("data-date");
    render();
  });

  sectionsEl.addEventListener("click", function (event) {
    var item = event.target.closest("[data-item]");
    if (item) {
      var id = item.getAttribute("data-item");
      setDone(selected, id, !isDone(selected, id));
      render();
      return;
    }
    var sectionBtn = event.target.closest("[data-section]");
    if (!sectionBtn) return;
    var sectionId = sectionBtn.getAttribute("data-section");
    var day = plan.buildDay(selected);
    var section = day.sections.filter(function (s) { return s.id === sectionId; })[0];
    if (!section) return;
    var all = section.items.every(function (row) { return isDone(selected, row.id); });
    section.items.forEach(function (row) { setDone(selected, row.id, !all); });
    render();
  });

  function count(day) {
    var total = 0;
    var done = 0;
    day.sections.forEach(function (section) {
      section.items.forEach(function (item) {
        total += 1;
        if (isDone(day.iso, item.id)) done += 1;
      });
    });
    return { total: total, done: done, left: total - done };
  }

  function weekdayOf(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }

  function monthDay(iso) {
    var p = iso.split("-");
    return Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  function renderSync() {
    if (!syncEl.textContent) {
      setSync(token() ? "已连接 GitHub" : "未连接。勾选先留在这台设备", token() ? "is-ok" : "");
    }
    settingsBtn.textContent = token() ? "GitHub 已连接" : "连接 GitHub";
  }

  function setSync(text, cls) {
    syncEl.textContent = text;
    syncEl.className = "sync" + (cls ? " " + cls : "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
