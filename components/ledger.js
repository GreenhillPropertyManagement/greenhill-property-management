/* ===========================
   Ledger (FINAL FIXED)
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

  // ✅ SORT ALL TRANSACTIONS (CRITICAL)
  data.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

  // ✅ GLOBAL RUNNING BALANCE (ONE PASS)
  let runningBalance = 0;

  const ledger = data.map(item => {

    const amt = Math.abs(item.amount || 0);
    const delta = item.type === "charge" ? amt : -amt;

    runningBalance = normalizeMoney(runningBalance + delta);

    return {
      ...item,
      runningBalance
    };

  });

  // GROUP BY MONTH/YEAR
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

  // YEARS (NEWEST FIRST FOR UI)
  const years = [...new Set(sortedKeys.map(k => groups[k].year))].reverse();

  years.forEach(year => {

    const isCurrentYear = year === new Date().getFullYear();

    // ACCORDION HEADER
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
            <td>${new Date(item.transaction_date).toLocaleString("en-US",{month:"long",year:"numeric"})}</td>
            <td></td>
            <td></td>
            <td>${item.type}</td>
            <td>${item.description || ""}</td>
            <td>${item.type==="charge" ? formatCurrency(amt) : ""}</td>
            <td>${item.type!=="charge" ? formatCurrency(amt) : ""}</td>
            <td>${balanceAmt}</td>
          </tr>
        `);

      });

      // ✅ GREEN ROW FIX (USE LAST ITEM IN MONTH)
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
     ACCORDION
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
   Payment Page
--------------------------- */
function loadBalancesPaymentPage(user) {
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