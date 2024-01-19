var quill;
var userSelected;
var target;

document.addEventListener("DOMContentLoaded", function () {
  /* ----- Quill Editor Functionality ------ */

  /* Init Quill */
  quill = new Quill("#editor", {
    theme: "snow", // Specify theme in configuration
  });

  /* Save Quill Content */

  // When User clicks save button
  $(document).on("click", '[api-button="save-notepad-content"]', function () {
    // get the mode (defined as attr on main notepad div)
    var mode = $("#modal-notepad").attr("mode");

    // get quill content
    let quill_content = JSON.stringify(quill.getContents());

    // ---- Saving user notes
    if (mode === "user_notes") {
      saveQuillContent("user_notes", quill_content, userSelected);
    }

    if (mode === "user_notes") {
      saveQuillContent("user_notes", quill_content, userSelected);
    }

    if (mode === "legal_notes") {
      saveQuillContent("legal_notes", quill_content, userSelected);
    }

    // ---- Saving units notes
    if (mode === "unit_notes") {
      saveQuillContent("unit_notes", quill_content, localStorage.unitRecId);
    }

    // ---- Saving additional reits
    if (mode === "additional_reits") {
      saveQuillContent(
        "additional_reits",
        quill_content,
        localStorage.activeTenantUserId,
      );
    }
  });

  /* Loading Quill Content */

  // ---- Loading User Notes
  $("[data-user=notes]").click(function () {
    getTargetByParam();
    $("#modal-notepad").attr("mode", "user_notes");
    $(".loader").css("display", "flex"); // show loader
    loadQuillContent("user_notes", target); // load quill content
    userSelected = target;
  });

  // ---- Loading User Notes: Active Tenant on Unit Page
  $("[data-unit=active-tenant-notes]").click(function () {
    getTargetByParam();
    $("#modal-notepad").attr("mode", "user_notes");
    $(".loader").css("display", "flex"); // show loader
    loadQuillContent("user_notes", localStorage.activeTenantUserUuid); // load quill content
    userSelected = target;
  });

  // ---- Loading Unit Notes
  $("[data-unit=notes]").click(function () {
    getTargetByParam();
    $("#modal-notepad").attr("mode", "unit_notes");
    $(".loader").css("display", "flex"); // show loader
    loadQuillContent("unit_notes", target); // load quill content
  });

  // ---- Loading Additional Reits
  $("[data-unit=additional-reits]").click(function () {

    $("#modal-notepad").attr("mode", "additional_reits");
    $(".loader").css("display", "flex"); // show loader
    loadQuillContent("additional_reits", localStorage.activeTenantUserUuid); // load quill content
  });

  // ---- Loading Legal Content
  $("[data-user=legal-notes]")
    .off("click")
    .click(function () {
      getTargetByParam();
      $("[profile-tab-button=overview]").click(); // revert to overview Page
      $("#modal-notepad").attr("mode", "legal_notes");
      $(".loader").css("display", "flex"); // show loader
      loadQuillContent("legal_notes", target); // load quill content
      userSelected = target;
      $("[profile-tab-button=overview]").click();
    });
});

function saveQuillContent(mode, content, target) {
  $(".loader").css("display", "flex");

  $.ajax({
    url: localStorage.baseUrl + "api:_jc-29NR/save_content",
    type: "POST",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: JSON.stringify({
      mode: mode,
      quill_content: content,
      target: target,
    }),
    success: function (response) {
      alert("Success, Notes Saved!");
      $(".modal__block").hide();
      $(".loader").hide();
    },
  });
}

function loadQuillContent(mode, target) {
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:_jc-29NR/load_content",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      mode: mode,
      target: target,
    },
    success: function (response) {
      // Bind the Quill data
      quill.setContents(response.quill_content);

      // update Notepad Titles
      if (response.mode === "user") {
        $("[data-notepad=subtitle]").text(response.username); // update user's name in note modal
        $("[data-notepad=title]").text("User Notes"); // update notes header
      }
      if (response.mode === "unit") {
        $("[data-notepad=subtitle]").text(response.unit_name); // update user's name in note modal
        $("[data-notepad=title]").text("Unit Notes"); // update notes header
      }
      if (response.mode === "additional_reits") {
        $("[data-notepad=subtitle]").hide(); // update user's name in note modal
        $("[data-notepad=title]").text("Aditional Rents Reits"); // update notes header
      }
      if (response.mode === "legal_notes") {
        $("[data-notepad=subtitle]").hide(); // update user's name in note modal
        $("[data-notepad=title]").text("Legal Notes"); // update notes header
      }
    },
    complete: function () {
      $(".loader").hide();
    },
  });
}

function getTargetByParam() {
  const urlParams = new URLSearchParams(window.location.search);
  target = urlParams.get("id");
}
