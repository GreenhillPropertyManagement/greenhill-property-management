/* ===========================
   Ledger (with -0.00 fix)
   =========================== */

document.addEventListener("DOMContentLoaded", function () {

  $(document).on("click", "#unit-overview-bttn", function () {
      const urlParams = new URLSearchParams(window.location.search);
      let unitId = urlParams.get("id");
      fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='unit-ledger']").off("click").click(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let unitId = urlParams.get("id");
      fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='user-ledger']").off("click").click(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let userId = urlParams.get("id");
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
function roundToCents(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function normalizeMoney(n) {
  const r = roundToCents(n);
  return Object.is(r, -0) ? 0 : r;
}
function formatCurrency(amount) {
  const v = normalizeMoney(amount);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ---------------------------
   Fetch
--------------------------- */
function fetchTransactions(type, target) {

  $(".loader").css("display", "flex");

  const table = document.querySelector(".styled-table");
  const exportButton = $("[element='download-csv-button']");

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_ledger_transactions",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: { type, target },
    dataType: "json",
    success: function (data) {
      $(".styled-table tbody").empty();
      updateTable(data);
    },
    complete: function () {
      $(".loader").hide();
    }
  });

  exportButton.off("click").on("click", function () {
    exportTableToCSV(table, "transaction_ledger.csv");
  });
}

/* ---------------------------
   Date helpers
--------------------------- */
function parseDateInEasternTime(input) {
  if (!input) return null;
  let date = new Date(input + "T00:00:00");

  let jan = new Date(date.getFullYear(), 0, 1);
  let jul = new Date(date.getFullYear(), 6, 1);
  let isDST = date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());

  let offset = isDST ? -4 * 60 : -5 * 60;
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + offset);

  return date;
}

function formatDate(input) {
  const d = parseDateInEasternTime(input);
  if (!d) return "";
  return `${("0"+(d.getMonth()+1)).slice(-2)}/${("0"+d.getDate()).slice(-2)}/${d.getFullYear().toString().slice(-2)}`;
}

function formatBillingPeriod(input) {
  const d = parseDateInEasternTime(input);
  if (!d) return "";
  return `${d.toLocaleString("en-US",{month:"long"})} ${d.getFullYear()}`;
}

/* ===========================
   TABLE RENDER
=========================== */
function updateTable(data) {

  let runningBalance = 0;
  const $table = $(".styled-table");
  $table.find("tbody").remove();

  // SORT EVERYTHING FIRST (CRITICAL FIX)
  data.sort((a,b)=> new Date(a.transaction_date) - new Date(b.transaction_date));

  const groups = {};

  data.forEach(item=>{
    const d = parseDateInEasternTime(item.transaction_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if(!groups[key]) groups[key] = {year:d.getFullYear(), month:d.getMonth(), items:[]};
    groups[key].items.push(item);
  });

  const sortedKeys = Object.keys(groups).sort((a,b)=>{
    const [ay,am] = a.split('-').map(Number);
    const [by,bm] = b.split('-').map(Number);
    return ay===by ? am-bm : ay-by;
  });

  const yearOrder = [...new Set(sortedKeys.map(k=>groups[k].year))].reverse();

  yearOrder.forEach(year=>{

    const isCurrentYear = (year === new Date().getFullYear());

    const $toggleTbody = $(`<tbody></tbody>`);
    const $toggleRow = $(`
      <tr class="year-accordion-row${isCurrentYear ? '' : ' is-collapsed'}" data-year="${year}">
        <td colspan="8">
          ${year}
          <span class="year-accordion-chevron">&#9660;</span>
        </td>
      </tr>
    `);
    $toggleTbody.append($toggleRow);
    $table.append($toggleTbody);

    const $yearTbody = $(`<tbody class="year-tbody${isCurrentYear ? '' : ' is-collapsed'}" data-year="${year}"></tbody>`);

    sortedKeys.forEach(key=>{
      const group = groups[key];
      if(group.year !== year) return;

      group.items.forEach(item=>{

        const amt = Math.abs(item.amount||0);
        const delta = item.type === "charge" ? amt : -amt;
        runningBalance = normalizeMoney(runningBalance + delta);

        const balanceAmt = runningBalance < 0
          ? `-${formatCurrency(Math.abs(runningBalance))}`
          : formatCurrency(runningBalance);

        $yearTbody.append(`
          <tr>
            <td>${formatBillingPeriod(item.billing_period)}</td>
            <td>${formatDate(item.transaction_date)}</td>
            <td>${formatDate(item.transaction_date)}</td>
            <td>${item.type}</td>
            <td>${item.description||""}</td>
            <td>${item.type==="charge"?formatCurrency(amt):""}</td>
            <td>${item.type!=="charge"?formatCurrency(amt):""}</td>
            <td>${balanceAmt}</td>
          </tr>
        `);

      });

      // GREEN ROW (FIXED FORMAT)
      const lastBalance = runningBalance < 0
        ? `-${formatCurrency(Math.abs(runningBalance))}`
        : formatCurrency(runningBalance);

      const monthName = new Date(group.year, group.month).toLocaleString("en-US",{month:"long"});

      $yearTbody.append(`
        <tr style="background-color:#92EFDD;">
          <td>${monthName} ${group.year}</td>
          <td></td>
          <td></td>
          <td>${monthName} ${group.year} Balance</td>
          <td></td><td></td><td></td>
          <td>${lastBalance}</td>
        </tr>
      `);

    });

    $table.append($yearTbody);
  });

  /* ---------------------------
     ACCORDION FIX
  --------------------------- */
  $table.off("click",".year-accordion-row").on("click",".year-accordion-row",function(){

    const year = $(this).data("year");
    const isCollapsed = $(this).hasClass("is-collapsed");

    $table.find(".year-accordion-row").addClass("is-collapsed");
    $table.find(".year-tbody").addClass("is-collapsed");

    if(isCollapsed){
      $(this).removeClass("is-collapsed");
      $table.find(`.year-tbody[data-year="${year}"]`).removeClass("is-collapsed");
    }

  });

  /* ---------------------------
     BALANCE FROM TABLE
  --------------------------- */
  (function(){
    const today = new Date();
    const year = today.getFullYear();
    const month = today.toLocaleString("en-US",{month:"long"});

    const $tbody = $(`tbody.year-tbody[data-year="${year}"]`);
    let balanceText = null;

    $tbody.find("tr").each(function(){
      const $r = $(this);
      if($r.attr("style")?.includes("#92EFDD")){
        if($r.find("td").first().text().startsWith(month)){
          balanceText = $r.find("td").last().text();
        }
      }
    });

    if(balanceText){
      $("[data-tenant='current-balance-v2']").text(balanceText);
    }
  })();
}

/* ---------------------------
   CSV
--------------------------- */
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportTableToCSV(table, filename) {
  let csv = [];
  table.querySelectorAll("tr").forEach(row=>{
    let cols = row.querySelectorAll("td, th");
    let rowData = [];
    cols.forEach(c=>rowData.push(`"${c.innerText}"`));
    csv.push(rowData.join(","));
  });
  downloadCSV(csv.join("\n"), filename);
}

/* ---------------------------
   Payment Page Balances
--------------------------- */
function loadBalancesPaymentPage(user){
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/get_balances_payment_page",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: { user_id:user },
    success: function (res) {
      $("[data-tenant='current-balance']").text(formatCurrency(res.balance));
      $("[data-tenant='next-month-balance']").text(formatCurrency(res.next_month_payment));
    }
  });
}