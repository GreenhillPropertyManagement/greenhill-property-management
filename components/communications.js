document.addEventListener("DOMContentLoaded", function () {

  createNewConvo(); // functinon to create new convo on form submit
  sendMessage();

  // ---- Communication Tab button clicked
  $("#communications")
    .off("click")
    .on("click", function () {
      loadConvos(localStorage.userId, "self");
      localStorage.removeItem("activeConvo");
    });

  // ---- Communication Button Clicked on Users Profile Page
  $("[api-button=user-convos]").off("click").on("click", function () {
    $("[dyn-container='chat-container']").empty(); // empty messages
    loadConvos(localStorage.pageRefreshParam, "user");
    localStorage.removeItem("activeConvo");
  });

  // ---- Communication Button Clicked on Unit Page (Get Tenant Convos)
  $("[api-button=tenant-convos]").off("click").on("click", function () {
    $("[dyn-container='chat-container']").empty(); // empty messages
    loadConvos(localStorage.activeTenantUserUuid, "user");
    localStorage.removeItem("activeConvo");
  });

  // New convo button clicked
  $("[modal=new-convo]").off("click").on("click", function () {
    // if on profile page...
    if (localStorage.pageId === "profile") {
      loadRecipients(localStorage.pageRefreshParam); // load the contact info of the user's profile
    }

    // if on communications page...
    if (localStorage.pageId === "communications") {
      loadRecipients("multiple");
    }

    // if on Unit page...
    if (localStorage.pageId === "unit") {
      loadRecipients(localStorage.activeTenantUserUuid); // load the contact info of the unit's tenant
    }
  });

  // Delete Convo Button Clicked
  $("[element=delete-convo-button]").off("click").on("click", function () {
    deleteConvo();
  });

  // Event delegation for conversation title clicks
  $("[dyn-container='convos-container']").on(
    "click",
    ".dyn-item__chat-convo-item",
    function () {
      $(".dyn-item__chat-convo-item").css("color", "#201562"); // reset all the convo titles to dark
      $(this).css("color", "#412ace"); // make the active convo title purple
      $("[data-convo='delete-convo']").show(); // show delete convo button for admins only
    },
  );

  // chat input grow UI functionality
  function adjustHeight($elem) {
    $elem.css("height", "auto");
    $elem.css("height", $elem.prop("scrollHeight") + "px");
  }

  // Bind event to all instances of the textarea with class .chat-input
  $(".chat-input").each(function () {
    const $chatInput = $(this);

    $chatInput.on("input", function () {
      adjustHeight($chatInput);
    });

    // Initialize the height for the current textarea instance
    adjustHeight($chatInput);
  });
});

let activeConvosRequest = null;



function loadConvos(targetUser, type) {

  if (activeMessagesRequest) {
    activeMessagesRequest.abort();
    activeMessagesRequest = null;
  }
  localStorage.removeItem("activeConvo");
  $("[dyn-container='chat-container']").empty();
  //$(".chat__messages-wrapper").hide();
  //$(".chat__input-wrapper").hide();
  $("[data-convo='delete-convo']").hide();
  //$(".dyn-item__chat-convo-item").css("color", "#201562");

  const loadType = type;
  const activeUserId = String(targetUser);
  const convosContainer = $("[dyn-container='convos-container']");

  if (activeConvosRequest) {
    activeConvosRequest.abort();
  }

  convosContainer.empty();
  $(".chat__input-wrapper").hide();
  $(".loader").css("display", "flex");

  const currentRequest = $.ajax({
    url:
      localStorage.baseUrl +
      "api:LEAuXkTc/fetch_user_conversations",

    method: "GET",
    dataType: "json",

    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },

    data: {
      user_uuid: targetUser,
    },

    success: function (response) {
      console.log("Loading conversations for:", targetUser);

      const seenConvos = new Set();

      const sampleConvo = $(".convo-item-sample-wrapper")
        .find("[comm-sample-item='convo-item']")
        .first();

      response.forEach((convo) => {
        let attributes = {};

        try {
          attributes =
            typeof convo.attributes === "string"
              ? JSON.parse(convo.attributes)
              : convo.attributes || {};
        } catch (error) {
          console.error(
            "Unable to parse conversation attributes:",
            convo.attributes,
            error
          );

          return;
        }

        const conversationSid = convo.conversation_sid;

        if (
          !conversationSid ||
          seenConvos.has(conversationSid) ||
          document.getElementById(conversationSid)
        ) {
          return;
        }

        seenConvos.add(conversationSid);

        const convoItem = sampleConvo
          .clone(false)
          .appendTo(convosContainer);

        convoItem.attr("id", conversationSid);

        convoItem
          .find("[data-convo='convo-title']")
          .text(convo.friendly_name || "Conversation");

        const convoTimestamp =
          attributes.last_updated ||
          convo.date_updated ||
          convo.date_created;

        convoItem
          .find("[data-convo='timestamp']")
          .text(formatDateToCustomFormat(convoTimestamp));

        const lastMessageSender =
          attributes.last_message_sender != null
            ? String(attributes.last_message_sender)
            : "";

        convoItem.removeClass("new-message");

        if (attributes.convo_type === "peer_to_peer") {
          const participants = Array.isArray(
            attributes.convo_participants
          )
            ? attributes.convo_participants
            : [];

          const recipient = participants.find(
            (participant) =>
              participant.id != null &&
              String(participant.id) !== activeUserId
          );

          const recipientInfo =
            recipient?.info || "Unknown User";

          convoItem
            .find("[data-convo='recipient-info']")
            .text(recipientInfo);

          if (
            loadType === "self" &&
            attributes.convo_status === "updated" &&
            lastMessageSender !== activeUserId
          ) {
            convoItem
              .find("[data-convo='new-message-badge']")
              .show();

            convoItem.addClass("new-message");
          } else {
            convoItem
              .find("[data-convo='new-message-badge']")
              .hide();
          }

          convoItem.on("click", function () {
            $(".chat__messages-wrapper").show();

            const convoSid = $(this).attr("id");

            localStorage.setItem("activeConvo", convoSid);

            $("[dyn-container='chat-container']").empty();
            $(".loader").css("display", "flex");

            loadConvoMessages(convoSid);

            $(".chat__input-wrapper").css(
              "display",
              "flex"
            );

            if (
              lastMessageSender !== activeUserId &&
              loadType === "self"
            ) {
              updateConvoStatus(convoSid);

              convoItem.removeClass("new-message");

              convoItem
                .find("[data-convo='new-message-badge']")
                .hide();

              updateConvoCounter();
            }
          });
        }

        if (attributes.convo_type === "blast") {
          convoItem
            .find("[data-convo='recipient-info']")
            .text(
              "Broadcast: " +
                (attributes.property || "Property")
            );

          convoItem
            .find("[data-convo='blast-icon']")
            .show();

          const participants = Array.isArray(
            attributes.convo_participants
          )
            ? attributes.convo_participants
            : [];

          if (
            loadType === "self" &&
            activeUserId !== lastMessageSender
          ) {
            const hasUnreadMessage = participants.some(
              (participant) =>
                participant.user != null &&
                String(participant.user) === activeUserId &&
                !participant.message_seen
            );

            if (hasUnreadMessage) {
              convoItem
                .find("[data-convo='new-message-badge']")
                .show();

              convoItem.addClass("new-message");
            } else {
              convoItem
                .find("[data-convo='new-message-badge']")
                .hide();
            }
          } else {
            convoItem
              .find("[data-convo='new-message-badge']")
              .hide();
          }

          convoItem.on("click", function () {
            $(".chat__messages-wrapper").show();

            const convoSid = $(this).attr("id");

            localStorage.setItem("activeConvo", convoSid);

            if (localStorage.userRole !== "Admin") {
              $(".chat__input-wrapper").hide();
            } else {
              $(".chat__input-wrapper").css(
                "display",
                "flex"
              );
            }

            $("[dyn-container='chat-container']").empty();
            $(".loader").css("display", "flex");

            loadConvoMessages(convoSid);

            convoItem.removeClass("new-message");

            convoItem
              .find("[data-convo='new-message-badge']")
              .hide();

            updateConvoCounter();

            if (
              loadType === "self" &&
              activeUserId !== lastMessageSender
            ) {
              updateBroadcastMessageViewers(
                convoSid,
                activeUserId
              );
            }
          });
        } else {
          convoItem
            .find("[data-convo='blast-icon']")
            .hide();
        }
      });

      console.log(
        "Conversations Loaded. Running Counter..."
      );
    },

    complete: function () {
      // Only clear the variable if this is still the newest request
      if (activeConvosRequest === currentRequest) {
        activeConvosRequest = null;
        $(".loader").hide();
      }

      $(".back-convo-button")
        .off("click")
        .on("click", function () {
          $(".chat__messages-wrapper").hide();
        });

      updateConvoCounter();

      $("[data-convo='recipient-info']").each(function () {
        const $el = $(this);

        const displayName = $el
          .text()
          .replace(/\s*\([^()]*@[^()]*\)\s*$/, "")
          .trim();

        $el.text(displayName);
      });
    },

    error: function (xhr, status, error) {
      if (status !== "abort") {
        console.error(
          "Error fetching conversations:",
          error
        );
      }
    },
  });

  activeConvosRequest = currentRequest;
}


/* Function to Update Convo Counter */
function updateConvoCounter() {
  let convosContainer = $("div[dyn-container='convos-container']");
  let uniqueUnreadMessages = new Set(); // Track unique conversations with .new-message

  convosContainer.find(".dyn-item__chat-convo-item.new-message").each(function () {
      uniqueUnreadMessages.add($(this).attr("id")); // Store unique conversation IDs
  });

  let unreadCount = uniqueUnreadMessages.size; // Get unique count
  let counterElement = $("[data-api='convo-counter']");

  console.log("Total conversations:", convosContainer.find(".dyn-item__chat-convo-item").length);
  console.log("Total unique unread messages:", unreadCount);

  if (!counterElement.length) {
      console.warn("Counter element not found!");
      return;
  }

  counterElement.text(unreadCount);

  if (unreadCount > 0) {
      counterElement.show();
  } else {
      counterElement.hide();
  }
}

function convoInFocus() {
  let activeConvo = localStorage.activeConvo;
  let activeConvoItem = $("#" + activeConvo);

  // Check if the element is found
  if (activeConvoItem.length > 0) {
    activeConvoItem.find("[data-convo='convo-title']").css("color", "#412ace");
    activeConvoItem.prependTo(activeConvoItem.parent());
  } else {
    console.log("Active conversation item not found:", activeConvo);
  }
}


let activeMessagesRequest = null;

function loadConvoMessages(convoId) {
  const chatContainer = $("[dyn-container='chat-container']");
  const activeUser = String(localStorage.userId);

  // Cancel any previous message-loading request
  if (activeMessagesRequest) {
    activeMessagesRequest.abort();
  }

  chatContainer.empty();

  const currentRequest = $.ajax({
    url:
      localStorage.baseUrl +
      "api:LEAuXkTc/fetch_conversation",

    method: "GET",

    headers: {
      Authorization:
        "Bearer " + localStorage.authToken,
    },

    dataType: "json",

    data: {
      conversation_id: convoId,
    },

    success: function (response) {
      // Only select one copy of each hidden template
      const sampleUserMessage = $(".convo-item-sample-wrapper")
        .find("[comm-sample-item='user-chat']")
        .first();

      const sampleParticipantMessage = $(".convo-item-sample-wrapper")
        .find("[comm-sample-item='participant-chat']")
        .first();

      chatContainer.empty();

      response.forEach((message) => {
        let attributes = {};

        try {
          attributes =
            typeof message.attributes === "string"
              ? JSON.parse(message.attributes)
              : message.attributes || {};
        } catch (error) {
          console.error(
            "Unable to parse message attributes:",
            message.attributes,
            error
          );

          return;
        }

        const messageSender =
          attributes.sender_id != null
            ? String(attributes.sender_id)
            : "";

        const senderName =
          attributes.sender_name || "Unknown User";

        const timestamp =
          attributes.timestamp ||
          message.date_created ||
          message.date_updated;

        const messageBody =
          message.body || "";

        const isCurrentUser =
          messageSender === activeUser;

        const messageItem = (
          isCurrentUser
            ? sampleUserMessage
            : sampleParticipantMessage
        )
          .clone(false)
          .appendTo(chatContainer);

        messageItem
          .find("[data-chat='message']")
          .html(
            messageBody.replace(/\n/g, "<br>")
          );

        messageItem
          .find("[data-chat='sender']")
          .text(senderName);

        messageItem
          .find("[data-chat='timestamp']")
          .text(
            formatDateToCustomFormat(timestamp)
          );

        if (attributes.media_url) {
          const mediaUrl =
            attributes.media_url;

          const mediaParts =
            mediaUrl.split("~");

          const numImages =
            parseInt(mediaParts[1], 10) || 0;

          for (
            let i = 0;
            i < numImages;
            i++
          ) {
            const imageUrl =
              `${mediaUrl}/nth/${i}/`;

            const imageElement = $("<img>", {
              src: imageUrl,
              alt: "Attachment",
            }).css({
              width: isCurrentUser
                ? "auto"
                : "100%",
              "max-height": "200px",
              "margin-bottom": "10px",
              "border-radius": "7px",
              cursor: "pointer",
            });

            imageElement.on(
              "click",
              function () {
                window.open(
                  imageUrl,
                  "_blank"
                );
              }
            );

            messageItem
              .find(".message-img-container")
              .append(
                $("<div>").append(
                  imageElement
                )
              );
          }
        }
      });
    },

    complete: function () {
      // Ignore an older aborted request
      if (
        activeMessagesRequest !==
        currentRequest
      ) {
        return;
      }

      activeMessagesRequest = null;

      convoInFocus();
      $(".loader").hide();
    },

    error: function (
      xhr,
      status,
      error
    ) {
      if (status !== "abort") {
        console.error(
          "Error loading messages:",
          error
        );
      }
    },
  });

  activeMessagesRequest = currentRequest;
}

function updateConvoStatus(convoId) {
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:LEAuXkTc/update_convo_status",
    type: "POST",
    data: { conversation_sid: convoId },
    success: function (response) {},
    complete: function () {},
    error: function (error) {},
  });
}

function loadRecipients(recipient) {
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:LEAuXkTc/load_new_convo_recipients",
    type: "GET",
    data: {
      user_uuid: localStorage.userId,
      recipient: recipient,
    },
    success: function (response) {
      // Clear previous options in the select field
      $("[data-api-input=recipient]").empty();

      if (!$.isArray(response)) {
        // Response is a single object, set the select field to this object
        var optionText =
          response.display_name +
          " " +
          " (" +
          response.email +
          ")";
        $("[data-api-input=recipient]").append(
          $("<option>", {
            value: response.user_id,
            text: optionText,
            selected: true, // Make this option selected
          }),
        );
      } else {
        // Response is an array, add a placeholder and then options for each recipient
        // Add the placeholder to the select field
        $("[data-api-input=recipient]").append(
          $("<option>", {
            value: "",
            text: "Choose a Recipient",
            selected: true,
            disabled: true,
          }),
        );

        // Loop through each user in the response array
        $.each(response, function (index, user) {
          // Create the option text
          var optionText =
            user.display_name + " " + " (" + user.email + ")";

          // Append the new option to the select field
          $("[data-api-input=recipient]").append(
            $("<option>", {
              value: user.user_id,
              text: optionText,
            }),
          );
        });
      }
    },
    complete: function () {
      $(".loader").hide(); // Hide the loader image or element
    },
    error: function (error) {
      // Ideally, handle the error, possibly showing an error message to the user
      console.error("Error loading recipients: ", error);
    },
  });
}

function createNewConvo() {
  $("#new-convo-form")
    .off("submit") // ✅ Prevent multiple event bindings
    .on("submit", function (event) {
      event.preventDefault();

      if ($("#convo_recipient").find(":selected").val() === "") {
        alert("Please Select a recipient");
        $("#new-convo-form")[0].reset();
        $("#convo_recipient").val(""); // Explicitly reset select
        return;
      }

      $(".modal__block").hide();
      $(".loader").css("display", "flex");

      const formData = {};

      // Get the message input value
      const messageInput = $("#convo-message");
      const messageValue = messageInput.val().replace(/\r?\n/g, "\n");

      // Collect key-value pairs from form inputs
      $(this).find("[data-api-input]").each(function () {
        const input = $(this);
        const key = input.data("api-input");
        const value = input.val();
        formData[key] = value;
      });

      if ($("#convo_recipient").find(":selected").val() !== "") {
        formData["recipient_formatted_info"] = $("#convo_recipient").find(":selected").text();
      }

      formData["convo_message"] = messageValue;
      formData["sender"] = localStorage.userId;
      formData["sender_formatted_info"] = `${localStorage.firstName} ${localStorage.lastName} (${localStorage.email})`;
      formData["sender_first_name"] = localStorage.firstName;
      formData["sender_last_name"] = localStorage.lastName;

      /* ✅ Make an AJAX POST request */
      $.ajax({
        url: localStorage.baseUrl + "api:LEAuXkTc/create_new_convo",
        type: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.authToken,
        },
        data: JSON.stringify(formData),
        contentType: "application/json",
        success: function (response) {
          console.log("✅ New conversation created:", response.convo.sid);

          /* ✅ Dynamically add the new conversation */
          let newConvoId = response.convo.sid;
          let page = localStorage.getItem("pageId");

          if (page === "profile") {
            // ✅ If on the user’s profile, load THEIR conversations
            loadConvos(localStorage.pageRefreshParam, "user");
          } else if (page === "communications") {
            // ✅ If on the communications tab, load only MY conversations
            loadConvos(localStorage.userId, "self");
          } else if (page === "unit") {
            // ✅ If on a property unit page, load tenant conversations
            loadConvos(localStorage.activeTenantUserUuid, "user");
          }

          // ✅ Load messages for the new conversation
          loadConvoMessages(newConvoId);
        },
        complete: function () {
          /* Reset Form */
          $("#new-convo-form")[0].reset();

          /* Reset the Uploadcare widget */
          var widget = uploadcare.Widget("#convo-media");
          widget.value(null);

          $(".loader").hide();
        },
        error: function (error) {
          console.error("Error creating new conversation:", error);
        },
      });
    });
}

function updateBroadcastMessageViewers(convoId, activeUser) {
  /* This function updates who has seen the message in a broadcast convo blast */
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:LEAuXkTc/update_convo_blast_viewers",
    type: "POST",
    data: {
      conversation_sid: convoId,
      user_to_update: activeUser,
    },
    success: function (response) {},
    complete: function () {},
    error: function (error) {},
  });
}

function sendMessage() {
  $("[element='chat-send']").on("click", function () {
    $(".loader").css("display", "flex"); // show loader
    // get values for inputs
    let sender_id = localStorage.getItem("userId");
    let sender_first_name = localStorage.firstName;
    let sender_last_name = localStorage.lastName;
    let message_body = $(this)
      .closest(".chat-input-container")
      .find(".chat-input")
      .val()
      .replace(/\n/g, "<br/>");
    let media = $(this)
      .closest(".chat__input-wrapper")
      .find("[role='uploadcare-uploader']")
      .val();
    let conversation_id = localStorage.getItem("activeConvo");

    $.ajax({
      type: "POST",
      url: localStorage.baseUrl + "api:LEAuXkTc/send_message",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: {
        sender_id: sender_id,
        sender_first_name: sender_first_name,
        sender_last_name: sender_last_name,
        message_body: message_body,
        media: media,
        conversation_id: conversation_id,
      },
      success: function (response) {
        $('[role="uploadcare-uploader"]').each(function () {
          var widget = uploadcare.Widget(this);
          widget.value(null);
        });

        /* Load New Message in Messages Container */
        var chatContainer = $("[dyn-container='chat-container']");
        var sampleUserMessage = $(".convo-item-sample-wrapper").find(
          "[comm-sample-item='user-chat']",
        );
        let userMessageItem = $(sampleUserMessage)
          .clone()
          .appendTo(chatContainer); // clone the sample message blob and append to chat container
        userMessageItem
          .find("[data-chat='message']")
          .html(response.body.replace(/\n/g, "<br>"));
        userMessageItem
          .find("[data-chat='sender']")
          .text(response.attributes.sender_name); // bind the sender's name
        userMessageItem
          .find("[data-chat='timestamp']")
          .text(formatDateToCustomFormat(response.attributes.timestamp)); // bind the timestamp

        // Check if there are images in the message
        if (response.attributes.media_url) {
          const mediaUrl = response.attributes.media_url;
          const [uuid, numImages] = mediaUrl.split("~");
          const numImagesInt = parseInt(numImages);

          for (let i = 0; i < numImagesInt; i++) {
            const imageUrl = `${mediaUrl}/nth/${i}/`;
            const imageElement = $("<img>");
            imageElement.attr("src", imageUrl);
            imageElement.attr("alt", "Image");
            imageElement.css("width", "100%");
            imageElement.css("max-height", "200px");
            imageElement.css("margin-bottom", "10px");
            imageElement.css("border-radius", "7px"); // Add padding to the bottom of each image

            // Add a click handler to the image element
            imageElement.click(function () {
              window.open(imageUrl, "_blank"); // Open the image URL in a new tab when the image is clicked
            });

            const imageDiv = $("<div>");
            imageDiv.append(imageElement);

            // Append the image div to the user message container
            userMessageItem.find(".message-img-container").append(imageDiv);
          }
        }

        // Function to scroll to the bottom of the chat container
        function scrollToBottom() {
          chatContainer.scrollTop(chatContainer[0].scrollHeight);
        }

        // Check if the images are loaded before scrolling
        var imagesLoaded = 0;
        var totalImages = userMessageItem.find("img").length;

        if (totalImages === 0) {
          // No images, so scroll immediately
          scrollToBottom();
        } else {
          // Attach load event for each image
          userMessageItem
            .find("img")
            .on("load", function () {
              imagesLoaded++;
              if (imagesLoaded === totalImages) {
                // All images are loaded
                scrollToBottom();
              }
            })
            .each(function () {
              if (this.complete) $(this).trigger("load");
            });
        }
      },
      complete: function () {
        $(".loader").hide();
        $(".chat-input").val("");
        $(".chat-input").css("height", "");
      },
    });
  });
}

function deleteConvo() {
  $(".loader").css("display", "flex");
  $(".modal__block").hide();

  $.ajax({
    url: localStorage.baseUrl + "api:LEAuXkTc/delete_conversation",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      conversation_id: localStorage.activeConvo,
    },
    success: function (response) {
      showToast("Success! Conversation Deleted");
      var page = localStorage.getItem('pageId');
      if (page == "unit"){
        $("[api-button=tenant-convos]").click();
      }
      $("[dyn-container='chat-container']").empty();
      $(".loader").hide();

    },
    complete: function () {
      if (localStorage.pageId === "communications") {
        loadConvos(localStorage.userId, "self");
      } else if (localStorage.pageId === "profile") {
        loadConvos(localStorage.pageRefreshParam, "user");
      }
    },
  });
}


