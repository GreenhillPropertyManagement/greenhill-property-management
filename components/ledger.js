/* ===========================
   Ledger (FINAL - FULLY WORKING)
   =========================== */

document.addEventListener("DOMContentLoaded", function () {

  $(document).on("click", "#unit-overview-bttn", function () {
    const unitId = new URLSearchParams(window.location.search).get("id");
    fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='unit-ledger']").off("click").click(function () {
    const unitId = new URLSearchParams(window.location.search).get("id");
    fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='user-ledger']").off("click").click(function () {
    const userId = new URLSearchParams(window.location.search).get("id");
    fetchTransactions("tenant-user-ledger", userId);
  });

  $("#pay-rent").off("click").click(function () {
    fetchTransactions("tenant-user-ledger", localStorage.userId);
    loadBalancesPaymentPage(localStorage.userRecId);
  });

  $(".styled-table").off("click", ".file-icon").on("click", ".file-icon", function (e) {
    e.stopPropagation();
    const url = $(this).data("url");
    if (url) window.open(url, "_blank");
  });

});

/* ---------------------------
   Money helpers
--------------------------- */
function normalizeMoney(n) {
  const r = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function formatCurrency(amount) {
  const v = normalizeMoney(amount);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

/* ---------------------------
   Date helpers
--------------------------- */
function parseDate(input) {
  if (!input) return null;
  return new Date(input);
}

function formatDate(input) {
  const d = parseDate(input);
  if (!d) return "";
  return `${("0" + (d.getMonth()+1)).slice(-2)}/${("0" + d.getDate()).slice(-2)}/${d.getFullYear().toString().slice(-2)}`;
}

function formatBillingPeriod(input) {
  const d = parseDate(input);
  if (!d) return "";
  return d.toLocaleString("en-US",{month:"long", year:"numeric"});
}

/* ---------------------------
   Fetch
--------------------------- */
function fetchTransactions(type, target) {

  $(".loader").show();

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_ledger_transactions",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken
    },
    data: { type, target },
    success: function (data) {
      $(".styled-table tbody").remove();
      updateTable(data);
    },
    complete: function () {
      $(".loader").hide();
    }
  });
}

/* ===========================
   TABLE RENDER
=========================== */
function updateTable(data) {

  const $table = $(".styled-table");

  /* ---------------------------
     MATCH PAYMENT INIT RECORDS
  --------------------------- */
  const paymentInits = data.filter(d =>
    d.description?.toLowerCase().includes("initiated")
  );

  function findMatchingInit(record) {
    if (!record || record.type !== "payment") return null;

    if (record.payment_init_id) {
      return paymentInits.find(init =>
        init.payment_init_id === record.payment_init_id
      );
    }

    const completionDate = new Date(record.transaction_date);

    return paymentInits.find(init =>
      init.transaction_id === record.transaction_id &&
      init.amount === 0 &&
      new Date(init.transaction_date) <= completionDate
    );
  }

  /* ---------------------------
     SORT (CRITICAL)
  --------------------------- */
  data.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

  /* ---------------------------
     BUILD LEDGER (GLOBAL PASS)
  --------------------------- */
  let runningBalance = 0;

  const ledger = data.map(item => {

    const matchedInit = item.type === "payment"
      ? findMatchingInit(item)
      : null;

    const initiatedDate = (item.type === "payment" && matchedInit)
      ? matchedInit.transaction_date
      : item.transaction_date;

    const completionDate = item.transaction_date;

    const amt = Math.abs(item.amount || 0);
    const delta = item.type === "charge" ? amt : -amt;

    runningBalance = normalizeMoney(runningBalance + delta);

    return {
      ...item,
      initiatedDate,
      completionDate,
      runningBalance
    };

  });

  /* ---------------------------
     GROUP BY MONTH/YEAR
  --------------------------- */
  const groups = {};

  ledger.forEach(item => {
    const d = new Date(item.transaction_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;

    if (!groups[key]) {
      groups[key] = {
        year: d.getFullYear(),
        month: d.getMonth(),
        items: []
      };
    }

    groups[key].items.push(item);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number);
    const [by, bm] = b.split("-").map(Number);
    return ay === by ? am - bm : ay - by;
  });

  /* ---------------------------
     YEARS (NEWEST FIRST)
  --------------------------- */
  const years = [...new Set(sortedKeys.map(k => groups[k].year))].reverse();

  years.forEach(year => {

    const isCurrentYear = year === new Date().getFullYear();

    /* ---------- ACCORDION HEADER ---------- */
    $table.append(`
      <tbody>
        <tr class="year-accordion-row ${isCurrentYear ? "" : "is-collapsed"}" data-year="${year}">
          <td colspan="8">
            ${year}
            <span class="year-accordion-chevron">▼</span>
          </td>
        </tr>
      </tbody>
    `);

    const $tbody = $(`<tbody class="year-tbody ${isCurrentYear ? "" : "is-collapsed"}" data-year="${year}"></tbody>`);

    sortedKeys.forEach(key => {

      const group = groups[key];
      if (group.year !== year) return;

      group.items.forEach(item => {

        const amt = Math.abs(item.amount || 0);

        const balanceAmt = item.runningBalance < 0
          ? `-${formatCurrency(Math.abs(item.runningBalance))}`
          : formatCurrency(item.runningBalance);

        $tbody.append(`
          <tr>
            <td>${formatBillingPeriod(item.billing_period)}</td>
            <td>${formatDate(item.initiatedDate)}</td>
            <td>${formatDate(item.completionDate)}</td>
            <td>${item.type}</td>
            <td>${item.description || ""}</td>
            <td>${item.type==="charge" ? formatCurrency(amt) : ""}</td>
            <td>${item.type!=="charge" ? formatCurrency(amt) : ""}</td>
            <td>${balanceAmt}</td>
          </tr>
        `);

      });

      /* ---------- GREEN MONTH ROW ---------- */
      const last = group.items[group.items.length - 1];

      const monthName = new Date(group.year, group.month)
        .toLocaleString("en-US", { month: "long" });

      const balanceText = last.runningBalance < 0
        ? `-${formatCurrency(Math.abs(last.runningBalance))}`
        : formatCurrency(last.runningBalance);

      $tbody.append(`
        <tr style="background-color:#92EFDD;">
          <td>${monthName} ${group.year}</td>
          <td></td>
          <td></td>
          <td>${monthName} ${group.year} Balance</td>
          <td></td><td></td><td></td>
          <td>${balanceText}</td>
        </tr>
      `);

    });

    $table.append($tbody);
  });

  /* ---------------------------
     ACCORDION LOGIC
  --------------------------- */
  $table.off("click", ".year-accordion-row").on("click", ".year-accordion-row", function () {

    const year = $(this).data("year");
    const collapsed = $(this).hasClass("is-collapsed");

    $table.find(".year-accordion-row").addClass("is-collapsed");
    $table.find(".year-tbody").addClass("is-collapsed");

    if (collapsed) {
      $(this).removeClass("is-collapsed");
      $table.find(`.year-tbody[data-year="${year}"]`).removeClass("is-collapsed");
    }
  });

  /* ---------------------------
     CURRENT MONTH BALANCE
  --------------------------- */
  (function () {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.toLocaleString("en-US", { month: "long" });

    const $tbody = $(`tbody.year-tbody[data-year="${year}"]`);
    let balanceText = null;

    $tbody.find("tr").each(function () {
      const $row = $(this);

      if ($row.attr("style")?.includes("#92EFDD")) {
        const first = $row.find("td").first().text();

        if (first.startsWith(month)) {
          balanceText = $row.find("td").last().text();
        }
      }
    });

    if (balanceText) {
      $("[data-tenant='current-balance-v2']").text(balanceText);
    }
  })();
}

/* ---------------------------
   Payment Page Balances
--------------------------- */
function loadBalancesPaymentPage(user){
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/get_balances_payment_page",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken
    },
    data: { user_id: user },
    success: function (res) {
      $("[data-tenant='current-balance']").text(formatCurrency(res.balance));
      $("[data-tenant='next-month-balance']").text(formatCurrency(res.next_month_payment));
    }
  });
}