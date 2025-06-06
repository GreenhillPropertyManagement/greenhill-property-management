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
    loadConvos(localStorage.pageRefreshParam, "user");
    localStorage.removeItem("activeConvo");
  });

  // ---- Communication Button Clicked on Unit Page (Get Tenant Convos)
  $("[api-button=tenant-convos]").off("click").on("click", function () {
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

function loadConvos(targetUser, type) {
  let loadType = type;
  let convosContainer = $("[dyn-container='convos-container']");

  // Clear previous conversations before loading new ones
  convosContainer.empty();
  $(".chat__input-wrapper").hide();
  $(".loader").css("display", "flex");

  $.ajax({
    url: localStorage.baseUrl + "api:LEAuXkTc/fetch_user_conversations",
    method: "GET",
    dataType: "json",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: { user_uuid: targetUser },
    success: function (response) {
      console.log("Loading conversations for:", targetUser);

      let seenConvos = new Set();
      let sampleConvo = $(".convo-item-sample-wrapper").find("[comm-sample-item='convo-item']");

      response.forEach((convo) => {
        if (!seenConvos.has(convo.conversation_sid)) {
          seenConvos.add(convo.conversation_sid);

          let convoItem = $(sampleConvo).clone().appendTo(convosContainer);
          convoItem.attr("id", convo.conversation_sid);
          convoItem.find("[data-convo='convo-title']").text(convo.friendly_name);
          convoItem.find("[data-convo='timestamp']").text(formatDateToCustomFormat(convo.attributes.last_updated));

          const lastMessageSender = convo.attributes.last_message_sender ? convo.attributes.last_message_sender.toString() : "";
          let activeUserId = targetUser;

          convoItem.removeClass("new-message");

          /* ---------- Peer-to-Peer Conversation ---------- */
          if (convo.attributes.convo_type === "peer_to_peer") {
            const participants = convo.attributes.convo_participants;
            let recipientInfo = "[Unknown]";

            if (participants && Array.isArray(participants)) {
              // Show the person they were chatting with (not themselves)
              const recipient = participants.find((p) => p.id.toString() !== targetUser.toString());
              if (recipient) {
                recipientInfo = recipient.info;
              }
            }

            convoItem.find("[data-convo='recipient-info']").text(recipientInfo);

            if (loadType === "self" && convo.attributes.convo_status === "updated" && lastMessageSender !== activeUserId) {
              convoItem.find("[data-convo='new-message-badge']").show();
              convoItem.addClass("new-message");
            } else {
              convoItem.find("[data-convo='new-message-badge']").hide();
            }

            convoItem.click(function () {
              $('.chat__messages-wrapper').show();
              let convoSid = $(this).attr("id");
              localStorage.setItem("activeConvo", convoSid);

              $("[data-convo='chat-container']").empty();
              $(".loader").css("display", "flex");
              loadConvoMessages(convoSid);
              $(".chat__input-wrapper").css("display", "flex");

              if (convo.attributes.last_message_sender !== activeUserId && loadType === "self") {
                updateConvoStatus(convoSid);
                convoItem.removeClass("new-message");
                convoItem.find("[data-convo='new-message-badge']").hide();
                updateConvoCounter();
              }
            });
          }

          /* ---------- Property Blast Conversation ---------- */
          if (convo.attributes.convo_type === "blast") {
            convoItem.find("[data-convo='recipient-info']").text("Broadcast: " + convo.attributes.property);
            convoItem.find("[data-convo='blast-icon']").show();

            if (loadType === "self" && activeUserId !== convo.attributes.last_message_sender) {
              const participants = convo.attributes.convo_participants;
              let hasUnreadMessage = participants.some(participant => participant.user === activeUserId && !participant.message_seen);

              if (hasUnreadMessage) {
                convoItem.find("[data-convo='new-message-badge']").show();
                convoItem.addClass("new-message");
              } else {
                convoItem.find("[data-convo='new-message-badge']").hide();
              }
            } else {
              convoItem.find("[data-convo='new-message-badge']").hide();
            }

            convoItem.click(function () {
              $('.chat__messages-wrapper').show();
              let convoSid = $(this).attr("id");
              localStorage.setItem("activeConvo", convoSid);

              if (localStorage.userRole !== "Admin") {
                $(".chat__input-wrapper").hide();
              } else {
                $(".chat__input-wrapper").css("display", "flex");
              }

              $("[data-convo='chat-container']").empty();
              $(".loader").css("display", "flex");
              loadConvoMessages(convoSid);
              convoItem.removeClass("new-message");
              convoItem.find("[data-convo='new-message-badge']").hide();
              updateConvoCounter();

              if (loadType === "self" && activeUserId !== convo.attributes.last_message_sender) {
                updateBroadcastMessageViewers(convoSid, activeUserId);
              }
            });
          } else {
            convoItem.find("[data-convo='blast-icon']").hide();
          }
        }
      });

      console.log("Conversations Loaded. Running Counter...");
    },
    complete: function () {
      console.log("AJAX completed, conversations should be loaded.");
      $(".loader").hide();
      $('.back-convo-button').click(function () {
        $('.chat__messages-wrapper').hide();
      });
      updateConvoCounter();
    },
    error: function (error) {
      console.error("Error fetching conversations:", error);
    },
  });
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

function loadConvoMessages(convoId) {
  var chatContainer = $("[dyn-container='chat-container']");

  $.ajax({
    url: localStorage.baseUrl + "api:LEAuXkTc/fetch_conversation",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      conversation_id: convoId,
    },
    success: function (response) {
      var activeUser = localStorage.userId; // set active user
      var sampleUserMessage = $(".convo-item-sample-wrapper").find(
        "[comm-sample-item='user-chat']",
      );
      var sampleParticipantMessage = $(".convo-item-sample-wrapper").find(
        "[comm-sample-item='participant-chat']",
      );

      chatContainer.empty(); // empty the chat container

      // loop through each message
      response.forEach((message) => {
        // get and convert the message sender data
        const messageSender =
          message.attributes.sender_id != null
            ? message.attributes.sender_id.toString()
            : "";

        // run if the message sender is the active user...
        if (messageSender === activeUser) {
          let userMessageItem = $(sampleUserMessage)
            .clone()
            .appendTo(chatContainer); // clone the sample message blob and append to chat container
          const messageBodyContainer = userMessageItem.find(
            "[data-chat='message']",
          );
          messageBodyContainer.html(message.body.replace(/\n/g, "<br>"));
          userMessageItem
            .find("[data-chat='sender']")
            .text(message.attributes.sender_name); // bind the sender's name
          userMessageItem
            .find("[data-chat='timestamp']")
            .text(formatDateToCustomFormat(message.attributes.timestamp)); // bind the timestamp

          // Check if there are images in the message
          if (message.attributes.media_url) {
            const mediaUrl = message.attributes.media_url;
            const [uuid, numImages] = mediaUrl.split("~");
            const numImagesInt = parseInt(numImages);

            for (let i = 0; i < numImagesInt; i++) {
              const imageUrl = `${mediaUrl}/nth/${i}/`;
              const imageElement = $("<img>");
              imageElement.attr("src", imageUrl);
              imageElement.attr("alt", "Image");
              imageElement.css("width", "auto");
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
        } else {
          let participantMessageItem = $(sampleParticipantMessage)
            .clone()
            .appendTo(chatContainer); // clone the sample message blob and append to chat container
          const messageBodyContainer = participantMessageItem.find(
            "[data-chat='message']",
          );
          messageBodyContainer.html(message.body.replace(/\n/g, "<br>"));
          participantMessageItem
            .find("[data-chat='sender']")
            .text(message.attributes.sender_name); // bind the sender's name
          participantMessageItem
            .find("[data-chat='timestamp']")
            .text(formatDateToCustomFormat(message.attributes.timestamp)); // bind the timestamp

          if (message.attributes.media_url) {
            const mediaUrl = message.attributes.media_url;
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

              participantMessageItem
                .find(".message-img-container")
                .append(imageDiv);
            }
          }
        }
      });
    },
    complete: function () {
      convoInFocus();
      $(".loader").hide();
    },
  });
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
